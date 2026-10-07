/**
 * bfields — responsive fields: the current device, and per-device values.
 *
 * Any field authored with `'responsive' => true` holds one value per device.
 * Schema::responsive() decides where tablet and mobile are stored (see
 * `Responsive` in types.ts). This file is the only place that knows, so field
 * components never see a device. FieldRenderer hands each one the value for
 * the device on screen, and a component edits it the way it edits any value.
 *
 * INHERITANCE. A device with no value of its own inherits from the nearest
 * device above it: tablet from desktop, mobile from tablet, then desktop.
 * "No value" means absent or empty ('' , [], an object of empty strings). A
 * nested set counts as set once any key other than its unit has a value, the
 * rule 3D Viewer Pro's responsiveSize() reader already follows. PHP readers
 * apply the same fallback. Nothing is written for a device until someone sets
 * it.
 *
 * THE DEVICE is one choice for the whole page, like Gutenberg's: switching
 * Width to Tablet switches Height too. Hosts follow it with
 * `bfields.onDeviceChange()` or the `bfields:device-change` DOM event, e.g. a
 * live preview that shows the size for the chosen device.
 */

import { useEffect, useState } from '@wordpress/element';
import type { Device, Field, FieldValue, Values } from './types';

export const DEVICES: Device[] = ['desktop', 'tablet', 'mobile'];

type DeviceListener = (device: Device) => void;

let current: Device = 'desktop';
const listeners = new Set<DeviceListener>();

export function getDevice(): Device {
	return current;
}

export function setDevice(device: Device): void {
	if (device === current || !DEVICES.includes(device)) {
		return;
	}

	current = device;
	listeners.forEach((listener) => listener(device));
	document.dispatchEvent(new CustomEvent('bfields:device-change', { detail: { device } }));
}

