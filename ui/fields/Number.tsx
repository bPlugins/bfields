/**
 * bfields — `slider` (and the dispatch for `number` / `spinner`).
 *
 * Ported from 3d-viewer-new-ui `controls.jsx` → `Slider`: a 350px track that
 * fills blue up to the thumb via the `--bfields-range-pct` custom property,
 * with the current value in a bordered readout beside it.
 *
 * `number` and `spinner` render ./NumberInput.tsx: the number box and the
 * stepper.
 *
 * All three types STORE STRINGS ("30", "1"), not numbers (3.1). Parsing to a
 * number and writing it back would change the stored bytes on every save, so
 * the value stays a string throughout and only the input element sees a number.
 */

import type { FieldComponentProps } from '../core/registry';
import NumberInput from './NumberInput';

export default function NumberField(props: FieldComponentProps) {
	const { field, value, onChange, locked, id } = props;
	const { min, max, step, presentation } = field.props;

	if (presentation !== 'slider') {
		return <NumberInput {...props} />;
	}

	const text = typeof value === 'string' ? value : String(value ?? '');
	const lo = Number(min ?? 0);
	const hi = Number(max ?? 100);
	const current = text === '' ? lo : Number(text);
	const pct = hi > lo ? ((current - lo) / (hi - lo)) * 100 : 0;

	return (
		<div className="bfields-slider">
			<input
				id={id}
				type="range"
				value={Number.isNaN(current) ? lo : current}
				min={lo}
				max={hi}
				step={step ?? 1}
				disabled={locked}
				aria-label={field.title || undefined}
				style={{ '--bfields-range-pct': `${Math.max(0, Math.min(100, pct))}%` } as React.CSSProperties}
				onChange={(event) => onChange(event.target.value)}
			/>
			<span className="bfields-slider__value">{text}</span>
		</div>
	);
}
