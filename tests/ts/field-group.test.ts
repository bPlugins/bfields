/**
 * bfields — `field_group` cards (ui/layout/FieldGroup.tsx).
 *
 * The wire shape is Schema.php's: grouped fields stay in `section.fields`,
 * tagged `fieldGroup`, and `section.groups` describes the cards. These pin
 * that a group changes nothing a field renders or stores, that dependencies
 * keep their scope, and the card's own behaviour (hide when empty, collapse,
 * open on search and on a rejected field).
 */

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import AdminShell from '../../ui/layout/AdminShell';
import EditorShell, { type EditorBoot } from '../../ui/layout/EditorShell';
import MetaboxShell from '../../ui/layout/MetaboxShell';
import Text from '../../ui/fields/Text';
import { registerField } from '../../ui/core/registry';
import { createStore, type Store } from '../../ui/core/store';
import type { BootPayload, DependencyRule, Field, FieldGroup, Section, Values } from '../../ui/core/types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

registerField('text', Text);

const rule = (controller: string, condition: string, value: string, scope: 'local' | 'global' = 'local'): DependencyRule => ({
	controller,
	condition,
	value,
	scope,
});

const field = (id: string, extra: Partial<Field> = {}): Field => ({
	id,
	type: 'text',
	core: 'text',
	title: `Title ${id}`,
	subtitle: '',
	desc: '',
	before: '',
	after: '',
	class: '',
	pro: false,
	display: false,
	layout: '',
	icon: '',
	props: {},
	default: '',
	...extra,
});

const group = (id: string, extra: Partial<FieldGroup> = {}): FieldGroup => ({
	id,
	title: `Group ${id}`,
	subtitle: '',
	desc: '',
	icon: 'sun',
	class: '',
	collapsible: true,
	collapsed: false,
	...extra,
});

/** The same section with and without its groups: the tags and descriptors are the only difference. */
function pair(fields: Field[], groups: FieldGroup[], layout = 'rows'): [Section, Section] {
	const grouped: Section = { id: 'main', slug: 'main', title: 'Main', icon: '', layout, fields, groups };
	const plain: Section = {
		...grouped,
		fields: fields.map(({ fieldGroup: _tag, ...rest }) => rest as Field),
		groups: [],
	};

	return [grouped, plain];
}

function boot(sections: Section[], unique = 'fg', showSearch = false): BootPayload {
	return {
		schema: {
			schema: 1,
			unique,
			kind: 'metabox',
			args: { title: 'Screen', showSearch, showResetAll: false, showResetSection: false, brand: {} },
			sections,
		},
		values: {},
		aliases: {},
		undeclared: [],
	} as unknown as BootPayload;
}

function mount(element: ReturnType<typeof createElement>): HTMLElement {
	const container = document.createElement('div');
	document.body.appendChild(container);
	act(() => createRoot(container).render(element));
	return container;
}

function type(input: HTMLInputElement, text: string): void {
	const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
	act(() => {
		setter?.call(input, text);
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});
}

