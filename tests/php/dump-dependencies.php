<?php
/**
 * bfields — build the shared dependency fixture.
 *
 * Collects every `dependency` rule any bPlugins plugin registers with Codestar
 * on this machine, normalises it through \BFields\Dependency, generates value
 * permutations for each controller, and records what the PHP engine decides.
 *
 * tests/ts/dependency.test.ts then runs the SAME table through the TypeScript
 * engine and asserts identical results — the "PHP and TS agree on the rule
 * table from all six field files" exit criterion of Phase 1 (plan 8.2).
 *
 *   wp eval-file wp-content/plugins/bfields/tests/php/dump-dependencies.php
 *
 * Screens a host registered with bfields (Modern mode) are read from the
 * bfields registry; the demo's `_bfields_*` keys are left out.
 *
 * BFIELDS_DEP_TIER=free registers 3D Viewer Premium's free field sets with
 * can_use_premium_code() false in memory (the 3D Viewer Premium harness's
 * licence-lapse.php does the same), labels their origins `{unique}@free`, and
 * MERGES the new cases into the existing fixture instead of replacing it.
 * Run it in bin/test.sh's wp-admin/product-edit context.
 */

if (!defined('ABSPATH')) {
	exit;
}

$bfields_root = (getenv('BFIELDS_ROOT') ?: WP_PLUGIN_DIR . '/bfields') . '/';

require_once $bfields_root . 'php/includes/load.php';

if (!class_exists('CSF_Setup')) {
	echo "Codestar is not loaded — cannot collect rules.\n";
	exit(1);
}

$free_tier = 'free' === getenv('BFIELDS_DEP_TIER');

if ($free_tier) {
	global $wpdb;

	$fs_accounts = $wpdb->get_var("SELECT option_value FROM {$wpdb->options} WHERE option_name = 'fs_accounts'");

	$fs      = bp3d_fs();
	$license = new ReflectionProperty(get_class($fs), '_license');
	$site    = new ReflectionProperty(get_class($fs), '_site');
	$license->setAccessible(true);
	$site->setAccessible(true);
	$real_license = $license->getValue($fs);
	$real_site    = $site->getValue($fs);

	$trial_site = is_object($real_site) ? clone $real_site : null;
	if ($trial_site && property_exists($trial_site, 'trial_ends')) {
		$trial_site->trial_ends    = null;
		$trial_site->trial_plan_id = null;
	}
	$license->setValue($fs, null);
	$site->setValue($fs, $trial_site);

	if (false !== bp3d_fs()->can_use_premium_code()) {
		echo "Could not make can_use_premium_code() false.\n";
		exit(1);
	}

	$registry = \BFields\Registry::instance();
	foreach (array('screens', 'schemas') as $prop) {
		$ref = new ReflectionProperty(\BFields\Registry::class, $prop);
		$ref->setAccessible(true);
		$ref->setValue($registry, array());
	}
	foreach (array('modern', 'sections') as $prop) {
		$ref = new ReflectionProperty(\BP3D\Helper\Registrar::class, $prop);
		$ref->setAccessible(true);
		$ref->setValue(null, array());
	}

	// Register with bfields whatever the site's interface is.
	add_filter('bp3d_admin_ui_surface', static function () {
		return 'modern';
	});

	require_once BP3D_PATH . 'inc/Field/Viewer.php';
	require_once BP3D_PATH . 'inc/Field/Settings.php';
	require_once BP3D_PATH . 'inc/Woocommerce/ProductMeta.php';

	(new \BP3D\Field\Viewer())->create_metabox();
	(new \BP3D\Field\Settings())->init();
	(new \BP3D\Woocommerce\ProductMeta())->register();

	$license->setValue($fs, $real_license);
	$site->setValue($fs, $real_site);

	if (array() === \BFields\Registry::instance()->keys()) {
		echo "The free field sets did not register with bfields.\n";
		exit(1);
	}

	if ($fs_accounts !== $wpdb->get_var("SELECT option_value FROM {$wpdb->options} WHERE option_name = 'fs_accounts'")) {
		echo "fs_accounts changed — stop and check Freemius.\n";
		exit(1);
	}
}

