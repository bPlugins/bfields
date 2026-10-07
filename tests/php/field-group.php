<?php
/**
 * bfields — `field_group` is storage-neutral (Schema::flatten()).
 *
 * One screen authored twice: with field_group wrappers (a nested group, a
 * group with a dependency, an empty group, a group inside a fieldset and
 * inside a repeater row) and with every wrapper unwrapped
 * (Schema::unwrap_groups(), what Codestar is given). What must hold:
 *
 *   1. field_index, declared_ids and defaults are identical, in order; the
 *      only difference anywhere in the fields is the `fieldGroup` tag.
 *   2. Seeding, Save, Reset Section and Reset All write identical bytes to
 *      wp_options, and PostMeta::save identical bytes to post meta. No group
 *      id is ever a stored key.
 *   3. The section carries one descriptor per drawn group; nested groups
 *      join the outer one; rows and fieldsets are never tagged.
 *   4. The Codestar stand-in's `pre_fields` lists the grouped fields, not
 *      the group (premium's licence-lapse overlay reads it).
 *   5. A field_group handed to Schema::field() directly holds no value.
 *   6. A group's dependency is ANDed onto each child wherever it is spliced.
 *
 * Scratch keys and one scratch post only.
 */

if (!defined('ABSPATH')) {
	exit;
}

require_once (rtrim((string) (getenv('BFIELDS_ROOT') ?: WP_PLUGIN_DIR . '/bfields'), '/')) . '/tests/php/lib.php';

use BFields\Compat\Codestar;
use BFields\Compat\Instance;
use BFields\Registry;
use BFields\Schema;
use BFields\Storage\Option;
use BFields\Storage\PostMeta;

$report = new BFields_Report('bfields field_group storage neutrality');

// The fixture authors a nested group on purpose: count the notice, do not print it.
$notices = array();
add_action('doing_it_wrong_run', static function ($function, $message) use (&$notices) {
	$notices[] = (string) $message;
}, 10, 2);
add_filter('doing_it_wrong_trigger_error', '__return_false');

$wrapped = array(
	array(
		'id'     => 'fg_main',
		'title'  => 'Main',
		'fields' => array(
			array('id' => 'top', 'type' => 'text', 'default' => 'a'),
			array(
				'id'       => 'fg_look',
				'type'     => 'field_group',
				'title'    => 'Look <b>& feel</b>',
				'subtitle' => 'Colours and size',
				'icon'     => 'sun',
				'fields'   => array(
					array('id' => 'tint', 'type' => 'color', 'default' => '#fff'),
					array('id' => 'size', 'type' => 'dimensions', 'default' => array('width' => '10', 'unit' => 'px'), 'responsive' => true),
					array('id' => 'mode', 'type' => 'select', 'options' => array('a' => 'A', 'b' => 'B'), 'default' => 'z'),
					array(
						'id'     => 'fg_inner',
						'type'   => 'field_group',
						'title'  => 'Nested',
						'fields' => array(
							array('id' => 'deep', 'type' => 'switcher', 'default' => true, 'dependency' => array('mode', '==', 'b')),
						),
					),
				),
			),
			array('id' => 'between', 'type' => 'number', 'default' => 3),
			array(
				'type'       => 'field_group',
				'title'      => 'Untitled id',
				'collapsed'  => true,
				'dependency' => array('top', '!=', ''),
				'fields'     => array(
					array('id' => 'box', 'type' => 'fieldset', 'fields' => array(
						array('id' => 'w', 'type' => 'text', 'default' => '1'),
						array('id' => 'fg_in_fieldset', 'type' => 'field_group', 'fields' => array(
							array('id' => 'h', 'type' => 'text', 'default' => '2'),
						)),
					)),
					array('id' => 'rows', 'type' => 'group', 'fields' => array(
						array('id' => 'label', 'type' => 'text'),
						array('id' => 'fg_in_row', 'type' => 'field_group', 'dependency' => array('label', '!=', ''), 'fields' => array(
							array('id' => 'note', 'type' => 'text', 'default' => 'n'),
						)),
					), 'default' => array(array('label' => 'First', 'note' => 'x'))),
					array('id' => 'gated', 'type' => 'text', 'dependency' => array('between', '!=', '0')),
				),
			),
			array('id' => 'fg_empty', 'type' => 'field_group', 'title' => 'Empty', 'fields' => array()),
			array('id' => 'locked', 'type' => 'field_group', 'fields' => array(
				array('id' => 'placeholder', 'type' => 'text', 'pro' => true),
			)),
		),
	),
	array(
		'id'     => 'fg_second',
		'title'  => 'Second',
		'fields' => array(
			array('id' => 'fg_tail', 'type' => 'field_group', 'title' => 'Tail', 'fields' => array(
				array('id' => 'last', 'type' => 'textarea', 'default' => 'z'),
			)),
		),
	),
);

