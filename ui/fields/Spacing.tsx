/**
 * bfields — `spacing`.
 *
 * One bordered number box per declared side, in the NumberInput style (40px,
 * 30px in the Add New rows), then the unit select and the link button. Each
 * box names its side inside it: the authored `labels[side]` at the start,
 * Codestar's plain-text `{side}_icon` ("Deg", "%") at the end, or, when the
 * field authors neither, an arrow for the side as Codestar's default icons
 * draw it. A per-device switch appears beside the row title when the field
 * is authored `'responsive' => true`: FieldRenderer then hands this component
 * one device's sides at a time, with the inherited ones as placeholders.
 *
 * Stored as {top,right,bottom,left,unit}, and a field authored with
 * `'left' => false` has NO left key at all — so only the declared sides are
 * rendered and the object is patched rather than rebuilt. Writing a `left: ''`
 * into a value that never had one changes the stored bytes (3.1).
 *
 * The link button keeps no stored key either. While it is pressed, typing into
 * one side writes the same number to every declared side; it starts pressed
 * when the stored sides are already equal.
 */

import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Chain } from '../core/icons';
import type { IconComponent } from '../core/icons';
import type { FieldComponentProps } from '../core/registry';
import { placeholderOf } from '../core/responsive';
import { staleLabel } from './Choice';
import type { Field, SpacingSide as Side, SpacingValue } from '../core/types';

const SIDES: Array<{ key: Side; label: string; Arrow: IconComponent }> = [
	{ key: 'top', label: __('Top', 'bfields'), Arrow: ArrowUp },
	{ key: 'right', label: __('Right', 'bfields'), Arrow: ArrowRight },
	{ key: 'bottom', label: __('Bottom', 'bfields'), Arrow: ArrowDown },
	{ key: 'left', label: __('Left', 'bfields'), Arrow: ArrowLeft },
];

/** Codestar's `{side}_icon` when it is plain text ("Deg", "X"); its default is icon HTML. */
export function sideIconText(field: Field, side: Side): string {
	const icon = field.props[`${side}Icon` as const];

	return typeof icon === 'string' && icon.trim() !== '' && !/[<>]/.test(icon) ? icon.trim() : '';
}

/**
 * A side's caption: the authored `labels` entry, else Codestar's `{side}_icon`
 * when it is plain text, else the side's name. With both a label and a text
 * icon it reads "X (Deg)".
 */
export function sideLabel(field: Field, side: Side, fallback: string): string {
	const own = field.props.labels?.[side];
	const text = sideIconText(field, side);

	if (own && text) {
		return `${own} (${text})`;
	}

	return own || text || fallback;
}

/** The inherited side, else the authored per-side placeholder. */
export function sidePlaceholder(field: Field, side: Side, inherited: SpacingValue): string | undefined {
	const authored = field.props.placeholder;

	return (
		placeholderOf(inherited[side]) ??
		(authored && typeof authored === 'object' && typeof authored[side] === 'string' ? authored[side] : undefined)
	);
}

export default function Spacing({ field, value, onChange, locked, id, inherited }: FieldComponentProps) {
	const current: SpacingValue =
		value && typeof value === 'object' && !Array.isArray(value) ? (value as SpacingValue) : {};
	const fallback: SpacingValue =
		inherited && typeof inherited === 'object' && !Array.isArray(inherited) ? (inherited as SpacingValue) : {};

	// Codestar's list when the field authors none (Schema.php sends it too).
	const units = field.props.units ?? ['px', '%', 'em'];
	// A stored unit the list does not offer gets an option of its own.
	// Without one the select shows the first unit while the store keeps
	// the stored one. An empty unit still shows the first unit, as
	// Codestar's select does.
	const staleUnit = current.unit && !units.includes(current.unit) ? current.unit : '';
	const showUnits = field.props.showUnits !== false;
	const sides = field.props.left !== false ? SIDES : SIDES.filter((side) => side.key !== 'left');

	const [linked, setLinked] = useState(() => {
		const set = new Set(sides.map((side) => String(current[side.key] ?? '')));
		return set.size === 1 && !set.has('');
	});

	const setSide = (key: Side, next: string): void => {
		if (!linked) {
			onChange({ ...current, [key]: next });
			return;
		}

		const patch: SpacingValue = { ...current };
		sides.forEach((side) => {
			patch[side.key] = next;
		});
		onChange(patch);
	};

	return (
		<div className="bfields-spacing" role="group" aria-label={field.title || undefined}>
			{sides.map((side, index) => {
				const own = field.props.labels?.[side.key];
				const suffix = sideIconText(field, side.key);
				const Arrow = side.Arrow;

				return (
					<span
						key={side.key}
						className={`bfields-number bfields-spacing__side${suffix ? ' bfields-number--unit' : ''}`}
						title={sideLabel(field, side.key, side.label)}
					>
						{own ? (
							<span className="bfields-spacing__prefix" aria-hidden="true">
								{own}
							</span>
						) : !suffix ? (
							<span className="bfields-spacing__prefix" aria-hidden="true">
								<Arrow size={14} />
							</span>
						) : null}
						<input
							id={index === 0 ? id : undefined}
							type="number"
							inputMode="decimal"
							step="any"
							className="bfields-number__input bfields-spacing__input"
							value={(current[side.key] as string) ?? ''}
							placeholder={sidePlaceholder(field, side.key, fallback)}
							disabled={locked}
							aria-label={sideLabel(field, side.key, side.label)}
							onChange={(event) => setSide(side.key, event.target.value)}
						/>
						{suffix ? (
							<span className="bfields-number__unit" aria-hidden="true">
								{suffix}
							</span>
						) : null}
					</span>
				);
			})}

			{showUnits ? (
				<select
					className="bfields-select bfields-spacing__unit"
					aria-label={`${field.title} ${__('unit', 'bfields')}`}
					value={current.unit ?? ''}
					disabled={locked}
					onChange={(event) => onChange({ ...current, unit: event.target.value })}
				>
					{staleUnit ? <option value={staleUnit}>{staleLabel(staleUnit)}</option> : null}
					{units.map((unit) => (
						<option key={unit} value={unit}>
							{unit}
						</option>
					))}
				</select>
			) : null}

			<button
				type="button"
				className="bfields-spacing__link"
				aria-pressed={linked}
				disabled={locked}
				title={linked ? __('Unlink sides', 'bfields') : __('Link sides', 'bfields')}
				aria-label={__('Link sides', 'bfields')}
				onClick={() => setLinked(!linked)}
			>
				<Chain size={14} />
			</button>
		</div>
	);
}
