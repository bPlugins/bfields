/**
 * bfields — C4: a section holding a field its `validate` rejected marks its tab.
 */

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import MetaboxShell from '../../ui/layout/MetaboxShell';
import { sectionHasError } from '../../ui/layout/TabError';
import { createStore } from '../../ui/core/store';
import type { BootPayload, Field, Section } from '../../ui/core/types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const field = (id: string, fields?: Field[]): Field =>
	({ id, type: 'text', core: 'text', title: id, subtitle: '', desc: '', before: '', after: '', class: '', pro: false, display: false, layout: '', icon: '', props: {}, default: '', ...(fields ? { fields } : {}) }) as unknown as Field;
const section = (id: string, fields: Field[]): Section => ({ id, slug: id, title: id.toUpperCase(), icon: '', layout: 'rows', fields });

describe('tab error markers', () => {
	test('sectionHasError finds top-level and nested ids, and nothing for no errors', () => {
		const s = section('a', [field('top'), field('rows', [field('inner')])]);
		expect(sectionHasError(s, new Set(['top']))).toBe(true);
		expect(sectionHasError(s, new Set(['inner']))).toBe(true);
		expect(sectionHasError(s, new Set(['other']))).toBe(false);
		expect(sectionHasError(s, new Set())).toBe(false);
	});

	test('the meta box marks only the tab holding a rejected field, with a spoken name', () => {
		const boot = { schema: { schema: 1, unique: 'mb', sections: [section('a', [field('a_f')]), section('b', [field('code')])] }, values: {} } as unknown as BootPayload;
		const container = document.createElement('div');
		document.body.appendChild(container);
		act(() => createRoot(container).render(createElement(MetaboxShell, { boot, store: createStore({}), errors: ['code'] })));

		const tabs = Array.from(container.querySelectorAll<HTMLElement>('[role="tab"]'));
		expect(tabs.map((tab) => Boolean(tab.querySelector('.bfields-tab__error')))).toEqual([false, true]);
		expect(tabs[1]?.textContent).toContain('(has errors)');
		expect(tabs[1]?.querySelector('.bfields-tab__error > [aria-hidden="true"]')?.textContent).toBe('!');
	});

	test('no errors, no markers', () => {
		const boot = { schema: { schema: 1, unique: 'mb2', sections: [section('a', [field('x')]), section('b', [field('y')])] }, values: {} } as unknown as BootPayload;
		const container = document.createElement('div');
		document.body.appendChild(container);
		act(() => createRoot(container).render(createElement(MetaboxShell, { boot, store: createStore({}) })));
		expect(container.querySelectorAll('.bfields-tab__error')).toHaveLength(0);
	});
});
