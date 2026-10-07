<?php
/**
 * bfields — Update without a reload, server half (Metabox::in_place_response(),
 * save() outcomes, refresh_nonces(), the stale-nonce report, the boot keys).
 *
 * Simulates post.php's editpost request in memory: $_POST is set by hand and
 * save() is called directly, then the response is built the way
 * redirect_location() builds it, without exiting.
 *
 * Creates its own scratch posts on two in-memory post types and LEAVES them:
 * nothing is deleted. The only transients it sets are bfields' own 5-minute
 * errors entries for those scratch posts.
 *
 *   cd /path/to/wordpress && BFIELDS_ROOT=/path/to/bfields wp --user=1 eval-file /path/to/bfields/tests/php/update-in-place.php
 */

if (!defined('ABSPATH')) {
	exit;
}

require_once (rtrim((string) (getenv('BFIELDS_ROOT') ?: WP_PLUGIN_DIR . '/bfields'), '/')) . '/tests/php/lib.php';

use BFields\Metabox;
use BFields\Registry;

$report = new BFields_Report('bfields update in place (server)');

if (!current_user_can('edit_posts')) {
	$report->fail('run as an administrator: wp --user=1 eval-file …');
	$report->finish('');
}

$type  = 'bfields_uip_test';
$plain = 'bfields_uip_plain';
$uniq  = '_bfields_test_uip_';
$puniq = '_bfields_test_uip_plain_';

foreach (array($type, $plain) as $post_type) {
	register_post_type($post_type, array('public' => false, 'show_ui' => true, 'capability_type' => 'post', 'supports' => array('title')));
}

$fields = array(
	array('id' => 'f', 'type' => 'text', 'default' => 'a'),
	array(
		'id'       => 'n',
		'type'     => 'text',
		'default'  => '1',
		'validate' => static function ($value) {
			return 'bad' === $value ? 'Not allowed.' : '';
		},
	),
);

Registry::instance()->metabox($uniq, array('post_type' => $type, 'title' => 'UIP', 'frame' => 'page', 'page' => array('update_in_place' => true)));
Registry::instance()->section($uniq, array('id' => 's', 'title' => 'S', 'fields' => $fields));
Registry::instance()->metabox($puniq, array('post_type' => $plain, 'title' => 'Plain', 'frame' => 'page'));
Registry::instance()->section($puniq, array('id' => 's', 'title' => 'S', 'fields' => $fields));

$GLOBALS['pagenow'] = 'post.php';

$metabox = Metabox::instance();

$new_post = static function (string $post_type, string $title): int {
	return (int) wp_insert_post(array('post_type' => $post_type, 'post_status' => 'publish', 'post_title' => 'bfields update-in-place scratch: ' . $title . ' (safe to delete)'));
};

$errors_key = static function (string $unique, int $post_id): string {
	return 'bfields_errors_' . md5($unique . '|' . $post_id . '|' . get_current_user_id());
};

/** The stored report without the in-place save's token. */
$report_of = static function (string $unique, int $post_id) use ($errors_key) {
	$stored = get_transient($errors_key($unique, $post_id));

	if (is_array($stored)) {
		unset($stored[Metabox::TOKEN]);
	}

	return $stored;
};

/** Today's editpost request for a published post, as post_submit_meta_box() posts it. */
$request = static function (int $post_id, array $values, array $over = array()) use ($uniq): void {
	$post = array(
		'action'                       => 'editpost',
		'post_ID'                      => (string) $post_id,
		'save'                         => 'Update',
		'original_post_status'         => 'publish',
		'post_status'                  => 'publish',
		'hidden_aa'                    => '2026',
		'aa'                           => '2026',
		'hidden_jj'                    => '05',
		'jj'                           => '05',
		'bfields_values'               => array($uniq => wp_json_encode($values)),
		'bfields_metabox_nonce_' . sanitize_key($uniq) => wp_create_nonce('bfields_metabox_' . $uniq . '_' . $post_id),
		Metabox::IN_PLACE              => $uniq,
	);

	$_POST = wp_slash(array_merge($post, $over));
};