const click = (element: Element | null | undefined): void =>
	act(() => {
		(element as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
	});

const fixture = (): Field[] => [
	field('outside'),
	field('a', { fieldGroup: 'g' }),
	field('b', { fieldGroup: 'g', dependency: [rule('outside', '!=', 'hide-b')] }),
	field('c', { fieldGroup: 'g', dependency: [rule('a', '!=', 'hide-c', 'global')] }),
	field('after'),
];

describe('field_group cards', () => {
	test('children render exactly as without the group, inside one accessible card', () => {
		const [grouped, plain] = pair(fixture(), [group('g', { subtitle: 'Sub' })]);
		const values: Values = { outside: '', a: 'x', b: 'y', c: 'z', after: '' };
		const withGroup = mount(createElement(MetaboxShell, { boot: boot([grouped], 'fg1'), store: createStore(values) }));
		const without = mount(createElement(MetaboxShell, { boot: boot([plain], 'fg1'), store: createStore(values) }));

		const card = withGroup.querySelector<HTMLElement>('.bfields-field-group[data-group="g"]');
		expect(card).not.toBeNull();
		expect(card?.hasAttribute('data-field')).toBe(false);
		expect(card?.classList.contains('bfields-row') || card?.classList.contains('bfields-card')).toBe(false);

		const toggle = card?.querySelector<HTMLButtonElement>('button.bfields-field-group__toggle');
		const body = card?.querySelector<HTMLElement>('.bfields-field-group__body');
		expect(toggle?.getAttribute('aria-expanded')).toBe('true');
		expect(toggle?.getAttribute('aria-controls')).toBe(body?.id);
		expect(body?.getAttribute('role')).toBe('region');
		expect(body?.getAttribute('aria-labelledby')).toBe(toggle?.id);
		expect(toggle?.getAttribute('aria-describedby')).toBe(card?.querySelector('.bfields-field-group__desc')?.id);
		expect(toggle?.closest('h3')).not.toBeNull();

		// Same rows, same ids, same markup, in the same order.
		const rows = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-field]')).map((node) => node.outerHTML);
		expect(rows(withGroup)).toEqual(rows(without));
		expect(Array.from(card?.querySelectorAll('[data-field]') ?? []).map((node) => node.getAttribute('data-field'))).toEqual(['a', 'b', 'c']);
	});

	test('an edit inside a group writes the field’s own root key, never a group key', () => {
		const [grouped, plain] = pair(fixture(), [group('g')]);
		const values: Values = { outside: '', a: '', b: '', c: '', after: '' };
		const groupedStore = createStore(values);
		const plainStore = createStore(values);
		const one = mount(createElement(MetaboxShell, { boot: boot([grouped], 'fg2'), store: groupedStore }));
		const two = mount(createElement(MetaboxShell, { boot: boot([plain], 'fg2b'), store: plainStore }));

		type(one.querySelector<HTMLInputElement>('[data-field="b"] input') as HTMLInputElement, 'typed');
		type(two.querySelector<HTMLInputElement>('[data-field="b"] input') as HTMLInputElement, 'typed');

		expect(groupedStore.get().b).toBe('typed');
		expect(Object.keys(groupedStore.get())).not.toContain('g');
		expect(groupedStore.get()).toEqual(plainStore.get());
		expect(JSON.stringify(groupedStore.get())).toBe(JSON.stringify(plainStore.get()));
	});

	test('dependencies keep their scope; the card hides when every field in it is hidden, or by its own rule', () => {
		const fields = fixture();
		const [grouped] = pair(fields, [group('g')]);
		const store = createStore({ outside: 'hide-b', a: 'hide-c', b: '', c: '', after: '' });
		const root = mount(createElement(MetaboxShell, { boot: boot([grouped], 'fg3'), store }));
		const shown = () => Array.from(root.querySelectorAll('[data-field]')).map((node) => node.getAttribute('data-field'));

		// b follows a field outside the group; c a sibling inside it, by a global rule.
		expect(shown()).toEqual(['outside', 'a', 'after']);

		const hiddenA: Field[] = fields.map((item) =>
			item.id === 'a' ? { ...item, dependency: [rule('outside', '!=', 'hide-b')] } : item
		);
		const [allHidden] = pair(hiddenA, [group('g')]);
		const empty = mount(createElement(MetaboxShell, { boot: boot([allHidden], 'fg3b'), store }));
		expect(empty.querySelector('.bfields-field-group')).toBeNull();

		act(() => store.setValue('outside', 'show'));
		expect(empty.querySelector('.bfields-field-group')).not.toBeNull();

		const [ruled] = pair(fields, [group('g', { dependency: [rule('after', '==', 'on')] })]);
		const gated = mount(createElement(MetaboxShell, { boot: boot([ruled], 'fg3c'), store }));
		expect(gated.querySelector('.bfields-field-group')).toBeNull();
		act(() => store.setValue('after', 'on'));
		expect(gated.querySelector('.bfields-field-group')).not.toBeNull();
	});

	test('collapsed starts closed, keeps its fields mounted, and toggles', () => {
		const [grouped] = pair(fixture(), [group('g', { collapsed: true })]);
		const root = mount(createElement(MetaboxShell, { boot: boot([grouped], 'fg4'), store: createStore({}) }));
		const toggle = root.querySelector<HTMLButtonElement>('.bfields-field-group__toggle');
		const body = root.querySelector<HTMLElement>('.bfields-field-group__body');

		expect(toggle?.getAttribute('aria-expanded')).toBe('false');
		expect(body?.hidden).toBe(true);
		expect(body?.querySelector('[data-field="a"] input')).not.toBeNull();

		click(toggle);
		expect(toggle?.getAttribute('aria-expanded')).toBe('true');
		expect(body?.hidden).toBe(false);
		expect(root.querySelector('.bfields-field-group')?.classList.contains('is-open')).toBe(true);

		click(toggle);
		expect(body?.hidden).toBe(true);
	});

	test('a plain group has no toggle and is always open', () => {
		const [grouped] = pair(fixture(), [group('g', { collapsible: false, collapsed: true })]);
		const root = mount(createElement(MetaboxShell, { boot: boot([grouped], 'fg5'), store: createStore({}) }));
		expect(root.querySelector('button.bfields-field-group__toggle')).toBeNull();
		expect(root.querySelector<HTMLElement>('.bfields-field-group__body')?.hidden).toBe(false);
	});

	test('a rejected field opens its collapsed group', () => {
		const [grouped] = pair(fixture(), [group('g', { collapsed: true })]);
		const root = mount(createElement(MetaboxShell, { boot: boot([grouped], 'fg6'), store: createStore({}), errors: ['c'] }));
		expect(root.querySelector('.bfields-field-group__toggle')?.getAttribute('aria-expanded')).toBe('true');
	});

	test('a group icon never turns on icon tiles for rows that have none', () => {
		const [grouped] = pair(fixture(), [group('g', { icon: 'sun' })]);
		const root = mount(createElement(MetaboxShell, { boot: boot([grouped], 'fg7'), store: createStore({}) }));
		expect(root.querySelector('.bfields-field-group__icon')).not.toBeNull();
		expect(root.querySelectorAll('.bfields-row__icon')).toHaveLength(0);
	});

	test('a field whose group is not described renders flat', () => {
		const [grouped] = pair(fixture(), []);
		const root = mount(createElement(MetaboxShell, { boot: boot([grouped], 'fg8'), store: createStore({}) }));
		expect(root.querySelector('.bfields-field-group')).toBeNull();
		expect(root.querySelectorAll('[data-field]')).toHaveLength(5);
	});

	test('layout row puts title and subtitle in a row label column and the card beside them', () => {
		const [grouped, plain] = pair(fixture(), [group('g', { layout: 'row', subtitle: 'Sub', card_title: 'Settings', class: 'host-row' })]);
		const values: Values = { outside: '', a: 'x', b: 'y', c: 'z', after: '' };
		const root = mount(createElement(MetaboxShell, { boot: boot([grouped], 'fg9'), store: createStore(values) }));
		const without = mount(createElement(MetaboxShell, { boot: boot([plain], 'fg9'), store: createStore(values) }));

		const row = root.querySelector<HTMLElement>('.bfields-row--group[data-group="g"]');
		expect(row?.classList.contains('host-row')).toBe(true);
		expect(row?.querySelector('.bfields-row__main .bfields-row__title')?.textContent).toBe('Group g');
		const desc = row?.querySelector('.bfields-row__main .bfields-row__desc');
		expect(desc?.textContent).toBe('Sub');

		const card = row?.querySelector<HTMLElement>('.bfields-row__control > .bfields-field-group');
		expect(card?.hasAttribute('data-group')).toBe(false);
		expect(card?.classList.contains('host-row')).toBe(false);
		expect(card?.querySelector('.bfields-field-group__title')?.textContent).toBe('Settings');
		expect(card?.querySelector('.bfields-field-group__desc')).toBeNull();
		expect(card?.querySelector('.bfields-field-group__toggle')?.getAttribute('aria-describedby')).toBe(desc?.id);

		const rows = (node: HTMLElement) => Array.from(node.querySelectorAll('[data-field]')).map((item) => item.outerHTML);
		expect(rows(root)).toEqual(rows(without));
	});
});

