/**
 * bfields — addressing a value below a root key.
 *
 * A path is keys and list positions from the screen's root:
 * `['bp3d_models', 0, 'model_src']`. Inside a list a segment may also be the
 * row's client id (`rowId`, handed to components and adornments), which stays
 * right when rows are reordered after the path was taken. Nothing here
 * creates a container: a write through a missing row or key is dropped, so a
 * path can never invent a stored shape.
 */

import type { FieldPath, FieldValue } from './types';

/** Client row ids, by row object. Shared by every Repeater; never stored. */
export const rowIds = new WeakMap<object, string>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

function indexIn(list: unknown[], segment: string | number): number {
	if (typeof segment === 'number') {
		return Number.isInteger(segment) && segment >= 0 && segment < list.length ? segment : -1;
	}

	if (/^\d+$/.test(segment)) {
		return indexIn(list, Number(segment));
	}

	return list.findIndex((item) => typeof item === 'object' && item !== null && rowIds.get(item) === segment);
}

/** The value at `path` inside `root`, or undefined when any step is missing. */
export function getIn(root: unknown, path: FieldPath): unknown {
	let node = root;

	for (const segment of path) {
		if (Array.isArray(node)) {
			const at = indexIn(node, segment);
			node = at < 0 ? undefined : node[at];
		} else if (isRecord(node)) {
			node = node[String(segment)];
		} else {
			return undefined;
		}
	}

	return node;
}

/**
 * `root` with `value` at `path`, copying only the containers on the way (key
 * order kept). Returns `root` itself when nothing changes, and undefined when
 * the path does not exist.
 */
export function setIn(
	root: unknown,
	path: FieldPath,
	value: unknown,
	same: (a: unknown, b: unknown) => boolean
): unknown {
	const [segment, ...rest] = path;

	if (segment === undefined) {
		return same(root, value) ? root : value;
	}

	if (Array.isArray(root)) {
		const at = indexIn(root, segment);

		if (at < 0) {
			return undefined;
		}

		const next = setIn(root[at], rest, value, same);

		if (next === undefined) {
			return undefined;
		}

		if (next === root[at]) {
			return root;
		}

		const id = typeof root[at] === 'object' && root[at] !== null ? rowIds.get(root[at] as object) : undefined;

		if (id && typeof next === 'object' && next !== null) {
			rowIds.set(next, id);
		}

		return root.map((item, index) => (index === at ? next : item));
	}

	if (isRecord(root)) {
		const key = String(segment);

		if (rest.length > 0 && !(key in root)) {
			return undefined;
		}

		const next = setIn(root[key], rest, value, same);

		if (next === undefined) {
			return undefined;
		}

		return next === root[key] ? root : { ...root, [key]: next };
	}

	return undefined;
}

/** A string id or a path, as the public API takes it. */
export const toPath = (idOrPath: string | FieldPath): FieldPath =>
	Array.isArray(idOrPath) ? idOrPath : [idOrPath];

export type { FieldPath, FieldValue };
