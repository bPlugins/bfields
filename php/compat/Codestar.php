<?php
/**
 * bfields — Codestar compatibility facade.
 *
 * Accepts Codestar's `createOptions` / `createSection` / `createMetabox` calls
 * with their field arrays unchanged, and registers them with bfields instead.
 * This is what lets 3D Viewer keep ONE schema for both renderers (7.11): the
 * six field files change one call site, not their contents, so neither UI can
 * declare a field set the other does not.
 *
 * NEVER define the global `CSF` class here. Codestar guards itself with
 * class_exists('CSF'), so a polyfill under that name would silently hijack
 * every other CSF-based plugin on the site (4.0). The facade is
 * \BFields\Compat\Codestar and nothing else.
 *
 * @package BFields\Compat
 */

namespace BFields\Compat;

use BFields\Registry;

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Drop-in replacement for the `\CSF::` static API.
 */
final class Codestar
{
	/**
	 * Codestar's CSF::createOptions().
	 *
	 * @param string $unique Storage key.
	 * @param array  $args   Screen arguments, in CSF's vocabulary.
	 */
	public static function createOptions(string $unique, array $args = array()): void
	{
		Registry::instance()->options($unique, $args);

		bfields_bridge_csf_hooks($unique);
	}

	/**
	 * Codestar's CSF::createMetabox().
	 */
	public static function createMetabox(string $unique, array $args = array()): void
	{
		Registry::instance()->metabox($unique, $args);

		bfields_bridge_csf_hooks($unique);
	}

	/**
	 * Codestar's CSF::createSection().
	 *
	 * Field arrays are passed through verbatim. Codestar reads only the keys it
	 * knows, and bfields' extra keys (`pro`, `icon`, `layout`, `adornments`,
	 * the optional section `id`) are ignored by it — which is what makes one
	 * array serve both renderers (4.2).
	 */
	public static function createSection(string $unique, array $section = array()): void
	{
		Registry::instance()->section($unique, $section);
	}

	/**
	 * Codestar's CSF::createCustomizeOptions() — not supported.
	 *
	 * No bPlugins product uses it. Registering it silently would give a host a
	 * screen that never renders; failing loudly in debug is the safer default.
	 */
	public static function createCustomizeOptions(string $unique, array $args = array()): void
	{
		_doing_it_wrong(
			__METHOD__,
			esc_html__('bfields does not implement Customizer options. Keep this screen on Codestar.', 'bfields'),
			'1.0.0'
		);
	}

	/**
	 * Codestar's CSF::createShortcoder() — not supported.
	 */
	public static function createShortcoder(string $unique, array $args = array()): void
	{
		_doing_it_wrong(
			__METHOD__,
			esc_html__('bfields does not implement the shortcode generator. Keep this screen on Codestar.', 'bfields'),
			'1.0.0'
		);
	}

	/**
	 * Codestar's CSF::createWidget() — not supported.
	 */
	public static function createWidget(string $unique, array $args = array()): void
	{
		_doing_it_wrong(
			__METHOD__,
			esc_html__('bfields does not implement widgets. Keep this screen on Codestar.', 'bfields'),
			'1.0.0'
		);
	}
}
