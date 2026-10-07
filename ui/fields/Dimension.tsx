/**
 * bfields — `dimensions`.
 *
 * Ported from the design's `.bp3d-dim` (Add New → Style → Width / Height): a
 * number input, a unit select, and a bordered link button with the chain in
 * the primary colour. Sizes live in the stylesheet — the Settings page's
 * 72/62/34px, and the Add New frames' compact 70/auto/28px in the editor.
 *
 * The link button has no Codestar meaning and no stored key (D.1), so it keeps
 * no state beyond the page. On a field that declares BOTH axes it locks the
 * aspect ratio while it is pressed — typing a width scales the height with it.
 * On a single-axis field (3D Viewer's `bp_3d_width` / `bp_3d_height`) there
 * is nothing to lock, so it is not drawn, although the design draws it.
 *
 * On a responsive field (`'responsive' => true`) tablet and mobile nest inside
 * the value (`{width, unit, tablet: {width, unit}}`, 3D Viewer Pro's shape).
 * FieldRenderer hands this component one device's set at a time, and the
 * set it inherits as `inherited`, whose numbers show as placeholders.
 *
 * Stored as {width,unit} or {height,unit} (3.1). A field authored with
 * 'height' => false has no height key at all, and adding one would change the
 * stored bytes, so only the declared axes are rendered.
 */

import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Chain } from '../core/icons';
import type { FieldComponentProps } from '../core/registry';
import { placeholderOf } from '../core/responsive';
import { staleLabel } from './Choice';
import type { DimensionValue } from '../core/types';

export default function Dimension({ field, value, onChange, locked, id, inherited }: FieldComponentProps) {
	const [linked, setLinked] = useState(false);

	const current: DimensionValue =
		value && typeof value === 'object' && !Array.isArray(value) ? (value as DimensionValue) : {};
	const fallback: DimensionValue =
		inherited && typeof inherited === 'object' && !Array.isArray(inherited) ? (inherited as DimensionValue) : {};

	const showWidth = field.props.width !== false;
	const showHeight = field.props.height !== false;
	const bothAxes = showWidth && showHeight;
	// Codestar's list when the field authors none (Schema.php sends it too).
	const units = field.props.units ?? ['px', '%', 'em'];
	// A stored unit the list does not offer gets an option of its own.
	// Without one the select shows the first unit while the store keeps
	// the stored one. An empty unit still shows the first unit, as
	// Codestar's select does.
	const staleUnit = current.unit && !units.includes(current.unit) ? current.unit : '';
	const showUnits = field.props.showUnits !== false;

	// Patch, never rebuild: the object keeps its key order and any key a
	// previous version wrote (7.2).
	const patch = (next: Partial<DimensionValue>): void => onChange({ ...current, ...next });

	const setAxis = (axis: 'width' | 'height', next: string): void => {
		const other = axis === 'width' ? 'height' : 'width';
		const from = Number(current[axis]);
		const to = Number(next);
		const pair = Number(current[other]);

		if (linked && bothAxes && from > 0 && to > 0 && pair > 0) {
			// Scale the other axis by the same ratio, and store it as a string
			// like every other number this field writes.
			patch({ [axis]: next, [other]: String(Number(((pair * to) / from).toFixed(2))) });
			return;
		}

		patch({ [axis]: next });
	};

	return (
		<div className="bfields-dim">
			{showWidth ? (
				<input
					id={id}
					type="number"
					className="bfields-input"
					value={current.width ?? ''}
					placeholder={placeholderOf(fallback.width)}
					disabled={locked}
					aria-label={bothAxes ? __('Width', 'bfields') : field.title || __('Width', 'bfields')}
					onChange={(event) => setAxis('width', event.target.value)}
				/>
			) : null}

			{showHeight ? (
				<input
					id={showWidth ? undefined : id}
					type="number"
					className="bfields-input"
					value={current.height ?? ''}
					placeholder={placeholderOf(fallback.height)}
					disabled={locked}
					aria-label={bothAxes ? __('Height', 'bfields') : field.title || __('Height', 'bfields')}
					onChange={(event) => setAxis('height', event.target.value)}
				/>
			) : null}

			{showUnits ? (
				<select
					className="bfields-select"
					value={current.unit ?? ''}
					disabled={locked}
					aria-label={`${field.title} unit`}
					onChange={(event) => patch({ unit: event.target.value })}
				>
					{staleUnit ? <option value={staleUnit}>{staleLabel(staleUnit)}</option> : null}
					{units.map((unit) => (
						<option key={unit} value={unit}>
							{unit}
						</option>
					))}
				</select>
			) : null}

			{bothAxes ? (
				<button
					type="button"
					className="bfields-dim__link"
					aria-pressed={linked}
					aria-disabled={locked ? true : undefined}
					title={__('Keep width and height in proportion', 'bfields')}
					onClick={() => !locked && setLinked(!linked)}
				>
					<Chain size={14} />
				</button>
			) : null}
		</div>
	);
}