$plain = Schema::unwrap_sections($wrapped);

// The unwrap itself: no field_group left at any depth, and idempotent.
$report->count('unwrap');
$left = false;
array_walk_recursive($plain, static function ($value, $key) use (&$left) {
	$left = $left || ('type' === $key && 'field_group' === $value);
});
if ($left) {
	$report->fail('unwrap_sections left a field_group behind');
}
if (Schema::unwrap_sections($plain) !== $plain) {
	$report->fail('unwrap_sections is not idempotent');
}
if (!function_exists('bfields_unwrap_field_groups') || bfields_unwrap_field_groups($wrapped[0]['fields']) !== $plain[0]['fields']) {
	$report->fail('bfields_unwrap_field_groups() is missing or differs from Schema::unwrap_groups()');
}

$args = array('save_defaults' => true, 'defaults' => array('between' => 7, 'deep' => false));
$a    = Schema::build('_bfields_test_fg_a_', 'options', $args, $wrapped);
$b    = Schema::build('_bfields_test_fg_b_', 'options', $args, $plain);

/** Drop the presentational keys, so what is left must be identical. */
$strip = static function (array $schema): array {
	foreach ($schema['sections'] as $s => $section) {
		unset($schema['sections'][$s]['groups']);
		foreach ($section['fields'] as $f => $field) {
			unset($schema['sections'][$s]['fields'][$f]['fieldGroup']);
		}
	}
	unset($schema['unique']);
	return $schema;
};

// 1. The declared set.
foreach (array('field_index' => 'field_index', 'declared_ids' => 'declared_ids', 'defaults' => 'defaults') as $what => $method) {
	$report->count('declared set compared');
	$left_side  = Schema::$method($strip($a));
	$right_side = Schema::$method($strip($b));
	if (!bfields_identical($left_side, $right_side)) {
		$report->fail("{$what}: wrapped " . bfields_show($left_side) . ' vs plain ' . bfields_show($right_side));
	}
}
if (!bfields_identical($strip($a), $strip($b))) {
	$report->fail('the normalised schemas differ beyond fieldGroup/groups');
}
foreach (array('fg_look', 'fg_inner', 'fg_empty', 'locked', 'group-fg_main-2', 'fg_in_row', 'fg_in_fieldset') as $id) {
	$report->count('group ids never declared');
	if (in_array($id, Schema::declared_ids($a), true) || array_key_exists($id, Schema::defaults($a))) {
		$report->fail("group id {$id} became a declared field");
	}
}

// 3. Descriptors and tags.
$report->count('descriptors');
$groups = $a['sections'][0]['groups'];
$ids    = array_column($groups, 'id');
if (array('fg_look', 'group-fg_main-2', 'locked') !== $ids) {
	$report->fail('section groups expected [fg_look, group-fg_main-2, locked], got ' . bfields_show($ids));
}
if ('Look & feel' !== $groups[0]['title'] || 'sun' !== $groups[0]['icon'] || true !== $groups[0]['collapsible'] || false !== $groups[0]['collapsed']) {
	$report->fail('fg_look descriptor: ' . bfields_show($groups[0]));
}
if ('card' !== $groups[0]['layout'] || '' !== $groups[0]['card_title']) {
	$report->fail('fg_look layout defaults: ' . bfields_show($groups[0]));
}
if (!isset($groups[1]['dependency'][0]['controller']) || 'top' !== $groups[1]['dependency'][0]['controller'] || true !== $groups[1]['collapsed']) {
	$report->fail('generated group descriptor lost its dependency or collapsed flag: ' . bfields_show($groups[1]));
}
if (array('fg_tail') !== array_column($a['sections'][1]['groups'], 'id') || array() !== $b['sections'][0]['groups']) {
	$report->fail('second section / plain schema groups wrong');
}
$tags = array();
foreach ($a['sections'][0]['fields'] as $field) {
	$tags[$field['id']] = isset($field['fieldGroup']) ? $field['fieldGroup'] : '';
}
$expected_tags = array(
	'top' => '', 'tint' => 'fg_look', 'size' => 'fg_look', 'mode' => 'fg_look', 'deep' => 'fg_look',
	'between' => '', 'box' => 'group-fg_main-2', 'rows' => 'group-fg_main-2', 'gated' => 'group-fg_main-2', 'placeholder' => 'locked',
);
if ($expected_tags !== $tags) {
	$report->fail('fieldGroup tags: expected ' . bfields_show($expected_tags) . ', got ' . bfields_show($tags));
}
$walk_rows = static function (array $fields) use (&$walk_rows): bool {
	foreach ($fields as $field) {
		if (isset($field['fieldGroup']) || (!empty($field['fields']) && $walk_rows($field['fields']))) {
			return true;
		}
	}
	return false;
};
foreach ($a['sections'][0]['fields'] as $field) {
	if (!empty($field['fields']) && $walk_rows($field['fields'])) {
		$report->fail("{$field['id']}: a row or fieldset child carries a fieldGroup tag");
	}
}
$client = Schema::for_client($a);
if ($client['sections'][0]['groups'] !== $groups) {
	$report->fail('for_client() changed the group descriptors');
}

