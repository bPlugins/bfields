<?php
/**
 * bfields — golden round-trip test.
 *
 * The proof behind safety rule 7.2 and 7.16: for every real record, hydrating
 * it into the store and dehydrating + sanitizing it back must produce the SAME
 * BYTES. If this suite is green, saving a screen through bfields without
 * touching anything cannot change a user's data.
 *
 * Two layers:
 *
 *   1. Codec: Csf::hydrate() -> Sanitizer::field(), per value, for the golden
 *      set (tests/php/fixtures/golden) and the edge set (fixtures/edge).
 *   2. Full save path: the record is written to a SCRATCH option / scratch
 *      post's meta, saved through Storage\Option::save() / Storage\PostMeta::
 *      save() exactly as the UI would save it untouched (merge, hooks, the
 *      write itself, and wp_slash for post meta), read back, and compared.
 *
 * It fails when any of the three keys has no field set, or when nothing was
 * checked — a green run on 0 records proves nothing (review 3.1).
 *
 *   bin/test.sh runs it in the context 3D Viewer needs.
 */

if (!defined('ABSPATH')) {
	exit;
}

require_once (rtrim((string) (getenv('BFIELDS_ROOT') ?: WP_PLUGIN_DIR . '/bfields'), '/')) . '/tests/php/lib.php';

use BFields\Codec\Csf;
use BFields\Sanitizer;
use BFields\Schema;
use BFields\Storage\Option;
use BFields\Storage\PostMeta;
use BFields\Storage\Values;

$report = new BFields_Report('bfields golden round-trip');

/**
 * Is this change one of the normalisations section 3.1 explicitly sanctions?
 *
 * bfields is allowed to change exactly the legacy variants listed here, and
 * nothing else. Switchers are NOT among them any more: '' and PHP bools are
 * kept as stored (review 4.1, decided 2026-09-23), so any switcher change
 * fails.
 *
 * @return string|null A label for the normalisation, or null if it is a defect.
 */
function bfields_documented_normalisation($stored, $returned, array $field): ?string
{
	// A host type mapped onto a core renderer is held to that core's rules.
	$type = Schema::codec_type($field);

	// 3.1: "checkbox with options ... '' when nothing checked ... Framework
	//       writes []." Readers guard with is_array(), so the two are equal.
	if ('checkbox' === $type && !empty($field['props']['options'])) {
		if (('' === $stored || null === $stored) && array() === $returned) {
			return "checkbox: '' (nothing checked) -> []";
		}

		return null;
	}

	// 3.1: a single-value button_set holding an array (CSF Reset of an array
	//      default) sends Shortcode into multiple mode; first element wins.
	if ('button_set' === $type && empty($field['props']['multiple']) && is_array($stored)) {
		return 'button_set: array (CSF Reset) -> first element';
	}

	// 3.1: group/repeater store '' when empty; an empty list normalises back
	//      to that same '' rather than to [].
	if (in_array($type, array('group', 'repeater'), true)) {
		if (array() === $stored && '' === $returned) {
			return "group: [] -> '' (CSF's empty shape)";
		}

		return bfields_children_normalised($stored, $returned, $field, 'group');
	}

	if ('fieldset' === $type) {
		return bfields_children_normalised(array($stored), array($returned), $field, 'fieldset');
	}

	// 3.1: media accepts a bare numeric id and expands it at render time.
	if ('media' === $type && is_numeric($stored) && is_array($returned)) {
		return 'media: bare attachment id -> 8-key array';
	}

	// Codestar wp_parse_args() a partial media array to the 8 keys and posts
	// all 8; stored keys keep value and order, missing ones are appended as ''.
	if ('media' === $type && is_array($stored) && is_array($returned)) {
		$head = array_slice($returned, 0, count($stored), true);
		$tail = array_slice($returned, count($stored), null, true);
		if (bfields_identical($stored, $head) && array() !== $tail
			&& array() === array_diff(array_keys($tail), Csf::MEDIA_KEYS)
			&& array() === array_intersect_key($tail, $stored)
			&& array() === array_filter($tail, static function ($v) {
				return '' !== $v;
			})) {
			return "media: partial array -> 8-key array (missing keys appended as '')";
		}
	}

	return null;
}

/**
 * Classify every difference inside a group's rows (or a fieldset's values).
 * A label only when EVERY difference is itself sanctioned.
 */
