/**
 * bfields — the value store.
 *
 * THE STORE HOLDS VALUES IN STORED SHAPE (4.0, 7.12). '1'/'0' strings, the
 * 8-key media array, {width,unit}, list-of-rows groups — whatever section 3.1
 * says is in the database is what is in here. Field components convert at the
 * edge for display only.
 *
 * That is not a style choice. Every conversion is a chance to change bytes; if
 * the store IS the wire format, a field the user never touched goes back
 * verbatim by construction, and the golden suite confirms that rather than
 * having to establish it.
 */

import { getIn, setIn } from './path';
import type { FieldPath, FieldValue, Values } from './types';

export type StoreListener = (values: Values, changed: string[]) => void;

export type Store = {
	get(): Values;
	getValue(id: string): FieldValue | undefined;
	setValue(id: string, value: FieldValue): void;
	/** Read below a root key: `['bp3d_models', 0, 'model_src']` (see core/path.ts). */
	getPath(path: FieldPath): FieldValue | undefined;
	/** Write below a root key, patching each container on the way; a missing step is a no-op. */
	setPath(path: FieldPath, value: FieldValue): void;
	setMany(patch: Values): void;
	/** Adopt a server response as the new clean baseline. */
	commit(values: Values): void;
	/** The server now holds `baseline`: move the baseline only, never what the user sees. */
	rebase(baseline: Values): void;
	/** Throw away edits and return to the last baseline. */
	revert(): void;
	isDirty(): boolean;
	/** Ids that differ from the baseline. */
	dirtyIds(): string[];
	subscribe(listener: StoreListener): () => void;
};

/**
 * Structural equality over the stored shapes.
 *
 * Key ORDER is significant: PHP's serialize() preserves insertion order, so an
 * array rebuilt in a different order is different bytes in the database even
 * though its contents match.
 */
export function identical(a: unknown, b: unknown): boolean {
	if (a === b) {
		return true;
	}

	if (Array.isArray(a) || Array.isArray(b)) {
		if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
			return false;
		}
		return a.every((item, index) => identical(item, b[index]));
	}

	if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
		const ka = Object.keys(a as object);
		const kb = Object.keys(b as object);

		if (ka.length !== kb.length || ka.some((key, index) => key !== kb[index])) {
			return false;
		}

		return ka.every((key) =>
			identical((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
		);
	}

	return false;
}

/**
 * Create a store seeded from the hydrated values PHP sent.
 */
export function createStore(initial: Values): Store {
	// `baseline` is what the server last confirmed; `values` is what the user
	// sees. A failed save must leave both alone (4.4).
	let baseline: Values = { ...initial };
	let values: Values = { ...initial };

	const listeners = new Set<StoreListener>();

	const emit = (changed: string[]): void => {
		listeners.forEach((listener) => listener(values, changed));
	};

	const store: Store = {
		get: () => values,

		getValue: (id) => values[id],

		setValue(id, value) {
			if (identical(values[id], value)) {
				return;
			}
			values = { ...values, [id]: value };
			emit([id]);
		},

		getPath: (path) => getIn(values, path) as FieldValue | undefined,

		setPath(path, value) {
			const [root, ...rest] = path;

			if (root === undefined || !(String(root) in values)) {
				if (root !== undefined && rest.length === 0) {
					store.setValue(String(root), value);
				}
				return;
			}

			const next = setIn(values[String(root)], rest, value, identical);

			if (next !== undefined) {
				store.setValue(String(root), next as FieldValue);
			}
		},

		setMany(patch) {
			const changed = Object.keys(patch).filter((id) => !identical(values[id], patch[id]));

			if (changed.length === 0) {
				return;
			}

			values = { ...values, ...patch };
			emit(changed);
		},

		commit(next) {
			baseline = { ...next };
			values = { ...next };
			emit(Object.keys(next));
		},

		rebase(next) {
			baseline = { ...next };
			// Nothing the user sees changed; listeners re-read isDirty().
			emit([]);
		},

		revert() {
			values = { ...baseline };
			emit(Object.keys(baseline));
		},

		isDirty: () => Object.keys(values).some((id) => !identical(values[id], baseline[id])),

		dirtyIds: () => Object.keys(values).filter((id) => !identical(values[id], baseline[id])),

		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};

	return store;
}
