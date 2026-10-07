/**
 * bfields — `color`.
 *
 * Ported from the design's `.bp3d-colorpick` (Add New → Style → Background
 * Color): one 38px bordered button holding a 26×18 swatch and the words
 * "Select Color". The design draws it at rest only; clicking it opens the
 * panel in ./ColorPanel.tsx (alpha, `transparent`, the raw value, default).
 * The panel is the button's sibling inside `.bfields-color`, so no input
 * sits inside the button and a click in the panel never toggles it.
 *
 * Values in the wild are hex, rgba(…), `transparent`, or '' meaning "use the
 * default" (3.1). The swatch paints whatever is stored, rgba included, and the
 * value is only ever REPLACED by a pick — never rewritten on load — so a stored
 * `rgba(0, 0, 0, 0.4)` survives being looked at. `transparent` and '' show the
 * checkerboard rather than the brand blue the design's swatch falls back to.
 */

import { useCallback, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import type { FieldComponentProps } from '../core/registry';
import ColorPanel from './ColorPanel';

export default function Color({ field, value, onChange, locked, id }: FieldComponentProps) {
	const [open, setOpen] = useState(false);
	const button = useRef<HTMLSpanElement>(null);
	const text = typeof value === 'string' ? value : '';
	const empty = text === '' || text.toLowerCase() === 'transparent';
	const panelId = `${id}-panel`;

	const toggle = (): void => {
		if (!locked) {
			setOpen(!open);
		}
	};

	const close = useCallback((returnFocus: boolean): void => {
		setOpen(false);
		if (returnFocus) {
			button.current?.focus();
		}
	}, []);

	return (
		<span className="bfields-color">
			<span
				ref={button}
				id={id}
				role="button"
				tabIndex={locked ? -1 : 0}
				aria-haspopup="dialog"
				aria-expanded={open}
				aria-controls={open ? panelId : undefined}
				aria-disabled={locked || undefined}
				aria-label={field.title || __('Colour', 'bfields')}
				className="bfields-colorpick"
				title={text || __('Default', 'bfields')}
				onClick={toggle}
				onKeyDown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						toggle();
					}
				}}
			>
				<span
					className={`bfields-colorpick__swatch${empty ? ' bfields-colorpick__swatch--empty' : ''}`}
					style={empty ? undefined : { background: text }}
				/>
				{__('Select Color', 'bfields')}
			</span>
			{open ? (
				<ColorPanel id={panelId} field={field} locked={locked} onChange={onChange} text={text} onClose={close} />
			) : null}
		</span>
	);
}