function bfields_children_normalised($stored, $returned, array $field, string $what): ?string
{
	if (!is_array($stored) || !is_array($returned) || array_keys($stored) !== array_keys($returned)) {
		return null;
	}

	$children = array();

	foreach ((array) (isset($field['fields']) ? $field['fields'] : array()) as $child) {
		if ('' !== $child['id'] && !$child['display']) {
			$children[$child['id']] = $child;
		}
	}

	$reasons = array();

	foreach ($stored as $index => $row) {
		if (!is_array($row) || !is_array($returned[$index]) || array_keys($row) !== array_keys($returned[$index])) {
			return null;
		}

		foreach ($row as $key => $value) {
			if (bfields_identical($value, $returned[$index][$key])) {
				continue;
			}

			if (!isset($children[$key])) {
				return null;   // Undeclared sub-key changed — never allowed.
			}

			$reason = bfields_documented_normalisation($value, $returned[$index][$key], $children[$key]);

			if (null === $reason) {
				return null;
			}

			$reasons[$reason] = true;
		}
	}

	return array() === $reasons ? null : $what . ' row: ' . implode(' + ', array_keys($reasons));
}

/**
 * Compare a stored row with what came back, key by key.
 *
 * Declared keys may differ only by a sanctioned normalisation; undeclared keys
 * must be identical. Keys the save ADDED (declared fields the record lacked,
 * written at their default, as Codestar also does) are counted, not failed.
 */
function bfields_compare_rows(array $before, array $after, array $schema, string $label, string $layer, BFields_Report $report): void
{
	$index = Schema::field_index($schema);

	foreach ($before as $id => $original) {
		if (!array_key_exists($id, $after)) {
			$report->fail("{$layer} / {$label} / {$id}: key was DROPPED");
			continue;
		}

		$returned = $after[$id];
		$report->count("{$layer}: values compared");

		if (bfields_identical($original, $returned)) {
			continue;
		}

		$reason = isset($index[$id]) ? bfields_documented_normalisation($original, $returned, $index[$id]) : null;

		if (null !== $reason) {
			$report->note($reason);
			continue;
		}

		$type = isset($index[$id]) ? $index[$id]['type'] : 'undeclared';

		$report->fail(sprintf(
			"%s / %s / %s (%s)\n    stored:   %s\n    returned: %s",
			$layer,
			$label,
			$id,
			$type,
			bfields_show($original),
			bfields_show($returned)
		));
	}

	foreach (array_keys($after) as $id) {
		if (!array_key_exists($id, $before)) {
			$report->note("{$layer}: declared field absent from the record, written at its default");
		}
	}
}

// ---- The records -----------------------------------------------------------

$golden = bfields_test_root() . 'tests/php/fixtures/golden';
$edge   = bfields_test_root() . 'tests/php/fixtures/edge';

$keys = array(
	'_bp3d_settings_' => array($golden . '/settings.json'),
	'_bp3dimages_'    => glob($golden . '/viewer-*.json'),
	'_bp3d_product_'  => glob($golden . '/product-*.json'),
);

$records = array();   // [unique, label, stored]

foreach ($keys as $unique => $files) {
	foreach ((array) $files as $file) {
		$stored = is_readable($file) ? json_decode((string) file_get_contents($file), true) : null;
		if (is_array($stored)) {
			$records[] = array($unique, basename($file, '.json'), $stored);
		}
	}
}

// Edge fixtures: {"unique": "...", "note": "...", "value": {...}}, built by
// make-edge-fixtures.php. JSON keeps true/false as booleans, so a Reset
// record's PHP bools survive decoding.
foreach ((array) glob($edge . '/*.json') as $file) {
	$fixture = json_decode((string) file_get_contents($file), true);
	if (is_array($fixture) && isset($fixture['unique'], $fixture['value']) && is_array($fixture['value'])) {
		$records[] = array($fixture['unique'], 'edge/' . basename($file, '.json'), $fixture['value']);
		$report->count('edge fixtures');
	}
}

$schemas = array();

foreach (array_keys($keys) as $unique) {
	$schemas[$unique] = bfields_test_schema($unique);

	if (!$schemas[$unique]) {
		$report->fail("no field set for {$unique}: its records cannot be checked. Run through bin/test.sh (admin + product-edit context), or set BFIELDS_SCHEMA_SOURCE=inventory.");
	}
}

// ---- 1. Codec: hydrate -> sanitize, per value -------------------------------

foreach ($records as list($unique, $label, $stored)) {
	if (empty($schemas[$unique])) {
		continue;
	}

	$report->count('records');

	$returned = array();
	$index    = Schema::field_index($schemas[$unique]);

	foreach ($stored as $id => $original) {
		$returned[$id] = isset($index[$id])
			? Sanitizer::field(Csf::hydrate($original, $index[$id]), $index[$id])
			: $original;   // Undeclared: never touched by the codec.
	}

	bfields_compare_rows($stored, $returned, $schemas[$unique], $label, 'codec', $report);
}

