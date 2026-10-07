/**
 * bfields — resizable screen layout. EXPERIMENTAL, behind `resizable`.
 *
 * Both screens are drawn as a 1185px column (the width the Figma frames were
 * measured at), or the whole content well with `page_width: 'full'`. With
 * `resizable` on, the user can drag:
 *
 *   the page edges      the column's width; both edges move together because
 *                       the column is centred (`page_align: 'start'`: the end
 *                       edge only)
 *   the editor gutter   the split between the controls and the sidebar
 *                       (meta-box editor only — the options page has none)
 *   the tabs gutter     the width of the tab column, with
 *                       `tabs_position: 'left'` (both screens)
 *
 * At rest each handle shows only a small grip in the gutter, outside every
 * designed surface, and the sizes are the design's. Double-click or Enter puts
 * a handle back. Sizes are a per-browser convenience in localStorage, keyed
 * per screen; nothing is saved to the server.
 */

import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const PAGE_MIN = 960;
const SIDE_MIN = 280;
/** What the controls column keeps, whatever the sidebar asks for. */
export const MAIN_MIN = 420;
const TABS_MIN = 160;
const TABS_MAX = 480;

type Stored = { page: number | null; side: number | null; tabs: number | null };

const size = (value: unknown): number | null => (typeof value === 'number' ? value : null);

function load(key: string): Stored {
	try {
		const saved = JSON.parse(window.localStorage.getItem(key) ?? '{}') as Partial<Stored>;

		return { page: size(saved.page), side: size(saved.side), tabs: size(saved.tabs) };
	} catch {
		return { page: null, side: null, tabs: null };
	}
}

/** Content width of an element, padding excluded. */
function innerWidth(node: Element | null | undefined): number {
	if (!node) {
		return Infinity;
	}

	const style = window.getComputedStyle(node);

	return node.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
}

/**
 * The stored sizes for one screen. `custom` is null wherever the user has not
 * dragged (or has reset), which is when a screen should leave its CSS alone.
 */
export function useResizableLayout(key: string, defaults: { page: number; side: number; tabs: number }) {
	const [custom, setCustom] = useState<Stored>(() => load(key));

	useEffect(() => {
		try {
			window.localStorage.setItem(key, JSON.stringify(custom));
		} catch {
			// Private windows and blocked storage: the layout just won't stick.
		}
	}, [key, custom]);

	return {
		custom,
		page: custom.page ?? defaults.page,
		side: custom.side ?? defaults.side,
		tabs: custom.tabs ?? defaults.tabs,
		setPage: (page: number | null) => setCustom((prev) => ({ ...prev, page })),
		setSide: (side: number | null) => setCustom((prev) => ({ ...prev, side })),
		setTabs: (tabs: number | null) => setCustom((prev) => ({ ...prev, tabs })),
	};
}

type Bounds = () => [number, number];

/** The column may grow to fill the element it is centred in, and no further. */
export const pageBounds =
	(well: () => Element | null | undefined): Bounds =>
	() => {
		const max = innerWidth(well());

		return [Math.min(PAGE_MIN, max), max];
	};

/** The sidebar may grow until the controls column is down to MAIN_MIN. */
export const sideBounds =
	(editor: () => Element | null | undefined, gap: number): Bounds =>
	() => {
		const max = innerWidth(editor()) - gap - MAIN_MIN;

		return [SIDE_MIN, Math.max(SIDE_MIN, max)];
	};

/**
 * The tab column may grow by whatever the column beside it can spare above
 * `keep`, up to TABS_MAX. Measured live, because what can be spared depends
 * on the page width and, in the editor, on the sidebar's.
 */
export const tabsBounds =
	(tabs: () => Element | null | undefined, beside: () => Element | null | undefined, keep: number): Bounds =>
	() => {
		const current = tabs()?.getBoundingClientRect().width ?? TABS_MIN;
		const spare = (beside()?.getBoundingClientRect().width ?? Infinity) - keep;

		return [TABS_MIN, Math.max(TABS_MIN, Math.min(TABS_MAX, current + spare))];
	};

/** The stylesheet mirrors in RTL (index-rtl.css), so a physical drag or arrow key moves the other way. */
const physical = (node: Element, direction: 1 | -1): number =>
	window.getComputedStyle(node).direction === 'rtl' ? -direction : direction;

