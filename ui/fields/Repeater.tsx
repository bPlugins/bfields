/**
 * bfields — `group` and `repeater`.
 *
 * Codestar's accordion list, against a store instead of against the DOM. CSF
 * clones a hidden template row and renumbers every input's `name` on add,
 * remove and reorder, which is where its dependency hazards come from (the
 * template matches selectors first) and why a row's field ids are not really
 * ids at all. Here a row is an object in an array and nothing is renumbered.
 *
 * The rules that make it safe, in the order they bite:
 *
 *   1. STORED SHAPE, ALWAYS. A group is a list of row objects and an empty one
 *      is '' (3.1). Rows are PATCHED, never rebuilt, so key order and any key
 *      an older version wrote survive a save untouched.
 *   2. A new row is built from the schema's defaults, complete. An edited row
 *      gains nothing it did not have: Codec\Csf::dehydrate_row() iterates the
 *      ROW rather than the schema, so a record that predates a sub-field stays
 *      as it is and diffs clean (7.2, 8.2).
 *   3. Sub-fields go through FieldRenderer with `row` passed, so a row-local
 *      dependency resolves inside the row and an `'all'` rule reaches out to
 *      the screen — there is no second dependency engine here (4.2).
 *
 * ROW TABS. A long row (a 3D model with its lighting, AR, size and hotspots)
 * can be split into tabs: a sub-field with `'tab' => 'Lighting'` starts a tab,
 * and every sub-field after it joins that tab until the next one names
 * another. Only the open tab's fields render. It is presentation only — the
 * row is still one flat object, so storage, defaults and dependencies are
 * exactly what they are without it — and a group with no `tab` key renders
 * as before.
 *
 * ROW IDS. Keys, open rows and open tabs follow a client id held in a WeakMap
 * beside the rows, never in them: nothing is added to a row, so there is no
 * `__id` for the codec to strip.
 */

