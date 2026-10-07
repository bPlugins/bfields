<?php
/**
 * bfields — options page: menu, mount node, REST save.
 *
 * Part of the PHP spine (4.0). The page itself renders one mount node (and a
 * fallback notice inside it); the React body does the rest. The two things that cannot leave PHP are here: the menu
 * (no JS runs before the screen exists) and the save endpoint's capability +
 * nonce check.
 *
 * @package BFields
 */

namespace BFields;

use BFields\Storage\Option;
use BFields\Storage\Values;

if (!defined('ABSPATH')) {
	exit;
}

/**
 * One registered options screen.
 */
final class OptionsPage
{
	const REST_NAMESPACE = 'bfields/v1';

	/** @var array<string, OptionsPage> */
	private static $pages = array();

	/** @var string */
	private $unique;

	/** @var string */
	private $hook = '';

	private function __construct(string $unique)
	{
		$this->unique = $unique;
	}

	/**
	 * Get (or create) the page object for a key.
	 */
	public static function for_key(string $unique): OptionsPage
	{
		if (!isset(self::$pages[$unique])) {
			self::$pages[$unique] = new self($unique);
		}

		return self::$pages[$unique];
	}

	/**
	 * Register the menu entry, honouring CSF's menu_type/menu_parent args.
	 */
	public function add_menu(): void
	{
		// Raw args only. Building the schema here would run every callback and
		// content closure on every admin page, for a menu label (review 6).
		$screen = Registry::instance()->screen($this->unique);

		if (!$screen) {
			return;
		}

		$args = $screen['args'];

		$title      = isset($args['menu_title'])
			? (string) $args['menu_title']
			: (isset($args['framework_title']) ? (string) $args['framework_title'] : '');
		$slug       = isset($args['menu_slug']) ? (string) $args['menu_slug'] : sanitize_title($this->unique);
		$capability = $this->capability();
		$type       = isset($args['menu_type']) ? (string) $args['menu_type'] : 'menu';
		$parent     = isset($args['menu_parent']) ? (string) $args['menu_parent'] : '';
		$icon       = isset($args['menu_icon']) ? (string) $args['menu_icon'] : '';
		$position   = isset($args['menu_position']) ? $args['menu_position'] : null;

		$render = array($this, 'render');

		if ('submenu' === $type && '' !== $parent) {
			$this->hook = (string) add_submenu_page($parent, $title, $title, $capability, $slug, $render, $position);
		} else {
			$this->hook = (string) add_menu_page($title, $title, $capability, $slug, $render, $icon, $position);
		}

		if ('' !== $this->hook) {
			add_action('load-' . $this->hook, array($this, 'on_load'));
		}
	}

	/**
	 * Enqueue the UI for this screen only.
	 */
	public function on_load(): void
	{
		Assets::instance()->enqueue_for($this->unique);

		// `load-{hook}` fires only on this screen, so the class does too.
		add_filter('admin_body_class', array($this, 'body_class'));
	}

	/**
	 * Mark the screen as a bfields screen, so its page background can match
	 * the app (theme/base.css, "The page around a bfields screen").
	 *
	 * Spaces on BOTH sides: admin_body_class is a plain string, and filters
	 * that run later append without a leading space (Tutor LMS does), which
	 * would glue their class onto this one.
	 *
	 * @param string $classes Space-separated body classes.
	 */
	public function body_class(string $classes): string
	{
		return $classes . ' bfields-screen ';
	}

	/**
	 * The mount node, with the fallback notice the bundle removes on mount
	 * (see Mount).
	 */
	public function render(): void
	{
		$schema = Registry::instance()->schema($this->unique);

		if (!$schema) {
			return;
		}

		$capability = $this->capability();

		if (!current_user_can($capability)) {
			wp_die(esc_html__('You do not have permission to edit these settings.', 'bfields'));
		}

		Mount::render($this->unique, 'options', $schema);
	}

	/**
	 * The capability required to view and save this screen.
	 */
	public function capability(): string
	{
		$screen = Registry::instance()->screen($this->unique);

		$capability = 'manage_options';

		if ($screen && !empty($screen['args']['menu_capability'])) {
			$capability = (string) $screen['args']['menu_capability'];
		}

		return $capability;
	}