// 2. Storage, options.
$ka = '_bfields_test_fg_a_';
$kb = '_bfields_test_fg_b_';
delete_option($ka);
delete_option($kb);

$both = static function (callable $act) use ($ka, $kb, $a, $b): array {
	$act(new Option($ka), $a);
	$act(new Option($kb), $b);
	return array(get_option($ka), get_option($kb));
};
$same = static function (string $what, array $rows) use ($report): void {
	$report->count('stored rows compared');
	if (!is_array($rows[0]) || serialize($rows[0]) !== serialize($rows[1])) {
		$report->fail("{$what}: wrapped stores " . bfields_show($rows[0]) . ', plain stores ' . bfields_show($rows[1]));
	}
	foreach (array('fg_look', 'fg_inner', 'fg_empty', 'locked', 'group-fg_main-2', 'fg_tail', 'fg_in_row', 'fg_in_fieldset') as $id) {
		if (is_array($rows[0]) && array_key_exists($id, $rows[0])) {
			$report->fail("{$what}: group id {$id} was stored");
		}
	}
};

$same('seed', $both(static function (Option $o, array $s) { $o->seed($s); }));

$posted = array(
	'top' => 'changed', 'tint' => '#000000', 'size' => array('width' => '20', 'unit' => '%', 'tablet' => array('width' => '5', 'unit' => 'px')),
	'mode' => 'b', 'deep' => '', 'between' => '9', 'box' => array('w' => 'W', 'h' => 'H'),
	'rows' => array(array('__id' => 'r1', 'label' => 'L', 'note' => 'N')), 'placeholder' => 'never', 'last' => 'zz',
	'fg_look' => 'injected',
);
$same('save', $both(static function (Option $o, array $s) use ($posted) { $o->save($posted, $s); }));
$same('reset_section', $both(static function (Option $o, array $s) { $o->reset_section('fg_main', $s); }));
$same('save again', $both(static function (Option $o, array $s) use ($posted) { $o->save($posted, $s); }));
$same('reset_all', $both(static function (Option $o, array $s) { $o->reset_all($s); }));

delete_option($ka);
delete_option($kb);

// 2. Storage, post meta.
$post_id = (int) wp_insert_post(array('post_type' => 'post', 'post_status' => 'draft', 'post_title' => 'bfields field_group scratch (safe to delete)'));
try {
	$ma = new PostMeta($post_id, '_bfields_test_fg_ma_');
	$mb = new PostMeta($post_id, '_bfields_test_fg_mb_');
	$ma->save($posted, $a);
	$mb->save($posted, $b);
	$same('post meta save', array(get_post_meta($post_id, '_bfields_test_fg_ma_', true), get_post_meta($post_id, '_bfields_test_fg_mb_', true)));
} finally {
	wp_delete_post($post_id, true);
}

