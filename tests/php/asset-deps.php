<?php
/**
 * bfields — the bundle may only depend on script handles the oldest supported
 * WordPress registers.
 *
 * A script whose dependency is not registered is silently never printed: the
 * screen is blank, with no error (review 3.4 — `react-jsx-runtime` exists only
 * from WordPress 6.6, the plugins say 6.5). This runs in plain PHP, no
 * WordPress needed:
 *
 *   php tests/php/asset-deps.php
 *
 * When the build adds a handle, check it exists in WordPress 6.5
 * (wp-includes/script-loader.php, wp-includes/assets/script-loader-packages.php)
 * before adding it here. `react-jsx-runtime` is allowed because
 * Assets::register_jsx_runtime() provides it where core does not.
 */

const BFIELDS_WP_FLOOR = '6.5';

$available = array(
	// Registered by WordPress 6.5.
	'react', 'react-dom', 'lodash', 'jquery',
	'wp-a11y', 'wp-api-fetch', 'wp-components', 'wp-compose', 'wp-data', 'wp-dom-ready',
	'wp-element', 'wp-escape-html', 'wp-hooks', 'wp-html-entities', 'wp-i18n', 'wp-icons',
	'wp-keycodes', 'wp-primitives', 'wp-url',
	// Shimmed by bfields before 6.6.
	'react-jsx-runtime',
);

$root   = dirname(__DIR__, 2);
$failed = false;

foreach (array('build/index.asset.php') as $relative) {
	$file = $root . '/' . $relative;

	if (!is_readable($file)) {
		fwrite(STDERR, "{$relative} is missing — run npm run build first.\n");
		exit(1);
	}

	$asset = require $file;

	foreach ($asset['dependencies'] as $handle) {
		if (!in_array($handle, $available, true)) {
			fwrite(STDERR, sprintf("%s depends on \"%s\", which WordPress %s does not register.\n", $relative, $handle, BFIELDS_WP_FLOOR));
			$failed = true;
		}
	}
}

if ($failed) {
	exit(1);
}

printf("ok — every bundle dependency exists on WordPress %s (or is shimmed)\n", BFIELDS_WP_FLOOR);
