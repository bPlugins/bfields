<?php
/**
 * bfields — shared helpers for the PHP suites.
 *
 * Each suite is run with `wp eval-file`, which eval()s the file: __DIR__ and
 * __FILE__ point at the eval context, so paths are anchored to BFIELDS_ROOT
 * (bin/test.sh sets it) or the plugin directory.
 *
 * WHERE THE FIELD SETS COME FROM
 *
 *   default                         The LIVE Codestar registry. 3D Viewer only
 *                                   registers its screens in wp-admin, and the
 *                                   product box only on a product edit request,
 *                                   so bin/test.sh boots wp-cli in that context.
 *                                   A key Codestar does not hold falls back to
 *                                   the bfields registry (a host in Modern mode).
 *   BFIELDS_SCHEMA_SOURCE=inventory tests/php/fixtures/schema-inventory.json —
 *                                   the same registry, captured. CI uses it: it
 *                                   has Codestar but not 3D Viewer.
 *
 * A key with no field set is a FAILURE, never a skip. That is the hole review
 * 3.1 found: both suites reported PASS on 0 records.
 */

if (!defined('ABSPATH')) {
	exit;
}

$GLOBALS['bfields_test_root'] = rtrim((string) (getenv('BFIELDS_ROOT') ?: WP_PLUGIN_DIR . '/bfields'), '/') . '/';

require_once $GLOBALS['bfields_test_root'] . 'php/includes/load.php';

/*
 * The host wiring 3D Viewer Pro ships for its one custom Codestar type
 * (integration report 2026-09-26, D1): `bp3d_responsive_dimensions` is mapped
 * onto the `dimension` renderer, and its fields carry `'responsive' => true`
 * (bfields_test_screen() adds that below; Codestar ignores the key). The
 * suites prove the data under THAT wiring, not under the unmapped fallback,
 * which the opaque-types check in roundtrip.php covers on its own.
 *
 * Added before any schema is built: Schema::type_map() caches the filter.
 */
const BFIELDS_TEST_HOST_TYPES = array('bp3d_responsive_dimensions' => 'dimension');

add_filter('bfields_type_map', static function (array $map): array {
	// `bfields_test_rows` is not a host's: roundtrip.php uses it to check that
	// a mapped type is stored the way its core's Codestar type is.
	return $map + BFIELDS_TEST_HOST_TYPES + array('bfields_test_rows' => 'repeater');
});

/**
 * Mark the host's responsive types `'responsive' => true`, at any depth.
 */
function bfields_test_host_recipe(array $fields): array
{
	foreach ($fields as $i => $field) {
		if (!is_array($field)) {
			continue;
		}
		if (isset($field['type']) && isset(BFIELDS_TEST_HOST_TYPES[$field['type']])) {
			$fields[$i]['responsive'] = true;
		}
		if (!empty($field['fields']) && is_array($field['fields'])) {
			$fields[$i]['fields'] = bfields_test_host_recipe($field['fields']);
		}
	}

	return $fields;
}

function bfields_test_root(): string
{
	return $GLOBALS['bfields_test_root'];
}

/**
 * A screen as Codestar holds it: ['kind' => …, 'args' => …, 'sections' => …].
 */
function bfields_test_screen(string $unique): ?array
{
	if ('inventory' === getenv('BFIELDS_SCHEMA_SOURCE')) {
		static $inventory = null;

		if (null === $inventory) {
			$inventory = json_decode((string) file_get_contents(bfields_test_root() . 'tests/php/fixtures/schema-inventory.json'), true);
		}

		$screen = isset($inventory['screens'][$unique]) ? $inventory['screens'][$unique] : null;

		return $screen && !empty($screen['sections']) ? $screen : null;
	}

	// A host in Modern mode hands the same field arrays to bfields instead of Codestar.
	if (!class_exists('CSF_Setup')) {
		return bfields_test_registered_screen($unique);
	}

	$args = CSF_Setup::$args;

	if (isset($args['admin_options'][$unique])) {
		$kind = 'options';
		$screen_args = $args['admin_options'][$unique];
	} elseif (isset($args['metabox_options'][$unique])) {
		$kind = 'metabox';
		$screen_args = $args['metabox_options'][$unique];
	} else {
		return bfields_test_registered_screen($unique);
	}

	$sections = isset($args['sections'][$unique]) ? $args['sections'][$unique] : array();

	if (array() === $sections) {
		return bfields_test_registered_screen($unique);
	}

	return array('kind' => $kind, 'args' => $screen_args, 'sections' => $sections);
}

