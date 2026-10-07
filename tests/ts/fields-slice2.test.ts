/**
 * bfields — number, textarea, code, media in a row and fieldset: what reaches
 * the store. Stored shapes are Codestar's (plan 3.1); nothing is written on
 * mount, and an untouched value keeps its bytes.
 */

import { act, createElement, useState } from 'react';
import type { ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import NumberField from '../../ui/fields/Number';
import { stepValue } from '../../ui/fields/NumberInput';
import Text from '../../ui/fields/Text';
import Code, { editorSettings } from '../../ui/fields/Code';
import type { CodeMirrorLike } from '../../ui/fields/Code';
import Media, { thumbnailOf } from '../../ui/fields/Media';
import Fieldset from '../../ui/fields/Fieldset';
import { registerField } from '../../ui/core/registry';
import type { FieldComponentProps } from '../../ui/core/registry';
import type { Field, FieldValue } from '../../ui/core/types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

registerField('number', NumberField);
registerField('text', Text);

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

const number = (props: Field['props'] = {}, extra: Partial<Field> = {}): Field =>
	field({ type: 'number', core: 'number', title: 'Size', props: { presentation: 'input', ...props }, ...extra });

const spinner = (props: Field['props'] = {}): Field =>
	field({ type: 'spinner', core: 'number', title: 'Speed', props: { presentation: 'stepper', ...props } });

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

const type = (element: Element, text: string): void => {
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

const press = (element: Element, key: string): void => {
	act(() => {
		element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
	});
};

afterEach(() => {
	document.body.innerHTML = '';
	delete (window as unknown as { wp?: unknown }).wp;
});

describe('number and spinner', () => {
	test('an untouched int is shown, never rewritten', () => {
		const m = mount(NumberField, number({ unit: 'px' }), 100);

		expect(m.container.querySelector('input')?.value).toBe('100');
		expect(m.container.querySelector('.bfields-number__unit')?.textContent).toBe('px');
		expect(m.emitted).toEqual([]);
		expect(m.current()).toBe(100);
	});

	test('typing stores a string, decimals included', () => {
		const m = mount(NumberField, number(), 100);

		type(m.container.querySelector('input') as Element, '12.5');
		expect(m.emitted).toEqual(['12.5']);
		expect(typeof m.current()).toBe('string');
	});

	test('a number box allows decimals by default (step "any")', () => {
		const m = mount(NumberField, number({ min: 24, max: 300 }), '100');
		const input = m.container.querySelector('input') as HTMLInputElement;

		expect(input.getAttribute('step')).toBe('any');
		expect(input.getAttribute('min')).toBe('24');
		expect(input.getAttribute('max')).toBe('300');
	});

	test('the stepper steps an int to a string', () => {
		const m = mount(NumberField, spinner({ min: -180, max: 180 }), 30);
		const [down, up] = [...m.container.querySelectorAll('.bfields-number__step')];

		click(up);
		expect(m.emitted).toEqual(['31']);
		click(down);
		click(down);
		expect(m.emitted).toEqual(['31', '30', '29']);
		expect(m.emitted.every((value) => typeof value === 'string')).toBe(true);
	});

	test('arrow and page keys step the spinner by its step', () => {
		const m = mount(NumberField, spinner({ min: 0.5, max: 5, step: 0.1 }), 1);
		const input = m.container.querySelector('input') as Element;

		press(input, 'ArrowUp');
		expect(m.emitted).toEqual(['1.1']);
		press(input, 'PageUp');
		expect(m.emitted[1]).toBe('2.1');
		press(input, 'ArrowDown');
		expect(m.emitted[2]).toBe('2');
	});

	test("Codestar's spinner bounds apply when none are authored", () => {
		const m = mount(NumberField, spinner(), '100');
		const [, up] = [...m.container.querySelectorAll<HTMLButtonElement>('.bfields-number__step')];

		expect(up?.disabled).toBe(true);
		click(up);
		expect(m.emitted).toEqual([]);
	});

	test('stepValue snaps, clamps and keeps the step precision', () => {
		expect(stepValue('1', 1, { min: 0.5, max: 5, step: 1 })).toBe('1.5');
		expect(stepValue('1', -1, { min: 0.5, max: 5, step: 1 })).toBe('0.5');
		expect(stepValue('0.3', 1, { step: 0.1 })).toBe('0.4');
		expect(stepValue('179', 10, { min: -180, max: 180, step: 1 })).toBe('180');
		expect(stepValue('', 1, { min: 30, max: 730, step: 30 })).toBe('30');
		expect(stepValue('abc', 1, { step: 1 })).toBeNull();
	});

	test('locked: no step, no write', () => {
		const m = mount(NumberField, spinner(), '5', { locked: true });

		click(m.container.querySelectorAll('.bfields-number__step')[1]);
		expect(m.emitted).toEqual([]);
		expect((m.container.querySelector('input') as HTMLInputElement).disabled).toBe(true);
	});
});

describe('textarea', () => {
	const textarea = field({ type: 'textarea', props: { multiline: true } });

	test.each([['a\r\nb\r\n'], ['a\nb\n'], ['  padded  ']])('untouched %j is never written', (stored) => {
		const m = mount(Text, textarea, stored);

		expect(m.container.querySelector('textarea')).not.toBeNull();
		expect(m.emitted).toEqual([]);
		expect(m.current()).toBe(stored);
	});

	test('an edit stores the text as the browser holds it', () => {
		const m = mount(Text, textarea, 'a\nb');

		type(m.container.querySelector('textarea') as Element, 'a\nb\nc ');
		expect(m.emitted).toEqual(['a\nb\nc ']);
	});
});

describe('code editor', () => {
	const code = field({ id: 'custom_css', type: 'code_editor', core: 'code', title: 'Custom CSS', props: { settings: { mode: 'css', theme: 'monokai', lineNumbers: true } } });

	test('falls back to the textarea without wp.codeEditor', () => {
		const m = mount(Code, code, 'a{b:c}\r\n');
		const area = m.container.querySelector('textarea') as HTMLTextAreaElement;

		expect(area.classList.contains('bfields-code__input')).toBe(true);
		expect(m.emitted).toEqual([]);
		type(area, 'x{}');
		expect(m.emitted).toEqual(['x{}']);
	});

	test('mounts core CodeMirror at use time, in the field mode, and writes only on a real edit', () => {
		let handler: ((cm: CodeMirrorLike, change: { origin?: string }) => void) | undefined;
		let buffer = '';
		const cm: CodeMirrorLike = {
			getValue: () => buffer,
			setValue: (text) => {
				buffer = text.replace(/\r\n?/g, '\n');
				handler?.(cm, { origin: 'setValue' });
			},
			on: (_event, fn) => {
				handler = fn;
			},
			setOption: () => undefined,
			getInputField: () => document.createElement('textarea'),
			getWrapperElement: () => document.createElement('div'),
			refresh: () => undefined,
			toTextArea: () => undefined,
		};
		const initialize = jest.fn((area: HTMLTextAreaElement) => {
			buffer = area.value;
			return { codemirror: cm };
		});

		(window as unknown as { wp: unknown }).wp = {
			codeEditor: { initialize, defaultSettings: { codemirror: { mode: 'text/css', lint: false, indentUnit: 4 } } },
		};

		const m = mount(Code, code, 'a{b:c}\r\n');

		expect(initialize).toHaveBeenCalledTimes(1);

		const settings = initialize.mock.calls[0] as unknown as [HTMLTextAreaElement, { codemirror: Record<string, unknown> }];

		expect(settings[1].codemirror.mode).toBe('css');
		expect(settings[1].codemirror.lineNumbers).toBe(true);
		expect(settings[1].codemirror.theme).toBeUndefined();
		expect(m.container.querySelector('.bfields-code--rich')).not.toBeNull();
		expect(m.emitted).toEqual([]);

		act(() => {
			buffer = 'a{b:d}\n';
			handler?.(cm, { origin: '+input' });
		});
		expect(m.emitted).toEqual(['a{b:d}\n']);
	});

	test('refreshes once a hidden mount is shown (a closed field_group)', () => {
		const refresh = jest.fn();
		const cm: CodeMirrorLike = {
			getValue: () => '',
			setValue: () => undefined,
			on: () => undefined,
			setOption: () => undefined,
			getInputField: () => document.createElement('textarea'),
			getWrapperElement: () => document.createElement('div'),
			refresh,
			toTextArea: () => undefined,
		};
		let observed: (() => void) | undefined;
		const Observer = window.ResizeObserver;
		const width = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
		let shown = 0;

		(window as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
			constructor(callback: () => void) {
				observed = callback;
			}
			observe() {}
			disconnect() {}
		};
		Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => shown });
		(window as unknown as { wp: unknown }).wp = { codeEditor: { initialize: () => ({ codemirror: cm }), defaultSettings: {} } };

		try {
			mount(Code, code, '');
			refresh.mockClear();
			act(() => observed?.());
			expect(refresh).not.toHaveBeenCalled();

			shown = 320;
			act(() => observed?.());
			expect(refresh).toHaveBeenCalledTimes(1);

			act(() => observed?.());
			expect(refresh).toHaveBeenCalledTimes(1);
		} finally {
			(window as unknown as { ResizeObserver: unknown }).ResizeObserver = Observer;
			if (width) {
				Object.defineProperty(HTMLElement.prototype, 'offsetWidth', width);
			}
		}
	});

	test('a non-CSS mode is not linted', () => {
		expect(editorSettings({ codemirror: { lint: true } }, { mode: 'htmlmixed' }, false).codemirror?.lint).toBe(false);
		expect(editorSettings(undefined, undefined, true).codemirror).toMatchObject({ mode: 'css', readOnly: 'nocursor' });
	});
});

