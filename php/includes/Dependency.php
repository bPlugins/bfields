<?php
/**
 * bfields — dependency rule engine (server side).
 *
 * Keeps Codestar's operators and drops Codestar's DOM. CSF evaluates rules by
 * querying inputs, which is where its hazards come from: the 4th-element global
 * flag, pipe-joined rules always AND'd, radio multi-match filtered by :checked,
 * and the hidden clone template matching first. Against a store, "row-local vs
 * global" is just "this row's values, then the root's", and that whole bug class
 * — including the one that hid the hotspot link fields — disappears.
 *
 * This is the PHP half. The TypeScript half in ui/core/dependency.ts implements
 * the same spec independently (7.15: validation twice, never shared code across
 * the boundary). tests/php/dump-dependencies.php fills the JSON fixture's
 * `expected` column from this class, and tests/ts/dependency.test.ts checks
 * the TypeScript engine against it.
 *
 * @package BFields
 */

namespace BFields;

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Normalises and evaluates CSF dependency rules.
 */
final class Dependency
{
	/**
	 * Normalise CSF's dependency syntax into a flat list of AND'd rules.
	 *
	 * Accepts all three authored forms:
	 *   ['ctrl', '==', 'x']                 one rule
	 *   ['a|b', '==|!=', 'x|y']             pipe-joined, AND'd (CSF's semantics)
	 *   ['ctrl', '==', 'x', 'all']          4th element = global scope
	 *   [['a','==','x'], ['b','!=','y']]    list of rules
	 *
	 * @param array $dependency As authored.
	 * @return array<int, array{controller:string,condition:string,value:string,scope:string}>
	 */
	public static function normalize($dependency): array
	{
		if (!is_array($dependency) || array() === $dependency) {
			return array();
		}

		// A list of rules: first element is itself an array. CSF::field()
		// implodes each column raw (setup.class.php:732-737), so a sub-rule's
		// '0' stays '0'.
		if (isset($dependency[0]) && is_array($dependency[0])) {
			$rules = array();
			foreach ($dependency as $rule) {
				if (!is_array($rule)) {
					continue;
				}
				$rules = array_merge($rules, self::rules(
					isset($rule[0]) ? (string) $rule[0] : '',
					isset($rule[1]) ? (string) $rule[1] : '',
					isset($rule[2]) ? $rule[2] : '',
					isset($rule[3]) ? $rule[3] : ''
				));
			}
			return $rules;
		}

		// One rule (possibly pipe-joined). CSF::field() prints each part only
		// when it is !empty() (setup.class.php:739-742): a value of '0'
		// reaches Codestar's script as '', and no condition as '' — which
		// always shows.
		return self::rules(
			!empty($dependency[0]) ? (string) $dependency[0] : '',
			!empty($dependency[1]) ? (string) $dependency[1] : '',
			!empty($dependency[2]) ? $dependency[2] : '',
			!empty($dependency[3]) ? $dependency[3] : ''
		);
	}

	/**
	 * Split one authored rule's pipe lists into AND'd rules.
	 *
	 * @param string       $controllers Pipe-joined controller ids.
	 * @param string       $conditions  Pipe-joined operators.
	 * @param string|array $values      Pipe-joined values (or a list).
	 * @param mixed        $global      The 4th element.
	 */
	private static function rules(string $controllers, string $conditions, $values, $global): array
	{
		if ('' === $controllers) {
			return array();
		}

		$controllers = explode('|', $controllers);
		$conditions  = explode('|', $conditions);
		$values      = is_array($values) ? $values : explode('|', (string) $values);

		// CSF's 4th element is a global flag: ANY non-empty value (usually
		// 'all') means the controller lives outside this section or group row
		// (setup.class.php:742 — `! empty( $dependency[3] )`).
		//
		// Documented difference (plan 4.2): Codestar applies the flag to the
		// field's whole rule set; bfields applies it per rule. Identical for
		// the authored forms Codestar accepts (one flag per dependency array)
		// and it is what lets a list of rules mix row-local and global
		// controllers without the `hotspot_style` body-class hack.
		$scope = !empty($global) ? 'global' : 'local';

		$rules = array();

		foreach ($controllers as $index => $controller) {
			$controller = trim($controller);
			if ('' === $controller) {
				continue;
			}

			// Pipe lists may be shorter than the controller list. Codestar
			// reads `conditions[index] || conditions[0]` and `values[index] ||
			// ''` (main.js:412-413) — the FIRST condition and an EMPTY value,
			// not the last of either.
			$rules[] = array(
				'controller' => $controller,
				'condition'  => self::js_or($conditions, $index, self::js_or($conditions, 0, '')),
				'value'      => self::js_or($values, $index, ''),
				'scope'      => $scope,
			);
		}

		return $rules;
	}

