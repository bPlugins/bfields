/**
 * bfields — the colour field's panel: swatch preview, the value as text, an
 * opacity slider, and Transparent / Default / Clear.
 *
 * Opens from the designed button in ./Color.tsx. The OS picker behind the
 * swatch makes opaque hex only; the panel adds what Codestar's picker has and
 * 3D Viewer's `bp_model_bg`, `bp_model_progressbar_color` and
 * `bp3d_loader_background` need: an alpha, `transparent`, and the default.
 *
 * Values are written in the shapes already stored: `#rrggbb` when opaque,
 * `rgba(r, g, b, a)` (Codestar's authored defaults use that spacing) when
 * not, `transparent`, or '' (use the default). Nothing is written until the
 * user changes something, so opening the panel on an `rgba(…)` or a named
 * colour leaves it byte for byte as it was.
 */

import { useEffect, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import type { KeyboardEvent } from 'react';
import type { FieldComponentProps } from '../core/registry';

type Rgba = { r: number; g: number; b: number; a: number };

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGBA = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d*\.?\d+)\s*)?\)$/i;

/** Parse the colours this panel can edit; null for anything else. */
export function parseColor(text: string): Rgba | null {
	const value = text.trim();
	const hex = HEX.exec(value);

	if (hex?.[1]) {
		const digits = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1];

		return {
			r: parseInt(digits.slice(0, 2), 16),
			g: parseInt(digits.slice(2, 4), 16),
			b: parseInt(digits.slice(4, 6), 16),
			a: 1,
		};
	}

	const rgba = RGBA.exec(value);

	if (rgba) {
		const channel = (n: string | undefined): number => Math.min(255, Number(n));

		return {
			r: channel(rgba[1]),
			g: channel(rgba[2]),
			b: channel(rgba[3]),
			a: rgba[4] === undefined ? 1 : Math.max(0, Math.min(1, Number(rgba[4]))),
		};
	}

	return null;
}

const hex2 = (n: number): string => n.toString(16).padStart(2, '0');

/** `#rrggbb` when opaque, `rgba(r, g, b, a)` otherwise. */
export function formatColor({ r, g, b, a }: Rgba): string {
	return a >= 1 ? `#${hex2(r)}${hex2(g)}${hex2(b)}` : `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(2))})`;
}

/** A typed value in the stored shape, or null when it is not one. */
export function normaliseTyped(typed: string): string | null {
	const next = typed.trim();

	if (next === '') {
		return '';
	}

	if (next.toLowerCase() === 'transparent') {
		return 'transparent';
	}

	const parsed = parseColor(next);

	return parsed ? formatColor(parsed) : null;
}

const FOCUSABLE = 'input:not(:disabled), button:not(:disabled)';

type Props = Pick<FieldComponentProps, 'field' | 'locked' | 'onChange'> & {
	id: string;
	text: string;
	/** `true` when focus should go back to the opener (Escape). */
	onClose: (returnFocus: boolean) => void;
};

