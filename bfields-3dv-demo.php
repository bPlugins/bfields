<?php
/**
 * Plugin Name: bfields — 3D Viewer Demo
 * Description: A development-only demo host that rebuilds 3D Viewer Premium's admin screens — the Settings page, the Add New viewer editor and the WooCommerce product box — on bfields. Sandboxed storage keys and a sandboxed post type: it cannot touch 3D Viewer's real data. NOT part of the framework and never shipped in dist/bfields.zip.
 * Version: 1.1.0
 * Author: bPlugins
 * License: GPL-2.0-or-later
 * Requires PHP: 7.4
 *
 * WHY THIS FILE IS HERE AND NOT IN A PLUGIN OF ITS OWN
 *
 * The demo exercises every field the library ships — the transcribed ones in
 * ui/fields/ and the stand-ins in ui/fields/claude/. Keeping its sources beside
 * the framework's means one repo, one node_modules and one `npm run build:demo`,
 * and it lets the demo import ui/ sources directly instead of copying them.
 *
 * bin/dist.sh packages php/, build/ and languages/ only, so neither this file
 * nor demo/ can reach a host plugin. Nothing in demo/ is a dependency of
 * anything in php/ or ui/ — delete the folder and the framework is unchanged.
 *
 * @package BFieldsDemo
 */

if (!defined('ABSPATH')) {
	exit;
}

require_once __DIR__ . '/demo/load.php';
