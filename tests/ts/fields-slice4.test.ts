/**
 * bfields — colour panel, source select, checklist, spacing, device switch and
 * the meta box tabs: what reaches the store. Stored shapes are Codestar's
 * (plan 3.1); nothing is written on mount or open.
 */

import { act, createElement, useState } from 'react';
import type { ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import Color from '../../ui/fields/Color';
import { normaliseTyped } from '../../ui/fields/ColorPanel';
import Choice from '../../ui/fields/Choice';
import SourceSelect from '../../ui/fields/SourceSelect';
import Spacing from '../../ui/fields/Spacing';
import DeviceSwitcher from '../../ui/fields/DeviceSwitcher';
import MetaboxShell from '../../ui/layout/MetaboxShell';
import { createStore } from '../../ui/core/store';
import { resolveIcon, Box } from '../../ui/core/icons';
import type { FieldComponentProps } from '../../ui/core/registry';
import type { BootPayload, Device, Field, FieldValue } from '../../ui/core/types';

jest.mock('../../ui/core/api', () => ({
	requestChoices: jest.fn(),
	fetchChoices: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require('../../ui/core/api') as { requestChoices: jest.Mock };

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const field = (extra: Partial<Field> = {}): Field => ({
	id: 'f',
	type: 'text',
	core: 'text',
	title: 'Field',
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

type Mounted = { container: HTMLElement; emitted: FieldValue[]; current: () => FieldValue };

function mount(
	Component: ComponentType<FieldComponentProps>,
	f: Field,
	initial: FieldValue,
	extra: Partial<FieldComponentProps> = {}
): Mounted {
	const emitted: FieldValue[] = [];
	let latest = initial;

	function Host() {
		const [value, setValue] = useState<FieldValue>(initial);

		latest = value;

		return createElement(Component, {
			unique: 'u',
			id: 'bf-f',
			field: f,
			value,
			values: {},
			onChange: (next: FieldValue) => {
				emitted.push(next);
				setValue(next);
			},
			...extra,
		});
	}

	const container = document.createElement('div');
	document.body.appendChild(container);
	act(() => createRoot(container).render(createElement(Host)));

	return { container, emitted, current: () => latest };
}

const type = (element: Element | null, text: string): void => {
	const input = element as HTMLInputElement;
	const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set;

	act(() => {
		setter?.call(input, text);
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});
};

const click = (element: Element | null | undefined): void => {
	act(() => {
		(element as HTMLElement).click();
	});
};

const press = (element: Element | null, key: string, extra: KeyboardEventInit = {}): void => {
	act(() => {
		(element as Element).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra }));
	});
};

const focus = (element: Element | null): void => {
	act(() => {
		(element as HTMLElement).focus();
	});
};

const flush = async (ms = 0): Promise<void> => {
	await act(async () => {
		jest.advanceTimersByTime(ms);
		await Promise.resolve();
		await Promise.resolve();
	});
};

afterEach(() => {
	document.body.innerHTML = '';
	api.requestChoices.mockReset();
	jest.useRealTimers();
});

describe('colour panel', () => {
	const colour = (extra: Partial<Field> = {}): Field =>
		field({ id: 'tint', type: 'color', core: 'color', title: 'Tint', default: 'rgba(0, 0, 0, 0.4)', ...extra });

	test('opening on rgba, transparent or a named colour writes nothing', () => {
		['rgba(0, 0, 0, 0.4)', 'transparent', '', 'red', '#FFF'].forEach((stored) => {
			const { container, emitted } = mount(Color, colour(), stored);
			click(container.querySelector('.bfields-colorpick'));
			expect(container.querySelector('.bfields-colorpanel')).not.toBeNull();
			focus(container.querySelector('.bfields-colorpanel__text'));
			act(() => (container.querySelector('.bfields-colorpanel__text') as HTMLElement).blur());
			press(container.querySelector('.bfields-colorpanel'), 'Escape');
			expect(emitted).toEqual([]);
			document.body.innerHTML = '';
		});
	});

	test('the button names its panel and Escape returns focus to it', () => {
		const { container } = mount(Color, colour(), '#1b5cf0');
		const button = container.querySelector('.bfields-colorpick') as HTMLElement;

		expect(button.getAttribute('aria-expanded')).toBe('false');
		expect(button.hasAttribute('aria-controls')).toBe(false);
		click(button);
		const panel = container.querySelector('.bfields-colorpanel') as HTMLElement;
		expect(button.getAttribute('aria-expanded')).toBe('true');
		expect(button.getAttribute('aria-controls')).toBe(panel.id);
		expect(panel.getAttribute('role')).toBe('dialog');
		expect(panel.contains(document.activeElement)).toBe(true);
		press(document.activeElement, 'Escape');
		expect(container.querySelector('.bfields-colorpanel')).toBeNull();
		expect(document.activeElement).toBe(button);
	});

	test('Tab is trapped inside the open panel', () => {
		const { container } = mount(Color, colour(), '#1b5cf0');
		click(container.querySelector('.bfields-colorpick'));
		const items = Array.from(container.querySelectorAll<HTMLElement>('.bfields-colorpanel input:not(:disabled), .bfields-colorpanel button:not(:disabled)'));
		const first = items[0]!;
		const last = items[items.length - 1]!;

		focus(last);
		press(last, 'Tab');
		expect(document.activeElement).toBe(first);
		press(first, 'Tab', { shiftKey: true });
		expect(document.activeElement).toBe(last);
	});

	test('opacity writes rgba with Codestar spacing; full opacity writes #rrggbb', () => {
		const { container, emitted } = mount(Color, colour(), 'rgba(0, 0, 0, 0.4)');
		click(container.querySelector('.bfields-colorpick'));
		type(container.querySelector('.bfields-colorpanel__alpha input'), '50');
		type(container.querySelector('.bfields-colorpanel__alpha input'), '100');
		expect(emitted).toEqual(['rgba(0, 0, 0, 0.5)', '#000000']);
	});

	test('Transparent, Default and Clear write the exact strings', () => {
		const { container, emitted } = mount(Color, colour({ default: '#ffffff' }), '#123456');
		click(container.querySelector('.bfields-colorpick'));
		const action = (label: string) =>
			Array.from(container.querySelectorAll('.bfields-colorpanel__action')).find((b) => b.textContent === label);

		click(action('Transparent'));
		click(action('Default'));
		click(action('Clear'));
		expect(emitted).toEqual(['transparent', '#ffffff', '']);
	});

	test('typed values are stored normalised, unreadable ones snap back', () => {
		expect(normaliseTyped('#FFF')).toBe('#ffffff');
		expect(normaliseTyped('rgba(0,0,0,.4)')).toBe('rgba(0, 0, 0, 0.4)');
		expect(normaliseTyped(' Transparent ')).toBe('transparent');
		expect(normaliseTyped('')).toBe('');
		expect(normaliseTyped('red')).toBeNull();

		const { container, emitted } = mount(Color, colour(), '#123456');
		click(container.querySelector('.bfields-colorpick'));
		const text = container.querySelector('.bfields-colorpanel__text') as HTMLInputElement;
		type(text, 'rgb(1,2,3)');
		press(text, 'Enter');
		type(text, 'nope');
		press(text, 'Enter');
		expect(emitted).toEqual(['#010203']);
		expect(text.value).toBe('#010203');

		type(text, '#abcdef');
		press(text, 'Escape');
		expect(emitted).toEqual(['#010203']);
		expect(container.querySelector('.bfields-colorpanel')).toBeNull();
	});

	test('a write while the panel is open is never undone by the text box', () => {
		const { container, emitted } = mount(Color, colour(), 'rgba(0, 0, 0, 0.4)');
		click(container.querySelector('.bfields-colorpick'));
		const range = container.querySelector('.bfields-colorpanel__alpha input') as HTMLInputElement;
		const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;

		act(() => {
			setter?.call(range, '50');
			range.dispatchEvent(new Event('input', { bubbles: true }));
			(container.querySelector('.bfields-colorpanel') as HTMLElement).dispatchEvent(
				new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
			);
		});
		expect(emitted).toEqual(['rgba(0, 0, 0, 0.5)']);
	});

	test('locked: the button does not open', () => {
		const { container } = mount(Color, colour(), '#123456', { locked: true });
		click(container.querySelector('.bfields-colorpick'));
		expect(container.querySelector('.bfields-colorpanel')).toBeNull();
	});
});

describe('source select', () => {
	const source = (extra: Partial<Field['props']> = {}): Field =>
		field({
			id: 'productId',
			type: 'select',
			core: 'choice',
			title: 'Product',
			props: { optionsSource: 'posts', searchable: true, placeholder: 'Search products', ...extra },
		});

	test('a stored id absent from the results is kept and shown as not available', async () => {
		jest.useFakeTimers();
		api.requestChoices.mockResolvedValue([]);
		const { container, emitted } = mount(Choice, source(), '12');
		await flush();

		expect(api.requestChoices).toHaveBeenCalledWith('u', 'productId', { include: ['12'] });
		expect(container.querySelector('.bfields-source__chip')?.textContent).toBe('12 (not available)');
		expect(emitted).toEqual([]);
	});

	test('a stored id resolves to its title without a write', async () => {
		jest.useFakeTimers();
		api.requestChoices.mockResolvedValue([{ value: '12', label: 'Chair' }]);
		const { container, emitted } = mount(SourceSelect, source(), '12');
		await flush();

		expect(container.querySelector('.bfields-source__chip')?.textContent).toBe('Chair');
		expect(emitted).toEqual([]);
	});

	test('search, arrow keys and Enter store the id as a string', async () => {
		jest.useFakeTimers();
		api.requestChoices.mockResolvedValue([
			{ value: '7', label: 'Lamp' },
			{ value: '9', label: 'Desk' },
		]);
		const { container, emitted } = mount(SourceSelect, source(), '');
		const input = container.querySelector('input[type="search"]') as HTMLInputElement;

		expect(input.getAttribute('role')).toBe('combobox');
		expect(input.placeholder).toBe('Search products');
		focus(input);
		type(input, 'l');
		expect(container.querySelector('.bfields-source__status')?.textContent).toMatch(/at least 2/);
		type(input, 'la');
		expect(container.querySelector('.bfields-source__status')?.textContent).toBe('Searching…');
		await flush(300);

		const options = container.querySelectorAll('[role="option"]');
		expect(Array.from(options).map((o) => o.textContent)).toEqual(['Lamp', 'Desk']);
		expect(input.getAttribute('aria-expanded')).toBe('true');
		press(input, 'ArrowDown');
		press(input, 'ArrowDown');
		expect(input.getAttribute('aria-activedescendant')).toBe(options[1]?.id);
		press(input, 'Enter');

		expect(emitted).toEqual(['9']);
		expect(typeof emitted[0]).toBe('string');
		expect(container.querySelector('.bfields-source__chip')?.textContent).toBe('Desk');
		expect(document.activeElement?.classList.contains('bfields-source__value')).toBe(true);
	});

	test('no matches and a failed request are told apart', async () => {
		jest.useFakeTimers();
		api.requestChoices.mockResolvedValueOnce([]);
		const { container } = mount(SourceSelect, source(), '');
		const input = container.querySelector('input[type="search"]') as HTMLInputElement;

		focus(input);
		type(input, 'zz');
		await flush(300);
		expect(container.querySelector('.bfields-source__status')?.textContent).toBe('No matches.');

		api.requestChoices.mockRejectedValueOnce(new Error('offline'));
		type(input, 'zzz');
		await flush(300);
		expect(container.querySelector('.bfields-source__status--error')).not.toBeNull();
	});

	test('remove stores an empty string; multiple stores a list', async () => {
		jest.useFakeTimers();
		api.requestChoices.mockResolvedValue([{ value: '12', label: 'Chair' }]);
		const single = mount(SourceSelect, source(), '12');
		await flush();
		click(single.container.querySelector('.bfields-source__remove'));
		expect(single.emitted).toEqual(['']);
		document.body.innerHTML = '';

		const many = mount(SourceSelect, source({ multiple: true }), ['12', '14']);
		await flush();
		click(many.container.querySelector('.bfields-source__remove'));
		expect(many.emitted).toEqual([['14']]);
	});

	test('locked: nothing can be searched or removed', async () => {
		jest.useFakeTimers();
		api.requestChoices.mockResolvedValue([{ value: '12', label: 'Chair' }]);
		const { container } = mount(SourceSelect, source(), '12', { locked: true });
		await flush();
		expect((container.querySelector('.bfields-source__remove') as HTMLButtonElement).disabled).toBe(true);
		expect((container.querySelector('.bfields-source__value') as HTMLButtonElement).disabled).toBe(true);
	});
});

describe('checklist', () => {
	const options = (n: number): Record<string, string> =>
		Object.fromEntries(Array.from({ length: n }, (_, i) => [`k${i}`, `Option ${i}`]));
	const checklist = (n = 3): Field =>
		field({ id: 'c', type: 'checkbox', core: 'choice', title: 'Pick', layout: 'checklist', props: { options: options(n), presentation: 'tiles' } });

	test('writes a list and [] when the last box is cleared', () => {
		const { container, emitted } = mount(Choice, checklist(), ['k1']);
		const boxes = container.querySelectorAll('[role="checkbox"]');

		expect(boxes[1]?.getAttribute('aria-checked')).toBe('true');
		click(boxes[0]);
		click(boxes[1]);
		click(boxes[0]);
		expect(emitted).toEqual([['k1', 'k0'], ['k0'], []]);
	});

	test('two columns above eight options', () => {
		const eight = mount(Choice, checklist(8), []);
		expect(eight.container.querySelector('.bfields-checklist--columns')).toBeNull();
		document.body.innerHTML = '';
		const nine = mount(Choice, checklist(9), []);
		expect(nine.container.querySelector('.bfields-checklist--columns')).not.toBeNull();
		expect(nine.emitted).toEqual([]);
	});
});

describe('spacing', () => {
	const angle = (): Field =>
		field({
			id: 'angle_property',
			type: 'spacing',
			core: 'spacing',
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

	test('premium angle_property: three boxes, captions, no unit, patched shape', () => {
		const { container, emitted } = mount(Spacing, angle(), { top: '0', right: '75', bottom: '105' });
		const inputs = container.querySelectorAll<HTMLInputElement>('.bfields-spacing__input');

		expect(inputs).toHaveLength(3);
		expect(container.querySelector('.bfields-spacing__unit')).toBeNull();
		expect(Array.from(container.querySelectorAll('.bfields-number__unit')).map((u) => u.textContent)).toEqual(['Deg', 'Deg', '%']);
		expect(Array.from(inputs).map((i) => i.getAttribute('aria-label'))).toEqual(['Deg', 'Deg', '%']);
		expect(emitted).toEqual([]);

		type(inputs[1]!, '80');
		expect(emitted).toEqual([{ top: '0', right: '80', bottom: '105' }]);
		expect(Object.keys(emitted[0] as object)).toEqual(['top', 'right', 'bottom']);
	});

	test('labels caption each side and empty sides show the placeholder', () => {
		const f = angle();
		f.props.labels = { top: 'X', right: 'Y', bottom: 'Z' };
		const { container } = mount(Spacing, f, { top: '', right: '', bottom: '' });
		const inputs = container.querySelectorAll<HTMLInputElement>('.bfields-spacing__input');

		expect(Array.from(container.querySelectorAll('.bfields-spacing__prefix')).map((p) => p.textContent)).toEqual(['X', 'Y', 'Z']);
		expect(inputs[0]?.getAttribute('aria-label')).toBe('X (Deg)');
		expect(inputs[2]?.placeholder).toBe('Z');
	});

	test('four sides with a unit keep the stored key order', () => {
		const f = field({ id: 'pad', type: 'spacing', core: 'spacing', title: 'Padding', props: { units: ['px', 'em'] } });
		const stored = { top: '1', right: '2', bottom: '3', left: '4', unit: 'px' };
		const { container, emitted } = mount(Spacing, f, stored);

		expect(container.querySelectorAll('.bfields-spacing__input')).toHaveLength(4);
		expect(container.querySelectorAll('.bfields-spacing__prefix svg')).toHaveLength(4);
		const select = container.querySelector('select') as HTMLSelectElement;
		act(() => {
			select.value = 'em';
			select.dispatchEvent(new Event('change', { bubbles: true }));
		});
		expect(emitted).toEqual([{ top: '1', right: '2', bottom: '3', left: '4', unit: 'em' }]);
		expect(Object.keys(emitted[0] as object)).toEqual(['top', 'right', 'bottom', 'left', 'unit']);
	});
});

describe('device switch', () => {
	function render(device: Device, overridden: Device[], onReset?: () => void) {
		const selected: Device[] = [];
		const container = document.createElement('div');
		document.body.appendChild(container);
		act(() =>
			createRoot(container).render(
				createElement(DeviceSwitcher, { device, overridden, onReset, onSelect: (d: Device) => selected.push(d) })
			)
		);
		return { container, selected };
	}

	test('three pressed-state buttons in a named group', () => {
		const { container, selected } = render('tablet', ['tablet']);
		const buttons = container.querySelectorAll('.bfields-devswitch__btn');

		expect(container.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe('Device');
		expect(Array.from(buttons).map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
		expect(buttons[1]?.getAttribute('title')).toBe('Tablet (has its own value)');
		expect(container.querySelectorAll('.bfields-devswitch__dot')).toHaveLength(1);
		click(buttons[2]);
		expect(selected).toEqual(['mobile']);
	});

	test('the reset × clears and hands focus back to the device', () => {
		const reset = jest.fn();
		const { container } = render('tablet', ['tablet'], reset);
		const button = container.querySelector('.bfields-devswitch__reset') as HTMLButtonElement;

		expect(button.getAttribute('aria-label')).toBe('Clear the Tablet value');
		click(button);
		expect(reset).toHaveBeenCalledTimes(1);
		expect(document.activeElement).toBe(container.querySelectorAll('.bfields-devswitch__btn')[1]);
	});

	test('no reset without a value of its own', () => {
		const { container } = render('desktop', []);
		expect(container.querySelector('.bfields-devswitch__reset')).toBeNull();
	});
});

describe('meta box tabs', () => {
	test('APG tablist: arrows select and move focus, one tab in the tab order', () => {
		const section = (id: string) => ({ id, title: id.toUpperCase(), icon: '', layout: 'rows', fields: [field({ id: `${id}_f` })] });
		const boot = { schema: { schema: 1, unique: 'mb', sections: [section('a'), section('b'), section('c')] }, values: {} } as unknown as BootPayload;
		const container = document.createElement('div');
		document.body.appendChild(container);
		act(() => createRoot(container).render(createElement(MetaboxShell, { boot, store: createStore({}) })));

		const tabs = () => Array.from(container.querySelectorAll<HTMLElement>('[role="tab"]'));
		expect(tabs().map((t) => t.tabIndex)).toEqual([0, -1, -1]);
		expect(container.querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby')).toBe(tabs()[0]?.id);

		focus(tabs()[0]!);
		press(tabs()[0]!, 'ArrowRight');
		expect(tabs()[1]?.getAttribute('aria-selected')).toBe('true');
		expect(document.activeElement).toBe(tabs()[1]);
		press(tabs()[1]!, 'End');
		expect(tabs()[2]?.getAttribute('aria-selected')).toBe('true');
		press(tabs()[2]!, 'ArrowRight');
		expect(tabs()[0]?.getAttribute('aria-selected')).toBe('true');
	});
});

describe('B14: every icon name premium uses resolves', () => {
	// grep "'icon' =>" in premium inc/Field/*.php, inc/Woocommerce/ProductMeta*.php, inc/Base/AdminUi.php (30 Sep 2026).
	const names = [
		'refresh', 'phone', 'move', 'image', 'zap', 'sliders', 'palette', 'maximize-2', 'loader', 'code', 'zoom-in',
		'maximize', 'grid', 'cloud-drizzle', 'camera', 'sun', 'link', 'download', 'warning', 'upload', 'search',
		'layers', 'info', 'check', 'cart', 'zoom-out', 'reset', 'monitor', 'external-link', 'diamond',
		'fas fa-eye', 'fa fa-paint-brush', 'fa fa-cog', 'fas fa-cog', 'fa fa-sliders',
		'fa fa-shopping-cart', 'fa fa-crosshairs', 'fa fa-code',
	];

	test.each(names)('%s', (name) => {
		expect(resolveIcon(name)).not.toBe(Box);
	});

	test('box, and fa-cube through its alias, are the box glyph', () => {
		expect(resolveIcon('box')).toBe(Box);
		expect(resolveIcon('fa fa-cube')).toBe(Box);
	});
});

describe('single select: stale value and option order (V-M4, V-L38)', () => {
	const select = (props: Field['props']): Field =>
		field({ id: 'tpl', type: 'select', core: 'choice', props: { presentation: 'select', ...props } });
	// What PHP's ['none' => 'None', 12 => 'Chair', 7 => 'Desk'] arrives as after JSON.parse.
	const presets = { 7: 'Desk', 12: 'Chair', none: 'None' } as Record<string, string>;

	test('keeps the PHP option order that optionOrder carries', () => {
		const { container } = mount(Choice, select({ options: presets, optionOrder: ['none', '12', '7'] }), 'none');

		expect(Array.from(container.querySelectorAll('option')).map((o) => o.value)).toEqual(['none', '12', '7']);
	});

	test.each([[''], ['99']])('a stale value %p shows the first option and writes nothing', (stored) => {
		const { container, emitted } = mount(Choice, select({ options: presets, optionOrder: ['none', '12', '7'] }), stored);
		const element = container.querySelector('select') as HTMLSelectElement;

		expect(element.value).toBe('none');
		expect(container.querySelectorAll('option')).toHaveLength(3);
		expect(emitted).toEqual([]);
	});

	test('a stale value on a select with a placeholder shows the placeholder', () => {
		const { container } = mount(Choice, select({ options: { a: 'A' }, placeholder: 'Pick one' }), 'gone');

		expect((container.querySelector('select') as HTMLSelectElement).value).toBe('');
	});
});
