<?php
/**
 * bfields — the save path, side by side with REAL Codestar.
 *
 * One field set, one stored row, one submitted form. Codestar saves it the way
 * it does in wp-admin (CSF_Options::set_options() from a nonce'd $_POST,
 * CSF_Metabox::save_meta_box()); bfields saves the same values through
 * Storage\Option / Storage\PostMeta. Then:
 *
 *   ROWS     every declared field is stored as the same bytes — kses, a
 *            one-argument `sanitize` callback (esc_url_raw, intval, trim),
 *            `'sanitize' => false`, and a failing `validate` that keeps the old
 *            value (review 3.7, 3.8, 4.3).
 *   ERRORS   the same fields fail validation.
 *   HOOKS    csf_{unique}_save, _save_before, _saved, _save_after fire in the
 *            same ORDER with the same argument SHAPE: ($data, $instance) for
 *            options, ($data, $post_id, $instance) for a meta box, with the
 *            real post id and an instance whose `pre_fields` lists the same
 *            ids (review 3.3).
 *
 * Scratch keys and a scratch post only; nothing a real screen uses is touched.
 */

if (!defined('ABSPATH')) {
	exit;
}

require_once (rtrim((string) (getenv('BFIELDS_ROOT') ?: WP_PLUGIN_DIR . '/bfields'), '/')) . '/tests/php/lib.php';

use BFields\Compat\Codestar;
use BFields\Registry;
use BFields\Storage\Option;
use BFields\Storage\PostMeta;

$report = new BFields_Report('bfields save parity with Codestar');

if (!class_exists('CSF_Options')) {
	$report->fail('Codestar is not loaded — there is nothing to compare against.');
	$report->finish('');
}

// Codestar's public (free) build has no CSF_Metabox; 3D Viewer vendors the
// Pro build, which does. CI installs the free one, so there — and only in
// inventory mode — the meta-box half is skipped out loud. Locally it is
// required.
$with_metabox = class_exists('CSF_Metabox');

if (!$with_metabox && 'inventory' !== getenv('BFIELDS_SCHEMA_SOURCE')) {
	$report->fail('CSF_Metabox is not loaded — the meta-box save path cannot be compared. Activate 3D Viewer (it vendors Codestar Pro).');
	$report->finish('');
}

if (!get_current_user_id()) {
	$report->fail('No user: Codestar verifies a nonce. Run with --user=<admin> (bin/test.sh does).');
	$report->finish('');
}

/** A validator in Codestar's contract: return a message to reject. */
function bfields_test_validate($value)
{
	return (is_string($value) && false !== strpos($value, 'bad')) ? 'Contains "bad".' : '';
}

$section = array(
	'title'  => 'Parity',
	'fields' => array(
		array('id' => 'p_text', 'type' => 'text'),
		array('id' => 'p_textarea', 'type' => 'textarea'),
		array('id' => 'p_switch', 'type' => 'switcher', 'default' => true),
		// bfields gets the field_group wrapper, Codestar the unwrapped list
		// ($csf_section): the rows, errors and hooks must not tell them apart.
		array('id' => 'p_group', 'type' => 'field_group', 'title' => 'Sanitized', 'fields' => array(
			array('id' => 'p_url', 'type' => 'text', 'sanitize' => 'esc_url_raw'),
			array('id' => 'p_int', 'type' => 'text', 'sanitize' => 'intval'),
			array('id' => 'p_trim', 'type' => 'text', 'sanitize' => 'trim'),
			array('id' => 'p_raw', 'type' => 'text', 'sanitize' => false),
			array('id' => 'p_valid', 'type' => 'text', 'validate' => 'bfields_test_validate'),
		)),
		array('id' => 'p_upload', 'type' => 'upload'),
		array('id' => 'p_color', 'type' => 'color'),
		array('id' => 'p_css', 'type' => 'code_editor'),
		array('id' => 'p_select', 'type' => 'select', 'options' => array('a' => 'A', 'b' => 'B')),
	),
);

$csf_section = array('fields' => \BFields\Schema::unwrap_groups($section['fields'])) + $section;

$stored_before = array('p_valid' => 'the good old value', 'p_text' => 'before');