$args     = CSF_Setup::$args;
$sections = $free_tier ? array() : (isset($args['sections']) ? $args['sections'] : array());

foreach (\BFields\Registry::instance()->keys() as $unique) {
	if (!isset($sections[$unique]) && 0 !== strpos($unique, '_bfields_')) {
		$sections[$unique] = \BFields\Registry::instance()->screen($unique)['sections'];
	}
}

$raw = array();

/** Walk every field, including group sub-fields, collecting dependencies. */
$walk = function ($fields, $screen, $inGroup) use (&$walk, &$raw) {
	foreach ((array) $fields as $field) {
		if (!is_array($field)) {
			continue;
		}

		if (!empty($field['dependency'])) {
			$raw[] = array(
				'screen'     => $screen,
				'field'      => isset($field['id']) ? $field['id'] : '(none)',
				'type'       => isset($field['type']) ? $field['type'] : '(none)',
				'in_group'   => $inGroup,
				'dependency' => $field['dependency'],
			);
		}

		if (!empty($field['fields'])) {
			$walk($field['fields'], $screen, $inGroup || in_array(
				isset($field['type']) ? $field['type'] : '',
				array('group', 'repeater'),
				true
			));
		}
	}
};

foreach ($sections as $unique => $screen_sections) {
	foreach ($screen_sections as $section) {
		if (!empty($section['fields'])) {
			$walk($section['fields'], $free_tier ? $unique . '@free' : $unique, false);
		}
	}
}

/**
 * Values worth trying against a controller.
 *
 * Deliberately includes the legacy variants section 3.1 documents — '' for a
 * never-toggled switcher, PHP booleans from a Codestar Reset, and numeric
 * strings — because those are precisely where two engines drift apart.
 */
function bfields_dep_probe_values($rule_value): array
{
	$probes = array('', '0', '1', 'true', 'false', 0, 1, true, false, null, 'other');

	// The rule's own value, and each member when it is a comma list.
	$probes[] = (string) $rule_value;

	foreach (explode(',', (string) $rule_value) as $part) {
		$probes[] = trim($part);
	}

	// A multi-value controller, which is where `any` / `not-any` diverge.
	$probes[] = array('a', 'b');
	$probes[] = array(trim((string) $rule_value));

	return $probes;
}

$cases = array();

foreach ($raw as $entry) {
	$rules = \BFields\Dependency::normalize($entry['dependency']);

	if (array() === $rules) {
		continue;
	}

	foreach ($rules as $rule) {
		foreach (bfields_dep_probe_values($rule['value']) as $probe) {
			// Once at the root, once with the controller inside a group row, so
			// the row-first-then-root resolution is covered both ways.
			$cases[] = array(
				'rules'    => array($rule),
				'values'   => array($rule['controller'] => $probe),
				'row'      => new stdClass(),
				'expected' => \BFields\Dependency::visible(array($rule), array($rule['controller'] => $probe)),
				'origin'   => $entry['screen'] . '::' . $entry['field'],
			);

			$cases[] = array(
				'rules'    => array($rule),
				'values'   => array($rule['controller'] => 'root-value'),
				'row'      => array($rule['controller'] => $probe),
				'expected' => \BFields\Dependency::visible(
					array($rule),
					array($rule['controller'] => 'root-value'),
					array($rule['controller'] => $probe)
				),
				'origin'   => $entry['screen'] . '::' . $entry['field'] . ' (row)',
			);
		}
	}

	// The whole rule set AND'd together, with every controller unset.
	$cases[] = array(
		'rules'    => $rules,
		'values'   => new stdClass(),
		'row'      => new stdClass(),
		'expected' => \BFields\Dependency::visible($rules, array()),
		'origin'   => $entry['screen'] . '::' . $entry['field'] . ' (all unset)',
	);
}

/**
 * The data-* attributes REAL Codestar prints for a dependency.
 *
 * CSF::field() is called with the rule on a bare `content` field, and the
 * attributes are read back out of its HTML. tests/ts/codestar-parity.test.ts
 * then parses them with Codestar's own main.js lines and compares the result
 * with \BFields\Dependency::normalize() — so the parse is checked against
 * Codestar itself, not against a second reading of it (review 4.4).
 */
