/**
 * bfields — the host API added for premium's adornments: array paths (G2),
 * late row writes (G3), the `below` slot (G4), the ready event and late
 * registration (G5), and Spacing's per-side placeholder and captions (G1).
 */

import { act, createElement, useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import FieldRenderer from '../../ui/layout/FieldRenderer';
import Repeater from '../../ui/fields/Repeater';
import Text from '../../ui/fields/Text';
import Dimension from '../../ui/fields/Dimension';
import Spacing, { sideLabel, sidePlaceholder } from '../../ui/fields/Spacing';
import { addAdornment, registerField } from '../../ui/core/registry';
import type { FieldComponentProps } from '../../ui/core/registry';
import { createStore, type Store } from '../../ui/core/store';
import { announceReady, attachStore, bfields } from '../../ui/core/runtime';
import { rowIds } from '../../ui/core/path';
import type { Field, FieldValue, Values } from '../../ui/core/types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

registerField('text', Text);
registerField('repeater', Repeater);
registerField('spacing', Spacing);
registerField('dimension', Dimension);

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

const group = (id: string, fields: Field[]): Field =>
	sub(id, { type: 'group', core: 'repeater', title: id, props: { presentation: 'plain' }, fields });

let unique = 0;

type Mounted = { store: Store; root: Root; container: HTMLElement; unique: string };

/** A root FieldRenderer against a real store, as MetaboxShell renders it. */
function mount(field: Field, values: Values, key = `u${++unique}`): Mounted {
	const store = createStore(values);

	attachStore(key, store);

	function Host() {
		const [current, setCurrent] = useState<Values>(store.get());

		useEffect(() => store.subscribe((next) => setCurrent(next)), []);

		return createElement(FieldRenderer, {
			unique: key,
			field,
			values: current,
			onChange: (id: string, value: FieldValue) => store.setValue(id, value),
		});
	}

	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);

	act(() => root.render(createElement(Host)));

	return { store, root, container, unique: key };
}

const input = (container: HTMLElement, name: string): HTMLInputElement =>
	container.querySelector(`[data-field="${name}"] input`) as HTMLInputElement;

function type(element: HTMLInputElement, text: string): void {
	const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
	act(() => {
		setter?.call(element, text);
		element.dispatchEvent(new Event('input', { bubbles: true }));
	});
}

