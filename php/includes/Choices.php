<?php
/**
 * bfields — option sources for choice fields (`'options' => 'posts'`).
 *
 * GET /bfields/v1/choices/<unique>?field=<id>&term=<text>
 * GET /bfields/v1/choices/<unique>?field=<id>&include=<id>,<id>
 *
 * Codestar resolves a string `options` with CSF_Fields::field_data() and, for
 * `ajax` selects, with `wp_ajax_csf-chosen`. That action takes `query_args`
 * from the browser and checks one global capability (`manage_options`, or
 * whatever csf_chosen_ajax_capability says). That is why 3D Viewer Pro's
 * HotspotFields::searchCapability() has to whitelist the posted query keys
 * before it widens the capability.
 *
 * Here the request names only a screen and a field. The query is that
 * field's own authored `query_args`, read on the server, so a client cannot
 * widen it. The capability is the one the screen needs to be saved. Whoever
 * may edit the field may list what it can hold, and nobody else may.
 *
 * Sources: posts, pages, categories, tags and menus, the ones field_data()
 * builds from WP_Query / WP_Term_Query, with the same defaults (published
 * posts, 25 results for a search). Any other source (users, roles, a
 * callback…) is not searchable, and the UI keeps the stored value read-only.
 *
 * @package BFields
 */

namespace BFields;

if (!defined('ABSPATH')) {
	exit;
}

/**
 * The choices REST route.
 */
final class Choices
{
	/** Codestar source name => [kind, post type or taxonomy]. */
	const SOURCES = array(
		'post'       => array('post', 'post'),
		'posts'      => array('post', 'post'),
		'page'       => array('post', 'page'),
		'pages'      => array('post', 'page'),
		'category'   => array('term', 'category'),
		'categories' => array('term', 'category'),
		'tag'        => array('term', 'post_tag'),
		'tags'       => array('term', 'post_tag'),
		'menu'       => array('term', 'nav_menu'),
		'menus'      => array('term', 'nav_menu'),
	);

	/** Codestar's page size for an ajax search. */
	const LIMIT = 25;

	/**
	 * Can bfields list this source?
	 */
	public static function supports(string $source): bool
	{
		return isset(self::SOURCES[$source]);
	}

	/**
	 * Register GET /bfields/v1/choices/<unique>.
	 */
	public static function register_rest_routes(): void
	{
		register_rest_route(
			OptionsPage::REST_NAMESPACE,
			'/choices/(?P<unique>[A-Za-z0-9_\-]+)',
			array(
				'methods'             => 'GET',
				'callback'            => array(__CLASS__, 'handle'),
				'permission_callback' => array(__CLASS__, 'can_list'),
				'args'                => array(
					'field'   => array(
						'type'     => 'string',
						'required' => true,
					),
					'term'    => array(
						'type'    => 'string',
						'default' => '',
					),
					'include' => array(
						'type'    => 'string',
						'default' => '',
					),
				),
			)
		);
	}

	/**
	 * Permission: the field exists on a registered screen, lists a supported
	 * source, is not a locked `pro` field, and the user can save that screen.
	 *
	 * The capability comes from the raw registration, so a refused request
	 * (a logged-out visitor, a subscriber) never builds the schema, which
	 * runs every `callback` and `content` closure on the screen. The schema
	 * is built for a refused user only when something filters
	 * bfields_choices_allowed, because that filter is given the field.
	 */
	public static function can_list(\WP_REST_Request $request)
	{
		$unique = (string) $request['unique'];
		$screen = Registry::instance()->screen($unique);

		if (!$screen) {
			return new \WP_Error('bfields_unknown_field', __('Unknown field.', 'bfields'), array('status' => 404));
		}

		if ('metabox' === $screen['kind']) {
			// The capability Metabox::save() asks for: authored, else the post type's own.
			$authored = !empty($screen['args']['menu_capability']) && is_string($screen['args']['menu_capability']);
			$allowed  = (!$authored || current_user_can($screen['args']['menu_capability'])) && self::can_edit_a_post_type($screen['args']);
		} else {
			$allowed = current_user_can(OptionsPage::for_key($unique)->capability());
		}

		$forbidden = new \WP_Error('bfields_forbidden', __('You do not have permission to do that.', 'bfields'), array('status' => 403));

		if (!$allowed && !has_filter('bfields_choices_allowed')) {
			return $forbidden;
		}

		$field = self::field($unique, (string) $request['field']);

		if (!$field) {
			return new \WP_Error('bfields_unknown_field', __('Unknown field.', 'bfields'), array('status' => 404));
		}

		/**
		 * Filter whether the current user may list a field's options.
		 *
		 * @param bool   $allowed Whether the user can save the field's screen.
		 * @param array  $field   Normalised schema field.
		 * @param string $unique  Storage key.
		 */
		if (!apply_filters('bfields_choices_allowed', $allowed, $field, $unique)) {
			return $forbidden;
		}

		return true;
	}

