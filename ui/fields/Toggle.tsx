/**
 * bfields — `switcher` and single `checkbox`.
 *
 * Markup ported from 3d-viewer-new-ui `controls.jsx` → `Toggle`: a
 * role="switch" button with a track and a state label beside it ("Enabled" /
 * "Disabled"), not a checkbox input. The `danger` tone is the red track the
 * "Delete data on uninstall" row uses in the Figma export.
 *
 * Stored shape is '1'/'0' for a switcher and '1'/'' for a bare checkbox (3.1).
 * The boolean lives only in this component; the store keeps the string (7.12).
 */

import { __ } from '@wordpress/i18n';
import type { FieldComponentProps } from '../core/registry';

/** The truth table every reader in the plugin already tolerates (7.6). */
export function truthy(value: unknown): boolean {
	if (typeof value === 'boolean') {
		return value;
	}

	if (typeof value === 'number') {
		return value === 1;
	}

	return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

export default function Toggle({ field, value, onChange, locked, id }: FieldComponentProps) {
	const on = truthy(value);

	// A bare checkbox stores '' when off; a switcher stores '0'.
	const offValue = field.type === 'checkbox' && !field.props.options ? '' : '0';

	const danger = field.layout === 'danger';

	const className = [
		'bfields-toggle',
		on ? 'bfields-toggle--on' : '',
		danger && !on ? 'bfields-toggle--danger' : '',
	]
		.filter(Boolean)
		.join(' ');

	const onLabel = field.props.textOn ?? __('Enabled', 'bfields');
	const offLabel = field.props.textOff ?? (danger ? __('No', 'bfields') : __('Disabled', 'bfields'));

	return (
		<button
			type="button"
			id={id}
			className={className}
			role="switch"
			aria-checked={on}
			aria-label={field.title || undefined}
			disabled={locked}
			onClick={() => onChange(on ? offValue : '1')}
		>
			<span className="bfields-toggle__track" />
			<span className="bfields-toggle__label">{on ? onLabel : offLabel}</span>
		</button>
	);
}
