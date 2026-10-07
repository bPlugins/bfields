<?php
/**
 * bfields — Layer 1: version-safe bootstrap.
 *
 * This file is bundled inside multiple host plugins (3D Viewer free + premium,
 * later HTML5 Video Player, …). Several copies at different versions may load in
 * the same request. ONLY the newest copy is allowed to define classes; every
 * host shares that single winning copy, so there is one runtime, one
 * `bfields-ui` script handle and one `window.bfields` on the page.
 *
 * INVARIANTS (migration plan 4.7 — do not break these):
 *   1. This file records version + path only. It NEVER requires class files.
 *   2. `bfields_register_copy` + `$GLOBALS['bfields_copies']` are FROZEN bytes
 *      in every released version, forever. An old copy must always be able to
 *      register itself with a newer one.
 *   3. No define() for the library version here — use the local
 *      $bfields_this_version. Only the winner defines BFIELDS_VERSION.
 *   4. Bump $bfields_this_version on every release.
 *   5. Every class guard is class_exists('X', false). With autoload on, the
 *      guard defeats itself (the BP3D\Init incident, 2026-07-14).
 *   6. No breaking changes under this package name — newest-wins means a
 *      breaking v2 would break v1 hosts on the same site. A breaking change
 *      ships as `bfields2` / `BFields2\` and coexists.
 *
 * @package BFields
 */

if (!defined('ABSPATH')) {
	exit;
}

$bfields_this_version = '1.1.0';   // Local var — NEVER a constant.
$bfields_this_file = __FILE__;

// ---- FROZEN: identical bytes in every released version, forever ----
if (!function_exists('bfields_register_copy')) {

	$GLOBALS['bfields_copies'] = array();

	/**
	 * Record a bundled copy of the library.
	 *
	 * @param string $version        Semantic version of the copy.
	 * @param string $bootstrap_file Absolute path to that copy's bootstrap.php.
	 */
	function bfields_register_copy($version, $bootstrap_file)
	{
		$GLOBALS['bfields_copies'][$version] = $bootstrap_file;
	}

	// -1000, not -100: arbitration has to beat anything else hooking early,
	// and it must happen before any script is enqueued.
	add_action('plugins_loaded', 'bfields_boot_newest', -1000);

	/**
	 * Load the newest registered copy and announce readiness.
	 *
	 * Runs once. Sorts every recorded copy by version and requires the highest
	 * one's loader. Hosts register their schemas on the `bfields_loaded` action.
	 */
	function bfields_boot_newest()
	{
		uksort($GLOBALS['bfields_copies'], 'version_compare');
		$newest_file = end($GLOBALS['bfields_copies']);       // Highest version wins.
		require_once dirname($newest_file) . '/includes/load.php';
		do_action('bfields_loaded');                          // Single entry point for hosts.
	}
}
// ------------------------------------------------------------------

// Development override. At equal versions the copy that registers LAST wins
// (plugin load order), so a checkout and a host's lib/bfields/ at the same
// version pick each other by folder name. Define BFIELDS_FORCE_PATH in
// wp-config.php as one copy's package root (the folder holding php/) and that
// copy wins outright. It registers under a version no release can reach.
// Nothing is skipped, so a path that no active plugin loads changes nothing.
// $GLOBALS['bfields_loaded_from'] names the winner either way.
if (defined('BFIELDS_FORCE_PATH') && realpath((string) BFIELDS_FORCE_PATH) === realpath(dirname(__DIR__))) {
	$bfields_this_version = '99999.0.0';
}

bfields_register_copy($bfields_this_version, $bfields_this_file);