function bfields_dep_csf_attributes($dependency): array
{
	ob_start();
	CSF::field(array('type' => 'content', 'content' => '', 'dependency' => $dependency), '', 'bfields_probe');
	$html = (string) ob_get_clean();

	$attrs = array();

	foreach (array('controller', 'condition', 'value', 'depend-global') as $name) {
		$attrs[$name] = preg_match('/ data-' . preg_quote($name, '/') . '="([^"]*)"/', $html, $match)
			? html_entity_decode($match[1], ENT_QUOTES)
			: '';
	}

	return $attrs;
}

// Every authored form, plus the edge cases the plan's fallback rules turn on.
$authored = array_map(static function ($entry) {
	return array('origin' => $entry['screen'] . '::' . $entry['field'], 'dependency' => $entry['dependency']);
}, $raw);

foreach ($free_tier ? array() : array(
	array('a|b|c', '==', 'x'),
	array('a|b|c', '==|!=', 'x|y'),
	array('a|b', '', 'x|y'),
	array('a|b', '==||', '1'),
	array('a', '==', '0'),
	array('a|b', '==|any', '0|p,q', 'all'),
	array('a', 'any', 'p, q'),
	array('a', '==', '1', true),
	array(array('a', '==', 'x'), array('b', '!=', 'y', 'all')),
) as $index => $synthetic) {
	$authored[] = array('origin' => 'synthetic #' . $index, 'dependency' => $synthetic);
}

$normalization = array();

foreach ($authored as $entry) {
	$normalization[] = array(
		'origin' => $entry['origin'],
		// The list-of-rules form: Codestar makes the WHOLE set global if any
		// rule is; bfields scopes each rule (documented difference, plan 4.2).
		'list'   => isset($entry['dependency'][0]) && is_array($entry['dependency'][0]),
		'csf'    => bfields_dep_csf_attributes($entry['dependency']),
		'rules'  => \BFields\Dependency::normalize($entry['dependency']),
	);
}

$path  = $bfields_root . 'tests/fixtures/dependency-cases.json';
$found = count($raw);
$added = count($cases);

if ($free_tier) {
	// Objects, not arrays: an empty `row` must stay `{}`.
	$previous = json_decode((string) file_get_contents($path));

	if (!is_object($previous) || empty($previous->cases)) {
		echo "No existing fixture to merge into — run the Pro dump first.\n";
		exit(1);
	}

	$seen = array();
	foreach ($previous->cases as $case) {
		$seen[wp_json_encode(array($case->rules, $case->values, $case->row))] = true;
	}
	$fresh = array();
	foreach ($cases as $case) {
		$key = wp_json_encode(array($case['rules'], $case['values'], $case['row']));
		if (!isset($seen[$key])) {
			$seen[$key] = true;
			$fresh[]    = $case;
		}
	}

	$origins = array_flip(array_column($previous->normalization, 'origin'));
	$normalization = array_merge($previous->normalization, array_values(array_filter($normalization, static function ($entry) use ($origins) {
		return !isset($origins[$entry['origin']]);
	})));

	$added = count($fresh);
	$cases = array_merge($previous->cases, $fresh);
	$raw   = array_fill(0, (int) $previous->rules_found + $found, null);
}

$fixture = array(
	'captured' => gmdate('c'),
	'note'     => 'Generated by tests/php/dump-dependencies.php from the live Codestar registry'
		. ($free_tier ? ', merged with 3D Viewer Premium\'s free-tier field sets (origins `{unique}@free`)' : '') . '. '
		. 'Expected values are the PHP engine\'s; tests/ts/dependency.test.ts asserts the TS engine matches.',
	'rules_found' => count($raw),
	'cases'    => $cases,
	'normalization' => $normalization,
);

if (!is_dir(dirname($path))) {
	mkdir(dirname($path), 0755, true);
}

file_put_contents($path, json_encode($fixture, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

printf("Wrote %s\n  %d dependency rules found this run, %d new cases, %d cases in total, %d normalization entries (%s).\n", $path, $found, $added, count($cases), count($normalization), size_format(filesize($path)));
