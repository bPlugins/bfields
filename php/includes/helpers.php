<?php
/**
 * bfields — reader helpers.
 *
 * Both return the RAW stored value with no casting (4.3). That is deliberate:
 * 3D Viewer's Utils::getSettings()/getPostMeta() closures are the single source
 * of interpretation for booleans and defaults, and a helper that quietly cast
 * '0' to false would give the plugin two different answers for one key.
 *
 * @package BFields
 */

if (!defined('ABSPATH')) {
	exit;
}

if (!function_exists('bfields_get_option')) {
	/**
	 * Read one field out of an options screen's row.
	 *
	 * @param string $unique  Storage key.
	 * @param string $field   Field id. Omit for the whole array.
	 * @param mixed  $default Returned when the key is absent.
	 * @return mixed Raw stored value.
	 */
	function bfields_get_option($unique, $field = '', $default = null)
	{
		$data = get_option($unique, array());

		if (!is_array($data)) {
			return $default;
		}

		if ('' === $field) {
			return $data;
		}

		return array_key_exists($field, $data) ? $data[$field] : $default;
	}
}

if (!function_exists('bfields_get_meta')) {
	/**
	 * Read one field out of a post's meta row.
	 *
	 * @param int    $post_id Post id.
	 * @param string $unique  Storage key.
	 * @param string $field   Field id. Omit for the whole array.
	 * @param mixed  $default Returned when the key is absent.
	 * @return mixed Raw stored value.
	 */
	function bfields_get_meta($post_id, $unique, $field = '', $default = null)
	{
		$data = get_post_meta((int) $post_id, $unique, true);

		if (!is_array($data)) {
			return $default;
		}

		if ('' === $field) {
			return $data;
		}

		return array_key_exists($field, $data) ? $data[$field] : $default;
	}
}

if (!function_exists('bfields_is_rest_request')) {
	/**
	 * Is this request one of bfields' REST routes, optionally for one screen?
	 *
	 * bfields' routes (`bfields/v1/options/<unique>`, the options page's save,
	 * and `bfields/v1/choices/<unique>`, a searchable select's option search)
	 * find the field on the REGISTERED screen. A host that registers its meta
	 * boxes or options page only in wp-admin (`is_admin()`, a post edit
	 * request) has no screen in these requests, and they answer 404. Register
	 * the screen when this is true as well:
	 *
	 *     if (is_admin() || bfields_is_rest_request('_my_meta_')) { ... }
	 *
	 * Read from the URL, because hosts register on `init` or earlier, before
	 * WordPress parses the REST route. It only lets the screen exist: every
	 * route still checks the screen's own capability.
	 *
	 * @param string $unique Storage key. Omit to match any bfields route.
	 * @return bool
	 */
	function bfields_is_rest_request($unique = '')
	{
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- read-only routing check.
		if (isset($_GET['rest_route'])) {
			$route = is_string($_GET['rest_route']) ? (string) wp_unslash($_GET['rest_route']) : '';
		} elseif (isset($_SERVER['REQUEST_URI'])) {
			$path   = (string) wp_parse_url((string) wp_unslash($_SERVER['REQUEST_URI']), PHP_URL_PATH);
			$prefix = '/' . trim(rest_get_url_prefix(), '/') . '/';
			$at     = strpos($path, $prefix);
			$route  = false === $at ? '' : '/' . substr($path, $at + strlen($prefix));
		} else {
			$route = '';
		}
		// phpcs:enable

		$route = rawurldecode($route);

		if (!preg_match('#^/bfields/v1/(?:options|choices)/([A-Za-z0-9_\-]+)/?$#', $route, $match)) {
			return false;
		}

		return '' === (string) $unique || (string) $unique === $match[1];
	}
}

if (!function_exists('bfields_enqueue_notices')) {
	/**
	 * Draw this screen's admin notices as bfields' one-line bars
	 * (Assets::enqueue_notices()). For a host's own screens without a form.
	 */
	function bfields_enqueue_notices()
	{
		\BFields\Assets::instance()->enqueue_notices();
	}
}

if (!function_exists('bfields_unwrap_field_groups')) {
	/**
	 * Codestar has no `field_group`: a Classic fallback passes each section's fields through this first.
	 *
	 * @param array $fields Fields as authored.
	 * @return array
	 */
	function bfields_unwrap_field_groups(array $fields)
	{
		return \BFields\Schema::unwrap_groups($fields);
	}
}
