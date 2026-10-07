<?php
/**
 * Dumps the live Codestar registry to tests/php/fixtures/schema-inventory.json.
 *
 * This is the contract bfields is tested against (plan, Phase 0): every screen,
 * section and field that any bPlugins product registers with Codestar on this
 * machine. Run with:
 *
 *   wp eval-file wp-content/plugins/bfields/tests/php/dump-inventory.php
 *
 * Closures (CSF `callback` / `content` fields, 15 of them in 3D Viewer) cannot
 * be serialized; they are recorded as a marker so the inventory still shows
 * that the field exists and what type it is.
 *
 * A host in Modern mode registers with bfields instead of Codestar; those
 * screens are read from the bfields registry (the demo's `_bfields_*` keys are
 * left out). A screen in the previous inventory that nothing registers now
 * (a product inactive on this machine) is carried over and listed under
 * `carried_over`; BFIELDS_INVENTORY_KEEP=0 drops it instead.
 */

if (!class_exists('CSF_Setup') && !class_exists('BFields\\Registry')) {
	echo "Neither Codestar nor bfields is loaded — nothing to dump.\n";
	return;
}

/**
 * Recursively replace anything JSON cannot hold.
 */
function bfields_dump_scrub($value)
{
	if (is_array($value)) {
		$out = array();
		foreach ($value as $key => $item) {
			$out[$key] = bfields_dump_scrub($item);
		}
		return $out;
	}

	if ($value instanceof Closure) {
		return '<closure>';
	}

	if (is_object($value)) {
		return '<object:' . get_class($value) . '>';
	}

	// Nonces in printed links change on every run.
	return is_string($value) ? preg_replace('/_wpnonce=[0-9a-f]{10}/', '_wpnonce=<nonce>', $value) : $value;
}

$path = rtrim((string) (getenv('BFIELDS_ROOT') ?: WP_PLUGIN_DIR . '/bfields'), '/') . '/tests/php/fixtures/schema-inventory.json';

$args      = class_exists('CSF_Setup') ? CSF_Setup::$args : array();
$sections  = isset($args['sections']) ? $args['sections'] : array();
$inventory = array(
	'captured'     => gmdate('c'),
	'csf_version'  => class_exists('CSF_Setup') ? CSF_Setup::$version : '',
	'screens'      => array(),
	'sources'      => array(),
	'carried_over' => array(),
	'type_tally'   => array(),
);

$tally = array();

foreach (array('admin_options' => 'options', 'metabox_options' => 'metabox') as $bucket => $kind) {
	foreach ((isset($args[$bucket]) ? $args[$bucket] : array()) as $unique => $screen_args) {
		$inventory['screens'][$unique] = array(
			'kind'     => $kind,
			'args'     => bfields_dump_scrub($screen_args),
			'sections' => bfields_dump_scrub(isset($sections[$unique]) ? $sections[$unique] : array()),
		);
		$inventory['sources'][$unique] = 'codestar';
	}
}

if (class_exists('BFields\\Registry')) {
	foreach (\BFields\Registry::instance()->keys() as $unique) {
		if (isset($inventory['screens'][$unique]) || 0 === strpos($unique, '_bfields_')) {
			continue;
		}
		$inventory['screens'][$unique] = bfields_dump_scrub(\BFields\Registry::instance()->screen($unique));
		$inventory['sources'][$unique] = 'bfields';
	}
}

$previous = is_readable($path) ? json_decode((string) file_get_contents($path), true) : null;

if ('0' !== getenv('BFIELDS_INVENTORY_KEEP') && is_array($previous) && !empty($previous['screens'])) {
	foreach ($previous['screens'] as $unique => $screen) {
		if (!isset($inventory['screens'][$unique])) {
			$inventory['screens'][$unique] = $screen;
			$inventory['sources'][$unique] = 'carried';
			$inventory['carried_over'][$unique] = isset($previous['carried_over'][$unique]) ? $previous['carried_over'][$unique] : $previous['captured'];
		}
	}
}

// Tally every field type in the inventory, including nested group sub-fields.
$walk = function ($fields) use (&$walk, &$tally) {
	foreach ((array) $fields as $field) {
		if (!is_array($field) || empty($field['type'])) {
			continue;
		}
		$type         = $field['type'];
		$tally[$type] = isset($tally[$type]) ? $tally[$type] + 1 : 1;
		if (!empty($field['fields'])) {
			$walk($field['fields']);
		}
	}
};

foreach ($inventory['screens'] as $screen) {
	foreach ($screen['sections'] as $section) {
		if (!empty($section['fields'])) {
			$walk($section['fields']);
		}
	}
}

arsort($tally);
$inventory['type_tally'] = $tally;

file_put_contents($path, json_encode($inventory, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

printf(
	"Wrote %s (%d screens, %d carried over, %d field types, %s).\n",
	$path,
	count($inventory['screens']),
	count($inventory['carried_over']),
	count($tally),
	size_format(filesize($path))
);