describe('G2 array paths', () => {
	const rows = (): FieldValue =>
		[
			{ model_src: 'a.glb', poster: '' },
			{ model_src: 'b.glb', poster: '', hotspots: [{ label: 'x' }, { label: 'y' }] },
		] as unknown as FieldValue;

	test('setPath patches one row key and keeps order and siblings', () => {
		const store = createStore({ bp3d_models: rows(), other: '1' });
		const before = store.get().bp3d_models as Values[];

		store.setPath(['bp3d_models', 1, 'poster'], 'p.webp');

		const after = store.get().bp3d_models as Values[];
		expect(after[0]).toBe(before[0]);
		expect(Object.keys(after[1] as object)).toEqual(['model_src', 'poster', 'hotspots']);
		expect(after[1]?.poster).toBe('p.webp');
		expect(store.get().other).toBe('1');
	});

	test('nested lists, numeric strings and row ids resolve', () => {
		const store = createStore({ bp3d_models: rows() });
		const second = (store.get().bp3d_models as Values[])[1] as object;

		rowIds.set(second, 'r-test');
		store.setPath(['bp3d_models', 'r-test', 'hotspots', '1', 'label'], 'z');

		expect(store.getPath(['bp3d_models', 1, 'hotspots', 1, 'label'])).toBe('z');
		expect(store.getPath(['bp3d_models', 'r-test', 'model_src'])).toBe('b.glb');
	});

	test('a missing step writes nothing', () => {
		const store = createStore({ bp3d_models: rows(), empty: '' });
		const listener = jest.fn();

		store.subscribe(listener);
		store.setPath(['bp3d_models', 5, 'poster'], 'x');
		store.setPath(['bp3d_models', 0, 'nope', 'deeper'], 'x');
		store.setPath(['empty', 0, 'poster'], 'x');
		store.setPath(['absent', 'key'], 'x');

		expect(listener).not.toHaveBeenCalled();
		expect(store.getPath(['bp3d_models', 5])).toBeUndefined();
	});

	test('bfields.setValue / getValue take a string or a path', () => {
		const store = createStore({ bp3d_models: rows(), title: 't' });

		attachStore('g2', store);
		bfields.setValue('g2', ['bp3d_models', 0, 'model_src'], 'c.glb');
		bfields.setValue('g2', 'title', 'u');

		expect(bfields.getValue('g2', ['bp3d_models', 0, 'model_src'])).toBe('c.glb');
		expect(bfields.getValue('g2', 'title')).toBe('u');
	});

	test('components and adornments get path and rowId', () => {
		const seen: Array<{ path?: unknown; rowId?: string }> = [];
		const Probe = (props: FieldComponentProps & { slot: string }) => {
			seen.push({ path: props.path, rowId: props.rowId });
			return null;
		};
		const field = group('items', [group('spots', [sub('label')])]);

		addAdornment('pathprobe', 'label', 'after', Probe as ComponentType<FieldComponentProps & { slot: string }>);

		const store = createStore({ items: [{ spots: [{ label: 'a' }, { label: 'b' }] }] });
		attachStore('pathprobe', store);

		const container = document.createElement('div');
		const root = createRoot(container);
		act(() =>
			root.render(
				createElement(FieldRenderer, {
					unique: 'pathprobe',
					field,
					values: store.get(),
					onChange: () => undefined,
				})
			)
		);

		const last = seen.slice(-2);
		expect(last.map((item) => item.path)).toEqual([
			['items', 0, 'spots', 0, 'label'],
			['items', 0, 'spots', 1, 'label'],
		]);
		expect(typeof last[1]?.rowId).toBe('string');

		// The rowId addresses the same row through the public API.
		bfields.setValue('pathprobe', ['items', 0, 'spots', last[1]?.rowId as string, 'label'], 'B');
		expect(bfields.getValue('pathprobe', ['items', 0, 'spots', 1, 'label'])).toBe('B');
		act(() => root.unmount());
	});
});