describe('field_group in the options screen search', () => {
	const search = (root: HTMLElement, text: string) =>
		type(root.querySelector<HTMLInputElement>('.bfields-search input') as HTMLInputElement, text);
	const shown = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-field]')).map((node) => node.getAttribute('data-field'));

	function options(): HTMLElement {
		const fields = [
			field('outside'),
			field('a', { fieldGroup: 'g', title: 'Alpha' }),
			field('b', { fieldGroup: 'g', title: 'Bravo' }),
			field('after'),
		];
		const [grouped] = pair(fields, [group('g', { title: 'Lighting & Environment', collapsed: true })]);
		const other: Section = { id: 'other', slug: 'other', title: 'Other', icon: '', layout: 'rows', fields: [field('elsewhere', { title: 'Bravo two' })], groups: [] };
		const payload = boot([grouped, other], 'fgopts', true);
		(payload.schema as { kind: string }).kind = 'options';

		return mount(createElement(AdminShell, { boot: payload, store: createStore({}) }));
	}

	test('a match inside a collapsed group shows only that field, with the group open', () => {
		const root = options();
		expect(root.querySelector('.bfields-field-group__toggle')?.getAttribute('aria-expanded')).toBe('false');

		search(root, 'bravo');
		expect(shown(root)).toEqual(['b', 'elsewhere']);
		expect(root.querySelector('.bfields-field-group__toggle')?.getAttribute('aria-expanded')).toBe('true');
		expect(root.querySelector<HTMLElement>('.bfields-field-group__body')?.hidden).toBe(false);

		// Clearing the search gives the group back its own (closed) state.
		search(root, '');
		expect(root.querySelector('.bfields-field-group__toggle')?.getAttribute('aria-expanded')).toBe('false');
	});

	test('a toggle during a search closes the card for that search only', () => {
		const root = options();
		const toggle = () => root.querySelector('.bfields-field-group__toggle');

		click(toggle());
		expect(toggle()?.getAttribute('aria-expanded')).toBe('true');

		search(root, 'environment');
		click(toggle());
		expect(toggle()?.getAttribute('aria-expanded')).toBe('false');
		expect(root.querySelector<HTMLElement>('.bfields-field-group__body')?.hidden).toBe(true);

		search(root, '');
		expect(toggle()?.getAttribute('aria-expanded')).toBe('true');
	});

	test('a match on the group title shows all of its fields', () => {
		const root = options();
		search(root, 'environment');
		expect(shown(root)).toEqual(['a', 'b']);
	});

	test('no match says so', () => {
		const root = options();
		search(root, 'nothing-like-this');
		expect(root.querySelector('.bfields-field-group')).toBeNull();
		expect(root.querySelector('.bfields-empty')).not.toBeNull();
	});
});

