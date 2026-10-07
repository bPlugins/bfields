<?php
/**
 * bfields — the choices route (php/includes/Choices.php).
 *
 * `'options' => 'posts'` selects (3D Viewer Pro's hotspot product picker) are
 * listed through GET /bfields/v1/choices/<unique>. What must hold:
 *
 *   1. A search returns what Codestar's field_data() would: published posts
 *      of the field's post type, as string ids with their titles.
 *   2. The field's authored `query_args` set the scope. A client cannot widen
 *      it: query_args it sends are ignored, and `include` ids outside the
 *      scope (a private post, another post type) resolve to nothing.
 *   3. Only a user who can save the screen may list it. An unknown field,
 *      a locked `pro` field and an unsupported source are refused.
 *   4. `query_args` never reach the browser (Schema::for_client()).
 *   5. A refused user never builds the schema (it runs every `content` and
 *      `callback` closure on the screen).
 *   6. bfields_is_rest_request() matches bfields' routes by exact key.
 *   7. A post option carries `thumbnail` (URL or ''); a WooCommerce product
 *      also carries `price` as plain text. A refused request queries nothing.
 *
 *   bin/test.sh runs it. Scratch screens, posts and a user; all removed.
 */

if (!defined('ABSPATH')) {
	exit;
}

require_once (rtrim((string) (getenv('BFIELDS_ROOT') ?: WP_PLUGIN_DIR . '/bfields'), '/')) . '/tests/php/lib.php';

use BFields\Compat\Codestar;
use BFields\Registry;
use BFields\Schema;

$report = new BFields_Report('bfields choices route');

if (!current_user_can('manage_options')) {
	$report->fail('Run as an administrator: --user=<admin> (bin/test.sh does).');
	$report->finish('');
}

$box = '_bfields_test_choices_';
$page_key = '_bfields_test_choices_opts_';

Codestar::createMetabox($box, array('post_type' => 'post', 'render' => false));
Codestar::createSection($box, array('title' => 'Choices', 'fields' => array(
	// Inside a field_group: the route must still find it (it stays a top-level field).
	array('id' => 'pick_group', 'type' => 'field_group', 'title' => 'Picks', 'fields' => array(
		array('id' => 'pick', 'type' => 'select', 'options' => 'posts', 'chosen' => true, 'ajax' => true, 'query_args' => array('post_type' => 'page')),
	)),
	array('id' => 'locked', 'type' => 'select', 'options' => 'posts', 'pro' => true),
	array('id' => 'who', 'type' => 'select', 'options' => 'users'),
	array('id' => 'rows', 'type' => 'group', 'fields' => array(
		array('id' => 'cat', 'type' => 'select', 'options' => 'categories'),
	)),
)));
// Registered only to be refused: nothing may build its schema.
$cold  = '_bfields_test_choices_cold_';
$built = 0;
Codestar::createMetabox($cold, array('post_type' => 'post', 'render' => false));
Codestar::createSection($cold, array('title' => 'Cold', 'fields' => array(
	array('type' => 'content', 'title' => 'Built', 'content' => static function () use (&$built) {
		$built++;
		return '';
	}),
	array('id' => 'pick', 'type' => 'select', 'options' => 'posts'),
)));
Codestar::createOptions($page_key, array('menu_capability' => 'manage_options', 'render' => false));
Codestar::createSection($page_key, array('title' => 'Choices', 'fields' => array(
	array('id' => 'any_post', 'type' => 'select', 'options' => 'posts'),
	array('id' => 'any_product', 'type' => 'select', 'options' => 'posts', 'query_args' => array('post_type' => 'product')),
)));
$woo = function_exists('wc_get_product') && post_type_exists('product');

$marker = 'bfieldschoicestest' . wp_rand(1000, 9999);
$ids    = array();
$make   = static function (string $type, string $status, string $title) use (&$ids): int {
	$id    = (int) wp_insert_post(array('post_type' => $type, 'post_status' => $status, 'post_title' => $title));
	$ids[] = $id;
	return $id;
};

$user = 0;

/**
 * GET the route and return [status, data].
 */
function bfields_test_choices(string $unique, array $params): array
{
	$request = new WP_REST_Request('GET', '/bfields/v1/choices/' . $unique);
	foreach ($params as $key => $value) {
		$request->set_param($key, $value);
	}
	$response = rest_do_request($request);

	return array($response->get_status(), $response->get_data());
}

function bfields_test_values(array $data): array
{
	return isset($data['options']) ? array_column($data['options'], 'value') : array();
}

