/**
 * bfields — the tab marker for a section holding a field its `validate`
 * rejected, as Codestar's `.csf-label-error` "!" on the nav link.
 */

import { __ } from '@wordpress/i18n';
import type { Field, Section } from '../core/types';

export function holds(fields: Field[], ids: ReadonlySet<string>): boolean {
	return fields.some((field) => ids.has(field.id) || holds(field.fields ?? [], ids));
}

export function sectionHasError(section: Section, ids: ReadonlySet<string>): boolean {
	return ids.size > 0 && holds(section.fields, ids);
}

export default function TabError() {
	return (
		<span className="bfields-tab__error">
			<span aria-hidden="true">!</span>
			<span className="bfields-sr">{__('(has errors)', 'bfields')}</span>
		</span>
	);
}