// What the user typed. Codestar receives it slashed in $_POST; bfields
// receives it decoded from JSON, unslashed.
$posted = array(
	'p_text'     => "Hello <script>alert(1)</script> \"quoted\" it's a back\\slash",
	'p_textarea' => "Line one\nLine <b>two</b> & three",
	'p_switch'   => '1',
	'p_url'      => 'https://example.com/a path?x=1&y=2',
	'p_int'      => '42abc',
	'p_trim'     => '  padded  ',
	'p_raw'      => '<b>kept raw</b>',
	'p_valid'    => 'a bad value',
	'p_upload'   => 'models/x.glb?a=1&b=2',
	'p_color'    => 'RGBA(0, 0, 0, 0.4)',
	'p_css'      => '.a > .b { content: "\201C"; }',
	'p_select'   => 'b',
);

/**
 * Record every csf_{unique}_* save hook: its position and argument shape.
 */
function bfields_test_record(string $unique, array &$log): void
{
	foreach (array('save', 'save_before', 'saved', 'save_after') as $event) {
		$callback = static function (...$args) use ($event, &$log) {
			$last  = end($args);
			$log[] = array(
				'event'      => $event,
				'count'      => count($args),
				'data'       => is_array($args[0]),
				'post_id'    => (3 === count($args)) ? $args[1] : null,
				'instance'   => is_object($last),
				'pre_fields' => is_object($last) && isset($last->pre_fields)
					? array_values(array_filter(array_map(static function ($field) {
						return isset($field['id']) ? $field['id'] : '';
					}, (array) $last->pre_fields)))
					: null,
			);
			return $args[0];
		};

		if ('save' === $event) {
			add_filter("csf_{$unique}_save", $callback, 10, 3);
		} else {
			add_action("csf_{$unique}_{$event}", $callback, 10, 3);
		}
	}
}

/**
 * Compare the two rows, the error keys and the hook logs.
 */
function bfields_test_compare(string $kind, $csf_row, $bf_row, array $csf_errors, array $bf_errors, array $csf_log, array $bf_log, array $section, BFields_Report $report, int $post_id = 0): void
{
	if (!is_array($csf_row) || !is_array($bf_row)) {
		$report->fail("{$kind}: a row is missing (Codestar " . gettype($csf_row) . ', bfields ' . gettype($bf_row) . ')');
		return;
	}

	foreach ($section['fields'] as $field) {
		$id = $field['id'];
		$report->count("{$kind}: fields compared");

		$a = array_key_exists($id, $csf_row) ? $csf_row[$id] : '(absent)';
		$b = array_key_exists($id, $bf_row) ? $bf_row[$id] : '(absent)';

		if (!bfields_identical($a, $b)) {
			$report->fail(sprintf("%s / %s: Codestar stores %s (%s), bfields %s (%s)", $kind, $id, bfields_show($a), gettype($a), bfields_show($b), gettype($b)));
		}
	}

	ksort($csf_errors);
	ksort($bf_errors);

	if (array_keys($csf_errors) !== array_keys($bf_errors)) {
		$report->fail("{$kind}: validation failed for [" . implode(', ', array_keys($csf_errors)) . '] under Codestar, [' . implode(', ', array_keys($bf_errors)) . '] under bfields');
	} else {
		$report->count("{$kind}: validation errors matched", count($csf_errors));
	}

	$order = static function (array $log): array {
		return array_column($log, 'event');
	};

	if ($order($csf_log) !== $order($bf_log)) {
		$report->fail("{$kind}: hook ORDER differs — Codestar " . implode(' → ', $order($csf_log)) . ', bfields ' . implode(' → ', $order($bf_log)));
		return;
	}

	foreach ($csf_log as $i => $csf_call) {
		$bf_call = $bf_log[$i];
		$report->count("{$kind}: hook calls compared");

		foreach (array('count', 'data', 'instance') as $shape) {
			if ($csf_call[$shape] !== $bf_call[$shape]) {
				$report->fail("{$kind} / {$csf_call['event']}: argument {$shape} differs — Codestar " . bfields_show($csf_call[$shape]) . ', bfields ' . bfields_show($bf_call[$shape]));
			}
		}

		if ($csf_call['pre_fields'] !== $bf_call['pre_fields']) {
			$report->fail("{$kind} / {$csf_call['event']}: \$instance->pre_fields differs — Codestar " . bfields_show($csf_call['pre_fields']) . ', bfields ' . bfields_show($bf_call['pre_fields']));
		}

		if ('metabox' === $kind && ((int) $csf_call['post_id'] !== $post_id || $bf_call['post_id'] !== $post_id)) {
			$report->fail("{$kind} / {$csf_call['event']}: post id — Codestar " . bfields_show($csf_call['post_id']) . ', bfields ' . bfields_show($bf_call['post_id']) . ", expected {$post_id}");
		}
	}
}

