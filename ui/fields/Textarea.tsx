/**
 * bfields — `textarea`.
 *
 * The input's border, radius and type over several lines. It grows with its
 * text up to six lines and scrolls after that; there is no resize handle.
 * Always a string, never trimmed (7.2).
 *
 * Nothing is written on mount, so a stored "\r\n" stays "\r\n" until the text
 * is edited; an edit stores what the browser holds, "\n".
 */

import { useLayoutEffect, useRef } from '@wordpress/element';
import type { CSSProperties } from 'react';
import type { FieldComponentProps } from '../core/registry';
import { placeholderOf, placeholderText } from '../core/responsive';

const MIN_ROWS = 3;
const MAX_ROWS = 6;

/** Height to fit the text; the stylesheet's min/max-height clamp it. */
function fit(area: HTMLTextAreaElement | null): void {
	if (!area) {
		return;
	}

	const style = getComputedStyle(area);
	const border = (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0);
	const max = parseFloat(style.maxHeight);

	area.style.height = 'auto';

	const needed = area.scrollHeight + border;

	area.style.height = `${needed}px`;
	area.style.overflowY = Number.isFinite(max) && needed > max ? 'auto' : 'hidden';
}

export default function Textarea({ field, value, onChange, locked, id, inherited }: FieldComponentProps) {
	const { attributes, maxLength } = field.props;
	const placeholder = placeholderOf(inherited) ?? placeholderText(field.props.placeholder);
	const text = typeof value === 'string' ? value : '';
	const area = useRef<HTMLTextAreaElement>(null);
	const rows = Math.min(MAX_ROWS, Math.max(1, Number(attributes?.rows ?? MIN_ROWS) || MIN_ROWS));

	useLayoutEffect(() => fit(area.current), [text, placeholder]);

	// Wrapping changes with the width, so refit when the column does.
	useLayoutEffect(() => {
		const node = area.current;

		if (!node || typeof ResizeObserver === 'undefined') {
			return undefined;
		}

		let width = node.offsetWidth;
		const observer = new ResizeObserver(() => {
			if (node.offsetWidth !== width) {
				width = node.offsetWidth;
				fit(node);
			}
		});

		observer.observe(node);

		return () => observer.disconnect();
	}, []);

	return (
		<textarea
			ref={area}
			id={id}
			className="bfields-textarea"
			value={text}
			placeholder={placeholder}
			disabled={locked}
			maxLength={maxLength}
			rows={rows}
			aria-label={field.title || undefined}
			style={{ '--bfields-textarea-rows': rows } as CSSProperties}
			onChange={(event) => onChange(event.target.value)}
		/>
	);
}