export default function ColorPanel({ id, field, locked, onChange, text, onClose }: Props) {
	const panel = useRef<HTMLDivElement>(null);
	const valueInput = useRef<HTMLInputElement>(null);
	const parsed = parseColor(text);
	// null until the user types, so a write elsewhere never meets a stale draft.
	const [draft, setDraftState] = useState<string | null>(null);
	// Read by commit(), which can run in the same event as the change that set it.
	const draftRef = useRef<string | null>(null);
	const setDraft = (next: string | null): void => {
		draftRef.current = next;
		setDraftState(next);
	};
	const fallback = typeof field.default === 'string' ? field.default : '';
	const title = field.title || __('Colour', 'bfields');

	useEffect(() => {
		(valueInput.current ?? panel.current?.querySelector<HTMLElement>(FOCUSABLE))?.focus();

		const outside = (event: MouseEvent): void => {
			if (panel.current && !panel.current.parentElement?.contains(event.target as Node)) {
				onClose(false);
			}
		};

		// Focus can fall to <body> when a pressed action disables itself.
		const escape = (event: globalThis.KeyboardEvent): void => {
			if (event.key === 'Escape' && document.activeElement === document.body) {
				onClose(true);
			}
		};

		document.addEventListener('mousedown', outside);
		document.addEventListener('keydown', escape);

		return () => {
			document.removeEventListener('mousedown', outside);
			document.removeEventListener('keydown', escape);
		};
	}, [onClose]);

	const act = (next: string): void => {
		setDraft(null);
		onChange(next);
		valueInput.current?.focus();
	};

	// Typed values are stored normalised; anything unreadable snaps back.
	const commit = (): void => {
		const typed = draftRef.current;

		if (typed === null) {
			return;
		}

		const next = normaliseTyped(typed);

		setDraft(null);

		if (next !== null && typed.trim() !== text && next !== text) {
			onChange(next);
		}
	};

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			onClose(true);
			return;
		}

		if (event.key !== 'Tab' || !panel.current) {
			return;
		}

		const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
		const first = items[0];
		const last = items[items.length - 1];

		if (!first || !last) {
			return;
		}

		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	};

	const alpha = parsed ? Math.round(parsed.a * 100) : 100;
	const empty = text === '' || text.toLowerCase() === 'transparent';

	return (
		<div
			ref={panel}
			id={id}
			className="bfields-colorpanel"
			role="dialog"
			aria-modal="true"
			aria-label={title}
			onKeyDown={onKeyDown}
		>
			<div className="bfields-colorpanel__row">
				<span className={`bfields-colorpanel__preview${empty ? ' bfields-colorpanel__preview--empty' : ''}`}>
					<span className="bfields-colorpanel__fill" style={empty ? undefined : { background: text }} />
					<input
						type="color"
						className="bfields-colorpanel__native"
						value={parsed ? formatColor({ ...parsed, a: 1 }) : '#ffffff'}
						disabled={locked}
						aria-label={__('Pick a colour', 'bfields')}
						// Keeps the alpha the value already had.
						onChange={(event) => {
							const picked = parseColor(event.target.value);
							if (picked) {
								onChange(formatColor({ ...picked, a: parsed ? parsed.a : 1 }));
							}
						}}
					/>
				</span>
				<input
					ref={valueInput}
					type="text"
					className="bfields-input bfields-colorpanel__text"
					value={draft ?? text}
					disabled={locked}
					placeholder={fallback || __('Default', 'bfields')}
					aria-label={__('Colour value', 'bfields')}
					spellCheck={false}
					autoComplete="off"
					onChange={(event) => setDraft(event.target.value)}
					onBlur={commit}
					onKeyDown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							commit();
						}
						if (event.key === 'Escape') {
							setDraft(null);
						}
					}}
				/>
			</div>

			<label className="bfields-colorpanel__alpha">
				<span className="bfields-colorpanel__label">{__('Opacity', 'bfields')}</span>
				<input
					type="range"
					min={0}
					max={100}
					value={alpha}
					disabled={locked || !parsed}
					style={{ '--bfields-range-pct': `${parsed ? alpha : 0}%` } as Record<string, string>}
					aria-valuetext={parsed ? `${alpha}%` : __('Not available', 'bfields')}
					onChange={(event) => parsed && onChange(formatColor({ ...parsed, a: Number(event.target.value) / 100 }))}
				/>
				<output className="bfields-colorpanel__output">{parsed ? `${alpha}%` : '—'}</output>
			</label>

			<div className="bfields-colorpanel__actions">
				<button
					type="button"
					className="bfields-colorpanel__action"
					disabled={locked || text === 'transparent'}
					onClick={() => act('transparent')}
				>
					{__('Transparent', 'bfields')}
				</button>
				<button
					type="button"
					className="bfields-colorpanel__action"
					disabled={locked || text === fallback}
					title={fallback ? sprintf(
						/* translators: %s: the field's default colour, e.g. "#ffffff". */
						__('Back to %s', 'bfields'),
						fallback
					) : undefined}
					onClick={() => act(fallback)}
				>
					{__('Default', 'bfields')}
				</button>
				{fallback !== '' ? (
					<button
						type="button"
						className="bfields-colorpanel__action"
						disabled={locked || text === ''}
						onClick={() => act('')}
					>
						{__('Clear', 'bfields')}
					</button>
				) : null}
			</div>
		</div>
	);
}
