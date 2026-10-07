<?php
/**
 * bfields — replay the dependency fixtures through the PHP engine.
 *
 * dependency-cases.json takes its `expected` column from \BFields\Dependency
 * when it is captured, so a later change to the PHP engine would only show up
 * on the TypeScript side. This catches it here, and replays the hand-written
 * mixed-scope table (the TS suite replays both too). Plain PHP, no WordPress:
 *
 *   php tests/php/dependency-replay.php
 */

define('ABSPATH', __DIR__ . '/');

require dirname(__DIR__, 2) . '/php/includes/Dependency.php';

$root = dirname(__DIR__) . '/fixtures/';
$fail = 0;
$runs = 0;

/** JSON objects decode to arrays here; an empty `row` is the same as none. */
$replay = static function (string $file) use ($root, &$fail, &$runs): void {
	$fixture = json_decode((string) file_get_contents($root . $file), true);

	if (!is_array($fixture) || empty($fixture['cases'])) {
		echo "$file: no cases\n";
		$fail++;
		return;
	}

	foreach ($fixture['cases'] as $i => $case) {
		$runs++;
		$got = \BFields\Dependency::visible($case['rules'], (array) $case['values'], (array) $case['row']);

		if ($got !== $case['expected']) {
			$fail++;
			printf("%s #%d %s: expected %s, got %s\n", $file, $i, $case['origin'], var_export($case['expected'], true), var_export($got, true));
		}
	}

	if (isset($fixture['dependency'])) {
		$runs++;
		$rules = \BFields\Dependency::normalize($fixture['dependency']);

		if ($rules !== $fixture['cases'][0]['rules']) {
			$fail++;
			printf("%s: the authored dependency normalizes to %s\n", $file, json_encode($rules));
		}
	}
};

$replay('dependency-cases.json');
$replay('mixed-scope-cases.json');

printf("%d checks, %d failed\n", $runs, $fail);
exit($fail > 0 ? 1 : 0);