/**
 * A screen as the host registered it with bfields (\BFields\Compat\Codestar).
 */
function bfields_test_registered_screen(string $unique): ?array
{
	$screen = \BFields\Registry::instance()->screen($unique);

	return $screen && !empty($screen['sections']) ? $screen : null;
}

/**
 * The bfields schema for a key, built from bfields_test_screen().
 */
function bfields_test_schema(string $unique): ?array
{
	$screen = bfields_test_screen($unique);

	if (!$screen) {
		return null;
	}

	foreach ($screen['sections'] as $i => $section) {
		if (!empty($section['fields']) && is_array($section['fields'])) {
			$screen['sections'][$i]['fields'] = bfields_test_host_recipe($section['fields']);
		}
	}

	return \BFields\Schema::build($unique, $screen['kind'], $screen['args'], $screen['sections']);
}

/**
 * Strict comparison that also catches array key REORDERING.
 *
 * Key order matters: PHP serialize() preserves insertion order, so an array
 * rebuilt in a different order is different bytes in wp_options even though
 * PHP's own === would call the two arrays equal.
 */
function bfields_identical($a, $b): bool
{
	if (is_array($a) !== is_array($b)) {
		return false;
	}

	if (is_array($a)) {
		if (array_keys($a) !== array_keys($b)) {
			return false;
		}
		foreach ($a as $key => $value) {
			if (!bfields_identical($value, $b[$key])) {
				return false;
			}
		}
		return true;
	}

	// Identical type AND value: '1' must not pass as 1, and '' must not pass
	// as null — those are exactly the distinctions section 3.1 turns on.
	return $a === $b;
}

function bfields_show($value): string
{
	$json = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
	$json = false === $json ? var_export($value, true) : $json;

	return strlen($json) > 220 ? substr($json, 0, 220) . '…' : $json;
}

/**
 * Collects results and prints the verdict.
 */
final class BFields_Report
{
	/** @var string */
	private $title;

	/** @var array<string, int> */
	public $counts = array();

	/** @var array<string, int> */
	public $notes = array();

	/** @var string[] */
	public $failures = array();

	public function __construct(string $title)
	{
		$this->title = $title;
	}

	public function count(string $what, int $by = 1): void
	{
		$this->counts[$what] = (isset($this->counts[$what]) ? $this->counts[$what] : 0) + $by;
	}

	public function note(string $what): void
	{
		$this->notes[$what] = (isset($this->notes[$what]) ? $this->notes[$what] : 0) + 1;
	}

	public function fail(string $message): void
	{
		$this->failures[] = $message;
	}

	/**
	 * Fail unless $what was counted at least once. A suite that checked
	 * nothing has proved nothing.
	 */
	public function require_nonzero(string $what): void
	{
		if (empty($this->counts[$what])) {
			$this->fail(sprintf('nothing checked: "%s" is 0 — the suite proved nothing (is 3D Viewer registering its screens in this context?)', $what));
		}
	}

	/**
	 * Print and exit: 0 when green, 1 otherwise.
	 */
	public function finish(string $pass_message): void
	{
		echo "\n", $this->title, "\n", str_repeat('-', 64), "\n";

		foreach ($this->counts as $what => $count) {
			printf("%-40s %d\n", $what . ':', $count);
		}

		if (array() !== $this->notes) {
			echo "\nsanctioned / informational:\n";
			arsort($this->notes);
			foreach ($this->notes as $what => $count) {
				printf("  %-60s %d\n", $what, $count);
			}
		}

		echo str_repeat('-', 64), "\n";

		if (array() === $this->failures) {
			echo 'PASS — ', $pass_message, "\n\n";
			exit(0);
		}

		printf("FAIL — %d problem(s):\n\n", count($this->failures));

		foreach (array_slice($this->failures, 0, 40) as $failure) {
			echo '  ', $failure, "\n\n";
		}

		if (count($this->failures) > 40) {
			printf("  … and %d more.\n\n", count($this->failures) - 40);
		}

		exit(1);
	}
}
