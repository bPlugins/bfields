<?php
/**
 * bfields — schema defaults that must match Codestar's form (Schema.php).
 *
 * What must hold:
 *
 *   1. A single `select` whose default is not one of its options holds, for a
 *      missing key, what a browser posts for it: the placeholder option ('')
 *      when there is one, else the first option. A default that IS an option
 *      is kept. Seeding still uses the raw default (`csfDefault`).
 *   2. Multiple selects and option sources are left alone.
 *   3. A screen's `args['defaults']` override goes through the same rule.
 *   4. `dimensions` and `spacing` with no `units` get Codestar's px, %, em.
 *      Authored units are kept.
 *   5. A `pro` sub-field's stored value in a group row passes through a save
 *      unchanged (it is never edited, and dropping it lost Pro data during a
 *      licence lapse); its non-pro siblings are written as before.
 *   6. A dependency rule on a single select carries the select's options and
 *      what Codestar's form shows for a stale value, and both engines read a
 *      stale value as that (tests/fixtures/stale-select-cases.json, which
 *      tests/ts/dependency.test.ts replays too).
 *   7. An options map with integer keys carries its PHP order (optionOrder).
 *   8. A stored null hydrates as the default; a button_set holding a nested
 *      array is kept as it is, without a warning.
 *
 *   bin/test.sh runs it. One scratch screen, never saved.
 */

if (!defined('ABSPATH')) {
	exit;
}

require_once (rtrim((string) (getenv('BFIELDS_ROOT') ?: WP_PLUGIN_DIR . '/bfields'), '/')) . '/tests/php/lib.php';

use BFields\Compat\Codestar;
use BFields\Registry;

$report = new BFields_Report('bfields schema defaults');

$box = '_bfields_test_schema_';

Codestar::createMetabox($box, array(
	'post_type' => 'post',
	'render'    => false,
	'defaults'  => array('overridden' => 'gone'),
));
Codestar::createSection($box, array('title' => 'Schema', 'fields' => array(
	array('id' => 'no_default', 'type' => 'select', 'options' => array('none' => 'None', '12' => 'Preset')),
	array('id' => 'stale_default', 'type' => 'select', 'options' => array('a' => 'A', 'b' => 'B'), 'default' => 'z'),
	array('id' => 'good_default', 'type' => 'select', 'options' => array('a' => 'A', 'b' => 'B'), 'default' => 'b'),
	array('id' => 'placeholder', 'type' => 'select', 'placeholder' => 'Pick one', 'options' => array('a' => 'A')),
	array('id' => 'empty_option', 'type' => 'select', 'options' => array('' => 'Neutral', 'x' => 'X')),
	array('id' => 'optgroup', 'type' => 'select', 'options' => array('Group' => array('g1' => 'G1', 'g2' => 'G2'))),
	array('id' => 'multiple', 'type' => 'select', 'multiple' => true, 'options' => array('a' => 'A')),
	array('id' => 'source', 'type' => 'select', 'options' => 'posts'),
	array('id' => 'overridden', 'type' => 'select', 'options' => array('a' => 'A', 'b' => 'B'), 'default' => 'b'),
	array('id' => 'dim', 'type' => 'dimensions'),
	array('id' => 'dim_units', 'type' => 'dimensions', 'units' => array('px', 'vw')),
	array('id' => 'space', 'type' => 'spacing'),
	array('id' => 'tpl', 'type' => 'select', 'options' => array('none' => 'None', 12 => 'Chair', 7 => 'Desk')),
	array('id' => 'bg', 'type' => 'color', 'dependency' => array('tpl', '==', 'none')),
	array('id' => 'bg_all', 'type' => 'color', 'dependency' => array('tpl|bg', '==|!=', 'none|x')),
	array('id' => 'with_default', 'type' => 'text', 'default' => 'dflt'),
	array('id' => 'segment', 'type' => 'button_set', 'options' => array('a' => 'A')),
	array('id' => 'rows', 'type' => 'group', 'fields' => array(
		array('id' => 'tpl', 'type' => 'text'),
		array('id' => 'kind', 'type' => 'select', 'placeholder' => 'Pick', 'options' => array('a' => 'A')),
		array('id' => 'by_kind', 'type' => 'text', 'dependency' => array('kind', '!=', 'a')),
		array('id' => 'by_row_tpl', 'type' => 'text', 'dependency' => array('tpl', '==', 'none')),
		array('id' => 'by_root_tpl', 'type' => 'text', 'dependency' => array('tpl', '==', 'none', 'all')),
		array('id' => 'free_text', 'type' => 'text'),
		array('id' => 'locked', 'type' => 'text', 'pro' => true),
		array('id' => 'invalid', 'type' => 'switcher', 'pro' => true),
		array('id' => 'inner', 'type' => 'group', 'fields' => array(
			array('id' => 'inner_free', 'type' => 'text'),
			array('id' => 'inner_locked', 'type' => 'text', 'pro' => true),
		)),
	)),
)));

$fields = array();
foreach (Registry::instance()->schema($box)['sections'][0]['fields'] as $field) {
	$fields[$field['id']] = $field;
}

