<?php
/**
 * bfields — seeding parity with REAL Codestar.
 *
 * Safety rule 7.5: a fresh site must be seeded exactly as Codestar seeds it.
 * Readers have their own fallbacks, and some differ from the field defaults —
 * Product.php falls back to rotateDelay 200, 3d_rotate_speed 20 and
 * bp_3d_loading 'lazy' — so a fresh install seeded differently from Codestar
 * would quietly behave differently. And `'default' => true` must stay PHP
 * true: readers that check `=== '1'` treat '1' and true differently.
 *
 * The earlier version of this test compared bfields with bfields: it ran
 * Codestar's default through bfields' own codec before comparing, so it could
 * never see a difference in stored type (review 3.1). Now:
 *
 *   1. CSF_Options is instantiated for a SCRATCH option with the real screen
 *      args and sections, and its save_defaults() writes the row.
 *   2. Storage\Option::seed() writes another scratch option from the same
 *      field set.
 *   3. The two raw rows are compared with ===, key order included.
 *   4. Reset All, run on the seeded row scrambled and with a key no field
 *      declares, writes the seeded row again (Codestar's Reset All writes
 *      what it seeds), key order included, and keeps that key after it.
 *
 * Allowed differences, and nothing else:
 *   - keys bfields does not seed: display types and `pro` placeholders (3.3);
 *   - a single-value button_set whose default is an array is seeded as its
 *     first element (3.1 — the array sends Shortcode into multiple mode).
 */

if (!defined('ABSPATH')) {
	exit;
}

require_once (rtrim((string) (getenv('BFIELDS_ROOT') ?: WP_PLUGIN_DIR . '/bfields'), '/')) . '/tests/php/lib.php';

use BFields\Schema;
use BFields\Storage\Option;

$report = new BFields_Report('bfields seeding parity with Codestar');

if (!class_exists('CSF_Options')) {
	$report->fail('Codestar (CSF_Options) is not loaded — there is nothing to compare against.');
	$report->finish('');
}

// The 3D Viewer screen is required; HVP's are checked when present.
$screens = array('_bp3d_settings_' => true, 'h5vp_option' => false, 'h5vp_quick' => false);

$csf_key = '_bfields_test_seed_csf_';
$bf_key  = '_bfields_test_seed_bf_';

foreach ($screens as $unique => $required) {
	$screen = bfields_test_screen($unique);

	if (!$screen || 'options' !== $screen['kind']) {
		if ($required) {
			$report->fail("no field set for {$unique}. Run through bin/test.sh, or set BFIELDS_SCHEMA_SOURCE=inventory.");
		}
		continue;
	}

	delete_option($csf_key);
	delete_option($bf_key);

	// 1. Real Codestar. set_options() finds no nonce in $_POST and does
	//    nothing; save_defaults() sees an empty row and writes it.
	$args                  = $screen['args'];
	$args['save_defaults'] = true;
	// Codestar never sees a field_group (a host unwraps before \CSF, see README).
	$csf_sections          = \BFields\Schema::unwrap_sections($screen['sections']);
	new CSF_Options($csf_key, array('args' => $args, 'sections' => $csf_sections));
	$csf = get_option($csf_key);

	// 2. bfields.
	$schema = Schema::build($bf_key, 'options', $screen['args'], $screen['sections']);
	(new Option($bf_key))->seed($schema);
	$mine = get_option($bf_key);

	// 4. Reset All over a row in another order, with an undeclared key.
	$reset_ok = false;
	if (is_array($mine)) {
		update_option($bf_key, array('_bfields_undeclared' => 'kept') + array_reverse($mine, true));
		(new Option($bf_key))->reset_all($schema);
		$reset_ok = get_option($bf_key) === $mine + array('_bfields_undeclared' => 'kept');
	}

	delete_option($csf_key);
	delete_option($bf_key);

	if (!is_array($csf) || !is_array($mine)) {
		$report->fail("{$unique}: a seeded row is missing (Codestar: " . gettype($csf) . ', bfields: ' . gettype($mine) . ')');
		continue;
	}

	$report->count('screens seeded');

	$report->count('resets compared');
	if (!$reset_ok) {
		$report->fail("{$unique}: Reset All did not write the seeded row in its order, followed by the undeclared key");
	}

	$index = Schema::field_index($schema);

	// Raw field arrays by id, to say WHY bfields skips a key.
	$raw = array();
	foreach ($csf_sections as $section) {
		foreach ((array) (isset($section['fields']) ? $section['fields'] : array()) as $field) {
			if (is_array($field) && !empty($field['id'])) {
				$raw[$field['id']] = $field;
			}
		}
	}

	foreach ($csf as $id => $value) {
		if (!array_key_exists($id, $mine)) {
			$type = isset($raw[$id]['type']) ? $raw[$id]['type'] : '';
			if (in_array($type, Schema::DISPLAY_TYPES, true)) {
				$report->note("not seeded by design (3.3): display type ({$type})");
			} elseif (!empty($raw[$id]['pro'])) {
				$report->note('not seeded by design (3.3): pro placeholder');
			} else {
				$report->fail("{$unique} / {$id}: Codestar seeds it, bfields does not (" . bfields_show($value) . ')');
			}
			continue;
		}

		$report->count('fields compared');

		if (bfields_identical($value, $mine[$id])) {
			continue;
		}

		$field = isset($index[$id]) ? $index[$id] : null;

		if ($field && 'button_set' === $field['type'] && empty($field['props']['multiple']) && is_array($value)
			&& $mine[$id] === (string) reset($value)) {
			$report->note('button_set: array default -> first element (3.1)');
			continue;
		}

		$report->fail(sprintf(
			'%s / %s (%s): Codestar seeds %s (%s), bfields seeds %s (%s)',
			$unique,
			$id,
			$field ? $field['type'] : '?',
			bfields_show($value),
			gettype($value),
			bfields_show($mine[$id]),
			gettype($mine[$id])
		));
	}

	foreach (array_keys($mine) as $id) {
		if (!array_key_exists($id, $csf)) {
			$report->fail("{$unique} / {$id}: bfields seeds a key Codestar does not");
		}
	}

	// Key order is part of the bytes. Codestar's order, minus what bfields
	// skips, must be bfields' order.
	$expected_order = array_values(array_filter(array_keys($csf), static function ($id) use ($mine) {
		return array_key_exists($id, $mine);
	}));

	if ($expected_order !== array_keys($mine)) {
		$report->fail("{$unique}: keys are seeded in a different ORDER from Codestar's — different serialize() bytes");
	}
}

$report->require_nonzero('screens seeded');
$report->require_nonzero('fields compared');

$report->finish('a fresh install is seeded exactly as Codestar seeds it, raw types and key order included.');
