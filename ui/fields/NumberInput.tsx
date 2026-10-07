/**
 * bfields — `number` and `spinner`.
 *
 * One bordered field with the unit inside it at the end; a `spinner` adds −
 * and + at the end, each behind a hairline. The Slider stays the design's
 * ./Number.tsx, which dispatches here for every other presentation.
 *
 * Both STORE STRINGS ("30", "1"), not numbers (3.1). Parsing to a number and
 * writing it back would change the stored bytes on every save, so the value
 * stays a string throughout and only the input element sees a number.
 *
 * Nothing is written until the user types or steps: a stored int (Codestar's
 * seeded default) is shown as text and stays an int until then.
 */

import { useRef } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import type { KeyboardEvent } from 'react';
import { Minus, Plus } from '../core/icons';
import type { FieldComponentProps } from '../core/registry';
import { placeholderOf, placeholderText } from '../core/responsive';

/** Codestar's spinner bounds when a field authors none (fields/spinner.php). */
const SPINNER = { min: 0, max: 100, step: 1 };

type Bounds = { min?: number; max?: number; step: number };

const finite = (raw: unknown): number | undefined => {
	if (raw === undefined || raw === null || raw === '') {
		return undefined;
	}

	const n = Number(raw);

	return Number.isFinite(n) ? n : undefined;
};

const decimals = (n: number): number => {
	const [mantissa = '', exponent] = String(n).toLowerCase().split('e');
	const places = (mantissa.split('.')[1] ?? '').length;

	return Math.max(0, places - Number(exponent ?? 0));
};

/**
 * The value one step from `from`, as a string, or null when `from` is not a
 * number. On the step grid it moves one step; off it, to the next grid point
 * in that direction (as a native number input steps). Clamped to the bounds.
 */
export function stepValue(from: string, direction: number, bounds: Bounds): string | null {
	const current = from.trim() === '' ? 0 : Number(from);
	const { min, max } = bounds;
	const step = bounds.step > 0 ? bounds.step : 1;

	if (!Number.isFinite(current)) {
		return null;
	}

	const base = min ?? 0;
	const at = (current - base) / step;
	const onGrid = Math.abs(at - Math.round(at)) < 1e-9;
	// Off the grid, the first step lands on the nearest grid point that way.
	const index = onGrid
		? Math.round(at) + direction
		: (direction > 0 ? Math.ceil(at) - 1 : Math.floor(at) + 1) + direction;

	let next = base + index * step;

	if (min !== undefined && next < min) {
		next = min;
	}
	if (max !== undefined && next > max) {
		next = max;
	}

	return String(Number(next.toFixed(Math.max(decimals(step), decimals(base)))));
}

/** A field's authored `attributes`, minus what React cannot take as a prop. */
function safeAttributes(attributes: Record<string, string | number> | undefined): Record<string, string | number> {
	const out: Record<string, string | number> = {};

	Object.entries(attributes ?? {}).forEach(([key, value]) => {
		if (!/^(on|class$|style$)/i.test(key)) {
			out[key] = value;
		}
	});

	return out;
}

export default function NumberInput({ field, value, onChange, locked, id, inherited }: FieldComponentProps) {
	const { unit, presentation, attributes } = field.props;
	const stepper = presentation === 'stepper';
	const input = useRef<HTMLInputElement>(null);
	const text = typeof value === 'string' ? value : String(value ?? '');
	// A responsive field on tablet or mobile shows what it inherits.
	const placeholder = placeholderOf(inherited) ?? placeholderText(field.props.placeholder);
	const unitId = unit ? `${id}-unit` : undefined;

	const bounds: Bounds = stepper
		? {
			min: finite(field.props.min) ?? SPINNER.min,
			max: finite(field.props.max) ?? SPINNER.max,
			step: finite(field.props.step) ?? SPINNER.step,
		}
		: { min: finite(field.props.min), max: finite(field.props.max), step: finite(field.props.step) ?? 1 };

	// An inheriting device steps from the value it shows.
	const from = text === '' ? (placeholder ?? '') : text;
	const shown = from.trim() === '' ? undefined : Number(from);

	const nudge = (direction: number): void => {
		const next = locked ? null : stepValue(from, direction, bounds);

		if (next !== null && next !== text) {
			onChange(next);
		}
	};

	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
		const direction = { ArrowUp: 1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[event.key];

		if (!stepper || direction === undefined) {
			return;
		}

		event.preventDefault();
		nudge(direction);
	};

	const label = field.title || __('value', 'bfields');
	const atMin = shown !== undefined && bounds.min !== undefined && shown <= bounds.min;
	const atMax = shown !== undefined && bounds.max !== undefined && shown >= bounds.max;

	const stepButton = (direction: 1 | -1) => {
		const name = direction > 0
			/* translators: %s: field title. */
			? sprintf(__('Increase %s', 'bfields'), label)
			/* translators: %s: field title. */
			: sprintf(__('Decrease %s', 'bfields'), label);

		return (
			<button
				type="button"
				className="bfields-number__step"
				tabIndex={-1}
				aria-label={name}
				aria-controls={id}
				title={name}
				disabled={locked || (direction > 0 ? atMax : atMin)}
				// Keep focus where it is; the input takes it on click.
				onPointerDown={(event) => event.preventDefault()}
				onClick={() => {
					nudge(direction);
					input.current?.focus();
				}}
			>
				{direction > 0 ? <Plus size={16} /> : <Minus size={16} />}
			</button>
		);
	};

	const className = ['bfields-number', stepper ? 'bfields-number--stepper' : '', unit ? 'bfields-number--unit' : '']
		.filter(Boolean)
		.join(' ');

	return (
		<span className={className}>
			{/* Minus on the "less" side, plus on the "more" side, the value between. */}
			{stepper ? stepButton(-1) : null}
			<input
				ref={input}
				id={id}
				type="number"
				inputMode="decimal"
				className="bfields-number__input"
				value={text}
				placeholder={placeholder}
				// Codestar's number carries min/max/step ('any' unset); its
				// spinner leaves the input free and clamps only when stepping.
				min={stepper ? undefined : field.props.min}
				max={stepper ? undefined : field.props.max}
				step={stepper ? 'any' : (field.props.step ?? 'any')}
				aria-valuemin={stepper ? bounds.min : undefined}
				aria-valuemax={stepper ? bounds.max : undefined}
				aria-label={field.title || undefined}
				aria-describedby={unitId}
				disabled={locked}
				onKeyDown={onKeyDown}
				onChange={(event) => onChange(event.target.value)}
				{...safeAttributes(attributes)}
			/>
			{unit ? (
				<span id={unitId} className="bfields-number__unit">
					{unit}
				</span>
			) : null}
			{stepper ? stepButton(1) : null}
		</span>
	);
}
