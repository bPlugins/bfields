<?php
/**
 * bfields — screen registry.
 *
 * Hosts register screens here (directly, or through \BFields\Compat\Codestar
 * when they are still authoring Codestar arrays). Nothing is normalised at
 * registration time: 3D Viewer's field set is decided per request — the public
 * `3dviewer_product_attributes` filter, licence gating, and 15 callback/content
 * closures (4.0) — so the schema is built when it is first needed and cached
 * for the rest of the request only.
 *
 * @package BFields
 */

namespace BFields;

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Holds every registered screen and builds its schema on demand.
 */
final class Registry
{
	/** @var Registry|null */
	private static $instance = null;

	/**
	 * unique => ['kind' => …, 'args' => …, 'sections' => […]]
	 *
	 * @var array<string, array>
	 */
	private $screens = array();

	/**
	 * Per-request schema cache, keyed by unique.
	 *
	 * @var array<string, array>
	 */
	private $schemas = array();

	public static function instance(): Registry
	{
		if (self::$instance === null) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Wire the spine's hooks.
	 */
	public function register(): void
	{
		// Late on init: hosts register their fields on `init` priority 0
		// (Settings::register()), so seeding has to run after them. Codestar
		// seeds on init too, and Product.php reads seeded values on the
		// frontend, so this cannot move to an admin-only hook (7.5).
		add_action('init', array($this, 'seed_defaults'), 99);

		add_action('admin_menu', array($this, 'register_menus'));
		add_action('rest_api_init', array($this, 'register_routes'));

		Metabox::instance()->register();
	}

	/**
	 * Register an options page.
	 */
	public function options(string $unique, array $args = array()): void
	{
		$this->screens[$unique] = array(
			'kind'     => 'options',
			'args'     => $args,
			'sections' => isset($this->screens[$unique]['sections']) ? $this->screens[$unique]['sections'] : array(),
		);

		unset($this->schemas[$unique]);

		$this->refuse_unsupported($unique);
	}

	/**
	 * Register a meta box.
	 */
	public function metabox(string $unique, array $args = array()): void
	{
		$this->screens[$unique] = array(
			'kind'     => 'metabox',
			'args'     => $args,
			'sections' => isset($this->screens[$unique]['sections']) ? $this->screens[$unique]['sections'] : array(),
		);

		unset($this->schemas[$unique]);

		$this->refuse_unsupported($unique);
	}

	/**
	 * Why this screen's storage cannot be handled, or '' when it can.
	 *
	 * v1 implements Codestar's default storage only: one serialized row in
	 * wp_options, or one serialized post-meta row. Codestar's `database`
	 * (transient / theme_mod / network) and a meta box's `data_type =>
	 * unserialize` would otherwise be written to the wrong place without a
	 * word (review 5).
	 */
	public function unsupported(string $unique): string
	{
		if (!isset($this->screens[$unique])) {
			return '';
		}

		$screen = $this->screens[$unique];
		$args   = $screen['args'];

		if ('options' === $screen['kind'] && !empty($args['database'])) {
			/* translators: %s: Codestar `database` value. */
			return sprintf(__('bfields does not implement the "%s" database option. Keep this screen on Codestar.', 'bfields'), (string) $args['database']);
		}

		if ('metabox' === $screen['kind'] && isset($args['data_type']) && 'serialize' !== $args['data_type']) {
			/* translators: %s: Codestar `data_type` value. */
			return sprintf(__('bfields does not implement data_type "%s" for meta boxes. Keep this screen on Codestar.', 'bfields'), (string) $args['data_type']);
		}

		return '';
	}

	/**
	 * Say so, loudly, when a screen is registered with storage bfields lacks.
	 */
	private function refuse_unsupported(string $unique): void
	{
		$reason = $this->unsupported($unique);

		if ('' !== $reason) {
			_doing_it_wrong(__CLASS__ . '::register', esc_html($reason), '1.0.0');
		}
	}

	/**
	 * Append a section to a screen.
	 *
	 * Sections may be registered before the screen itself (Codestar allows it,
	 * and AnalyticsPro::settingsSection() relies on ordering), so a placeholder
	 * screen is created rather than dropping the section.
	 */
	public function section(string $unique, array $section): void
	{
		if (!isset($this->screens[$unique])) {
			$this->screens[$unique] = array('kind' => 'options', 'args' => array(), 'sections' => array());
		}

		$this->screens[$unique]['sections'][] = $section;

		unset($this->schemas[$unique]);
	}

	/**
	 * Is this key registered with bfields?
	 */
	public function has(string $unique): bool
	{
		return isset($this->screens[$unique]);
	}

	/**
	 * Every registered key.
	 *
	 * @return string[]
	 */
	public function keys(): array
	{
		return array_keys($this->screens);
	}

	/**
	 * Raw registration record for a key.
	 */
	public function screen(string $unique): ?array
	{
		return isset($this->screens[$unique]) ? $this->screens[$unique] : null;
	}

	/**
	 * The normalised schema for a key, built once per request.
	 */
	public function schema(string $unique): ?array
	{
		if (!isset($this->screens[$unique])) {
			return null;
		}

		if (!isset($this->schemas[$unique])) {
			$screen = $this->screens[$unique];

			$this->schemas[$unique] = Schema::build(
				$unique,
				$screen['kind'],
				$screen['args'],
				$screen['sections']
			);
		}

		return $this->schemas[$unique];
	}

	/**
	 * Seed defaults for every options screen that asked for it.
	 */
	public function seed_defaults(): void
	{
		foreach ($this->screens as $unique => $screen) {
			if ('options' !== $screen['kind'] || '' !== $this->unsupported($unique)) {
				continue;
			}

			// Cheap checks first. This runs on every request, frontend
			// included, and building the schema runs every callback/content
			// closure (review 6); an already-seeded row never needs it.
			if (isset($screen['args']['save_defaults']) && !$screen['args']['save_defaults']) {
				continue;
			}

			if (!empty(get_option($unique))) {
				continue;
			}

			$schema = $this->schema($unique);

			if ($schema) {
				(new Storage\Option($unique))->seed($schema);
			}
		}
	}

	/**
	 * Add the admin menu entry for every options screen.
	 */
	public function register_menus(): void
	{
		foreach ($this->screens as $unique => $screen) {
			if ('options' === $screen['kind']) {
				OptionsPage::for_key($unique)->add_menu();
			}
		}
	}

	/**
	 * Register the REST save route.
	 */
	public function register_routes(): void
	{
		OptionsPage::register_rest_routes();
		Choices::register_rest_routes();
	}
}