describe('G3 a late row onChange', () => {
	test('merges into the rows the store holds now', () => {
		let late: ((value: FieldValue) => void) | undefined;
		const Picker = (props: FieldComponentProps & { slot: string }) => {
			if (props.field.id === 'model_src' && props.path?.[1] === 0) {
				late = props.onChange;
			}
			return null;
		};

		addAdornment('g3', 'model_src', 'after', Picker as ComponentType<FieldComponentProps & { slot: string }>);

		const field = group('bp3d_models', [sub('model_src'), sub('poster')]);
		const key = 'g3';
		const store = createStore({ bp3d_models: [{ model_src: 'a', poster: '' }, { model_src: 'b', poster: '' }] });

		attachStore(key, store);

		function Host() {
			const [current, setCurrent] = useState<Values>(store.get());
			useEffect(() => store.subscribe((next) => setCurrent(next)), []);
			return createElement(FieldRenderer, {
				unique: key,
				field,
				values: current,
				onChange: (id: string, value: FieldValue) => store.setValue(id, value),
			});
		}

		const container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);
		act(() => root.render(createElement(Host)));

		// Captured before the edits below, called after them.
		const stale = late;
		const posters = container.querySelectorAll<HTMLInputElement>('[data-field="poster"] input');

		type(posters[0] as HTMLInputElement, 'first.webp');
		type(posters[1] as HTMLInputElement, 'second.webp');
		act(() => stale?.('picked.glb'));

		expect(store.get().bp3d_models).toEqual([
			{ model_src: 'picked.glb', poster: 'first.webp' },
			{ model_src: 'b', poster: 'second.webp' },
		]);
		act(() => root.unmount());
	});

	test('follows its row through a reorder, and a removed row is not resurrected', () => {
		let late: ((value: FieldValue) => void) | undefined;
		const Picker = (props: FieldComponentProps & { slot: string }) => {
			if (props.path?.[1] === 0) {
				late = props.onChange;
			}
			return null;
		};

		addAdornment('g3b', 'poster', 'after', Picker as ComponentType<FieldComponentProps & { slot: string }>);

		const field = group('rows', [sub('name'), sub('poster')]);
		const { store, root } = (() => {
			const s = createStore({ rows: [{ name: 'one', poster: '' }, { name: 'two', poster: '' }] });
			attachStore('g3b', s);
			function Host() {
				const [current, setCurrent] = useState<Values>(s.get());
				useEffect(() => s.subscribe((next) => setCurrent(next)), []);
				return createElement(FieldRenderer, {
					unique: 'g3b',
					field,
					values: current,
					onChange: (id: string, value: FieldValue) => s.setValue(id, value),
				});
			}
			const r = createRoot(document.createElement('div'));
			act(() => r.render(createElement(Host)));
			return { store: s, root: r };
		})();

		const forOne = late;
		const [one, two] = store.get().rows as Values[];

		act(() => store.setValue('rows', [two, one] as FieldValue));
		act(() => forOne?.('one.webp'));

		expect(store.get().rows).toEqual([
			{ name: 'two', poster: '' },
			{ name: 'one', poster: 'one.webp' },
		]);

		act(() => store.setValue('rows', ''));
		act(() => forOne?.('again.webp'));
		expect(store.get().rows).toBe('');
		act(() => root.unmount());
	});
});

describe('G4 the below slot', () => {
	test('renders under the control, in its own block, only when used', () => {
		const Notice = () => createElement('p', { className: 'host-notice' }, 'Heads up');

		addAdornment('g4', 'label', 'below', Notice as ComponentType<FieldComponentProps & { slot: string }>);

		const { container, root } = mount(group('items', [sub('label'), sub('other')]), { items: [{ label: 'a', other: '' }] }, 'g4');

		const row = container.querySelector('[data-field="label"]') as HTMLElement;
		expect(row.className).toContain('bfields-row--below');
		expect(row.lastElementChild?.className).toBe('bfields-row__below');
		expect(row.querySelector(':scope > .bfields-row__control .host-notice')).toBeNull();
		expect(row.querySelector(':scope > .bfields-row__below .host-notice')?.textContent).toBe('Heads up');
		expect(container.querySelector('[data-field="other"] .bfields-row__below')).toBeNull();
		act(() => root.unmount());
	});
});

describe('G5 ready and late registration', () => {
	test('an adornment added after mount appears without a remount', () => {
		const { container, root, unique: key } = mount(sub('late_field'), { late_field: 'v' });

		expect(container.querySelector('.late-button')).toBeNull();

		act(() =>
			addAdornment(key, 'late_field', 'after', (() =>
				createElement('button', { className: 'late-button' }, 'Pick')) as ComponentType<FieldComponentProps & { slot: string }>)
		);

		expect(container.querySelector('[data-field="late_field"] .bfields-row__control .late-button')).not.toBeNull();
		act(() => root.unmount());
	});

	test('a field component registered after mount replaces the placeholder', () => {
		const { container, root } = mount(sub('odd', { type: 'odd_type', core: 'unknown' as Field['core'] }), { odd: 'x' });

		expect(container.textContent).toContain('cannot be edited');

		act(() => registerField('odd_type', (() => createElement('span', { className: 'odd-ok' })) as ComponentType<FieldComponentProps>));

		expect(container.querySelector('.odd-ok')).not.toBeNull();
		act(() => root.unmount());
	});

	test('bfields:ready fires once with the screens, then onReady runs at once', () => {
		const events: unknown[] = [];
		const early = jest.fn();
		const listener = (event: Event) => events.push((event as CustomEvent).detail);

		document.addEventListener('bfields:ready', listener);
		bfields.onReady(early);
		announceReady(['_a_', '_b_']);
		announceReady(['_c_']);

		expect(events).toEqual([{ unique: ['_a_', '_b_'] }]);
		expect(early).toHaveBeenCalledWith({ unique: ['_a_', '_b_'] });

		const late = jest.fn();
		bfields.onReady(late);
		expect(late).toHaveBeenCalledTimes(1);
		document.removeEventListener('bfields:ready', listener);
	});
});

