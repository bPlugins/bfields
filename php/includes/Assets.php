<?php
/**
 * bfields — asset registration and the PHP -> JS payload.
 *
 * Registered ONCE, by the copy that won arbitration, under the single handle
 * `bfields-ui` (4.7 invariant 5). Every host's schema mounts into that one
 * runtime, which is why no host may bundle the UI itself: N bundles would mean
 * N React roots and N window.bfields on one admin page (4.1).
 *
 * @package BFields
 */

namespace BFields;

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Registers and enqueues the one UI bundle.
 */
final class Assets
{
	const HANDLE = 'bfields-ui';

	/** The one-line notices on their own (build/notices.*), for host screens. */
	const NOTICES = 'bfields-notices';

	/** Inline-script JSON: a stored `</script>` or `<!--` cannot end the tag on WordPress before 7.0. */
	const JSON_FLAGS = JSON_HEX_TAG | JSON_HEX_AMP;

	/** @var Assets|null */
	private static $instance = null;

	/**
	 * Keys whose payload has already been printed this request.
	 *
	 * Two screens can share a page (an options screen plus a meta box), and the
	 * bundle must not be enqueued or localized twice.
	 *
	 * @var array<string, bool>
	 */
	private $localized = array();

	/** @var bool */
	private $registered = false;

