<?php
/**
 * bfields demo — regenerate the static preview's schema.
 *
 * The static page is not a second copy of the field definitions: it renders the
 * SAME JSON document the plugin sends to the browser, dumped from a real
 * install. That is the framework's own claim — "the JSON schema is the API" —
 * taken literally, and it means the preview cannot drift away from
 * demo/includes/Fields/*.php without someone forgetting to re-run this.
 *
 *   wp eval-file demo/static/dump-schema.php
 *
 * @package BFieldsDemo
 */

if (!defined('ABSPATH')) {
	exit;
}

$out = array();

foreach (array('settings' => '_bfields_demo_settings_', 'viewer' => '_bfields_demo_viewer_') as $name => $unique) {
	$schema = \BFields\Registry::instance()->schema($unique);

	if (!$schema) {
		WP_CLI::error("No schema registered for {$unique}. Is the demo plugin active?");
	}

	$out[$name] = \BFields\Schema::for_client($schema);
}

$json = wp_json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

$file = __DIR__ . '/assets/schema.js';

file_put_contents(
	$file,
	"/*\n"
		. " * bfields demo — the static preview's schema. GENERATED, do not edit.\n"
		. " *\n"
		. " * Dumped from a live install by demo/static/dump-schema.php, which is what\n"
		. " * keeps this preview honest: it is the same JSON document PHP sends to the\n"
		. " * React body, field for field, default for default.\n"
		. " *\n"
		. " *   wp eval-file demo/static/dump-schema.php\n"
		. " */\n\n"
		. "window.BFIELDS_STATIC = " . $json . ";\n"
);

WP_CLI::success('Wrote ' . $file . ' (' . size_format(filesize($file)) . ')');
