/**
 * bfields — the designed Repeater: what reaches the store.
 *
 * The stored shape is Codestar's (plan 3.1): a plain list of row objects,
 * '' when empty, rows patched rather than rebuilt, and no client-side row id
 * anywhere in the payload. These pin the emitted values, not the markup.
 */

import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import Repeater, { blankRow, moveRow, rowTitle, serializeRows } from '../../ui/fields/Repeater';
import Text from '../../ui/fields/Text';
import { registerField } from '../../ui/core/registry';
import type { Field, FieldValue, Values } from '../../ui/core/types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

registerField('text', Text);
registerField('repeater', Repeater);

const sub = (id: string, extra: Partial<Field> = {}): Field => ({
	id,
	type: 'text',
	core: 'text',
	title: id,
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
	...extra,
});

const group = (props: Field['props'] = {}, fields: Field[] = [sub('label'), sub('note', { default: 'n' })]): Field =>
	sub('items', {
		type: 'group',
		core: 'repeater',
		title: 'Items',
		props: { presentation: 'collapsible', titlePrefix: 'Item', titleNumber: true, buttonTitle: 'Add Item', ...props },
		fields,
	});

type Mounted = {
	container: HTMLElement;
	emitted: FieldValue[];
	root: Root;
	q: <T extends Element = HTMLElement>(selector: string) => T[];
};

function mount(field: Field, initial: FieldValue, locked = false): Mounted {
	const emitted: FieldValue[] = [];

	function Host() {
		const [value, setValue] = useState<FieldValue>(initial);

		return createElement(Repeater, {
			unique: 'u',
			id: 'bf-items',
			field,
			value,
			values: {},
			locked,
			onChange: (next: FieldValue) => {
				emitted.push(next);
				setValue(next);
			},
		});
	}

	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);

	act(() => root.render(createElement(Host)));

	return {
		container,
		emitted,
		root,
		q: <T extends Element = HTMLElement>(selector: string) => [...container.querySelectorAll<T>(selector)] as T[],
	};
}

const press = (element: Element, key: string): void => {
	act(() => {
		element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
	});
};

const click = (element: Element): void => {
	act(() => {
		(element as HTMLElement).click();
	});
};

const pointer = (element: Element, type: string, clientY: number): void => {
	const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientY, button: 0 });

	Object.defineProperty(event, 'pointerId', { value: 1 });
	act(() => {
		element.dispatchEvent(event);
	});
};

const rows = (): Values[] => [
	{ label: 'A', note: 'x' },
	{ label: 'B', note: 'y' },
	{ label: 'C', note: 'z' },
];

const last = (m: Mounted): FieldValue | undefined => m.emitted[m.emitted.length - 1];

afterEach(() => {
	document.body.innerHTML = '';
});

describe('pure helpers', () => {
	test('moveRow moves one item and keeps the row objects', () => {
		const list = rows();
		const moved = moveRow(list, 0, 2);

		expect(moved.map((row) => row.label)).toEqual(['B', 'C', 'A']);
		expect(moved[2]).toBe(list[0]);
		expect(moveRow(list, 0, 5)).toBe(list);
		expect(moveRow(list, 1, 1)).toBe(list);
	});

	test("an empty list is stored as ''", () => {
		expect(serializeRows([])).toBe('');
		expect(serializeRows(rows())).toEqual(rows());
	});

	test('a blank row is every sub-field at its default, display fields skipped', () => {
		const fields = [sub('label'), sub('note', { default: 'n' }), sub('info', { display: true, type: 'content', core: 'display' })];

		expect(blankRow(fields)).toEqual({ label: '', note: 'n' });
	});

	test('a blank row leaves out locked `pro` sub-fields, so a new row never saves them', () => {
		const fields = [sub('label'), sub('invalid', { pro: true, default: '1' })];

		expect(blankRow(fields)).toEqual({ label: '' });
	});

	test('the row title is prefix and number, then the first field (file name for an upload)', () => {
		expect(rowTitle({ label: 'Chair' }, group(), 1)).toEqual({ name: 'Item 2', value: 'Chair' });

		const upload = group({ titlePrefix: undefined, titleNumber: undefined }, [
			sub('model', { type: 'upload', core: 'media', props: { presentation: 'url' } }),
		]);

		expect(rowTitle({ model: 'https://x.test/files/my%20chair.glb?v=2' }, upload, 0)).toEqual({ name: '', value: 'my chair.glb' });
		expect(rowTitle({ model: '' }, upload, 2)).toEqual({ name: 'Item 3', value: '' });
	});
});

