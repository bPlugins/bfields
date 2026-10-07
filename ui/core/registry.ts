/**
 * bfields — the field and layout registry.
 *
 * Components are looked up by AUTHORING type first, then by core type, so a
 * host can override one Codestar type (`upload`, say) without replacing the
 * shared `media` component every other type resolves to — and can give a type
 * bfields does not know (core `unknown`) a component of its own.
 */

import { useSyncExternalStore } from '@wordpress/element';
import type { ComponentType } from '@wordpress/element';
import type { Field, FieldPath, FieldValue, Values } from './types';

export type FieldComponentProps = {
	/**
	 * The SCREEN's storage key (`_bp3dimages_`), also inside a group row or a
	 * fieldset — nested components hand it on so adornments registered for the
	 * screen reach row fields too.
	 */
	unique: string;
	field: Field;
	value: FieldValue;
	onChange: (value: FieldValue) => void;
	/** Root values — dependency controllers and adornments read them. */
	values: Values;
	/** Row values, when the field is inside a group row. */
	row?: Values;
	/** Rendered locked, and never sent on save (3.3). */
	locked?: boolean;
	/**
	 * True when the section's layout is `cards`.
	 *
	 * A card gives a control the full width of the card and its own line, so
	 * the bigger treatments in the design — the 44px source field with its
	 * Upload button, the poster block — are drawn instead of the compact ones
	 * a row's right-hand column can hold.
	 */
	card?: boolean;
	/**
	 * On a responsive field showing tablet or mobile: the value that device
	 * inherits while `value` is empty. A control that can show it as a
	 * placeholder does (see core/responsive.ts). Every other control is given
	 * the inherited value AS `value` and never sees this.
	 */
	inherited?: FieldValue;
	id: string;
	/**
	 * From the screen's root to this field: `['bp3d_models', 0, 'model_src']`.
	 * Taken at render; a list segment may also be written as `rowId`.
	 */
	path?: FieldPath;
	/** The client id of the repeater row this field sits in (never stored). */
	rowId?: string;
	/** The field's value in the store at call time, for code that runs after an await. */
	latest?: () => FieldValue | undefined;
};

export type FieldComponent = ComponentType<FieldComponentProps>;
export type AdornmentComponent = ComponentType<FieldComponentProps & { slot: string }>;

const fields = new Map<string, FieldComponent>();
const layouts = new Map<string, ComponentType<Record<string, unknown>>>();
const adornments = new Map<string, AdornmentComponent[]>();

let version = 0;
const watchers = new Set<() => void>();

function changed(): void {
	version++;
	watchers.forEach((watcher) => watcher());
}

function watch(watcher: () => void): () => void {
	watchers.add(watcher);
	return () => {
		watchers.delete(watcher);
	};
}

/** Re-renders the caller whenever a field, layout or adornment is registered. */
export function useRegistryVersion(): number {
	return useSyncExternalStore(watch, () => version, () => version);
}

/**
 * Register (or override) the component for a type.
 *
 * Public as `bfields.registerField(type, Component)` (4.5).
 */
export function registerField(type: string, component: FieldComponent): void {
	fields.set(type, component);
	changed();
}

/** Resolve a field to its component: authoring type wins, then core type. */
export function resolveField(field: Field): FieldComponent | undefined {
	return fields.get(field.type) ?? fields.get(field.core);
}

export function registerLayout(name: string, component: ComponentType<Record<string, unknown>>): void {
	layouts.set(name, component);
	changed();
}

export function resolveLayout(name: string): ComponentType<Record<string, unknown>> | undefined {
	return layouts.get(name);
}

const adornmentKey = (unique: string, fieldId: string, slot: string): string =>
	`${unique}::${fieldId}::${slot}`;

/**
 * Add a component into a named slot beside a field.
 *
 * This is how the Cloud Storage button and the SpecGloss notice attach in
 * Modern mode (4.5) — as declared slots, instead of the DOM injection
 * src/admin/cloudPicker.ts does against Codestar's markup today.
 */
export function addAdornment(
	unique: string,
	fieldId: string,
	slot: string,
	component: AdornmentComponent
): void {
	const key = adornmentKey(unique, fieldId, slot);
	adornments.set(key, [...(adornments.get(key) ?? []), component]);
	changed();
}

export function resolveAdornments(
	unique: string,
	fieldId: string,
	slot: string
): AdornmentComponent[] {
	return adornments.get(adornmentKey(unique, fieldId, slot)) ?? [];
}
