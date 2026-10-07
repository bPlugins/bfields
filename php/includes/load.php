<?php
/**
 * bfields — Layer 2: the winning copy's loader.
 *
 * Required exactly once, by bootstrap.php's arbitration, from the highest
 * version present on the site. Everything below therefore runs for one copy
 * only: one set of classes, one asset registration, one window.bfields.
 *
 * @package BFields
 */

namespace BFields;

if (!defined('ABSPATH')) {
	exit;
}

// Re-entry guard.
//
// NOT class_exists('BFields\\Loader', false): PHP hoists an unconditional,
// non-extending class declaration at COMPILE time, so BFields\\Loader already
// exists by the time a statement in this very file could test for it — the
// guard would fire on the first load and this file would never boot anything.
// (Invariant 5's class_exists(..., false) rule is about guards in OTHER files
// asking whether a class is available; it cannot guard the file that declares
// the class.) A plain global sentinel is evaluated in statement order and has
// neither problem.
if (isset($GLOBALS['bfields_loaded_from'])) {
	return;
}

$GLOBALS['bfields_loaded_from'] = __FILE__;

/**
 * Boots the winning copy: constants, autoloader, hooks, core services.
 */
final class Loader
{
	/**
	 * Version of the copy that won arbitration.
	 *
	 * Kept in sync with $bfields_this_version in bootstrap.php.
	 */
	const VERSION = '1.1.0';

	/**
	 * The bfields JSON schema version. The PHP<->JS wire format is the API
	 * (plan 4.0); bump only for additive changes, never break it.
	 */
	const SCHEMA = 1;

	/** @var Loader|null */
	private static $instance = null;

	/**
	 * Boot once and return the singleton.
	 */
	public static function boot(): Loader
	{
		if (self::$instance === null) {
			self::$instance = new self();
			self::$instance->run();
		}

		return self::$instance;
	}

	/**
	 * Define constants, register the autoloader and start core services.
	 */
	private function run(): void
	{
		// Only the winner defines these (invariant 3).
		if (!defined('BFIELDS_VERSION')) {
			define('BFIELDS_VERSION', self::VERSION);
		}
		if (!defined('BFIELDS_PATH')) {
			// .../lib/bfields/ — the package root, one level above php/.
			define('BFIELDS_PATH', dirname(__DIR__, 2) . '/');
		}
		if (!defined('BFIELDS_URL')) {
			define('BFIELDS_URL', self::url(BFIELDS_PATH));
		}
		if (!defined('BFIELDS_SCHEMA')) {
			define('BFIELDS_SCHEMA', self::SCHEMA);
		}

		$this->autoload();

		require_once BFIELDS_PATH . 'php/includes/hooks.php';
		require_once BFIELDS_PATH . 'php/includes/helpers.php';
		require_once BFIELDS_PATH . 'php/compat/Codestar.php';

		// The framework's PHP strings (OptionsPage, Mount, the compat layer).
		// Before `init` 0, where hosts register their screens.
		add_action('init', static function () {
			load_textdomain('bfields', BFIELDS_PATH . 'languages/bfields-' . determine_locale() . '.mo');
		}, -10);

		Assets::instance()->register();
		Registry::instance()->register();
	}

	/**
	 * PSR-4 autoloader for BFields\ → php/includes, BFields\Compat\ → php/compat.
	 *
	 * Deliberately not Composer's: hosts unzip dist/bfields.zip into lib/bfields/
	 * and never run `composer install` (plan 4.1).
	 */
	private function autoload(): void
	{
		spl_autoload_register(static function ($class) {
			if (strpos($class, 'BFields\\') !== 0) {
				return;
			}

			$relative = substr($class, strlen('BFields\\'));

			if (strpos($relative, 'Compat\\') === 0) {
				$file = BFIELDS_PATH . 'php/compat/' . str_replace('\\', '/', substr($relative, strlen('Compat\\'))) . '.php';
			} else {
				$file = BFIELDS_PATH . 'php/includes/' . str_replace('\\', '/', $relative) . '.php';
			}

			if (is_readable($file)) {
				require_once $file;
			}
		});
	}

	/**
	 * Resolve a filesystem path inside wp-content to a URL.
	 *
	 * plugins_url() cannot be used: the package sits in an unknown host plugin,
	 * and on some installs (mu-plugins, custom WP_CONTENT_DIR) the path is not
	 * under WP_PLUGIN_DIR at all.
	 */
	private static function url(string $path): string
	{
		$content_dir = wp_normalize_path(WP_CONTENT_DIR);
		$path        = wp_normalize_path($path);

		if (strpos($path, $content_dir) === 0) {
			return content_url(substr($path, strlen($content_dir)));
		}

		// Last resort: assume it is under the plugins directory.
		return plugins_url('/', $path . 'php/bootstrap.php');
	}
}

Loader::boot();