$location = static function (int $post_id): string {
	return add_query_arg('message', 1, get_edit_post_link($post_id, 'url'));
};

$save = static function (int $post_id) use ($metabox): void {
	$metabox->save($post_id, get_post($post_id));
};

// 1. Not the in-place client's request: the location is untouched.
$report->count('not applicable');
$id = $new_post($type, 'basic');
$request($id, array('f' => 'b', 'n' => '2'));
$save($id);

$no_marker = $_POST;
unset($no_marker[Metabox::IN_PLACE]);
$_POST = $no_marker;
if (null !== $metabox->in_place_response($location($id), $id)) {
	$report->fail('no marker: expected null');
}

$request($id, array('f' => 'b', 'n' => '2'), array('post_ID' => (string) ($id + 1)));
if (null !== $metabox->in_place_response($location($id), $id)) {
	$report->fail('post_ID mismatch: expected null');
}

$request($id, array('f' => 'b', 'n' => '2'), array('action' => 'editattachment'));
if (null !== $metabox->in_place_response($location($id), $id)) {
	$report->fail('action is not editpost: expected null');
}

$admin = get_current_user_id();
$where = $location($id);
wp_set_current_user(0);
$request($id, array('f' => 'b', 'n' => '2'));
if (null !== $metabox->in_place_response($where, $id)) {
	$report->fail('a user who cannot edit the post: expected null');
}
wp_set_current_user($admin);

// 2. The ordinary save.
$report->count('ordinary');
$request($id, array('f' => 'b', 'n' => '2'));
$save($id);
$data = $metabox->in_place_response($location($id), $id);

if (!is_array($data) || true !== $data['inPlace'] || '' !== $data['reason'] || 'saved' !== $data['box']) {
	$report->fail('ordinary save: expected inPlace, got ' . bfields_show($data));
} else {
	$values = (array) $data['values'];
	if (array('f' => 'b', 'n' => '2') !== $values) {
		$report->fail('values: expected the stored row hydrated, got ' . bfields_show($values));
	}
	$nonce_name = 'bfields_metabox_nonce_' . sanitize_key($uniq);
	if (!isset($data['nonces']['_wpnonce'], $data['nonces'][$nonce_name])) {
		$report->fail('nonces: expected _wpnonce and the box nonce, got ' . bfields_show($data['nonces']));
	} elseif (!wp_verify_nonce($data['nonces'][$nonce_name], 'bfields_metabox_' . $uniq . '_' . $id) || !wp_verify_nonce($data['nonces']['_wpnonce'], 'update-post_' . $id)) {
		$report->fail('nonces do not verify');
	}
	if ((string) get_post_meta($id, '_edit_lock', true) !== $data['lock']) {
		$report->fail('lock: expected the stored _edit_lock');
	}
	if ($id !== $data['postId'] || $uniq !== $data['unique'] || 'publish' !== $data['status'] || $location($id) !== $data['location']) {
		$report->fail('ids, status or location wrong: ' . bfields_show($data));
	}
	$json = wp_json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP);
	if (false === strpos($json, '"errors":{}')) {
		$report->fail('errors must encode as an object, got ' . $json);
	}
}

// 3. Each reason, in rule order.
$report->count('reasons');
$cases = array(
	'errors'   => array(array('f' => 'c', 'n' => 'bad'), array()),
	'button'   => array(array('f' => 'c', 'n' => '2'), array('publish' => 'Publish')),
	'status'   => array(array('f' => 'c', 'n' => '2'), array('original_post_status' => 'draft')),
	'date'     => array(array('f' => 'c', 'n' => '2'), array('jj' => '06')),
);