describe('the rendered list', () => {
	beforeEach(() => {
		window.confirm = jest.fn(() => true);
	});

	test('arrow keys on the handle reorder, and the stored list is plain', () => {
		const m = mount(group(), rows());
		const handle = m.q('[data-part="handle"]')[0]!;

		press(handle, 'ArrowDown');

		const stored = last(m) as Values[];

		expect(stored).toEqual([rows()[1], rows()[0], rows()[2]]);
		expect(stored.map((row) => Object.keys(row))).toEqual([['label', 'note'], ['label', 'note'], ['label', 'note']]);
		expect(JSON.stringify(stored)).not.toContain('__id');
		expect(m.q('[role="status"]')[0]!.textContent).toContain('moved to position 2 of 3');

		// Focus follows the row, so a second press keeps going.
		expect(document.activeElement?.closest('[data-row]')).toBe(m.q('[data-row]')[1]);
		press(document.activeElement!, 'End');
		expect((last(m) as Values[]).map((row) => row.label)).toEqual(['B', 'C', 'A']);
	});

	test('Move up / Move down buttons do the same', () => {
		const m = mount(group(), rows());

		click(m.q('[data-part="up"]')[2]!);
		expect((last(m) as Values[]).map((row) => row.label)).toEqual(['A', 'C', 'B']);

		click(m.q('[data-part="down"]')[0]!);
		expect((last(m) as Values[]).map((row) => row.label)).toEqual(['C', 'A', 'B']);
	});

	test('a pointer drag drops the row where it is released', () => {
		const m = mount(group(), rows());

		m.q('li[data-row]').forEach((item, index) => {
			item.getBoundingClientRect = () => ({ top: index * 60, bottom: index * 60 + 50, height: 50 }) as DOMRect;
		});

		const handle = m.q('[data-part="handle"]')[0]!;

		pointer(handle, 'pointerdown', 25);
		pointer(handle, 'pointermove', 100);
		expect(m.q('li[data-row]')[0]!.style.transform).toBe('translateY(75px)');
		pointer(handle, 'pointermove', 160);
		pointer(handle, 'pointerup', 160);

		const stored = last(m) as Values[];

		expect(stored.map((row) => row.label)).toEqual(['B', 'C', 'A']);
		expect(JSON.stringify(stored)).not.toContain('__id');
		expect(m.q('li[data-row]')[0]!.style.transform).toBe('');
	});

	test('editing a row keeps its identity through a later reorder', () => {
		const m = mount(group(), rows());

		click(m.q('[data-part="toggle"]')[0]!);

		const input = m.q<HTMLInputElement>('li[data-row] input')[0]!;
		const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;

		act(() => {
			setter.call(input, 'A2');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});

		expect((last(m) as Values[])[0]).toEqual({ label: 'A2', note: 'x' });

		press(m.q('[data-part="handle"]')[0]!, 'ArrowDown');

		// The open row moved with its data.
		const open = m.q('li[data-row].is-open');

		expect(open).toHaveLength(1);
		expect(open[0]).toBe(m.q('li[data-row]')[1]);
		expect((last(m) as Values[]).map((row) => row.label)).toEqual(['B', 'A2', 'C']);
	});

	test("removing the last row stores ''", () => {
		const m = mount(group(), [{ label: 'Only', note: '' }]);

		click(m.q('.bfields-repeater-row__remove')[0]!);

		expect(last(m)).toBe('');
		expect(m.q('.bfields-repeater__empty')).toHaveLength(1);
		expect(document.activeElement?.classList.contains('bfields-repeater__add')).toBe(true);
	});

	test('max is respected by add and duplicate', () => {
		const m = mount(group({ maxRows: 2 }), [{ label: 'A', note: '' }]);
		const add = m.q<HTMLButtonElement>('.bfields-repeater__add')[0]!;

		click(add);
		expect(last(m) as Values[]).toEqual([{ label: 'A', note: '' }, { label: '', note: 'n' }]);
		expect(m.emitted).toHaveLength(1);

		const addNow = m.q<HTMLButtonElement>('.bfields-repeater__add')[0]!;

		expect(addNow.disabled).toBe(true);
		expect(m.q<HTMLButtonElement>('[aria-label^="Duplicate"]').every((button) => button.disabled)).toBe(true);
		click(addNow);
		expect(m.emitted).toHaveLength(1);
		expect(m.q('.bfields-repeater__note')[0]!.textContent).toContain('2');
	});

	test('min keeps the last rows, and duplicate deep-copies without an id', () => {
		const m = mount(group({ minRows: 1 }), [{ label: 'A', note: '', nested: [{ t: '1' }] as unknown as FieldValue }]);

		expect(m.q<HTMLButtonElement>('.bfields-repeater-row__remove')[0]!.disabled).toBe(true);

		click(m.q('[aria-label^="Duplicate"]')[0]!);

		const stored = last(m) as Values[];

		expect(stored).toHaveLength(2);
		expect(stored[1]).toEqual(stored[0]);
		expect(stored[1]).not.toBe(stored[0]);
		expect(stored[1]!.nested).not.toBe(stored[0]!.nested);
		expect(JSON.stringify(stored)).not.toContain('__id');
	});

	test('a locked list renders but never writes', () => {
		const m = mount(group(), rows(), true);

		press(m.q('[data-part="handle"]')[0]!, 'ArrowDown');
		click(m.q('.bfields-repeater__add')[0]!);

		expect(m.emitted).toHaveLength(0);
		expect(m.q<HTMLButtonElement>('.bfields-repeater-row__remove').every((button) => button.disabled)).toBe(true);
	});

	test('row tabs move with the arrow keys and show one tab of fields', () => {
		const fields = [sub('label'), sub('light', { props: { tab: 'Lighting' } }), sub('ar', { props: { tab: 'AR' } })];
		const t = mount(group({}, fields), [{ label: 'A', light: '', ar: '' }]);

		click(t.q('[data-part="toggle"]')[0]!);

		const tabs = t.q('[role="tab"]');

		expect(tabs.map((tab) => tab.textContent)).toEqual(['General', 'Lighting', 'AR']);
		expect(t.q('[data-field]').map((row) => row.getAttribute('data-field'))).toEqual(['label']);

		press(tabs[0]!, 'ArrowRight');
		expect(t.q('[role="tab"][aria-selected="true"]')[0]!.textContent).toBe('Lighting');
		expect(t.q('[data-field]').map((row) => row.getAttribute('data-field'))).toEqual(['light']);

		press(t.q('[role="tab"]')[1]!, 'End');
		expect(t.q('[role="tab"][aria-selected="true"]')[0]!.textContent).toBe('AR');
		expect(t.emitted).toHaveLength(0);
	});

	test('nothing is written on mount, open or collapse', () => {
		const m = mount(group(), rows());

		click(m.q('[data-part="toggle"]')[1]!);
		click(m.q('[data-part="toggle"]')[1]!);

		expect(m.emitted).toHaveLength(0);
	});
});
