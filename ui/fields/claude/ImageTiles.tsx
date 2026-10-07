/**
 * bfields — `image_select`.
 *
 * STAND-IN — ui/fields/claude/. The design repo never drew this control, so it
 * was composed from the design's tokens rather than transcribed from a frame.
 * Replace this file when the real design lands; see ./README.md.
 *
 * The design's MIME tile card (../Choice.tsx, `tiles`) with an image in each
 * tile instead of a format name. HTML5 Video Player uses it; 3D Viewer does
 * not (D.2).
 */

import { Check } from '../../core/icons';
import type { FieldComponentProps } from '../../core/registry';

type Props = Pick<FieldComponentProps, 'field' | 'locked' | 'id'> & {
	options: Array<{ key: string; label: string }>;
	selected: string[];
	multiple: boolean;
	pick: (key: string) => void;
};

export default function ImageTiles({ field, locked, id, options, selected, multiple, pick }: Props) {
	return (
		<div className="bfields-subcard">
			<div className="bfields-subcard__head">
				<div>
					<h3 className="bfields-subcard__title">{field.title}</h3>
					{field.desc ? (
						<p className="bfields-subcard__desc" dangerouslySetInnerHTML={{ __html: field.desc }} />
					) : null}
				</div>
			</div>

			<div
				className="bfields-mime-grid"
				role={multiple ? 'group' : 'radiogroup'}
				aria-label={field.title || undefined}
				id={id}
			>
				{options.map((option) => {
					const on = selected.includes(option.key);

					return (
						<button
							key={option.key}
							type="button"
							role={multiple ? 'checkbox' : 'radio'}
							aria-checked={on}
							disabled={locked}
							onClick={() => pick(option.key)}
							className={`bfields-mime${on ? ' bfields-mime--on' : ''}`}
						>
							<span className="bfields-mime__box">{on ? <Check size={12} /> : null}</span>
							<img src={option.label} alt="" className="bfields-mime__image" />
						</button>
					);
				})}
			</div>
		</div>
	);
}