foreach ($cases as $reason => $case) {
	$rid = $new_post($type, 'reason ' . $reason);
	$request($rid, $case[0], $case[1]);
	$save($rid);
	$data = $metabox->in_place_response($location($rid), $rid);

	if (!is_array($data) || false !== $data['inPlace'] || $reason !== $data['reason']) {
		$report->fail("reason $reason: got " . bfields_show($data));
	} elseif (!isset($data['values'])) {
		$report->fail("reason $reason: values must travel whenever box is saved");
	}

	if ('errors' === $reason) {
		if (array('n' => 'Not allowed.') !== (array) $data['errors']) {
			$report->fail('errors: expected n => Not allowed., got ' . bfields_show($data['errors']));
		}
		// Not read, not consumed: a navigation (or the settle GET) renders it once, as today.
		if (array('n' => 'Not allowed.') !== $report_of($uniq, $rid)) {
			$report->fail('the errors transient must survive the in-place response');
		}
	}
}

$lid = $new_post($type, 'reason location');
$request($lid, array('f' => 'c', 'n' => '2'));
$save($lid);
$data = $metabox->in_place_response(admin_url('edit.php?post_type=' . $type), $lid);
if (!is_array($data) || 'location' !== $data['reason']) {
	$report->fail('reason location: got ' . bfields_show($data));
}

// 4. Opt-in off (host filter) with the marker: still a payload, reason off.
$report->count('off');
add_filter('bfields_update_in_place', '__return_false');
$request($id, array('f' => 'd', 'n' => '2'));
$save($id);
$data = $metabox->in_place_response($location($id), $id);
remove_filter('bfields_update_in_place', '__return_false');
if (!is_array($data) || 'off' !== $data['reason'] || 'saved' !== $data['box'] || !isset($data['values'])) {
	$report->fail('filter off: expected a payload with reason off, got ' . bfields_show($data));
}

$pid = $new_post($plain, 'not opted in');
$_POST = wp_slash(array(
	'action'                                         => 'editpost',
	'post_ID'                                        => (string) $pid,
	'save'                                           => 'Update',
	'original_post_status'                           => 'publish',
	'bfields_values'                                 => array($puniq => wp_json_encode(array('f' => 'x', 'n' => '1'))),
	'bfields_metabox_nonce_' . sanitize_key($puniq) => wp_create_nonce('bfields_metabox_' . $puniq . '_' . $pid),
	Metabox::IN_PLACE                                => $puniq,
));
$save($pid);
$data = $metabox->in_place_response($location($pid), $pid);
if (!is_array($data) || 'off' !== $data['reason']) {
	$report->fail('arg off: expected reason off, got ' . bfields_show($data));
}

// 5. Box outcomes: stale nonce (with the visible report), capability.
$report->count('outcomes');
$nid = $new_post($type, 'stale nonce');
update_post_meta($nid, $uniq, array('f' => 'kept', 'n' => '1'));
$before = get_post_meta($nid, $uniq, true);
$request($nid, array('f' => 'lost', 'n' => '1'), array('bfields_metabox_nonce_' . sanitize_key($uniq) => 'stale'));
$save($nid);
$data = $metabox->in_place_response($location($nid), $nid);
if (!is_array($data) || 'nonce' !== $data['box'] || 'nonce' !== $data['reason'] || isset($data['values'])) {
	$report->fail('stale nonce: got ' . bfields_show($data));
}
if ($before !== get_post_meta($nid, $uniq, true)) {
	$report->fail('stale nonce: the meta changed');
}
$flag = get_transient($errors_key($uniq, $nid));
if (!is_array($flag) || !isset($flag[Metabox::NONCE_FAILED])) {
	$report->fail('stale nonce: expected the __bfields_nonce report, got ' . bfields_show($flag));
}