export function onDeviceChange(listener: DeviceListener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/**
 * The page's device, re-rendering on change. Pass `false` for a field that
 * is not responsive: it then stays on desktop and never subscribes, so a
 * device switch does not re-render the rest of the screen.
 */
export function useDevice(enabled: boolean): Device {
	const [device, setState] = useState<Device>(enabled ? current : 'desktop');

	useEffect(() => {
		if (!enabled) {
			return undefined;
		}
		setState(current);
		return onDeviceChange(setState);
	}, [enabled]);

	return enabled ? device : 'desktop';
}

type Bag = Record<string, unknown>;

const asObject = (value: unknown): Bag =>
	value && typeof value === 'object' && !Array.isArray(value) ? (value as Bag) : {};

/** Empty in every shape a field stores: '', [], {url: '', id: '', …}. */
export function isEmpty(value: unknown): boolean {
	if (value === undefined || value === null || value === '') {
		return true;
	}
	if (Array.isArray(value)) {
		return value.length === 0;
	}
	if (typeof value === 'object') {
		return Object.values(value as Bag).every(isEmpty);
	}
	return false;
}

/** Does this device value count as the device's own, or does it inherit? */
function isSet(field: Field, value: unknown): boolean {
	const responsive = field.responsive;

	if (responsive?.mode !== 'nested') {
		return !isEmpty(value);
	}

	const skip = ['unit', responsive.keys.tablet, responsive.keys.mobile];

	return Object.entries(asObject(value)).some(([key, item]) => !skip.includes(key) && !isEmpty(item));
}

/**
 * A device's own stored value. `value` is the field's value (desktop's, with
 * the nested devices inside it); `bag` is the row or root values the suffix
 * keys live in.
 */
export function ownValue(field: Field, device: Device, value: FieldValue, bag: Values): FieldValue | undefined {
	const responsive = field.responsive;

	if (!responsive || device === 'desktop') {
		return value;
	}

	if (responsive.mode === 'suffix') {
		return bag[responsive.keys[device]];
	}

	return asObject(value)[responsive.keys[device]] as FieldValue | undefined;
}

/** Does this device have a value of its own? Desktop always does. */
export function hasOwnValue(field: Field, device: Device, value: FieldValue, bag: Values): boolean {
	return device === 'desktop' || isSet(field, ownValue(field, device, value, bag));
}

/** What the device falls back to: the nearest device above it that is set. */
export function inheritedValue(field: Field, device: Device, value: FieldValue, bag: Values): FieldValue | undefined {
	// Only tablet sits between a device and desktop, and only for mobile.
	for (const above of DEVICES.slice(1, DEVICES.indexOf(device)).reverse()) {
		if (hasOwnValue(field, above, value, bag)) {
			return ownValue(field, above, value, bag);
		}
	}

	return device === 'desktop' ? undefined : value;
}

/**
 * Cores whose control can show the inherited value as a placeholder, so the
 * device's own value (usually empty) is what the input holds. A toggle, a
 * select or a colour has no placeholder: those show the inherited value
 * itself until the device is given one.
 */
function showsPlaceholder(field: Field): boolean {
	switch (field.core) {
		case 'dimension':
		case 'spacing':
			return true;
		case 'text':
			return field.layout !== 'selector';
		case 'number':
			return field.props.presentation !== 'slider';
		default:
			return false;
	}
}

/**
 * What the control on screen gets for `device`: the value to show and edit,
 * and, for a placeholder-capable control, the value it inherits.
 */
export function deviceView(
	field: Field,
	device: Device,
	value: FieldValue,
	bag: Values
): { value: FieldValue; inherited?: FieldValue } {
	if (!field.responsive || device === 'desktop') {
		return { value };
	}

	const own = ownValue(field, device, value, bag);
	const inherited = inheritedValue(field, device, value, bag) as FieldValue;
	const set = isSet(field, own);

	if (!showsPlaceholder(field)) {
		return { value: set ? (own as FieldValue) : inherited };
	}

	if (field.responsive.mode === 'nested') {
		// The numbers stay empty and show the inherited ones as placeholders,
		// but the unit select has to show SOME unit: the inherited one, unless
		// this device chose its own. The first number typed then saves with
		// the unit on screen, not whatever a reader defaults to.
		const unit = asObject(inherited).unit;
		return {
			value: { ...(unit !== undefined ? { unit } : {}), ...asObject(own) } as FieldValue,
			inherited,
		};
	}

	return { value: (own ?? '') as FieldValue, inherited };
}

/**
 * Write `next` as `device`'s value. `emit` is FieldRenderer's (id, value)
 * change handler: a suffix device writes its own key, a nested one patches
 * the field's object and keeps its key order (7.2).
 */
export function writeDevice(
	field: Field,
	device: Device,
	next: FieldValue,
	value: FieldValue,
	emit: (id: string, value: FieldValue) => void
): void {
	const responsive = field.responsive;

	if (!responsive || device === 'desktop') {
		emit(field.id, next);
		return;
	}

	if (responsive.mode === 'suffix') {
		emit(responsive.keys[device], next);
		return;
	}

	emit(field.id, { ...asObject(value), [responsive.keys[device]]: next } as FieldValue);
}

/** Drop `device`'s own value so it inherits again. */
export function clearDevice(
	field: Field,
	device: Device,
	value: FieldValue,
	emit: (id: string, value: FieldValue) => void
): void {
	const responsive = field.responsive;

	if (!responsive || device === 'desktop') {
		return;
	}

	if (responsive.mode === 'suffix') {
		// '' is "unset" for every type: the codec turns it into that type's
		// empty shape, and every empty shape inherits.
		emit(responsive.keys[device], '');
		return;
	}

	const rest = { ...asObject(value) };
	delete rest[responsive.keys[device]];
	emit(field.id, rest as FieldValue);
}

/** An inherited scalar as placeholder text, or undefined when there is none. */
export function placeholderOf(inherited: unknown): string | undefined {
	return typeof inherited === 'string' || typeof inherited === 'number'
		? String(inherited) || undefined
		: undefined;
}

/** A field's authored placeholder as text; an object (spacing's per-side form) is not. */
export function placeholderText(placeholder: unknown): string | undefined {
	return typeof placeholder === 'string' ? placeholder : undefined;
}