	/**
	 * List matches for `term`, or the labels of the `include`d values.
	 *
	 * Response: { options: [{ value: '12', label: 'Chair', thumbnail: '', price: '৳ 12.00' }, …] }.
	 * Values are strings, as Codestar's select posts and stores them. Posts add
	 * `thumbnail` (a URL or ''); WooCommerce products add `price` (plain text).
	 */
	public static function handle(\WP_REST_Request $request)
	{
		$field = self::field((string) $request['unique'], (string) $request['field']);

		if (!$field) {
			return new \WP_Error('bfields_unknown_field', __('Unknown field.', 'bfields'), array('status' => 404));
		}

		list($kind, $object) = self::SOURCES[$field['props']['optionsSource']];

		$args    = isset($field['sourceArgs']) && is_array($field['sourceArgs']) ? $field['sourceArgs'] : array();
		$term    = sanitize_text_field((string) $request['term']);
		$include = array_values(array_filter(array_map('absint', explode(',', (string) $request['include']))));

		if ('' === $term && array() === $include) {
			return rest_ensure_response(array('options' => array()));
		}

		// The field's args set the scope and the request only narrows it.
		// `include` names ids already stored, and they go through that same
		// query. Resolved bare, they would hand out the title of any post by
		// id, a private or draft one included.
		$in_key = 'post' === $kind ? 'post__in' : 'include';
		$vars   = wp_parse_args($args, 'post' === $kind
			? array('post_type' => $object, 'post_status' => 'publish')
			: array('taxonomy' => $object, 'hide_empty' => false));

		if (array() !== $include) {
			$include = isset($vars[$in_key]) && array() !== (array) $vars[$in_key]
				? array_values(array_intersect($include, array_map('absint', (array) $vars[$in_key])))
				: $include;

			if (array() === $include) {
				return rest_ensure_response(array('options' => array()));
			}

			$vars[$in_key] = $include;
		}

		$options = array();

		if ('post' === $kind) {
			$query = new \WP_Query(array_merge($vars, array(
				's'                   => array() === $include ? $term : '',
				'posts_per_page'      => array() === $include ? self::LIMIT : count($include),
				'ignore_sticky_posts' => true,
				'no_found_rows'       => true,
				'fields'              => 'all',
			)));

			foreach ($query->posts as $post) {
				$option = array(
					'value'     => (string) $post->ID,
					'label'     => $post->post_title,
					'thumbnail' => (string) get_the_post_thumbnail_url($post, 'thumbnail'),
				);

				if ('product' === $post->post_type && function_exists('wc_get_product')) {
					$option['price'] = self::price_text($post);
				}

				$options[] = $option;
			}
		} else {
			$query = new \WP_Term_Query(array_merge($vars, array(
				'search' => array() === $include ? $term : '',
				'number' => array() === $include ? self::LIMIT : count($include),
			)));

			foreach ((array) $query->terms as $item) {
				$options[] = array('value' => (string) $item->term_id, 'label' => $item->name);
			}
		}

		return rest_ensure_response(array('options' => $options));
	}

	/**
	 * A product's active price as plain text, entities decoded. Ranges (variable,
	 * grouped) keep the price HTML minus struck-out and screen-reader copy.
	 */
	private static function price_text(\WP_Post $post): string
	{
		$product = wc_get_product($post);

		if (!$product) {
			return '';
		}

		if (!$product->is_type(array('variable', 'grouped')) && '' !== (string) $product->get_price()) {
			$html = wc_price(wc_get_price_to_display($product));
		} else {
			$html = preg_replace(
				array('#<span[^>]*class="screen-reader-text"[^>]*>.*?</span>#s', '#<del\b[^>]*>.*?</del>#s'),
				'',
				(string) $product->get_price_html()
			);
		}

		return trim((string) preg_replace('/\s+/u', ' ', html_entity_decode(wp_strip_all_tags((string) $html), ENT_QUOTES, 'UTF-8')));
	}

	/**
	 * The searchable field `$id` on a screen, at any depth, or null.
	 *
	 * A field id is unique within its row, not across the screen, so the
	 * first match wins. Any field on the screen is one the user may edit.
	 */
	private static function field(string $unique, string $id): ?array
	{
		$schema = Registry::instance()->schema($unique);

		if (!$schema || '' === $id) {
			return null;
		}

		$find = static function (array $fields) use (&$find, $id): ?array {
			foreach ($fields as $field) {
				if ($id === $field['id'] && empty($field['pro']) && !empty($field['props']['optionsSource']) && self::supports($field['props']['optionsSource'])) {
					return $field;
				}
				if (!empty($field['fields'])) {
					$found = $find($field['fields']);
					if ($found) {
						return $found;
					}
				}
			}
			return null;
		};

		foreach ($schema['sections'] as $section) {
			$found = $find($section['fields']);
			if ($found) {
				return $found;
			}
		}

		return null;
	}

	/**
	 * Can the user edit posts of at least one post type the meta box is on?
	 */
	private static function can_edit_a_post_type(array $args): bool
	{
		$types = isset($args['post_type']) ? (array) $args['post_type'] : array('post');

		foreach ($types as $type) {
			$object = get_post_type_object((string) $type);
			if ($object && current_user_can($object->cap->edit_posts)) {
				return true;
			}
		}

		return false;
	}
}