try {
	$page_pub  = $make('page', 'publish', "{$marker} Published page");
	$page_priv = $make('page', 'private', "{$marker} Private page");
	$post_pub  = $make('post', 'publish', "{$marker} Published post");

	// 1 + 2. Scope comes from the field's query_args (pages), not the source name.
	list($status, $data) = bfields_test_choices($box, array('field' => 'pick', 'term' => $marker));
	$report->count('requests');

	if (200 !== $status) {
		$report->fail("search: HTTP {$status} " . bfields_show($data));
	} elseif (array((string) $page_pub) !== bfields_test_values($data)) {
		$report->fail('search: expected only the published page, got ' . bfields_show($data));
	} elseif ("{$marker} Published page" !== $data['options'][0]['label']) {
		$report->fail('search: label is not the post title: ' . bfields_show($data));
	}

	// A client-sent query_args is not a parameter of this route at all.
	list($status, $data) = bfields_test_choices($box, array('field' => 'pick', 'term' => $marker, 'query_args' => array('post_type' => 'post', 'post_status' => 'any')));
	$report->count('requests');
	if (array((string) $page_pub) !== bfields_test_values($data)) {
		$report->fail('search: client query_args widened the scope: ' . bfields_show($data));
	}

	// `include` resolves stored ids, through the same scope.
	list($status, $data) = bfields_test_choices($box, array('field' => 'pick', 'include' => "{$page_pub},{$page_priv},{$post_pub}"));
	$report->count('requests');
	if (array((string) $page_pub) !== bfields_test_values($data)) {
		$report->fail('include: an id outside the field scope was resolved (private page or another post type): ' . bfields_show($data));
	}

	// A sub-field inside a group row is found too; terms work.
	list($status, $data) = bfields_test_choices($box, array('field' => 'cat', 'include' => (string) get_option('default_category')));
	$report->count('requests');
	if (200 !== $status || array((string) get_option('default_category')) !== bfields_test_values($data)) {
		$report->fail("group sub-field / categories: HTTP {$status} " . bfields_show($data));
	}

	// Options screens use the page's own capability.
	list($status, $data) = bfields_test_choices($page_key, array('field' => 'any_post', 'term' => $marker));
	$report->count('requests');
	if (200 !== $status || array((string) $post_pub) !== bfields_test_values($data)) {
		$report->fail("options screen: HTTP {$status} " . bfields_show($data));
	}

	// 7. Thumbnail and price.
	list($status, $data) = bfields_test_choices($box, array('field' => 'pick', 'term' => $marker));
	$report->count('media checks');
	if (!isset($data['options'][0]) || '' !== ($data['options'][0]['thumbnail'] ?? null) || array_key_exists('price', $data['options'][0])) {
		$report->fail("thumbnail: a page without one must send thumbnail '' and no price: " . bfields_show($data));
	}

	$image = (int) wp_insert_attachment(array('post_title' => "{$marker} image", 'post_mime_type' => 'image/jpeg', 'post_status' => 'inherit'), false, 0);
	$ids[] = $image;
	update_post_meta($image, '_wp_attached_file', "bfields-test/{$marker}.jpg");
	update_post_meta($page_pub, '_thumbnail_id', $image);
	list($status, $data) = bfields_test_choices($box, array('field' => 'pick', 'include' => (string) $page_pub));
	$report->count('media checks');
	if (false === strpos((string) ($data['options'][0]['thumbnail'] ?? ''), "bfields-test/{$marker}.jpg")) {
		$report->fail('thumbnail: expected the featured image URL: ' . bfields_show($data));
	}

	if ($woo) {
		$product = $make('product', 'publish', "{$marker} Chair");
		update_post_meta($product, '_regular_price', '12.5');
		update_post_meta($product, '_price', '12.5');
		wc_delete_product_transients($product);
		list($status, $data) = bfields_test_choices($page_key, array('field' => 'any_product', 'term' => $marker));
		$report->count('media checks');
		$price = (string) ($data['options'][0]['price'] ?? '');
		if (200 !== $status || false === strpos($price, '12') || $price !== wp_strip_all_tags($price) || false !== strpos($price, '&') || false !== strpos($price, 'price')) {
			$report->fail('price: expected the plain-text price of the product: ' . bfields_show($data));
		}

		$sale = $make('product', 'publish', "{$marker} Sofa");
		update_post_meta($sale, '_regular_price', '100');
		update_post_meta($sale, '_sale_price', '90');
		update_post_meta($sale, '_price', '90');
		wc_delete_product_transients($sale);
		list($status, $data) = bfields_test_choices($page_key, array('field' => 'any_product', 'include' => (string) $sale));
		$report->count('media checks');
		$price    = (string) ($data['options'][0]['price'] ?? '');
		$expected = trim((string) preg_replace('/\s+/u', ' ', html_entity_decode(wp_strip_all_tags(wc_price(90)), ENT_QUOTES, 'UTF-8')));
		if (200 !== $status || $expected !== $price || false !== strpos($price, '100')) {
			$report->fail("price: a sale product must send only its sale price '{$expected}': " . bfields_show($data));
		}
	} else {
		$report->count('woo skipped');
	}

	// 3. Refusals.
	foreach (array(
		array($box, 'locked', 404, 'a locked pro field'),
		array($box, 'who', 404, 'an unsupported source (users)'),
		array($box, 'nope', 404, 'an unknown field'),
		array('_bfields_test_unregistered_', 'pick', 404, 'an unregistered screen'),
	) as list($unique, $field, $expected, $what)) {
		list($status) = bfields_test_choices($unique, array('field' => $field, 'term' => $marker));
		$report->count('requests');
		if ($expected !== $status) {
			$report->fail("refuse {$what}: expected HTTP {$expected}, got {$status}");
		}
	}

	$admin = get_current_user_id();
	$user  = (int) wp_insert_user(array('user_login' => $marker, 'user_pass' => wp_generate_password(), 'role' => 'subscriber'));
	$ran   = 0;
	$count = static function ($value) use (&$ran) {
		$ran++;
		return $value;
	};
	add_action('pre_get_posts', $count);
	add_filter('post_thumbnail_id', $count);
	add_filter('woocommerce_get_price_html', $count);
	wp_set_current_user($user);
	list($status) = bfields_test_choices($box, array('field' => 'pick', 'term' => $marker));
	list($status2) = bfields_test_choices($page_key, array('field' => 'any_post', 'term' => $marker));
	// Refused on the capability, before the field is looked up.
	list($status3) = bfields_test_choices($box, array('field' => 'nope', 'term' => $marker));
	list($status4) = bfields_test_choices($cold, array('field' => 'pick', 'term' => $marker));
	list($status5) = bfields_test_choices($page_key, array('field' => 'any_product', 'term' => $marker));
	wp_set_current_user($admin);
	remove_action('pre_get_posts', $count);
	remove_filter('post_thumbnail_id', $count);
	remove_filter('woocommerce_get_price_html', $count);
	$report->count('requests', 5);
	if (403 !== $status || 403 !== $status2 || 403 !== $status5) {
		$report->fail("a subscriber must be refused: got HTTP {$status} (meta box), {$status2} (options) and {$status5} (products)");
	}
	if (403 !== $status3 || 403 !== $status4) {
		$report->fail("a subscriber must be refused before the field is looked up: got HTTP {$status3} (unknown field) and {$status4} (cold screen)");
	}
	$report->count('schema checks');
	if (0 !== $built) {
		$report->fail("a refused request built the schema: the cold screen's content closure ran {$built} time(s)");
	}
	$report->count('schema checks');
	if (0 !== $ran) {
		$report->fail("a refused request ran a query, a thumbnail or a price lookup {$ran} time(s)");
	}

	// 4. The browser gets `searchable`, never the query.
	$client = Schema::for_client(Registry::instance()->schema($box));
	$pick   = $client['sections'][0]['fields'][0];
	$report->count('schema checks');
	if (array_key_exists('sourceArgs', $pick) || empty($pick['props']['searchable'])) {
		$report->fail('schema: expected props.searchable and no sourceArgs on the client field: ' . bfields_show($pick));
	}
	if (!empty($client['sections'][0]['fields'][2]['props']['searchable'])) {
		$report->fail('schema: an unsupported source (users) is marked searchable');
	}

	// 6. bfields_is_rest_request(), read from the URL.
	$saved_uri   = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : null;
	$saved_route = isset($_GET['rest_route']) ? $_GET['rest_route'] : null;
	$prefix      = '/' . trim(rest_get_url_prefix(), '/') . '/';
	unset($_GET['rest_route']);
	foreach (array(
		array("{$prefix}bfields/v1/choices/_my_meta_", '_my_meta_', true),
		array("/sub/dir{$prefix}bfields/v1/options/_my_meta_?x=1", '_my_meta_', true),
		array("{$prefix}bfields/v1/choices/_my_meta_", '', true),
		array("{$prefix}bfields/v1/choices/_my_meta_extra_", '_my_meta_', false),
		array("{$prefix}bfields/v1/choices/_my_", '_my_meta_', false),
		array("{$prefix}other/v1/choices/_my_meta_", '_my_meta_', false),
		array('/wp-admin/post.php', '', false),
	) as list($uri, $key, $expected)) {
		$_SERVER['REQUEST_URI'] = $uri;
		$report->count('rest checks');
		if ($expected !== bfields_is_rest_request($key)) {
			$report->fail("bfields_is_rest_request('{$key}') for {$uri}: expected " . var_export($expected, true));
		}
	}
	$_SERVER['REQUEST_URI'] = '/index.php';
	$_GET['rest_route']     = '/bfields/v1/options/_my_meta_';
	$report->count('rest checks');
	if (!bfields_is_rest_request('_my_meta_')) {
		$report->fail('bfields_is_rest_request() missed ?rest_route=');
	}
	if (null === $saved_uri) {
		unset($_SERVER['REQUEST_URI']);
	} else {
		$_SERVER['REQUEST_URI'] = $saved_uri;
	}
	if (null === $saved_route) {
		unset($_GET['rest_route']);
	} else {
		$_GET['rest_route'] = $saved_route;
	}
} finally {
	foreach ($ids as $id) {
		wp_delete_post($id, true);
	}
	if ($user) {
		require_once ABSPATH . 'wp-admin/includes/user.php';
		wp_delete_user($user);
	}
}

$report->require_nonzero('requests');

$report->finish('option sources list what Codestar would, inside the field\'s own scope, for users who can save the screen only.');