import { useEffect, useRef, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import FieldRenderer, { fieldKeys } from '../layout/FieldRenderer';
import { ArrowDown, ArrowUp, ChevronDown, Copy, Grip, Plus, Trash, resolveIcon } from '../core/icons';
import type { FieldComponentProps } from '../core/registry';
import { rowIds } from '../core/path';
import type { Field, FieldValue, Values } from '../core/types';

/** The blank row a schema describes: every sub-field at its default, except locked `pro` ones, which are never saved. */
export function blankRow(fields: Field[]): Values {
	const row: Values = {};

	fields.forEach((child) => {
		if (child.id === '' || child.display || child.pro) {
			return;
		}

		row[child.id] = (child.default ?? '') as FieldValue;
	});

	return row;
}

/** `rows` with the item at `from` moved to `to`; the row objects themselves are untouched. */
export function moveRow<T>(rows: T[], from: number, to: number): T[] {
	if (from === to || from < 0 || to < 0 || from >= rows.length || to >= rows.length) {
		return rows;
	}

	const next = [...rows];
	const [moved] = next.splice(from, 1);

	next.splice(to, 0, moved as T);

	return next;
}

/** What the store is handed: the list, or '' once it is empty (3.1). */
export function serializeRows(rows: Values[]): FieldValue {
	return rows.length === 0 ? '' : (rows as unknown as FieldValue);
}

type RowTab = { name: string; fields: Field[] };

/**
 * A row's sub-fields in tabs, or null when none names one. Sub-fields before
 * the first `tab` open a tab of their own, "General".
 */
function rowTabs(fields: Field[]): RowTab[] | null {
	if (!fields.some((child) => child.props.tab)) {
		return null;
	}

	const tabs: RowTab[] = [];

	fields.forEach((child) => {
		const name = child.props.tab;
		const current = tabs[tabs.length - 1];

		if (name && name !== current?.name) {
			tabs.push({ name, fields: [child] });
		} else if (current) {
			current.fields.push(child);
		} else {
			tabs.push({ name: __('General', 'bfields'), fields: [child] });
		}
	});

	return tabs;
}

/** The last path segment of a URL, decoded when it decodes. */
function fileName(url: string): string {
	const base = url.split(/[?#]/)[0]?.split('/').pop() ?? '';

	try {
		return decodeURIComponent(base);
	} catch {
		return base;
	}
}

/**
 * The value CSF prints after the prefix: the row's first sub-field (its
 * `accordion_title_by` default). Uploads show their file name and selects
 * their label, so six collapsed models or hotspots stay tell-apart-able.
 */
function titleValue(row: Values, fields: Field[]): string {
	const first = fields.find((child) => child.id !== '' && !child.display);

	if (!first || first.core === 'toggle') {
		return '';
	}

	let raw: unknown = row[first.id];

	if (Array.isArray(raw)) {
		raw = raw[0];
	}

	if (raw && typeof raw === 'object' && typeof (raw as { url?: unknown }).url === 'string') {
		raw = (raw as { url: string }).url;
	}

	if (typeof raw !== 'string' && typeof raw !== 'number') {
		return '';
	}

	const text = String(raw).trim();
	const options = first.props.options;

	if (text !== '' && first.core === 'media') {
		return fileName(text);
	}

	if (options && !Array.isArray(options) && typeof options[text] === 'string') {
		return options[text];
	}

	return text;
}

export type RowTitle = { name: string; value: string };

/** CSF's accordion title: number and `accordion_title_prefix`, then the first field's value. */
export function rowTitle(row: Values, field: Field, index: number): RowTitle {
	const prefix = String(field.props.titlePrefix ?? '').trim();
	const numbered = Boolean(field.props.titleNumber);
	const value = titleValue(row, field.fields ?? []);
	let name = '';

	if (prefix && numbered) {
		name = sprintf('%1$s %2$d', prefix, index + 1);
	} else if (prefix) {
		name = prefix;
	} else if (numbered) {
		name = `${index + 1}.`;
	}

	if (name === '' && value === '') {
		/* translators: %d: the row's position in the list. */
		name = sprintf(__('Item %d', 'bfields'), index + 1);
	}

	return { name, value };
}

const plainTitle = (title: RowTitle): string =>
	title.name && title.value ? `${title.name} — ${title.value}` : title.name || title.value;

/** Codestar's repeater default is an icon tag; a label is text. */
function addLabel(field: Field): string {
	const own = [field.props.buttonTitle, field.props.addTitle].find(
		(label) => typeof label === 'string' && label.trim() !== '' && !/[<>]/.test(label)
	);

	return own ?? __('Add New', 'bfields');
}

function deepCopy(row: Values): Values {
	return JSON.parse(JSON.stringify(row)) as Values;
}

let sequence = 0;
const nextId = (): string => `r${++sequence}`;

type Drag = { id: string; from: number; to: number; offset: number; shift: number };

type DragTrack = {
	pointerId: number;
	startY: number;
	tops: number[];
	bottoms: number[];
	from: number;
	id: string;
};

type FocusTarget = { id: string; part: 'handle' | 'toggle' | 'up' | 'down' } | { id: ''; part: 'add' };

export default function Repeater({ unique, id, field, value, values, row: parentRow, onChange, locked, path, latest }: FieldComponentProps) {
	const children = field.fields ?? [];
	const rows: Values[] = Array.isArray(value) ? (value as Values[]) : [];
	const here = path ?? [field.id];
	const nested = parentRow !== undefined;
	const collapsible = field.props.presentation !== 'plain';

	// Codestar's `max` / `min` (0 = no limit). Enforced on add, duplicate and
	// remove only: rows already stored are never trimmed or padded.
	const maxRows = Number(field.props.maxRows ?? 0) || 0;
	const minRows = Number(field.props.minRows ?? 0) || 0;
	const canAdd = !locked && (maxRows === 0 || rows.length < maxRows);
	const canRemove = !locked && rows.length > minRows;
	const canMove = !locked && rows.length > 1;

	const idOf = useRef(rowIds);
	const lastIds = useRef<string[]>([]);
	const used = new Set<string>();

	// Rows this component produced are known by object; anything else (a
	// revert, a server commit) takes the previous id at its index.
	const ids = rows.map((item, index) => {
		const isObject = typeof item === 'object' && item !== null;
		let known = isObject ? idOf.current.get(item) : undefined;

		if (!known || used.has(known)) {
			const previous = lastIds.current[index];

			known = previous && !used.has(previous) ? previous : nextId();

			if (isObject) {
				idOf.current.set(item, known);
			}
		}

		used.add(known);

		return known;
	});

	lastIds.current = ids;

	const [open, setOpen] = useState<Record<string, boolean>>({});
	const [tabOf, setTabOf] = useState<Record<string, string>>({});
	const [drag, setDrag] = useState<Drag | null>(null);
	const [message, setMessage] = useState('');

	const rootRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLOListElement>(null);
	const track = useRef<DragTrack | null>(null);
	const focusNext = useRef<FocusTarget | null>(null);

	const tabs = rowTabs(children);
	const label = addLabel(field);
	const domId = (rowId: string): string => `${id}-${rowId}`;
	const titleOf = (index: number): string => plainTitle(rowTitle(rows[index] ?? {}, field, index));

	useEffect(() => {
		const target = focusNext.current;
		const root = rootRef.current;

		focusNext.current = null;

		if (!target || !root) {
			return;
		}

		const scope = target.part === 'add' ? root : root.querySelector(`[data-row="${target.id}"]`);
		const wanted = scope?.querySelector<HTMLElement>(`[data-part="${target.part}"]`);
		const fallback = scope?.querySelector<HTMLElement>('[data-part="toggle"], [data-part="handle"]');
		const element = wanted && !(wanted as HTMLButtonElement).disabled ? wanted : fallback;

		element?.focus();
	});

	const announce = (text: string): void => {
		// A repeat of the same words is still a new announcement.
		setMessage((current) => (current === text ? `${text}\u00a0` : text));
	};

	const emit = (next: Values[]): void => {
		if (!locked) {
			onChange(serializeRows(next));
		}
	};

	// The rows as the store holds them when called, not as they were drawn.
	const freshRows = (): Values[] => {
		const now = latest ? latest() : value;

		if (now === undefined) {
			return rows;
		}

		return Array.isArray(now) ? (now as Values[]) : [];
	};

	const findRow = (list: Values[], rowId: string): number => {
		const found = list.findIndex((item) => typeof item === 'object' && item !== null && idOf.current.get(item) === rowId);
		// Rows replaced from outside get their ids on the next render; until then, by position.
		return found >= 0 ? found : lastIds.current.indexOf(rowId);
	};

	const readRow = (rowId: string): Values | undefined => {
		const list = freshRows();
		return list[findRow(list, rowId)];
	};

	const patchRow = (rowId: string, key: string, next: FieldValue): void => {
		const list = freshRows();
		const index = findRow(list, rowId);
		const source = list[index];

		if (locked || !source) {
			return;
		}

		const patched = { ...source, [key]: next };

		idOf.current.set(patched, rowId);
		emit(list.map((item, at) => (at === index ? patched : item)));
	};

	const add = (): void => {
		if (!canAdd) {
			return;
		}

		const fresh = blankRow(children);
		const rowId = nextId();

		idOf.current.set(fresh, rowId);
		emit([...rows, fresh]);
		setOpen({ ...open, [rowId]: true });
		focusNext.current = { id: rowId, part: collapsible ? 'toggle' : 'handle' };
		announce(
			sprintf(
				/* translators: 1: row title, 2: its position, 3: number of rows. */
				__('%1$s added, item %2$d of %3$d.', 'bfields'),
				plainTitle(rowTitle(fresh, field, rows.length)),
				rows.length + 1,
				rows.length + 1
			)
		);
	};

	const clone = (index: number): void => {
		const source = rows[index];

		if (!source || !canAdd) {
			return;
		}

		const copy = deepCopy(source);
		const rowId = nextId();

		idOf.current.set(copy, rowId);
		emit([...rows.slice(0, index + 1), copy, ...rows.slice(index + 1)]);
		setOpen({ ...open, [rowId]: true });
		focusNext.current = { id: rowId, part: collapsible ? 'toggle' : 'handle' };
		announce(
			sprintf(
				/* translators: 1: row title, 2: position of the copy. */
				__('%1$s duplicated as item %2$d.', 'bfields'),
				titleOf(index),
				index + 2
			)
		);
	};

	const remove = (index: number): void => {
		if (!canRemove || !rows[index]) {
			return;
		}

		// eslint-disable-next-line no-alert
		if (!window.confirm(__('Are you sure to delete this item?', 'bfields'))) {
			return;
		}

		const title = titleOf(index);
		const next = rows.filter((_item, at) => at !== index);
		const neighbour = ids[index + 1] ?? ids[index - 1];

		emit(next);
		focusNext.current = neighbour ? { id: neighbour, part: collapsible ? 'toggle' : 'handle' } : { id: '', part: 'add' };
		announce(
			sprintf(
				/* translators: 1: row title, 2: number of rows left. */
				_n('%1$s removed, %2$d item left.', '%1$s removed, %2$d items left.', next.length, 'bfields'),
				title,
				next.length
			)
		);
	};

	const move = (from: number, to: number, part: 'handle' | 'up' | 'down'): void => {
		const rowId = ids[from];

		if (!canMove || !rowId || to < 0 || to >= rows.length || to === from) {
			return;
		}

		const title = titleOf(from);

		emit(moveRow(rows, from, to));
		focusNext.current = { id: rowId, part };
		announce(
			sprintf(
				/* translators: 1: row title, 2: new position, 3: number of rows. */
				__('%1$s moved to position %2$d of %3$d.', 'bfields'),
				title,
				to + 1,
				rows.length
			)
		);
	};

	const onHandleKey = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
		if (drag) {
			if (event.key === 'Escape') {
				event.preventDefault();
				cancelDrag();
			}
			return;
		}

		const to = {
			ArrowUp: index - 1,
			ArrowDown: index + 1,
			Home: 0,
			End: rows.length - 1,
		}[event.key];

		if (to === undefined) {
			return;
		}

		event.preventDefault();
		move(index, to, 'handle');
	};

	const cancelDrag = (): void => {
		track.current = null;
		setDrag(null);
		announce(__('Reorder cancelled.', 'bfields'));
	};

	const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, index: number): void => {
		const list = listRef.current;
		const rowId = ids[index];

		if (!canMove || !list || !rowId || event.button !== 0) {
			return;
		}

		event.preventDefault();
		event.currentTarget.focus({ preventScroll: true });
		event.currentTarget.setPointerCapture?.(event.pointerId);

		const rects = [...list.children].map((item) => item.getBoundingClientRect());
		const scroll = window.scrollY;
		const tops = rects.map((rect) => rect.top + scroll);
		const bottoms = rects.map((rect) => rect.bottom + scroll);
		const gap = tops.length > 1 ? (tops[1] ?? 0) - (bottoms[0] ?? 0) : 0;

		track.current = { pointerId: event.pointerId, startY: event.clientY + scroll, tops, bottoms, from: index, id: rowId };
		setDrag({ id: rowId, from: index, to: index, offset: 0, shift: (bottoms[index] ?? 0) - (tops[index] ?? 0) + gap });
	};

	const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>): void => {
		const state = track.current;

		if (!state || !drag || event.pointerId !== state.pointerId) {
			return;
		}

		const edge = 48;

		if (event.clientY < edge) {
			window.scrollBy(0, -16);
		} else if (event.clientY > window.innerHeight - edge) {
			window.scrollBy(0, 16);
		}

		const { tops, bottoms, from } = state;
		const top = tops[from] ?? 0;
		const bottom = bottoms[from] ?? 0;
		const min = (tops[0] ?? 0) - top;
		const max = (bottoms[bottoms.length - 1] ?? 0) - bottom;
		const offset = Math.min(max, Math.max(min, event.clientY + window.scrollY - state.startY));
		const centre = (top + bottom) / 2 + offset;
		let to = 0;

		tops.forEach((rowTop, at) => {
			if (at !== from && (rowTop + (bottoms[at] ?? rowTop)) / 2 <= centre) {
				to++;
			}
		});

		setDrag({ ...drag, to, offset });
	};

	const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>): void => {
		const state = track.current;

		if (!state || event.pointerId !== state.pointerId) {
			return;
		}

		track.current = null;
		event.currentTarget.releasePointerCapture?.(event.pointerId);

		const to = drag?.to ?? state.from;

		setDrag(null);

		if (to !== state.from) {
			move(state.from, to, 'handle');
		}
	};

	const shiftOf = (index: number, rowId: string): string | undefined => {
		if (!drag) {
			return undefined;
		}

		if (rowId === drag.id) {
			return `translateY(${drag.offset}px)`;
		}

		if (drag.from < drag.to && index > drag.from && index <= drag.to) {
			return `translateY(${-drag.shift}px)`;
		}

		if (drag.from > drag.to && index >= drag.to && index < drag.from) {
			return `translateY(${drag.shift}px)`;
		}

		return undefined;
	};

	const hintId = `${id}-reorder-hint`;
	const limitId = `${id}-limit`;
	const short = minRows > 0 && rows.length < minRows;
	const full = maxRows > 0 && rows.length >= maxRows;

	const addButton = (
		<button
			type="button"
			className="bfields-btn bfields-btn--soft bfields-repeater__add"
			data-part="add"
			disabled={!canAdd}
			aria-describedby={short || full ? limitId : undefined}
			onClick={add}
		>
			<Plus size={16} />
			{label}
		</button>
	);

	let limit = null;

	if (short) {
		limit = (
			<p id={limitId} className="bfields-repeater__error">
				{sprintf(
					/* translators: %d: the fewest rows the list may hold. */
					_n('Add at least %d item.', 'Add at least %d items.', minRows, 'bfields'),
					minRows
				)}
			</p>
		);
	} else if (full) {
		limit = (
			<p id={limitId} className="bfields-repeater__note">
				{sprintf(
					/* translators: %d: the most rows the list may hold. */
					_n('You cannot add more than %d item.', 'You cannot add more than %d items.', maxRows, 'bfields'),
					maxRows
				)}
			</p>
		);
	}

	const className = [
		'bfields-repeater',
		nested ? 'bfields-repeater--nested' : '',
		collapsible ? '' : 'bfields-repeater--plain',
		locked ? 'bfields-repeater--locked' : '',
	]
		.filter(Boolean)
		.join(' ');

	return (
		<div ref={rootRef} className={className}>
			<span id={hintId} hidden>
				{__('Drag, or press the up and down arrow keys, to reorder.', 'bfields')}
			</span>
			<div className="bfields-repeater__sr" role="status" aria-live="polite" aria-atomic="true">
				{message}
			</div>

			{rows.length === 0 ? (
				<div className="bfields-repeater__empty">
					<p className="bfields-repeater__hint">
						{sprintf(
							/* translators: %s: the add button's label, e.g. "Add New Model". */
							__('Nothing here yet. Use “%s” to add the first one.', 'bfields'),
							label
						)}
					</p>
					{addButton}
					{limit}
				</div>
			) : (
				<ol
					ref={listRef}
					className={`bfields-repeater__list${drag ? ' is-sorting' : ''}`}
					aria-label={field.title || undefined}
				>
					{rows.map((item, index) => {
						const rowId = ids[index] ?? String(index);
						const expanded = !collapsible || Boolean(open[rowId]);
						const title = rowTitle(item, field, index);
						const text = plainTitle(title);
						const tabAt = tabs ? Math.max(0, tabs.findIndex((tab) => tab.name === tabOf[rowId])) : 0;
						const current = tabs?.[tabAt];
						const shown = current ? current.fields : children;
						const shownKeys = fieldKeys(shown);
						const base = domId(rowId);
						const dragging = drag?.id === rowId;

						const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, at: number): void => {
							if (!tabs) {
								return;
							}

							const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
							const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[event.key];
							let next: number | undefined;

							if (step !== undefined) {
								next = (at + step + tabs.length) % tabs.length;
							} else if (event.key === 'Home') {
								next = 0;
							} else if (event.key === 'End') {
								next = tabs.length - 1;
							}

							const tab = next === undefined ? undefined : tabs[next];

							if (!tab) {
								return;
							}

							event.preventDefault();
							setTabOf({ ...tabOf, [rowId]: tab.name });
							event.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="tab"]')[next ?? 0]?.focus();
						};

						return (
							<li
								key={rowId}
								data-row={rowId}
								className={[
									'bfields-repeater-row',
									expanded ? 'is-open' : '',
									dragging ? 'is-dragging' : '',
								]
									.filter(Boolean)
									.join(' ')}
								style={{ transform: shiftOf(index, rowId) }}
							>
								<div className="bfields-repeater-row__head">
									<button
										type="button"
										className="bfields-icon-btn bfields-repeater-row__handle"
										data-part="handle"
										disabled={!canMove}
										aria-label={sprintf(
											/* translators: %s: row title. */
											__('Reorder %s', 'bfields'),
											text
										)}
										aria-describedby={hintId}
										title={__('Drag to reorder', 'bfields')}
										onPointerDown={(event) => onPointerDown(event, index)}
										onPointerMove={onPointerMove}
										onPointerUp={onPointerUp}
										onPointerCancel={() => drag && cancelDrag()}
										onKeyDown={(event) => onHandleKey(event, index)}
									>
										<Grip size={16} />
									</button>

									{collapsible ? (
										<button
											type="button"
											id={`${base}-toggle`}
											className="bfields-repeater-row__toggle"
											data-part="toggle"
											aria-expanded={expanded}
											aria-controls={`${base}-body`}
											onClick={() => setOpen({ ...open, [rowId]: !expanded })}
										>
											<span className="bfields-repeater-row__title">
												{title.name ? <span className="bfields-repeater-row__name">{title.name}</span> : null}
												{title.value ? <span className="bfields-repeater-row__value">{title.value}</span> : null}
											</span>
											<span className="bfields-repeater-row__chevron">
												<ChevronDown size={16} />
											</span>
										</button>
									) : (
										<span id={`${base}-toggle`} className="bfields-repeater-row__title bfields-repeater-row__title--plain">
											{title.name ? <span className="bfields-repeater-row__name">{title.name}</span> : null}
											{title.value ? <span className="bfields-repeater-row__value">{title.value}</span> : null}
										</span>
									)}

									<div className="bfields-repeater-row__actions">
										<span className="bfields-repeater-row__order">
											<button
												type="button"
												className="bfields-icon-btn"
												data-part="up"
												disabled={!canMove || index === 0}
												aria-label={sprintf(
													/* translators: %s: row title. */
													__('Move %s up', 'bfields'),
													text
												)}
												title={__('Move up', 'bfields')}
												onClick={() => move(index, index - 1, 'up')}
											>
												<ArrowUp size={16} />
											</button>
											<button
												type="button"
												className="bfields-icon-btn"
												data-part="down"
												disabled={!canMove || index === rows.length - 1}
												aria-label={sprintf(
													/* translators: %s: row title. */
													__('Move %s down', 'bfields'),
													text
												)}
												title={__('Move down', 'bfields')}
												onClick={() => move(index, index + 1, 'down')}
											>
												<ArrowDown size={16} />
											</button>
										</span>
										<button
											type="button"
											className="bfields-icon-btn"
											disabled={!canAdd}
											aria-label={sprintf(
												/* translators: %s: row title. */
												__('Duplicate %s', 'bfields'),
												text
											)}
											title={__('Duplicate', 'bfields')}
											onClick={() => clone(index)}
										>
											<Copy size={16} />
										</button>
										<button
											type="button"
											className="bfields-icon-btn bfields-repeater-row__remove"
											disabled={!canRemove}
											aria-label={sprintf(
												/* translators: %s: row title. */
												__('Remove %s', 'bfields'),
												text
											)}
											title={__('Remove', 'bfields')}
											onClick={() => remove(index)}
										>
											<Trash size={16} />
										</button>
									</div>
								</div>

								{expanded ? (
									<div
										id={`${base}-body`}
										className="bfields-repeater-row__body"
										role={collapsible ? 'region' : undefined}
										aria-labelledby={collapsible ? `${base}-toggle` : undefined}
									>
										{tabs ? (
											<div
												className="bfields-repeater-tabs"
												role="tablist"
												aria-label={text}
											>
												{tabs.map((tab, at) => {
													const icon = field.props.tabIcons?.[tab.name];
													const Icon = icon ? resolveIcon(icon) : null;
													const selected = tab.name === current?.name;

													return (
														<button
															key={tab.name}
															type="button"
															role="tab"
															id={`${base}-tab-${at}`}
															aria-selected={selected}
															aria-controls={`${base}-panel`}
															tabIndex={selected ? 0 : -1}
															className={`bfields-repeater-tab${selected ? ' is-active' : ''}`}
															onClick={() => setTabOf({ ...tabOf, [rowId]: tab.name })}
															onKeyDown={(event) => onTabKey(event, at)}
														>
															{Icon ? <Icon size={16} /> : null}
															{tab.name}
														</button>
													);
												})}
											</div>
										) : null}

										<fieldset
											id={`${base}-panel`}
											className="bfields-repeater-row__fields"
											disabled={locked}
											role={tabs ? 'tabpanel' : undefined}
											aria-labelledby={tabs ? `${base}-tab-${tabAt}` : undefined}
										>
											{shown.map((child, at) => (
												<FieldRenderer
													key={shownKeys[at]}
													unique={unique}
													// This field's own id already carries any outer
													// row's prefix, so nested rows stay distinct.
													idPrefix={`${id}-${index}`}
													field={child}
													values={values}
													row={item}
													basePath={[...here, index]}
													rowId={rowId}
													readBag={() => readRow(rowId)}
													onChange={(key, next) => patchRow(rowId, key, next)}
												/>
											))}
										</fieldset>
									</div>
								) : null}
							</li>
						);
					})}
				</ol>
			)}

			{rows.length > 0 ? (
				<div className="bfields-repeater__foot">
					{addButton}
					{limit}
				</div>
			) : null}
		</div>
	);
}
