/**
 * bfields — window.bfields.
 *
 * The public JS API (4.5). In Modern mode the 3D Viewer preview stops scraping
 * the DOM and becomes a subscriber instead: `readAttributes()` keeps its
 * mapping, but it is fed from state rather than from
 * document.querySelector('[name="_bp3dimages_[…]"]'). The Cloud Storage button
 * and the SpecGloss notice become adornments.
 */

import { registerField, registerLayout, addAdornment } from './registry';
import { getDevice, setDevice, onDeviceChange } from './responsive';
import { toPath } from './path';
import type { FieldPath, FieldValue, Values } from './types';
import type { Store } from './store';

type ValuesListener = (values: Values) => void;
type ReadyListener = (detail: ReadyDetail) => void;
export type ReadyDetail = { unique: string[] };

const stores = new Map<string, Store>();
let ready: ReadyDetail | null = null;
const readyListeners: ReadyListener[] = [];

/** The store a screen mounted with, for readers that must see the latest values. */
export function getStore(unique: string): Store | undefined {
	return stores.get(unique);
}

/**
 * Fired once, before the first screen mounts: `bfields:ready` on `document`
 * with `detail.unique` (the screens about to mount), then onReady() callbacks.
 */
export function announceReady(unique: string[]): void {
	if (ready) {
		return;
	}

	ready = { unique };
	document.dispatchEvent(new CustomEvent('bfields:ready', { detail: { unique: [...unique] } }));
	readyListeners.splice(0).forEach((listener) => listener(ready as ReadyDetail));
}
const pending = new Map<string, ValuesListener[]>();

/**
 * Store unsubscribers for listeners that subscribed before their screen
 * mounted. The function `subscribe()` handed back was created before the store
 * existed, so it looks here once the store is attached.
 */
const attached = new Map<ValuesListener, () => void>();

/** Called by the mounter once a screen's store exists. */
export function attachStore(unique: string, store: Store): void {
	stores.set(unique, store);

	// Subscribers that arrived before the screen mounted are wired up now and
	// given the current values immediately, so a listener can never miss the
	// first state just by loading early.
	const waiting = pending.get(unique) ?? [];

	waiting.forEach((listener) => {
		attached.set(
			listener,
			store.subscribe((values) => listener(values))
		);
		listener(store.get());
	});

	pending.delete(unique);
}

export const bfields = {
	registerField,
	registerLayout,
	addAdornment,

	/**
	 * Observe a screen's values. The payload is in STORED shape (3.1), which is
	 * what every existing reader already understands.
	 */
	subscribe(unique: string, listener: ValuesListener): () => void {
		const store = stores.get(unique);

		if (!store) {
			pending.set(unique, [...(pending.get(unique) ?? []), listener]);
			return () => {
				// Before mount: drop it from the queue. After: detach it from
				// the store it was wired to in attachStore().
				pending.set(unique, (pending.get(unique) ?? []).filter((item) => item !== listener));
				attached.get(listener)?.();
				attached.delete(listener);
			};
		}

		const unsubscribe = store.subscribe((values) => listener(values));

		listener(store.get());

		return unsubscribe;
	},

	/** A root id, or a path below it: `['bp3d_models', 0, 'model_src']` (a list segment may be a rowId). */
	getValue(unique: string, idOrPath: string | FieldPath): FieldValue | undefined {
		return stores.get(unique)?.getPath(toPath(idOrPath));
	},

	setValue(unique: string, idOrPath: string | FieldPath, value: FieldValue): void {
		stores.get(unique)?.setPath(toPath(idOrPath), value);
	},

	/** Run once bfields is about to mount, or now if it already has. */
	onReady(listener: ReadyListener): void {
		if (ready) {
			listener(ready);
		} else {
			readyListeners.push(listener);
		}
	},

	getValues(unique: string): Values | undefined {
		return stores.get(unique)?.get();
	},

	/**
	 * The device responsive fields are showing ('desktop' | 'tablet' |
	 * 'mobile'), one choice for the whole page. A live preview follows it
	 * with onDeviceChange() to show the chosen device's size.
	 */
	getDevice,
	setDevice,
	onDeviceChange,
};

export type BFieldsRuntime = typeof bfields;