// 4. The Codestar stand-in.
$report->count('pre_fields');
Codestar::createOptions('_bfields_test_fg_inst_', array('save_defaults' => false));
foreach ($wrapped as $section) {
	Codestar::createSection('_bfields_test_fg_inst_', $section);
}
$pre = array_values(array_filter(array_map(static function ($field) {
	return isset($field['id']) ? $field['id'] : '';
}, Instance::for_key('_bfields_test_fg_inst_')->pre_fields)));
$expected_pre = array('top', 'tint', 'size', 'mode', 'deep', 'between', 'box', 'rows', 'gated', 'placeholder', 'last');
if ($expected_pre !== $pre) {
	$report->fail('Instance pre_fields: expected ' . bfields_show($expected_pre) . ', got ' . bfields_show($pre));
}
$registered = Registry::instance()->schema('_bfields_test_fg_inst_');
if (!$registered || array('fg_look', 'group-fg_main-2', 'locked') !== array_column($registered['sections'][0]['groups'], 'id')) {
	$report->fail('a screen registered through the Codestar facade lost its groups');
}

if (defined('WP_DEBUG') && WP_DEBUG) {
	$report->count('debug notices');
	$nested = array_filter($notices, static function ($m) { return false !== strpos($m, 'inside another'); });
	if (array() === $nested) {
		$report->fail('no WP_DEBUG notice for a field_group nested in a field_group');
	}
	$in_row = array_filter($notices, static function ($m) { return false !== strpos($m, 'repeater row or a fieldset'); });
	if (array() === $in_row) {
		$report->fail('no WP_DEBUG notice for a field_group inside a repeater row or fieldset');
	}
}

// 5. The guard path.
$report->count('guard');
$direct = Schema::field(array('id' => 'g', 'type' => 'field_group', 'fields' => array(array('id' => 'x', 'type' => 'text'))));
if (true !== $direct['display'] || array_key_exists('default', $direct) || 'display' !== $direct['core']) {
	$report->fail('Schema::field() on a field_group: expected a display node, got ' . bfields_show($direct));
}

// 6. The group's dependency survives the splice.
$report->count('inherited dependency');
$by_id = static function (array $fields, string $id) {
	foreach ($fields as $field) {
		if (isset($field['id']) && $id === $field['id']) {
			return $field;
		}
	}
	return array();
};
$plain_main = $plain[0]['fields'];
$plain_box  = $by_id($plain_main, 'box');
$plain_gate = $by_id($plain_main, 'gated');
$plain_note = $by_id($by_id($plain_main, 'rows')['fields'], 'note');
if (array('top', '!=', '') !== ($plain_box['dependency'] ?? null)) {
	$report->fail('unwrap: box did not inherit the group rule as authored: ' . bfields_show($plain_box));
}
// '0' in a single rule reaches Codestar as '' (CSF::field() prints only !empty() parts).
if (array(array('top', '!=', ''), array('between', '!=', '')) !== ($plain_gate['dependency'] ?? null)) {
	$report->fail('unwrap: gated did not AND the group rule with its own: ' . bfields_show($plain_gate));
}
if (array('label', '!=', '') !== ($plain_note['dependency'] ?? null)) {
	$report->fail('unwrap: a group inside a row dropped its rule: ' . bfields_show($plain_note));
}
$modern_gate = $by_id($a['sections'][0]['fields'], 'gated');
$modern_note = $by_id($by_id($a['sections'][0]['fields'], 'rows')['fields'], 'note');
if (array('top', 'between') !== array_column($modern_gate['dependency'] ?? array(), 'controller')) {
	$report->fail('schema: gated rules expected [top, between], got ' . bfields_show($modern_gate));
}
if (array('label') !== array_column($modern_note['dependency'] ?? array(), 'controller')) {
	$report->fail('schema: a group inside a row dropped its rule: ' . bfields_show($modern_note));
}
if (array('only' => 1) !== Schema::inherit_dependency(array('only' => 1), null)) {
	$report->fail('inherit_dependency() changed a list for a group without a rule');
}
if (defined('WP_DEBUG') && WP_DEBUG) {
	$notices = array();
	Schema::inherit_dependency(array(array('id' => 'y', 'type' => 'text', 'dependency' => array('b', '==', '2'))), array('a', '==', '1', 'all'));
	if (array() === array_filter($notices, static function ($m) { return false !== strpos($m, 'global (4th) flag'); })) {
		$report->fail('no WP_DEBUG notice for a mixed global flag');
	}
}

$report->finish('a screen with field_group wrappers declares, seeds, saves and resets the same bytes as the same screen without them; group ids are never stored.');
