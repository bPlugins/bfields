/**
 * bfields — a `checkbox` with options, drawn as a list in the row's control
 * column.
 *
 * The design's only multi-select is the MIME tile grid, built for fourteen
 * file formats. A short list takes the tile's parts without the tile: the
 * 20px box with its tick (`--bfields-check` when checked), the label beside
 * it, one column, two above eight options. Schema.php draws every
 * `checkbox` with options as the tile grid (Appendix D), so a host asks for
 * the list with `'layout' => 'checklist'`.
 *
 * Stored as a list of option keys (3.1). Unticking the last one stores `[]`.
 */

import { Check } from '../core/icons';
import type { FieldComponentProps } from '../core/registry';
import type { Field } from '../core/types';

/** A multi-select the host asked to draw as a list rather than as tiles. */
export function isChecklist(field: Field): boolean {
	return field.layout === 'checklist';
}

type Props = Pick<FieldComponentProps, 'field' | 'locked'> & {
	options: Array<{ key: string; label: string }>;
	selected: string[];
	pick: (key: string) => void;
};

/** Above this many options the list takes two columns. */
export const CHECKLIST_COLUMNS_AT = 8;

export default function Checklist({ field, locked, options, selected, pick }: Props) {
	const columns = options.length > CHECKLIST_COLUMNS_AT ? ' bfields-checklist--columns' : '';

	return (
		<div className={`bfields-checklist${columns}`} role="group" aria-label={field.title || undefined}>
			{options.map((option) => {
				const on = selected.includes(option.key);

				return (
					<button
						key={option.key}
						type="button"
						role="checkbox"
						aria-checked={on}
						disabled={locked}
						onClick={() => pick(option.key)}
						className={`bfields-checklist__item${on ? ' bfields-checklist__item--on' : ''}`}
					>
						<span className="bfields-checklist__box" aria-hidden="true">
							{on ? <Check size={12} /> : null}
						</span>
						<span className="bfields-checklist__label">{option.label}</span>
					</button>
				);
			})}
		</div>
	);
}