describe('media in a row', () => {
	const EMPTY_KEYS = ['url', 'id', 'width', 'height', 'thumbnail', 'alt', 'title', 'description'];
	const media = field({ id: 'bp3d_loader_image', type: 'media', core: 'media', title: 'Spinner Image', props: { presentation: 'attachment' } });
	const upload = field({ id: 'poster_src', type: 'upload', core: 'media', title: '3D Poster', props: { presentation: 'url' } });
	const stored = {
		url: 'https://x.test/a.png', id: '12', width: '40', height: '40', thumbnail: 'https://x.test/a-150.png',
		alt: 'A', title: 'Spinner', description: 'd', legacy: 'kept?',
	};

	test('media Remove writes the empty 8-key array in Codestar order', () => {
		const m = mount(Media, media, stored);

		expect(m.container.querySelector('.bfields-media__name')?.textContent).toBe('Spinner');
		click(m.container.querySelector('.bfields-media__remove'));

		const written = m.emitted[0] as Record<string, string>;

		expect(Object.keys(written)).toEqual(EMPTY_KEYS);
		expect(Object.values(written).every((item) => item === '')).toBe(true);
		expect(m.container.querySelector('.bfields-media__remove')).toBeNull();
	});

	test('the poster card Remove writes the same shape', () => {
		const m = mount(Media, media, stored, { card: true });

		click(m.container.querySelector('.bfields-poster .bfields-btn--link'));
		expect(Object.keys(m.emitted[0] as object)).toEqual(EMPTY_KEYS);
	});

	test('upload keeps a URL string: typing and Remove', () => {
		const m = mount(Media, upload, 'https://x.test/p.jpg', { row: {} });

		type(m.container.querySelector('.bfields-media__input') as Element, 'https://x.test/q.jpg');
		click(m.container.querySelector('.bfields-media__remove'));
		expect(m.emitted).toEqual(['https://x.test/q.jpg', '']);
	});

	test('wp.media is looked up when Upload is pressed, not before', () => {
		const m = mount(Media, media, { ...stored, url: '' });
		const open = jest.fn();
		let select: (() => void) | undefined;

		(window as unknown as { wp: unknown }).wp = {
			media: () => ({
				on: (_event: string, fn: () => void) => {
					select = fn;
				},
				open,
				state: () => ({
					get: () => ({
						first: () => ({
							toJSON: () => ({ id: 7, url: 'https://x.test/b.gif', type: 'image', width: 64, height: 64, sizes: { full: { url: 'https://x.test/b.gif' } }, alt: '', title: 'B', description: '' }),
						}),
					}),
				}),
			}),
		};

		click(m.container.querySelector('.bfields-media__upload'));
		expect(open).toHaveBeenCalled();
		act(() => select?.());

		const written = m.emitted[0] as Record<string, string>;

		expect(written).toMatchObject({ url: 'https://x.test/b.gif', id: '7', width: '64', thumbnail: 'https://x.test/b.gif' });
		expect(Object.keys(written).slice(0, 8)).toEqual(EMPTY_KEYS);
	});

	test("thumbnail follows Codestar's preview order", () => {
		expect(thumbnailOf({ type: 'image', url: 'u', sizes: { thumbnail: { url: 't' }, full: { url: 'f' } } })).toBe('t');
		expect(thumbnailOf({ type: 'image', url: 'u', sizes: { full: { url: 'f' } } })).toBe('f');
		expect(thumbnailOf({ type: 'application', url: 'u', icon: 'i' })).toBe('i');
	});
});