describe('field_group in the page editor', () => {
	const editor: EditorBoot = {
		heading: 'Edit',
		title: 'T',
		titleInput: '',
		shortcode: '',
		hint: '',
		sideHeading: '',
		published: true,
		trashUrl: '',
		trashLabel: '',
	};

	test('cards stay cards inside the group, and Reset to Default resets grouped fields', () => {
		const fields = [field('a', { default: 'da' }), field('b', { fieldGroup: 'g', default: 'db' }), field('c', { fieldGroup: 'g', default: 'dc' })];
		const [grouped] = pair(fields, [group('g')], 'cards');
		const store: Store = createStore({ a: 'x', b: 'y', c: 'z' });
		const payload = boot([grouped], 'fged');
		payload.schema.args.showResetSection = true;
		const root = mount(createElement(EditorShell, { boot: payload, store, editor }));

		expect(Array.from(root.querySelectorAll('.bfields-field-group__body > .bfields-card')).map((n) => n.getAttribute('data-field'))).toEqual(['b', 'c']);

		const confirm = window.confirm;
		window.confirm = () => true;
		try {
			click(Array.from(root.querySelectorAll('button')).find((button) => button.textContent === 'Reset to Default'));
		} finally {
			window.confirm = confirm;
		}

		expect(store.get()).toEqual({ a: 'da', b: 'db', c: 'dc' });
	});

	test('show_reset_section off drops Reset to Default and the empty action bar', () => {
		const [grouped] = pair([field('a', { default: 'da' })], [], 'cards');
		const root = mount(createElement(EditorShell, { boot: boot([grouped], 'fged2'), store: createStore({ a: 'x' }), editor }));

		expect(Array.from(root.querySelectorAll('button')).some((button) => button.textContent === 'Reset to Default')).toBe(false);
		expect(root.querySelector('.bfields-editor__actions')).toBeNull();
	});
});