type SplitterProps = {
	className: string;
	label: string;
	value: number;
	/** +1 when dragging right grows the value in LTR, −1 when it shrinks it; flipped in RTL. */
	direction: 1 | -1;
	/** A centred column grows by twice the pointer's travel. */
	scale?: number;
	bounds: Bounds;
	onChange: (value: number | null) => void;
};

export function Splitter({ className, label, value, direction, scale = 1, bounds, onChange }: SplitterProps) {
	const drag = useRef<{ x: number; value: number; min: number; max: number; sign: number } | null>(null);
	const [dragging, setDragging] = useState(false);
	const [, setMounted] = useState(false);

	// bounds() measures refs that are still null on the first render; draw once more to fill the aria values.
	useEffect(() => setMounted(true), []);

	// Text selection and the cursor are page-wide while a drag is on.
	useEffect(() => {
		document.body.classList.toggle('bfields-resizing', dragging);

		return () => document.body.classList.remove('bfields-resizing');
	}, [dragging]);

	const clamp = (next: number, min: number, max: number): number => Math.round(Math.min(max, Math.max(min, next)));

	const [min, max] = bounds();

	return (
		<div
			className={`bfields-splitter ${className}${dragging ? ' bfields-splitter--active' : ''}`}
			role="separator"
			aria-orientation="vertical"
			aria-label={label}
			aria-valuenow={Number.isFinite(value) ? value : Number.isFinite(max) ? max : undefined}
			aria-valuemin={Number.isFinite(min) ? min : undefined}
			aria-valuemax={Number.isFinite(max) ? max : undefined}
			tabIndex={0}
			title={__('Drag to resize · double-click to reset', 'bfields')}
			onPointerDown={(event) => {
				if (event.button !== 0) {
					return;
				}

				const [lo, hi] = bounds();

				event.preventDefault();
				event.currentTarget.setPointerCapture(event.pointerId);
				// A full-width column has no number yet (Infinity): it starts from what it fills.
				drag.current = {
					x: event.clientX,
					value: Math.min(value, hi),
					min: lo,
					max: hi,
					sign: physical(event.currentTarget, direction),
				};
				setDragging(true);
			}}
			onPointerMove={(event) => {
				const start = drag.current;

				if (start) {
					const travel = (event.clientX - start.x) * start.sign * scale;
					onChange(clamp(start.value + travel, start.min, start.max));
				}
			}}
			onPointerUp={(event) => {
				drag.current = null;
				setDragging(false);
				event.currentTarget.releasePointerCapture(event.pointerId);
			}}
			onPointerCancel={() => {
				drag.current = null;
				setDragging(false);
			}}
			onDoubleClick={() => onChange(null)}
			onKeyDown={(event) => {
				const step = event.shiftKey ? 50 : 10;
				const delta = { ArrowLeft: -step, ArrowRight: step }[event.key];

				if (delta !== undefined) {
					event.preventDefault();
					const [lo, hi] = bounds();
					onChange(clamp(Math.min(value, hi) + delta * physical(event.currentTarget, direction), lo, hi));
				} else if (event.key === 'Enter') {
					event.preventDefault();
					onChange(null);
				}
			}}
		>
			<span className="bfields-splitter__grip" aria-hidden="true" />
		</div>
	);
}

type PageHandlesProps = {
	value: number;
	bounds: Bounds;
	/** `page_width: 'full'`: reaching the well's edge clears the size, so it follows the window again. */
	fill?: boolean;
	/** `page_align: 'start'`: the column's leading edge is fixed, so only the end edge drags. */
	align?: 'center' | 'start';
	onChange: (value: number | null) => void;
};

/** The handles on the column's edges: both when centred, the end one when pinned to the start. */
export function PageHandles({ value, bounds, fill = false, align = 'center', onChange: set }: PageHandlesProps) {
	const label = __('Page width', 'bfields');
	const onChange = (next: number | null): void => set(fill && next !== null && next >= bounds()[1] ? null : next);
	const centred = align === 'center';
	const scale = centred ? 2 : 1;

	return (
		<>
			{centred ? (
				<Splitter
					className="bfields-splitter--page-start"
					label={label}
					value={value}
					direction={-1}
					scale={scale}
					bounds={bounds}
					onChange={onChange}
				/>
			) : null}
			<Splitter
				className="bfields-splitter--page-end"
				label={label}
				value={value}
				direction={1}
				scale={scale}
				bounds={bounds}
				onChange={onChange}
			/>
		</>
	);
}