	/**
	 * Register POST /bfields/v1/options/<unique>.
	 */
	public static function register_rest_routes(): void
	{
		register_rest_route(
			self::REST_NAMESPACE,
			'/options/(?P<unique>[A-Za-z0-9_\-]+)',
			array(
				'methods'             => 'POST',
				'callback'            => array(__CLASS__, 'handle_save'),
				'permission_callback' => array(__CLASS__, 'can_save'),
				'args'                => array(
					'unique' => array(
						'type'     => 'string',
						'required' => true,
					),
				),
			)
		);
	}

	/**
	 * Capability check for the save route.
	 *
	 * The capability comes from the screen's own registration, so a host that
	 * registers a page under a narrower capability gets that capability
	 * enforced on save too. An unregistered key is refused outright.
	 */
	public static function can_save(\WP_REST_Request $request)
	{
		$unique = (string) $request['unique'];

		$screen = Registry::instance()->screen($unique);

		// Options screens only. A meta-box key is saved with its post, and
		// accepting it here would write a wp_option named `_bp3dimages_`.
		if (!$screen || 'options' !== $screen['kind']) {
			return new \WP_Error('bfields_unknown_screen', __('Unknown settings screen.', 'bfields'), array('status' => 404));
		}

		// A `database` mode bfields does not implement (transient, network…)
		// must not be quietly written to wp_options instead.
		if ('' !== Registry::instance()->unsupported($unique)) {
			return new \WP_Error('bfields_unsupported_storage', Registry::instance()->unsupported($unique), array('status' => 501));
		}

		if (!current_user_can(self::for_key($unique)->capability())) {
			return new \WP_Error('bfields_forbidden', __('You do not have permission to save these settings.', 'bfields'), array('status' => 403));
		}

		return true;
	}

	/**
	 * Save handler.
	 *
	 * Payload: { schema: 1, action: 'save'|'reset_section'|'reset_all',
	 *            section: id, values: {field_id: value} }
	 *
	 * The response is the stored array, hydrated, which the store adopts as its
	 * new baseline. A failure returns an error and writes nothing, so the
	 * user's edits survive a lapsed nonce or a dropped connection (4.4).
	 */
	public static function handle_save(\WP_REST_Request $request)
	{
		$unique = (string) $request['unique'];
		$schema = Registry::instance()->schema($unique);

		if (!$schema) {
			return new \WP_Error('bfields_unknown_screen', __('Unknown settings screen.', 'bfields'), array('status' => 404));
		}

		$payload = $request->get_json_params();

		if (!is_array($payload)) {
			return new \WP_Error('bfields_bad_payload', __('Malformed request.', 'bfields'), array('status' => 400));
		}

		// The wire format is versioned and must match exactly; a newer UI
		// talking to an older spine is a bug, not something to guess through.
		$sent = isset($payload['schema']) ? (int) $payload['schema'] : 0;

		if ($sent !== Loader::SCHEMA) {
			return new \WP_Error(
				'bfields_schema_mismatch',
				__('This page is out of date. Reload and try again.', 'bfields'),
				array('status' => 409)
			);
		}

		$action  = isset($payload['action']) ? (string) $payload['action'] : 'save';
		$storage = new Option($unique);

		switch ($action) {
			case 'reset_all':
				if (empty($schema['args']['showResetAll'])) {
					return new \WP_Error('bfields_forbidden', __('Reset is not available on this screen.', 'bfields'), array('status' => 403));
				}
				$values = $storage->reset_all($schema);
				break;

			case 'reset_section':
				if (empty($schema['args']['showResetSection'])) {
					return new \WP_Error('bfields_forbidden', __('Reset is not available on this screen.', 'bfields'), array('status' => 403));
				}
				$section = isset($payload['section']) ? sanitize_key($payload['section']) : '';
				$values  = $storage->reset_section($section, $schema);
				break;

			case 'save':
			default:
				// Absent payload is a no-op, never a delete (7.4). A bundle that
				// failed halfway must not be able to blank a settings page.
				if (!isset($payload['values']) || !is_array($payload['values']) || array() === $payload['values']) {
					return new \WP_Error('bfields_empty_payload', __('Nothing to save.', 'bfields'), array('status' => 400));
				}
				$values = $storage->save($payload['values'], $schema);
				break;
		}

		return rest_ensure_response(array(
			'schema'     => Loader::SCHEMA,
			'values'     => $values,
			'undeclared' => Values::undeclared($storage->read(), $schema),
			// field id => message, from `validate` callbacks. Those fields kept
			// their stored value; everything else was saved (Codestar's rule).
			'errors'     => (object) $storage->errors(),
		));
	}
}