	public static function instance(): Assets
	{
		if (self::$instance === null) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Hook registration into admin_enqueue_scripts.
	 */
	public function register(): void
	{
		add_action('admin_enqueue_scripts', array($this, 'register_assets'), 5);
	}

	/**
	 * Register (do not enqueue) the script and styles.
	 *
	 * Priority 5 so anything enqueuing at the default 10 can declare a
	 * dependency on `bfields-ui`.
	 */
	public function register_assets(): void
	{
		if ($this->registered || wp_script_is(self::HANDLE, 'registered')) {
			return;
		}

		$this->registered = true;

		$asset_file = BFIELDS_PATH . 'build/index.asset.php';

		// @wordpress/scripts emits the dependency list, which is how react and
		// react-dom resolve to wp.element rather than a second React in the
		// bundle (4.6). Two Reacts on one admin page is the failure to avoid.
		$asset = is_readable($asset_file)
			? require $asset_file
			: array('dependencies' => array('wp-element', 'wp-i18n', 'wp-api-fetch'), 'version' => BFIELDS_VERSION);

		$this->register_jsx_runtime();

		wp_register_script(
			self::HANDLE,
			BFIELDS_URL . 'build/index.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_register_style(
			self::HANDLE,
			BFIELDS_URL . 'build/index.css',
			array(),
			$asset['version']
		);

		// The build emits index-rtl.css beside index.css; this is what makes
		// WordPress load it for RTL locales.
		wp_style_add_data(self::HANDLE, 'rtl', 'replace');

		$notices = BFIELDS_PATH . 'build/notices.asset.php';
		$notices = is_readable($notices) ? require $notices : array('dependencies' => array(), 'version' => BFIELDS_VERSION);

		wp_register_script(self::NOTICES, BFIELDS_URL . 'build/notices.js', $notices['dependencies'], $notices['version'], true);
		wp_register_style(self::NOTICES, BFIELDS_URL . 'build/notices.css', array(), $notices['version']);
		wp_style_add_data(self::NOTICES, 'rtl', 'replace');

		// The framework's own chrome strings. Host field labels stay in PHP and
		// travel in the schema payload, so they keep using each plugin's own
		// .pot and never depend on a JS catalogue (4.8).
		if (function_exists('wp_set_script_translations')) {
			wp_set_script_translations(self::HANDLE, 'bfields', BFIELDS_PATH . 'languages');
			wp_set_script_translations(self::NOTICES, 'bfields', BFIELDS_PATH . 'languages');
			add_filter('load_script_textdomain_relative_path', array($this, 'translation_path'), 10, 2);
		}
	}

	/**
	 * The catalogue is named for `build/index.js`; an embedded copy
	 * (lib/bfields/) would otherwise look for md5 of its own longer path.
	 *
	 * @param string|false $relative Script path relative to its plugin.
	 * @param string       $src      Script URL.
	 * @return string|false
	 */
	public function translation_path($relative, $src)
	{
		if (!is_string($src)) {
			return $relative;
		}

		$path = wp_parse_url($src, PHP_URL_PATH);

		// notices.js uses a subset of index.js's strings, so it shares that catalogue.
		foreach (array('build/index.js', 'build/notices.js') as $bundle) {
			if (wp_parse_url(BFIELDS_URL . $bundle, PHP_URL_PATH) === $path) {
				return 'build/index.js';
			}
		}

		return $relative;
	}

	/**
	 * Provide `react-jsx-runtime` where WordPress does not (before 6.6).
	 *
	 * @wordpress/scripts compiles JSX to the automatic runtime and lists the
	 * `react-jsx-runtime` handle as a dependency. WordPress registers that
	 * handle from 6.6; on 6.5 — the plugins' stated floor — a script with a
	 * missing dependency is never printed, and the screen is blank (review
	 * 3.4). The shim builds the same API on the `react` handle 6.5 does have:
	 * jsx()/jsxs() are createElement() with the props object as config, which
	 * is exactly what the automatic runtime compiles to.
	 */
	private function register_jsx_runtime(): void
	{
		if (wp_script_is('react-jsx-runtime', 'registered')) {
			return;
		}

		wp_register_script('react-jsx-runtime', false, array('react'), BFIELDS_VERSION, true);

		wp_add_inline_script(
			'react-jsx-runtime',
			'(function(R){if(window.ReactJSXRuntime||!R){return;}'
				. 'var has=Object.prototype.hasOwnProperty;'
				. 'function jsx(type,props,key){var config={},name;'
				. 'for(name in props){if(has.call(props,name)){config[name]=props[name];}}'
				. 'if(key!==undefined){config.key=key;}'
				. 'return R.createElement(type,config);}'
				. 'window.ReactJSXRuntime={jsx:jsx,jsxs:jsx,Fragment:R.Fragment};'
				. '})(window.React);'
		);
	}

	/**
	 * Enqueue the UI for one screen and hand it its payload.
	 *
	 * @param string   $unique  Storage key.
	 * @param int|null $post_id The post being edited, for a meta box.
	 */
	public function enqueue_for(string $unique, ?int $post_id = null): void
	{
		$this->register_assets();

		if (isset($this->localized[$unique])) {
			return;
		}

		$schema = Registry::instance()->schema($unique);

		if (!$schema) {
			return;
		}

		$this->localized[$unique] = true;

		wp_enqueue_script(self::HANDLE);
		wp_enqueue_style(self::HANDLE);

		// The media modal is not on every admin screen. Without it the Upload
		// button of an `upload`/`media` field does nothing (review 5).
		if (Schema::uses_types($schema, array('media', 'upload'))) {
			if (did_action('admin_enqueue_scripts')) {
				wp_enqueue_media();
			} else {
				add_action('admin_enqueue_scripts', static function () {
					wp_enqueue_media();
				});
			}
		}

		// CodeMirror for a `code_editor`; core returns false and enqueues
		// nothing when the user has syntax highlighting off (Code.tsx falls back).
		if (Schema::uses_types($schema, array('code_editor'))) {
			wp_enqueue_code_editor(array('type' => 'text/css'));
		}

		$storage = 'metabox' === $schema['kind']
			? new Storage\PostMeta((int) $post_id, $unique)
			: new Storage\Option($unique);
		$stored  = $storage->read();

		$payload = array(
			'schema'     => Schema::for_client($schema),
			'values'     => Storage\Values::hydrate($stored, $schema),
			'aliases'    => Schema::section_aliases($schema),
			'undeclared' => Storage\Values::undeclared($stored, $schema),
		);

		// One boot payload per screen, appended to the shared runtime. Each
		// screen registers itself; the bundle mounts every .bfields-root it
		// finds on the page.
		wp_add_inline_script(
			self::HANDLE,
			'window.bfieldsBoot = window.bfieldsBoot || {};'
				. 'window.bfieldsBoot[' . wp_json_encode($unique, self::JSON_FLAGS) . '] = ' . wp_json_encode($payload, self::JSON_FLAGS) . ';',
			'before'
		);

		$this->print_settings();
	}

	/**
	 * Draw the admin notices on the current screen as one-line bars, the way
	 * bfields screens draw them, on a host screen that has no bfields form.
	 *
	 * Call it no later than admin_enqueue_scripts: the body class is added on
	 * admin_body_class, which wp-admin prints after that.
	 */
	public function enqueue_notices(): void
	{
		$this->register_assets();

		wp_enqueue_style(self::NOTICES);
		wp_enqueue_script(self::NOTICES);

		if (!has_filter('admin_body_class', array($this, 'notices_body_class'))) {
			add_filter('admin_body_class', array($this, 'notices_body_class'));
		}
	}

	/**
	 * Spaces on both sides, as OptionsPage::body_class() explains.
	 *
	 * @param string $classes Space-separated body classes.
	 */
	public function notices_body_class($classes): string
	{
		return $classes . ' bfields-notices ';
	}

	/**
	 * Print the runtime settings every screen shares, once.
	 */
	private function print_settings(): void
	{
		static $printed = false;

		if ($printed) {
			return;
		}

		$printed = true;

		$settings = array(
			'schema'  => Loader::SCHEMA,
			'version' => BFIELDS_VERSION,
			'rest'    => esc_url_raw(rest_url(OptionsPage::REST_NAMESPACE)),
			'nonce'   => wp_create_nonce('wp_rest'),
			'assets'  => BFIELDS_URL,
			'locale'  => get_user_locale(),
			'rtl'     => is_rtl(),
		);

		wp_add_inline_script(
			self::HANDLE,
			'window.bfieldsSettings = ' . wp_json_encode($settings, self::JSON_FLAGS) . ';',
			'before'
		);
	}
}