$cid = $new_post($type, 'capability');
$deny = static function ($allcaps) {
	$allcaps['edit_posts'] = false;
	return $allcaps;
};
add_filter('user_has_cap', $deny);
$request($cid, array('f' => 'c', 'n' => '1'));
$save($cid);
$data = $metabox->in_place_response($location($cid), $cid);
remove_filter('user_has_cap', $deny);
if (!is_array($data) || 'capability' !== $data['box'] || 'capability' !== $data['reason']) {
	$report->fail('capability: got ' . bfields_show($data));
}

// 6. A nested save_post for another post keeps this post's outcome.
$report->count('nested');
$aid = $new_post($type, 'outer');
$bid = $new_post($type, 'nested');
$request($aid, array('f' => 'outer', 'n' => '1'));
$save($aid);
$save($bid);
$data = $metabox->in_place_response($location($aid), $aid);
if (!is_array($data) || 'saved' !== $data['box'] || true !== $data['inPlace']) {
	$report->fail('nested save changed the outer outcome: ' . bfields_show($data));
}
if (false !== get_transient($errors_key($uniq, $bid))) {
	$report->fail('nested save: the nonce report must only be set for the post being edited');
}

// 7. Heartbeat nonce refresh.
$report->count('refresh');
$response = array('wp-refresh-post-nonces' => array('replace' => array('_wpnonce' => 'x')));
$out = $metabox->refresh_nonces($response, array('wp-refresh-post-nonces' => array('post_id' => (string) $id)), 'bfields_uip_test');
$nonce_name = 'bfields_metabox_nonce_' . sanitize_key($uniq);
if (empty($out['wp-refresh-post-nonces']['replace'][$nonce_name]) || !wp_verify_nonce($out['wp-refresh-post-nonces']['replace'][$nonce_name], 'bfields_metabox_' . $uniq . '_' . $id)) {
	$report->fail('refresh: the opted-in box nonce is missing or invalid');
}
$out = $metabox->refresh_nonces($response, array('wp-refresh-post-nonces' => array('post_id' => (string) $pid)), 'bfields_uip_plain');
if ($response !== $out) {
	$report->fail('refresh: a screen that did not opt in must be untouched');
}
wp_set_current_user(0);
$out = $metabox->refresh_nonces($response, array('wp-refresh-post-nonces' => array('post_id' => (string) $id)), 'bfields_uip_test');
wp_set_current_user($admin);
if ($response !== $out) {
	$report->fail('refresh: a user without edit_post must get nothing');
}

// 8. Boot keys: core's message for the type, else post's. Fresh posts, so render() finds no transient.
$report->count('boot');
$boot = static function (int $post_id) use ($metabox): array {
	ob_start();
	$metabox->render_page(get_post($post_id));
	$html = (string) ob_get_clean();

	return preg_match('/data-editor="([^"]*)"/', $html, $m) ? (array) json_decode(html_entity_decode($m[1], ENT_QUOTES), true) : array();
};

$GLOBALS['messages'] = array('post' => array(1 => 'Post updated. <a href="#">View</a>'), $type => array(1 => 'Model Updated'));
$editor = $boot($new_post($type, 'boot'));
if ('Model Updated' !== ($editor['updatedNotice'] ?? null) || true !== ($editor['updateInPlace'] ?? null) || empty($editor['postId'])) {
	$report->fail('boot: expected Model Updated + updateInPlace, got ' . bfields_show($editor));
}

$GLOBALS['messages'] = array('post' => array(1 => 'Post updated. <a href="#">View</a>'));
$editor = $boot($new_post($type, 'boot core message'));
if ('Post updated. <a href="#">View</a>' !== ($editor['updatedNotice'] ?? null)) {
	$report->fail("boot: expected core's post message, got " . bfields_show($editor['updatedNotice'] ?? null));
}

$editor = $boot($new_post($plain, 'boot plain'));
if (array_key_exists('updateInPlace', $editor) || array_key_exists('updatedNotice', $editor)) {
	$report->fail('boot: a screen that did not opt in must not get the keys');
}