// ---- 2. Full save path ------------------------------------------------------

$scratch_option = '_bfields_test_roundtrip_';
$scratch_meta   = '_bfields_test_roundtrip_';
$scratch_post   = 0;

try {
	foreach ($records as list($unique, $label, $stored)) {
		if (empty($schemas[$unique])) {
			continue;
		}

		$schema = $schemas[$unique];

		// What the UI holds for an untouched screen, and sends back on Save.
		$values = Values::hydrate($stored, $schema);

		if ('options' === $schema['kind']) {
			delete_option($scratch_option);
			update_option($scratch_option, $stored, false);

			(new Option($scratch_option))->save($values, $schema);

			$after = get_option($scratch_option);
		} else {
			if (!$scratch_post) {
				$scratch_post = (int) wp_insert_post(array(
					'post_type'   => 'post',
					'post_status' => 'draft',
					'post_title'  => 'bfields round-trip scratch (safe to delete)',
				));
			}

			delete_post_meta($scratch_post, $scratch_meta);
			update_post_meta($scratch_post, $scratch_meta, wp_slash($stored));

			// The fixture itself must survive WordPress's own meta API, or the
			// comparison below would blame bfields for WordPress's bytes.
			if (!bfields_identical($stored, get_post_meta($scratch_post, $scratch_meta, true))) {
				$report->fail("save / {$label}: the fixture does not survive update_post_meta() itself");
				continue;
			}

			(new PostMeta($scratch_post, $scratch_meta))->save($values, $schema);

			$after = get_post_meta($scratch_post, $scratch_meta, true);
		}

		$report->count('records saved through storage');

		if (!is_array($after)) {
			$report->fail("save / {$label}: nothing readable came back (" . gettype($after) . ')');
			continue;
		}

		bfields_compare_rows($stored, $after, $schema, $label, 'save', $report);
	}
} finally {
	delete_option($scratch_option);
	if ($scratch_post) {
		wp_delete_post($scratch_post, true);
	}
}

// ---- The merge never drops undeclared keys (7.3) ---------------------------
//
// Covered by layer 2 for real (bfields_compare_rows fails a dropped key); this
// checks the case that matters most on its own: a row whose Pro keys are not
// in the current (free) field set.

if (!empty($schemas['_bp3d_settings_'])) {
	$stored = json_decode((string) file_get_contents($golden . '/settings.json'), true);
	$stored['bfields_test_pro_only_key'] = array('kept' => '1');

	delete_option($scratch_option);
	update_option($scratch_option, $stored, false);
	(new Option($scratch_option))->save(Values::hydrate($stored, $schemas['_bp3d_settings_']), $schemas['_bp3d_settings_']);
	$after = get_option($scratch_option);
	delete_option($scratch_option);

	$report->count('undeclared-key merge checks');

	if (!isset($after['bfields_test_pro_only_key']) || !bfields_identical($stored['bfields_test_pro_only_key'], $after['bfields_test_pro_only_key'])) {
		$report->fail('merge: an undeclared key was not kept by Option::save()');
	}
}

// ---- Types bfields cannot render keep their value (review 3.2) --------------
//
// A Codestar `tabbed` / `sortable` / `wp_editor`, or HVP's custom `library`,
// used to be treated as text: its array was saved back as ''. So were arrays
// in a single select/radio and in a text field. All must survive untouched.

add_filter('doing_it_wrong_trigger_error', '__return_false');   // The notice is expected here.

$opaque_schema = Schema::build('_bfields_test_opaque_', 'options', array(), array(array(
	'title'  => 'Opaque',
	'fields' => array(
		array('id' => 'o_tabbed', 'type' => 'tabbed', 'tabs' => array(array('title' => 'A', 'fields' => array(array('id' => 'inner', 'type' => 'text'))))),
		array('id' => 'o_library', 'type' => 'library'),
		array('id' => 'o_select', 'type' => 'select', 'options' => array('a' => 'A')),
		array('id' => 'o_radio', 'type' => 'radio', 'options' => array('a' => 'A')),
		array('id' => 'o_text', 'type' => 'text'),
		array('id' => 'o_number', 'type' => 'number', 'default' => 20),
	),
)));

remove_filter('doing_it_wrong_trigger_error', '__return_false');

