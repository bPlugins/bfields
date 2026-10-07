/**
 * bfields — dependency rule engine (client side).
 *
 * The twin of php/includes/Dependency.php. Written twice on purpose (7.15):
 * the two implementations share a spec and a JSON fixture, never code. This one
 * decides what the user sees; the PHP one is the truth.
 *
 * Codestar's operators, none of Codestar's DOM. CSF resolves a controller by
 * querying inputs, which is where its hazards live — the hidden clone template
 * matching first, radio multi-match filtered by :checked, row-local controllers
 * leaking to the page. Against a store, "row-local vs global" is just "this
 * row's values, then the root's" (4.0).
 */

import type { DependencyRule, FieldValue, Values } from './types';

/**
 * Codestar's checkBoolean (assets/js/plugins.js): 1/'1'/true/'true' collapse to
 * true, and 0/'0'/false/'false'/null to false. Everything else — including ''
 * — is left exactly as it is.
 */
function checkBoolean(value: unknown): unknown {
	if (value === true || value === 1 || value === '1' || value === 'true') {
		return true;
	}

	if (
		value === false ||
		value === 0 ||
		value === '0' ||
		value === 'false' ||
		value === null ||
		value === undefined
	) {
		return false;
	}

	return value;
}

/**
 * JavaScript's `==` over the values checkBoolean leaves behind.
 *
 * CSF compares with `==`, not `===`, and that difference is load-bearing: a
 * switcher that has never been toggled is stored as '' (3.1), and `false == ''`
 * is TRUE in JavaScript because both sides become 0. A rule written
 * `['thing', '==', '0']` therefore SHOWS its field on a site where the switcher
 * was never touched. Strict equality would hide it — a visible regression on
 * exactly the records section 3.1 warns about.
 *
 * Neither language's native `==` can be used directly: PHP 8 casts a string to
 * bool when comparing against one, so `true == 'abc'` is true in PHP and false
 * in JavaScript. Both engines therefore spell the rules out.
 */
function toNumber(value: unknown): number {
	if (typeof value === 'boolean') {
		return value ? 1 : 0;
	}

	if (typeof value === 'number') {
		return value;
	}

	if (Array.isArray(value)) {
		return toNumber(value.join(','));
	}

	const text = String(value).trim();

	return text === '' ? 0 : Number(text);
}

function looseEquals(a: unknown, b: unknown): boolean {
	if (Array.isArray(a)) {
		return looseEquals(a.join(','), b);
	}

	if (Array.isArray(b)) {
		return looseEquals(a, b.join(','));
	}

	const aBool = typeof a === 'boolean';
	const bBool = typeof b === 'boolean';

	// bool vs bool, string vs string: plain identity.
	if (aBool === bBool && typeof a === typeof b) {
		return a === b;
	}

	// Anything mixed goes through Number(), where NaN never matches.
	const an = toNumber(a);
	const bn = toNumber(b);

	return !Number.isNaN(an) && !Number.isNaN(bn) && an === bn;
}

/**
 * `any` / `not-any` against the rule's comma-separated list.
 *
 * CSF splits the RULE value on commas — without trimming, so 'a, b' lists ' b'
 * — and searches it for the CURRENT value.
 * Note that `not-any` is NOT the negation of `any` when the current value is a
 * list: CSF returns true as soon as one member is missing from the list, so a
 * multi-select holding ['a','b'] tested against 'a' satisfies BOTH. Matching
 * that quirk is deliberate (7.9); php/includes/Dependency.php does the same.
 */
function inList(value: string, current: FieldValue | undefined, present: boolean): boolean {
	const allowed = String(value).split(',');
	const actual = Array.isArray(current) ? current : [current];

	return actual.some((item) => allowed.includes(String(item)) === present);
}

/**
 * Evaluate one rule. `value` is the rule's, `current` the controller's — the
 * same argument order as CSF's (val1, val2), which is what makes the numeric
 * comparisons read the right way round.
 */
export function evaluate(condition: string, value: string, current: FieldValue | undefined): boolean {
	// Rule.checkCondition(): `if( !this.condition ) { return true; }`.
	if (condition === '') {
		return true;
	}

	switch (condition) {
		// No '=' alias: Codestar has none, and an unknown operator is false.
		case '==':
			return looseEquals(checkBoolean(value), checkBoolean(current));

		case '!=':
			return !looseEquals(checkBoolean(value), checkBoolean(current));

		case '>=':
			return Number(current) >= Number(value);

		case '<=':
			return Number(current) <= Number(value);

		case '>':
			return Number(current) > Number(value);

		case '<':
			return Number(current) < Number(value);

		case 'any':
			return inList(value, current, true);

		case 'not-any':
			return inList(value, current, false);

		// CSF's '()' calls window[val1]. There is no safe equivalent here, and a
		// field must never be hidden by a rule the engine cannot evaluate.
		case '()':
			return true;

		default:
			return false;
	}
}

/**
 * Resolve a controller's value: this row first, then the root.
 *
 * A `global` rule (Codestar's 4th `'all'` element) skips the row. That is what
 * lets the hotspot link-field rule — the one Codestar could not express, hence
 * the body-class hack in src/admin/index.ts — be written declaratively.
 */
function resolve(
	rule: DependencyRule,
	values: Values,
	row?: Values
): FieldValue | undefined {
	if (rule.scope !== 'global' && row && Object.prototype.hasOwnProperty.call(row, rule.controller)) {
		return shown(rule, row[rule.controller]);
	}

	return Object.prototype.hasOwnProperty.call(values, rule.controller)
		? shown(rule, values[rule.controller])
		: values[rule.controller];
}

/**
 * A single select holding a value it does not offer ('' with no '' option, a
 * deleted preset id) shows Codestar's placeholder or first option, and its
 * rules read that (`choices` / `shown` come from Schema::tag_select_rules()).
 * Dependency::shown() is the PHP twin. The stored value is never changed.
 */
export function shown(rule: DependencyRule, current: FieldValue | undefined): FieldValue | undefined {
	if (!Array.isArray(rule.choices) || rule.shown === undefined) {
		return current;
	}

	if (current !== null && current !== undefined && typeof current !== 'string' && typeof current !== 'number') {
		return current;
	}

	const text = current === null || current === undefined ? '' : String(current);

	return rule.choices.includes(text) ? current : rule.shown;
}

/**
 * Is a field visible? All rules are AND'd, exactly as Codestar AND's them.
 */
export function isVisible(
	rules: DependencyRule[] | undefined,
	values: Values,
	row?: Values
): boolean {
	if (!rules || rules.length === 0) {
		return true;
	}

	return rules.every((rule) => evaluate(rule.condition, rule.value, resolve(rule, values, row)));
}
