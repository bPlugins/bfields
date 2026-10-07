/**
 * bfields — `text`, `password` (and the dispatch for `textarea`).
 *
 * The plain input is the design's `.bp3d-input` — 40px, 8px corners, 14px
 * type. `textarea` renders ./Textarea.tsx, the same field over several lines.
 *
 * The `selector` layout is the copyable monospace chip from the Woocommerce
 * Selectors tab in the Figma export (`.bp3d-selector-field`).
 *
 * Always a string in the store, never a number or a trimmed value: the stored
 * bytes are what round-trips (7.2), so nothing is normalised on the way in.
 */

import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import copyText from '../core/clipboard';
import { Copy, Check } from '../core/icons';
import type { FieldComponentProps } from '../core/registry';
import { placeholderOf, placeholderText } from '../core/responsive';
import Textarea from './Textarea';

export default function Text(props: FieldComponentProps) {
	const { field, value, onChange, locked, id, inherited } = props;
	const { attributes, multiline, secret, maxLength } = field.props;
	// A responsive field on tablet or mobile shows what it inherits.
	const placeholder = placeholderOf(inherited) ?? placeholderText(field.props.placeholder);
	const [copied, setCopied] = useState(false);
	const [clipped, setClipped] = useState(false);
	const chipInput = useRef<HTMLInputElement>(null);

	const text = typeof value === 'string' ? value : '';
	const isSelector = !multiline && field.layout === 'selector';

	// The chip shows an ellipsis when the column is narrower than the value; the title then carries it.
	useEffect(() => {
		const input = chipInput.current;

		if (!isSelector || !input) {
			return undefined;
		}

		const measure = (): void => setClipped(input.scrollWidth > input.clientWidth + 1);

		measure();

		if (typeof ResizeObserver === 'undefined') {
			return undefined;
		}

		const observer = new ResizeObserver(measure);
		observer.observe(input);

		return () => observer.disconnect();
	}, [isSelector, text]);

	if (multiline) {
		return <Textarea {...props} />;
	}

	if (field.layout === 'selector') {
		const copy = (): void => {
			void copyText(text).then((done) => {
				if (done) {
					setCopied(true);
					window.setTimeout(() => setCopied(false), 1500);
				}
			});
		};

		return (
			<span className="bfields-selector-field">
				<input
					ref={chipInput}
					id={id}
					type="text"
					value={text}
					placeholder={placeholder}
					disabled={locked}
					spellCheck={false}
					title={clipped ? text : undefined}
					size={Math.max(1, (text || placeholder || '').length)}
					aria-label={field.title || __('Selector', 'bfields')}
					onChange={(event) => onChange(event.target.value)}
				/>
				<button
					type="button"
					onClick={copy}
					aria-label={__('Copy selector', 'bfields')}
					title={copied ? __('Copied', 'bfields') : __('Copy', 'bfields')}
				>
					{copied ? <Check size={16} /> : <Copy size={16} />}
				</button>
			</span>
		);
	}

	return (
		<input
			id={id}
			type={secret ? 'password' : 'text'}
			className="bfields-input"
			value={text}
			placeholder={placeholder}
			disabled={locked}
			maxLength={maxLength}
			aria-label={field.title || undefined}
			onChange={(event) => onChange(event.target.value)}
			{...(attributes ?? {})}
		/>
	);
}