$draft = (int) wp_insert_post(array('post_type' => $type, 'post_status' => 'draft', 'post_title' => 'bfields update-in-place scratch: draft (safe to delete)'));
$editor = $boot($draft);
if (false !== ($editor['updateInPlace'] ?? null)) {
	$report->fail('boot: a draft must not save in place');
}

// 9. Host switch off: no heartbeat box nonce and no stale-nonce report, as before the feature.
$report->count('switch off');
add_filter('bfields_update_in_place', '__return_false');
$out = $metabox->refresh_nonces($response, array('wp-refresh-post-nonces' => array('post_id' => (string) $id)), 'bfields_uip_test');
if ($response !== $out) {
	$report->fail('switch off: heartbeat must not renew the box nonce');
}
$sid = $new_post($type, 'switch off stale nonce');
$request($sid, array('f' => 'lost', 'n' => '1'), array('bfields_metabox_nonce_' . sanitize_key($uniq) => 'stale'));
$save($sid);
remove_filter('bfields_update_in_place', '__return_false');
if (false !== get_transient($errors_key($uniq, $sid))) {
	$report->fail('switch off: a stale box nonce must be skipped silently, as before');
}

// 10. Another bfields box on the same form that did not save: reason others, its transient untouched.
$report->count('others');
$ouniq = '_bfields_test_uip_other_';
Registry::instance()->metabox($ouniq, array('post_type' => $type, 'title' => 'Other'));
Registry::instance()->section($ouniq, array('id' => 's', 'title' => 'S', 'fields' => $fields));
$oid = $new_post($type, 'other box');
$both = array(
	$uniq  => wp_json_encode(array('f' => 'b', 'n' => '1')),
	$ouniq => wp_json_encode(array('f' => 'b', 'n' => 'bad')),
);
$request($oid, array(), array('bfields_values' => $both, 'bfields_metabox_nonce_' . sanitize_key($ouniq) => wp_create_nonce('bfields_metabox_' . $ouniq . '_' . $oid)));
$save($oid);
$data = $metabox->in_place_response($location($oid), $oid);
if (!is_array($data) || 'others' !== $data['reason'] || 'saved' !== $data['box'] || false !== $data['inPlace']) {
	$report->fail('others: expected reason others, got ' . bfields_show($data));
}
if (array('n' => 'Not allowed.') !== $report_of($ouniq, $oid)) {
	$report->fail("others: the other box's errors transient must survive");
}
$both[$ouniq] = wp_json_encode(array('f' => 'c', 'n' => '1'));
$request($oid, array(), array('bfields_values' => $both, 'bfields_metabox_nonce_' . sanitize_key($ouniq) => wp_create_nonce('bfields_metabox_' . $ouniq . '_' . $oid)));
$save($oid);
$data = $metabox->in_place_response($location($oid), $oid);
if (!is_array($data) || '' !== $data['reason'] || true !== $data['inPlace']) {
	$report->fail('others: both boxes saved must stay in place, got ' . bfields_show($data));
}

// 10b. The other box failed while the page box had errors too: still flagged, so the client skips its settle GET.
$both = array(
	$uniq  => wp_json_encode(array('f' => 'b', 'n' => 'bad')),
	$ouniq => wp_json_encode(array('f' => 'b', 'n' => 'bad')),
);
$request($oid, array(), array('bfields_values' => $both, 'bfields_metabox_nonce_' . sanitize_key($ouniq) => wp_create_nonce('bfields_metabox_' . $ouniq . '_' . $oid)));
$save($oid);
$data = $metabox->in_place_response($location($oid), $oid);
if (!is_array($data) || 'errors' !== $data['reason'] || true !== $data['othersFailed']) {
	$report->fail('others: expected othersFailed beside reason errors, got ' . bfields_show($data));
}
$both[$ouniq] = wp_json_encode(array('f' => 'c', 'n' => '1'));
$both[$uniq]  = wp_json_encode(array('f' => 'c', 'n' => '1'));
$request($oid, array(), array('bfields_values' => $both, 'bfields_metabox_nonce_' . sanitize_key($ouniq) => wp_create_nonce('bfields_metabox_' . $ouniq . '_' . $oid)));
$save($oid);
$data = $metabox->in_place_response($location($oid), $oid);
if (!is_array($data) || false !== $data['othersFailed']) {
	$report->fail('others: expected othersFailed false once both saved, got ' . bfields_show($data));
}