// 1–3. What a key the row does not have holds, and what seeding writes.
foreach (array(
	'no_default'    => array('none', ''),
	'stale_default' => array('a', 'z'),
	'good_default'  => array('b', 'b'),
	'placeholder'   => array('', ''),
	'empty_option'  => array('', ''),
	'optgroup'      => array('g1', ''),
	'multiple'      => array(array(), ''),
	'source'        => array('', ''),
	'overridden'    => array('a', 'gone'),
) as $id => list($default, $seed)) {
	$report->count('select defaults');
	if (!bfields_identical($default, $fields[$id]['default'])) {
		$report->fail("{$id}: missing-key default expected " . bfields_show($default) . ', got ' . bfields_show($fields[$id]['default']));
	}
	if (!bfields_identical($seed, $fields[$id]['csfDefault'])) {
		$report->fail("{$id}: seeding default changed: expected " . bfields_show($seed) . ', got ' . bfields_show($fields[$id]['csfDefault']));
	}
}

// 4. Units.
foreach (array(
	'dim'       => array('px', '%', 'em'),
	'dim_units' => array('px', 'vw'),
	'space'     => array('px', '%', 'em'),
) as $id => $units) {
	$report->count('unit lists');
	$got = isset($fields[$id]['props']['units']) ? $fields[$id]['props']['units'] : null;
	if ($units !== $got) {
		$report->fail("{$id}: units expected " . bfields_show($units) . ', got ' . bfields_show($got));
	}
}

// 5. `pro` sub-fields in rows.
$report->count('pro sub-field rows');
$saved = \BFields\Sanitizer::field(array(
	array('__id' => 'r1', 'free_text' => 'kept', 'locked' => 'placeholder', 'invalid' => '1', 'extra' => 'x', 'inner' => array(
		array('inner_free' => 'a', 'inner_locked' => 'b'),
	)),
), $fields['rows']);
$expected = array(
	array('free_text' => 'kept', 'locked' => 'placeholder', 'invalid' => '1', 'extra' => 'x', 'inner' => array(
		array('inner_free' => 'a', 'inner_locked' => 'b'),
	)),
);
if (!bfields_identical($expected, $saved)) {
	$report->fail('pro sub-fields: expected ' . bfields_show($expected) . ', got ' . bfields_show($saved));
}

// 6. Stale single-select controllers.
$rule_of = static function (array $field, int $index = 0) {
	return isset($field['dependency'][$index]) ? $field['dependency'][$index] : array();
};
$children = array();
foreach ($fields['rows']['fields'] as $child) {
	$children[$child['id']] = $child;
}
foreach (array(
	'root select'                => array($rule_of($fields['bg']), array('none', '12', '7'), 'none'),
	'root select in a pipe rule' => array($rule_of($fields['bg_all']), array('none', '12', '7'), 'none'),
	'not a select'               => array($rule_of($fields['bg_all'], 1), null, null),
	'row placeholder select'     => array($rule_of($children['by_kind']), array('', 'a'), ''),
	'row text shadows root'      => array($rule_of($children['by_row_tpl']), null, null),
	'global rule reads the root' => array($rule_of($children['by_root_tpl']), array('none', '12', '7'), 'none'),
) as $label => list($rule, $choices, $shown)) {
	$report->count('tagged rules');
	if ($choices !== (isset($rule['choices']) ? $rule['choices'] : null) || $shown !== (isset($rule['shown']) ? $rule['shown'] : null)) {
		$report->fail("tag / {$label}: expected " . bfields_show(array($choices, $shown)) . ', got ' . bfields_show($rule));
	}
}

$stale = json_decode((string) file_get_contents(bfields_test_root() . 'tests/fixtures/stale-select-cases.json'), true);
foreach ($stale['cases'] as $case) {
	$report->count('stale-select cases');
	$got = \BFields\Dependency::visible($case['rules'], $case['values'], $case['row']);
	if ($got !== $case['expected']) {
		$report->fail("stale select / {$case['origin']}: expected " . bfields_show($case['expected']) . ', got ' . bfields_show($got));
	}
}

// 7. Option order.
$report->count('option orders');
if (array('none', '12', '7') !== (isset($fields['tpl']['props']['optionOrder']) ? $fields['tpl']['props']['optionOrder'] : null)) {
	$report->fail('optionOrder: expected none, 12, 7, got ' . bfields_show($fields['tpl']['props']['optionOrder'] ?? null));
}
if (isset($fields['good_default']['props']['optionOrder'])) {
	$report->fail('optionOrder: sent for a map JS keeps in order');
}

// 8. Null and malformed values.
$report->count('hydrate edge values', 2);
$schema   = Registry::instance()->schema($box);
$hydrated = \BFields\Storage\Values::hydrate(array('with_default' => null, 'segment' => array(array('a'))), $schema);
if ('dflt' !== $hydrated['with_default']) {
	$report->fail('null: a stored null did not hydrate as the default: ' . bfields_show($hydrated['with_default']));
}
if (array(array('a')) !== $hydrated['segment'] || array(array('a')) !== \BFields\Sanitizer::field($hydrated['segment'], $fields['segment'])) {
	$report->fail('button_set: a nested array was not kept as it is: ' . bfields_show($hydrated['segment']));
}

$report->finish('a missing select key holds what Codestar\'s form posts, seeding is unchanged, unit lists are Codestar\'s, `pro` sub-fields pass through saved rows, and stale selects read as Codestar shows them.');
