/**
 * bfields — responsive fields: inheritance and where each device is written.
 *
 * The stored shapes are a contract with readers outside bfields (3D Viewer
 * Pro's responsiveSize(), for the nested one), so these pin the exact keys
 * and values each write produces, not just that "something changed".
 */

import {
	clearDevice,
	deviceView,
	getDevice,
	hasOwnValue,
	inheritedValue,
	isEmpty,
	onDeviceChange,
	setDevice,
	writeDevice,
} from '../../ui/core/responsive';
import type { Field, FieldValue, Values } from '../../ui/core/types';

const base = {
	title: '',
	subtitle: '',
	desc: '',
	before: '',
	after: '',
	class: '',
	pro: false,
	display: false,
	layout: '',
	icon: '',
};

const width: Field = {
	...base,
	id: 'bp_3d_width',
	type: 'dimensions',
	core: 'dimension',
	props: { height: false },
	responsive: { mode: 'nested', keys: { tablet: 'tablet', mobile: 'mobile' } },
};

const align: Field = {
	...base,
	id: 'bp_3d_align',
	type: 'button_set',
	core: 'choice',
	props: { presentation: 'segmented' },
	responsive: { mode: 'suffix', keys: { tablet: 'bp_3d_align_tablet', mobile: 'bp_3d_align_mobile' } },
};

const offset: Field = {
	...base,
	id: 'offset',
	type: 'number',
	core: 'number',
	props: { presentation: 'input' },
	responsive: { mode: 'suffix', keys: { tablet: 'offset_tablet', mobile: 'offset_mobile' } },
};

function recorder() {
	const writes: Array<[string, FieldValue]> = [];
	return { writes, emit: (id: string, value: FieldValue) => writes.push([id, value]) };
}

describe('isEmpty', () => {
	it('treats every empty stored shape as unset', () => {
		expect(isEmpty('')).toBe(true);
		expect(isEmpty(undefined)).toBe(true);
		expect(isEmpty([])).toBe(true);
		expect(isEmpty({ url: '', id: '', alt: '' })).toBe(true);
	});

	it('keeps a switched-off toggle and a zero as values', () => {
		expect(isEmpty('0')).toBe(false);
		expect(isEmpty(0)).toBe(false);
		expect(isEmpty(['a'])).toBe(false);
	});
});

describe('nested (dimensions)', () => {
	const desktop = { width: '100', unit: '%' };

	it('inherits desktop on tablet, and tablet on mobile once tablet is set', () => {
		expect(inheritedValue(width, 'tablet', desktop, {})).toEqual(desktop);
		expect(inheritedValue(width, 'mobile', desktop, {})).toEqual(desktop);

		const withTablet = { ...desktop, tablet: { width: '80', unit: 'vw' } };
		expect(inheritedValue(width, 'mobile', withTablet, {})).toEqual({ width: '80', unit: 'vw' });
	});

	it('does not count a unit on its own as a value (responsiveSize() rule)', () => {
		const unitOnly = { ...desktop, tablet: { width: '', unit: 'vw' } };
		expect(hasOwnValue(width, 'tablet', unitOnly, {})).toBe(false);
		expect(inheritedValue(width, 'mobile', unitOnly, {})).toBe(unitOnly);
	});

	it('shows an unset device empty, with the inherited unit on screen', () => {
		expect(deviceView(width, 'tablet', desktop, {})).toEqual({ value: { unit: '%' }, inherited: desktop });
	});

	it('writes the device inside the object and keeps the desktop keys and their order', () => {
		const { writes, emit } = recorder();
		writeDevice(width, 'tablet', { unit: '%', width: '80' }, desktop, emit);

		expect(writes).toEqual([['bp_3d_width', { width: '100', unit: '%', tablet: { unit: '%', width: '80' } }]]);
		expect(Object.keys(writes[0]![1] as object)).toEqual(['width', 'unit', 'tablet']);
	});

	it('clears a device by removing its key, nothing else', () => {
		const { writes, emit } = recorder();
		clearDevice(width, 'tablet', { ...desktop, tablet: { width: '80', unit: '%' } }, emit);

		expect(writes).toEqual([['bp_3d_width', { width: '100', unit: '%' }]]);
	});

	it('leaves desktop exactly as before', () => {
		const { writes, emit } = recorder();
		writeDevice(width, 'desktop', { width: '90', unit: '%' }, desktop, emit);

		expect(writes).toEqual([['bp_3d_width', { width: '90', unit: '%' }]]);
		expect(deviceView(width, 'desktop', desktop, {})).toEqual({ value: desktop });
	});
});

describe('suffix (scalars)', () => {
	const values: Values = { bp_3d_align: 'center' };

	it('shows the inherited value itself on a control with no placeholder', () => {
		expect(deviceView(align, 'tablet', 'center', values)).toEqual({ value: 'center' });
		expect(deviceView(align, 'mobile', 'center', { ...values, bp_3d_align_tablet: 'end' })).toEqual({ value: 'end' });
	});

	it('gives a number input its own (empty) value and the inherited one as placeholder', () => {
		expect(deviceView(offset, 'tablet', '10', { offset: '10' })).toEqual({ value: '', inherited: '10' });
	});

	it('writes the device to its sibling key', () => {
		const { writes, emit } = recorder();
		writeDevice(align, 'mobile', 'start', 'center', emit);
		expect(writes).toEqual([['bp_3d_align_mobile', 'start']]);
	});

	it("clears to '' which every type reads as unset", () => {
		const { writes, emit } = recorder();
		clearDevice(align, 'tablet', 'center', emit);
		expect(writes).toEqual([['bp_3d_align_tablet', '']]);
	});

	it('reads suffix keys from a group row when one is passed', () => {
		const row: Values = { bp_3d_align: 'center', bp_3d_align_tablet: 'start' };
		expect(hasOwnValue(align, 'tablet', 'center', row)).toBe(true);
		expect(hasOwnValue(align, 'mobile', 'center', row)).toBe(false);
	});
});

describe('page-wide device', () => {
	afterEach(() => setDevice('desktop'));

	it('notifies subscribers and the DOM once per change', () => {
		const seen: string[] = [];
		const events: string[] = [];
		const off = onDeviceChange((device) => seen.push(device));
		const listener = (event: Event) => events.push((event as CustomEvent).detail.device);
		document.addEventListener('bfields:device-change', listener);

		setDevice('tablet');
		setDevice('tablet');
		setDevice('mobile');

		off();
		document.removeEventListener('bfields:device-change', listener);

		expect(getDevice()).toBe('mobile');
		expect(seen).toEqual(['tablet', 'mobile']);
		expect(events).toEqual(['tablet', 'mobile']);
	});
});