// 10c. The settle GET consumes only the report its own save wrote, and only the page box's.
$report->count('settle token');
$render = static function (int $post_id, array $args) use ($metabox): string {
	ob_start();
	$metabox->render(get_post($post_id), array('args' => $args));
	return (string) ob_get_clean();
};
$page_args = array('unique' => $uniq, 'frame' => 'page', 'editor' => '{}');
$tid = $new_post($type, 'settle token');
$request($tid, array('f' => 'c', 'n' => 'bad'));
$save($tid);
$data  = $metabox->in_place_response($location($tid), $tid);
$token = is_array($data) ? (string) $data['token'] : '';
$raw   = get_transient($errors_key($uniq, $tid));
if ('' === $token || !is_array($raw) || ($raw[Metabox::TOKEN] ?? '') !== $token) {
	$report->fail('token: expected the payload token stored in the report, got ' . bfields_show(array($token, $raw)));
}

$_GET[Metabox::SETTLE] = 'not-' . $token;
$html = $render($tid, $page_args);
if (array('n' => 'Not allowed.') !== $report_of($uniq, $tid) || false !== strpos($html, 'Not allowed.')) {
	$report->fail("settle: another save's token must neither show nor consume the report");
}
$_GET[Metabox::SETTLE] = $token;
$render($tid, array('unique' => $uniq));
if (array('n' => 'Not allowed.') !== $report_of($uniq, $tid)) {
	$report->fail('settle: a box outside the page frame must never consume on a settle GET');
}
$html = $render($tid, $page_args);
if (false !== get_transient($errors_key($uniq, $tid)) || false === strpos($html, 'Not allowed.')) {
	$report->fail('settle: the matching token must render and consume the report');
}
unset($_GET[Metabox::SETTLE]);

$request($tid, array('f' => 'c', 'n' => 'bad'));
$save($tid);
$html = $render($tid, $page_args);
if (false !== get_transient($errors_key($uniq, $tid)) || false !== strpos($html, Metabox::TOKEN) || false === strpos($html, 'Not allowed.')) {
	$report->fail('a normal load must consume the report and never print the token');
}

$native = $_POST;
unset($native[Metabox::IN_PLACE]);
$_POST = $native;
$save($tid);
$raw = get_transient($errors_key($uniq, $tid));
if (!is_array($raw) || isset($raw[Metabox::TOKEN])) {
	$report->fail('a native save must store the report as before, without a token, got ' . bfields_show($raw));
}
$render($tid, $page_args);

// 11. A stored value holding the end sentinel cannot cut the payload short.
$report->count('sentinel');
$encoded = Metabox::encode_response(array('values' => (object) array('f' => 'x BFIELDS-UIP-END y BFIELDS-UIP-BEGIN')));
$inner   = substr($encoded, strlen('BFIELDS-UIP-BEGIN'), -strlen('BFIELDS-UIP-END'));
if (false !== strpos($inner, 'BFIELDS-UIP-') || 'x BFIELDS-UIP-END y BFIELDS-UIP-BEGIN' !== (json_decode($inner, true)['values']['f'] ?? null)) {
	$report->fail('sentinel: expected it escaped inside the JSON, got ' . $encoded);
}

$_POST = array();

$report->finish('the in-place payload follows the plan, never consumes errors, and stays off unless opted in');