$opaque = array(
	'o_tabbed'  => array('inner' => 'kept', 'extra' => array('x' => '1')),
	'o_library' => array(array('id' => '7', 'src' => 'https://example.com/v.mp4')),
	'o_select'  => array('a', 'b'),
	'o_radio'   => array('a'),
	'o_text'    => array('not', 'a', 'string'),
	'o_number'  => 20,
);

foreach ($opaque_schema['sections'][0]['fields'] as $field) {
	if (in_array($field['type'], array('tabbed', 'library'), true) && 'unknown' !== $field['core']) {
		$report->fail("opaque: {$field['type']} maps to core '{$field['core']}', not 'unknown'");
	}
}

delete_option($scratch_option);
update_option($scratch_option, $opaque, false);
(new Option($scratch_option))->save(Values::hydrate($opaque, $opaque_schema), $opaque_schema);
$after = get_option($scratch_option);
delete_option($scratch_option);

$report->count('opaque-type records');
bfields_compare_rows($opaque, is_array($after) ? $after : array(), $opaque_schema, 'opaque types', 'save', $report);

// ---- Seeded ints survive an untouched save (decision 12) -------------------
//
// Codestar's seeding and Reset store an int default raw, and a script can store
// an int in a switcher. Through the browser (JSON keeps 1 a number) and back,
// an untouched int must stay an int; only a flipped toggle writes '1'/'0'.

$ints_schema = Schema::build('_bfields_test_ints_', 'options', array(), array(array(
	'title'  => 'Ints',
	'fields' => array(
		array('id' => 'i_on', 'type' => 'switcher', 'default' => 1),
		array('id' => 'i_off', 'type' => 'switcher', 'default' => 0),
		array('id' => 'i_check', 'type' => 'checkbox', 'default' => 1),
		array('id' => 'i_number', 'type' => 'number', 'default' => 20),
		array('id' => 'i_flip', 'type' => 'switcher'),
	),
)));

$ints = array('i_on' => 1, 'i_off' => 0, 'i_check' => 1, 'i_number' => 20, 'i_flip' => 1);

$ints_payload = json_decode((string) wp_json_encode(Values::hydrate($ints, $ints_schema)), true);
$ints_payload['i_flip'] = '0';   // The one field the user flips.

delete_option($scratch_option);
update_option($scratch_option, $ints, false);
(new Option($scratch_option))->save($ints_payload, $ints_schema);
$after = get_option($scratch_option);
delete_option($scratch_option);

$report->count('int records');

if (!is_array($after) || '0' !== ($after['i_flip'] ?? null)) {
	$report->fail('ints: a flipped int switcher did not store \'0\': ' . bfields_show($after['i_flip'] ?? null));
}
if (is_array($after)) {
	unset($ints['i_flip'], $after['i_flip']);
	bfields_compare_rows($ints, $after, $ints_schema, 'untouched ints', 'save', $report);
}

// ---- A mapped host type is stored as its core's Codestar type ---------------
//
// bfields_type_map picks the renderer, and the renderer writes its core's
// shape, so the codec must treat the type as that core's Codestar type (report
// 2026-09-26, D1). Left on the identity codec, a mapped repeater wrote the
// UI's row `__id`s into the data, and a mapped dimension with no default
// blanked to '' instead of {width, unit}.

$mapped_schema = Schema::build('_bfields_test_mapped_', 'options', array(), array(array(
	'title'  => 'Mapped',
	'fields' => array(
		array('id' => 'm_rows', 'type' => 'bfields_test_rows', 'fields' => array(array('id' => 'label', 'type' => 'text'))),
		array('id' => 'm_size', 'type' => 'bp3d_responsive_dimensions', 'height' => false, 'responsive' => true),
	),
)));

$mapped = Schema::field_index($mapped_schema);
$rows   = Sanitizer::field(array(array('__id' => 'r1', 'label' => 'A')), $mapped['m_rows']);
$size   = Csf::blank($mapped['m_size']);

$report->count('mapped host types checked', 2);

if (!bfields_identical(array(array('label' => 'A')), $rows)) {
	$report->fail('mapped: a type mapped onto `repeater` did not go through the group codec: ' . bfields_show($rows));
}
if (!bfields_identical(array('width' => '', 'unit' => ''), $size) || 'nested' !== ($mapped['m_size']['responsive']['mode'] ?? '')) {
	$report->fail('mapped: a type mapped onto `dimension` is not a nested dimension: ' . bfields_show($size));
}

$report->require_nonzero('records');
$report->require_nonzero('codec: values compared');
$report->require_nonzero('records saved through storage');
$report->require_nonzero('save: values compared');

$report->finish('every stored value round-tripped byte for byte, through the codec and through storage.');
