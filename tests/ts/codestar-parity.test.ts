/**
 * bfields — the dependency engines must agree with CODESTAR, not only with
 * each other.
 *
 * dependency.test.ts proves the TS engine matches the PHP one. That cannot
 * catch a misreading of Codestar the two share (review 4.4: both fell back to
 * the LAST pipe entry; Codestar reads `conditions[index] || conditions[0]` and
 * `values[index] || ''`). This file compares bfields against Codestar's own
 * code, extracted verbatim into tests/fixtures/codestar/csf-deps.cjs:
 *
 *   1. Parsing. For every dependency any bPlugins plugin registers (plus the
 *      edge cases), the fixture holds the data-* attributes real CSF::field()
 *      printed and the rules \BFields\Dependency::normalize() produced.
 *      Codestar's main.js lines turn the attributes into rules; they must be
 *      the same rules.
 *   2. Evaluation. Every operator, over rule values and controller values the
 *      DOM can hold (strings and string lists), through Codestar's
 *      Rule.evalCondition and through bfields' evaluate().
 */

import { evaluate } from '../../ui/core/dependency';
import type { DependencyRule } from '../../ui/core/types';
import cases from '../fixtures/dependency-cases.json';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const csf = require('../fixtures/codestar/csf-deps.cjs') as {
	readRules: (attrs: Record<string, string>) => {
		rules: Array<{ selector: string; condition: string; value: string }>;
		global: boolean;
	};
	Rule: {
		evalCondition: (context: null, control: null, condition: string, val1: string, val2: unknown) => boolean;
		checkBoolean: (value: unknown) => unknown;
	};
};

type Normalization = {
	origin: string;
	list: boolean;
	csf: Record<string, string>;
	rules: DependencyRule[];
};

const normalization = (cases as unknown as { normalization: Normalization[] }).normalization;

/** Codestar's rule, in bfields' shape. */
function fromCodestar(attrs: Record<string, string>): DependencyRule[] {
	const { rules, global } = csf.readRules(attrs);

	return rules
		.map((rule) => ({
			controller: rule.selector.replace(/^\[data-depend-id="(.*)"\]$/, '$1'),
			condition: rule.condition,
			value: rule.value,
			scope: (global ? 'global' : 'local') as DependencyRule['scope'],
		}))
		// Dependency::normalize() drops an empty controller: Codestar builds a
		// rule for `[data-depend-id=""]`, which matches nothing.
		.filter((rule) => rule.controller.trim() !== '');
}

describe('dependency parsing matches Codestar main.js', () => {
	it('covers the real rule set and the edge cases', () => {
		expect(normalization.length).toBeGreaterThan(100);
		expect(normalization.some((entry) => entry.origin.startsWith('synthetic'))).toBe(true);
	});

	it('produces the rules Codestar builds from the attributes it prints', () => {
		const differences: string[] = [];

		normalization.forEach((entry) => {
			let expected = fromCodestar(entry.csf);
			let actual = entry.rules.map((rule) => ({ ...rule, controller: rule.controller.trim() }));

			// The one documented difference (plan 4.2): in the list-of-rules
			// form Codestar makes the whole set global when any rule is; bfields
			// scopes each rule. Everything else about the list must still match.
			if (entry.list) {
				expected = expected.map((rule) => ({ ...rule, scope: 'local' }));
				actual = actual.map((rule) => ({ ...rule, scope: 'local' }));
			}

			if (JSON.stringify(expected) !== JSON.stringify(actual)) {
				differences.push(
					`${entry.origin}: attrs ${JSON.stringify(entry.csf)}\n` +
						`  Codestar: ${JSON.stringify(expected)}\n` +
						`  bfields:  ${JSON.stringify(actual)}`
				);
			}
		});

		expect(differences).toEqual([]);
	});
});

describe('evaluate() matches Codestar Rule.evalCondition', () => {
	const conditions = ['', '==', '=', '!=', '>=', '<=', '>', '<', 'any', 'not-any'];

	// Rule values: whatever the attributes can carry.
	const ruleValues = ['', '0', '1', 'true', 'false', 'x', 'a,b', 'a, b', '5', '10', '-1', '0.5'];

	// Controller values as the DOM hands them to Codestar: strings, and lists
	// of strings for multi-value controls.
	const currents: unknown[] = [
		'', '0', '1', 'true', 'false', 'x', 'a', 'b', ' b', 'a,b', '5', '10', '-1', '0.5', 'abc',
		['a'], ['a', 'b'], ['c'], [],
	];

	it('agrees on every operator × rule value × controller value', () => {
		const differences: string[] = [];

		conditions.forEach((condition) => {
			ruleValues.forEach((value) => {
				currents.forEach((current) => {
					// Rule.checkCondition() returns true for an empty condition
					// before evalCondition() is reached.
					const expected = condition === '' ? true : csf.Rule.evalCondition(null, null, condition, value, current);
					const actual = evaluate(condition, value, current as never);

					if (expected !== actual) {
						differences.push(
							`'${condition}' ${JSON.stringify(value)} against ${JSON.stringify(current)}: Codestar ${expected}, bfields ${actual}`
						);
					}
				});
			});
		});

		expect(differences.slice(0, 40)).toEqual([]);
	});
});