	/**
	 * JavaScript's `list[index] || fallback` over split strings: a missing or
	 * empty entry falls back ('0' is a non-empty string, so it does not).
	 */
	private static function js_or(array $list, int $index, string $fallback): string
	{
		if (isset($list[$index]) && '' !== (string) $list[$index]) {
			return (string) $list[$index];
		}

		return $fallback;
	}

	/**
	 * Is a field visible, given the current values?
	 *
	 * @param array $rules Normalised rules (all AND'd, as CSF does).
	 * @param array $values Root values.
	 * @param array $row    Row-local values, when evaluating inside a group.
	 */
	public static function visible(array $rules, array $values, array $row = array()): bool
	{
		foreach ($rules as $rule) {
			$current = self::resolve($rule, $values, $row);

			if (!self::evaluate($rule['condition'], $rule['value'], $current)) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Resolve a controller's current value: row first, then root.
	 *
	 * A rule marked `global` skips the row entirely, which is what CSF's 'all'
	 * flag means and what lets the `hotspot_style` body-class hack in
	 * src/admin/index.ts be expressed declaratively instead.
	 */
	private static function resolve(array $rule, array $values, array $row)
	{
		$controller = $rule['controller'];

		if ('global' !== $rule['scope'] && array_key_exists($controller, $row)) {
			return self::shown($rule, $row[$controller]);
		}

		return array_key_exists($controller, $values) ? self::shown($rule, $values[$controller]) : '';
	}

	/**
	 * What a single select shows for a value it does not offer ('' with no
	 * '' option, a deleted preset id): the browser selects Codestar's
	 * placeholder option, else the first option, and Codestar's rules read
	 * that. Schema::tag_select_rules() puts `choices` and `shown` on the rule.
	 * The stored value itself is never changed.
	 *
	 * @param array $rule    Normalised rule.
	 * @param mixed $current The controller's stored value.
	 * @return mixed
	 */
	private static function shown(array $rule, $current)
	{
		if (!isset($rule['choices'], $rule['shown']) || !is_array($rule['choices'])) {
			return $current;
		}

		if (null !== $current && !is_string($current) && !is_int($current) && !is_float($current)) {
			return $current;
		}

		return in_array((string) $current, $rule['choices'], true) ? $current : (string) $rule['shown'];
	}

	/**
	 * Evaluate one rule with Codestar's exact semantics.
	 *
	 * Ported from vendor/codestar-framework/assets/js/plugins.js
	 * (Rule.prototype.evalCondition). `$value` is the rule's value, `$current`
	 * the controller's current value — the same argument order as CSF's
	 * (val1, val2), which matters for the numeric comparisons.
	 */
	public static function evaluate(string $condition, $value, $current): bool
	{
		// Rule.checkCondition(): `if( !this.condition ) { return true; }`.
		if ('' === $condition) {
			return true;
		}

		switch ($condition) {
			// No '=' alias: Codestar has none, and an unknown operator is false.
			case '==':
				return self::loose_equals(self::check_boolean($value), self::check_boolean($current));

			case '!=':
				return !self::loose_equals(self::check_boolean($value), self::check_boolean($current));

			case '>=':
				return (float) $current >= (float) $value;

			case '<=':
				return (float) $current <= (float) $value;

			case '>':
				return (float) $current > (float) $value;

			case '<':
				return (float) $current < (float) $value;

			case 'any':
				return self::in_list($value, $current, true);

			case 'not-any':
				return self::in_list($value, $current, false);

			// CSF's '()' operator calls window[val1] — a DOM/global escape hatch
			// with no server-side meaning. Treated as "visible" so a field can
			// never be hidden by a rule PHP cannot evaluate.
			case '()':
				return true;
		}

		return false;
	}

	/**
	 * CSF's checkBoolean: 1/'1'/true/'true' collapse to true, and
	 * 0/'0'/false/'false'/null to false. Everything else — INCLUDING '' — is
	 * left exactly as it is.
	 */
	private static function check_boolean($value)
	{
		if (true === $value || 1 === $value || '1' === $value || 'true' === $value) {
			return true;
		}

		if (false === $value || 0 === $value || '0' === $value || 'false' === $value || null === $value) {
			return false;
		}

		return $value;
	}

	/**
	 * JavaScript's `==` over the values check_boolean() leaves behind.
	 *
	 * CSF compares with `==`, not `===`, and the difference is load-bearing: a
	 * switcher that has never been toggled is stored as '' (3.1), and
	 * `false == ''` is TRUE in JavaScript because both sides become 0. A rule
	 * written ['thing', '==', '0'] therefore SHOWS its field on a site where
	 * the switcher was never touched — strict equality would hide it, which is
	 * a visible regression on exactly the records section 3.1 warns about.
	 *
	 * PHP's own `==` cannot be used either: PHP casts a string to bool when
	 * comparing against one, so `true == 'abc'` is true here and false in
	 * JavaScript. Both engines spell the rules out instead.
	 */
	private static function loose_equals($a, $b): bool
	{
		if (is_array($a)) {
			return self::loose_equals(implode(',', $a), $b);
		}

		if (is_array($b)) {
			return self::loose_equals($a, implode(',', $b));
		}

		$a_bool = is_bool($a);
		$b_bool = is_bool($b);

		// bool vs bool, string vs string: plain identity.
		if ($a_bool === $b_bool && gettype($a) === gettype($b)) {
			return $a === $b;
		}

		// Anything mixed goes through Number(), where NaN never matches.
		$an = self::to_number($a);
		$bn = self::to_number($b);

		return null !== $an && null !== $bn && $an === $bn;
	}

	/**
	 * JavaScript's Number(): '' is 0, a non-numeric string is NaN (null here).
	 */
	private static function to_number($value): ?float
	{
		if (is_bool($value)) {
			return $value ? 1.0 : 0.0;
		}

		if (is_int($value) || is_float($value)) {
			return (float) $value;
		}

		$text = trim((string) $value);

		if ('' === $text) {
			return 0.0;
		}

		return is_numeric($text) ? (float) $text : null;
	}

	/**
	 * `any` / `not-any` against the rule's comma-separated list.
	 *
	 * CSF splits the RULE value on commas — without trimming, so 'a, b' lists
	 * ' b' — and searches it for the CURRENT value with $.inArray (strict).
	 * Both operators are "does any member match?" loops — `not-any` is
	 * NOT the negation of `any` when the current value is a list: CSF returns
	 * true as soon as one member is missing from the list, so for a multi-select
	 * holding ['a','b'] against 'a', `any` and `not-any` are BOTH true. That is
	 * a quirk, not a bug to fix here — matching it is the point (7.9), and the
	 * only multi-value controllers in 3D Viewer are checkbox/multiple selects
	 * that no rule targets today.
	 *
	 * @param mixed $value   The rule's comma-separated value.
	 * @param mixed $current The controller's current value.
	 * @param bool  $present true for `any`, false for `not-any`.
	 */
	private static function in_list($value, $current, bool $present): bool
	{
		$allowed = explode(',', (string) $value);
		$actual  = is_array($current) ? $current : array($current);

		foreach ($actual as $item) {
			if (in_array((string) $item, $allowed, true) === $present) {
				return true;
			}
		}

		return false;
	}
}