describe('G1 Spacing placeholder and side captions', () => {
	const angle = sub('angle_property', {
		type: 'spacing',
		core: 'spacing' as Field['core'],
		title: 'Custom Angle Values',
		props: {
			left: false,
			showUnits: false,
			topIcon: 'Deg',
			rightIcon: 'Deg',
			bottomIcon: '%',
			placeholder: { top: 'X', right: 'Y', bottom: 'Z' },
		},
	});

	test('an empty side shows its placeholder; an inherited value wins', () => {
		expect(sidePlaceholder(angle, 'top', {})).toBe('X');
		expect(sidePlaceholder(angle, 'bottom', {})).toBe('Z');
		expect(sidePlaceholder(angle, 'top', { top: '10' })).toBe('10');
		expect(sidePlaceholder(sub('s', { props: { placeholder: 'flat' } }), 'top', {})).toBeUndefined();
	});

	test('captions: labels, then plain-text icons, then the side name', () => {
		expect(sideLabel(angle, 'top', 'Top')).toBe('Deg');
		expect(sideLabel(sub('s', { props: { topIcon: '<i class="fas fa-long-arrow-alt-up"></i>' } }), 'top', 'Top')).toBe('Top');
		expect(sideLabel(sub('s', { props: { labels: { top: 'X' } } }), 'top', 'Top')).toBe('X');
		expect(sideLabel(sub('s', { props: { labels: { top: 'X' }, topIcon: 'Deg' } }), 'top', 'Top')).toBe('X (Deg)');
	});

	test('rendered: three sides, placeholders on the empty ones, nothing written', () => {
		const { container, store, root } = mount(angle, { angle_property: { top: '0', right: '', bottom: '' } });
		const inputs = [...container.querySelectorAll<HTMLInputElement>('.bfields-spacing__input')];
		const labels = inputs.map((node) => node.getAttribute('aria-label'));

		expect(inputs).toHaveLength(3);
		expect(inputs.map((node) => node.placeholder)).toEqual(['X', 'Y', 'Z']);
		expect(labels).toEqual(['Deg', 'Deg', '%']);
		expect(store.isDirty()).toBe(false);
		act(() => root.unmount());
	});
});

describe('F2 / F3', () => {
	test('a single-axis dimension has no link button; both axes keep it', () => {
		const dim = (props: Field['props']) => sub('size', { type: 'dimensions', core: 'dimension' as Field['core'], props });
		const one = mount(dim({ width: false }), { size: { height: '320', unit: 'px' } });
		const two = mount(dim({}), { size: { width: '1', height: '2', unit: 'px' } });

		expect(one.container.querySelector('.bfields-dim__link')).toBeNull();
		expect(two.container.querySelector('.bfields-dim__link')).not.toBeNull();
		act(() => one.root.unmount());
		act(() => two.root.unmount());
	});

	test('the selector chip input is named and sized to its value', () => {
		const { container, root } = mount(sub('gallery', { layout: 'selector', title: 'Gallery Selector' }), {
			gallery: '.woocommerce-product-gallery__image',
		});
		const field = container.querySelector('.bfields-selector-field input') as HTMLInputElement;

		expect(field.getAttribute('aria-label')).toBe('Gallery Selector');
		expect(field.size).toBe('.woocommerce-product-gallery__image'.length);
		expect(container.querySelector('.bfields-row--selector')).not.toBeNull();
		act(() => root.unmount());
	});
});