$saved_post = $_POST;
$post_id    = 0;

try {
	// ---- Options ------------------------------------------------------------

	$a = '_bfields_test_parity_csf_';
	$b = '_bfields_test_parity_bf_';

	delete_option($a);
	delete_option($b);
	update_option($a, $stored_before, false);
	update_option($b, $stored_before, false);

	$csf_log = array();
	bfields_test_record($a, $csf_log);

	$_POST = array(
		'csf_options_nonce' . $a => wp_create_nonce('csf_options_nonce'),
		$a                       => wp_slash($posted),
	);
	$csf = new CSF_Options($a, array('args' => array('save_defaults' => false), 'sections' => array($csf_section)));
	$_POST = $saved_post;

	Codestar::createOptions($b, array('save_defaults' => false));
	Codestar::createSection($b, $section);

	$bf_log = array();
	bfields_test_record($b, $bf_log);

	$storage = new Option($b);
	$storage->save($posted, Registry::instance()->schema($b));

	bfields_test_compare('options', get_option($a), get_option($b), (array) $csf->errors, $storage->errors(), $csf_log, $bf_log, $csf_section, $report);

	delete_option($a);
	delete_option($b);

	// ---- Meta box -----------------------------------------------------------

	if (!$with_metabox) {
		$report->note('SKIPPED: meta-box parity (Codestar free has no CSF_Metabox)');
	} else {

		$c = '_bfields_test_parity_mb_csf_';
		$d = '_bfields_test_parity_mb_bf_';

		$post_id = (int) wp_insert_post(array(
			'post_type'   => 'post',
			'post_status' => 'draft',
			'post_title'  => 'bfields save-parity scratch (safe to delete)',
		));

		update_post_meta($post_id, $c, wp_slash($stored_before));
		update_post_meta($post_id, $d, wp_slash($stored_before));

		$csf_mb  = new CSF_Metabox($c, array('args' => array('post_type' => 'post'), 'sections' => array($csf_section)));
		$csf_log = array();
		bfields_test_record($c, $csf_log);

		$_POST = array(
			'csf_metabox_nonce' . $c => wp_create_nonce('csf_metabox_nonce'),
			$c                       => wp_slash($posted),
		);
		// wp-admin/post.php sets the global post before save_post fires, and
		// Codestar's failed-validation path reads the old value through it
		// (get_meta_value()). Without it, Codestar would store '' instead.
		$saved_global_post = isset($GLOBALS['post']) ? $GLOBALS['post'] : null;
		$GLOBALS['post']   = get_post($post_id);
		$csf_mb->save_meta_box($post_id);
		$GLOBALS['post'] = $saved_global_post;
		$_POST = $saved_post;

		// Codestar keeps a meta box's validation errors in post meta.
		$csf_mb_errors = get_post_meta($post_id, '_csf_errors_' . $c, true);
		$csf_mb_errors = is_array($csf_mb_errors) && isset($csf_mb_errors['fields']) ? $csf_mb_errors['fields'] : array();

		Codestar::createMetabox($d, array('post_type' => 'post', 'render' => false));
		Codestar::createSection($d, $section);

		$bf_log = array();
		bfields_test_record($d, $bf_log);

		$meta = new PostMeta($post_id, $d);
		$meta->save($posted, Registry::instance()->schema($d));

		bfields_test_compare('metabox', get_post_meta($post_id, $c, true), get_post_meta($post_id, $d, true), $csf_mb_errors, $meta->errors(), $csf_log, $bf_log, $csf_section, $report, $post_id);
	}
} finally {
	$_POST = $saved_post;
	if ($post_id) {
		wp_delete_post($post_id, true);
	}
}

$report->require_nonzero('options: fields compared');
$report->require_nonzero('options: hook calls compared');
if ($with_metabox) {
	$report->require_nonzero('metabox: fields compared');
	$report->require_nonzero('metabox: hook calls compared');
}

$report->finish('Codestar and bfields store the same bytes and fire the same hooks, in the same order, with the same arguments.');
