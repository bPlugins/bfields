/**
 * bfields — `link`.
 *
 * STAND-IN — ui/fields/claude/. The design repo never drew this control, so it
 * was composed from the design's tokens rather than transcribed from a frame.
 * Replace this file when the real design lands; see ./README.md.
 *
 * Stored as {url,text,target} — three strings, patched in place. `target` is
 * '_blank' or '', never a boolean: Codestar writes the value straight into the
 * markup, so a true/false here would render `target="true"` (3.1).
 */

import { __ } from '@wordpress/i18n';
import type { FieldComponentProps } from '../../core/registry';
import { placeholderText } from '../../core/responsive';
import type { LinkValue } from '../../core/types';

const EMPTY: LinkValue = { url: '', text: '', target: '' };

export default function Link({ field, value, onChange, locked, id }: FieldComponentProps) {
	const current: LinkValue =
		value && typeof value === 'object' && !Array.isArray(value)
			? ({ ...EMPTY, ...(value as LinkValue) } as LinkValue)
			: EMPTY;

	const patch = (key: keyof LinkValue, next: string): void => {
		const base = (value && typeof value === 'object' ? value : EMPTY) as LinkValue;
		onChange({ ...base, [key]: next });
	};

	return (
		<div className="bfields-link">
			<input
				id={id}
				type="url"
				className="bfields-input"
				value={current.url}
				placeholder={placeholderText(field.props.placeholder) ?? 'https://'}
				disabled={locked}
				aria-label={__('URL', 'bfields')}
				onChange={(event) => patch('url', event.target.value)}
			/>

			<input
				type="text"
				className="bfields-input"
				value={current.text}
				placeholder={__('Link text', 'bfields')}
				disabled={locked}
				aria-label={__('Link text', 'bfields')}
				onChange={(event) => patch('text', event.target.value)}
			/>

			<label className="bfields-link__target">
				<input
					type="checkbox"
					checked={current.target === '_blank'}
					disabled={locked}
					onChange={(event) => patch('target', event.target.checked ? '_blank' : '')}
				/>
				{__('New tab', 'bfields')}
			</label>
		</div>
	);
}