describe('fieldset', () => {
	const realSize = field({
		id: 'real_size',
		type: 'fieldset',
		core: 'fieldset',
		title: 'Real Size',
		fields: ['width', 'height', 'depth'].map((id) => number({}, { id, title: id, default: '' })),
	});

	test('draws the sub-fields three across and writes nothing on mount', () => {
		const m = mount(Fieldset, realSize, { width: '', height: '', depth: '' });
		const set = m.container.querySelector('fieldset.bfields-fieldset') as HTMLElement;

		expect(set.style.getPropertyValue('--bfields-fieldset-cols')).toBe('3');
		expect(set.querySelectorAll('.bfields-number__input')).toHaveLength(3);
		expect(m.emitted).toEqual([]);
	});

	test('an edit patches the stored object, key order and extra keys kept', () => {
		const m = mount(Fieldset, realSize, { depth: '3', width: '1', height: '2', unit: 'cm' });
		const width = m.container.querySelector('#bf-f-width') as Element;

		type(width, '10');
		expect(m.emitted).toEqual([{ depth: '3', width: '10', height: '2', unit: 'cm' }]);
		expect(Object.keys(m.emitted[0] as object)).toEqual(['depth', 'width', 'height', 'unit']);
	});

	test('with nothing stored, the first edit writes {width,height,depth}', () => {
		const m = mount(Fieldset, realSize, '');

		type(m.container.querySelector('#bf-f-height') as Element, '2.5');
		expect(m.emitted).toEqual([{ width: '', height: '2.5', depth: '' }]);
	});

	test('locked: every input disabled, nothing written', () => {
		const m = mount(Fieldset, realSize, { width: '1', height: '2', depth: '3' }, { locked: true });

		expect((m.container.querySelector('fieldset') as HTMLFieldSetElement).disabled).toBe(true);
		type(m.container.querySelector('#bf-f-width') as Element, '9');
		expect(m.emitted).toEqual([]);
	});
});
