/**
 * bfields — `fieldset`.
 *
 * An inline sub-form: the sub-fields side by side in a grid (three across for
 * `real_size`), each under a small-caps label, with no card border of its own
 * because it sits inside a row or a repeater card.
 *
 * One object keyed by its sub-field ids — `real_size` is
 * {width,height,depth,unit} — so this component PATCHES that object and never
 * rebuilds it. Rebuilding would reorder the keys, and PHP's serialize()
 * preserves insertion order: a field nobody touched would come back as
 * different bytes (7.2).
 *
 * Sub-fields render through FieldRenderer with `row` set to the fieldset's own
 * value, which is what makes a dependency between two members of the same
 * fieldset resolve locally rather than against the screen.
 *
 * With no stored object at all (a row that predates the fieldset), the first
 * edit writes every sub-field, as Codestar's form posts them.
 */

import type { CSSProperties } from 'react';
import FieldRenderer, { fieldKeys } from '../layout/FieldRenderer';
import type { FieldComponentProps } from '../core/registry';
import type { Field, FieldValue, Values } from '../core/types';

const isObject = (value: unknown): value is Values =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** What Codestar's form would post for an unsaved fieldset: each sub-field at its default. */
export function blankFieldset(fields: Field[]): Values {
	const out: Values = {};

	fields.forEach((child) => {
		if (child.id !== '' && !child.display) {
			out[child.id] = (child.default ?? '') as FieldValue;
		}
	});

	return out;
}

export default function Fieldset({ unique, id, field, value, values, row, onChange, locked, path, rowId, latest }: FieldComponentProps) {
	const children = field.fields ?? [];
	const keys = fieldKeys(children);
	const current: Values = isObject(value) ? value : blankFieldset(children);
	const columns = Math.min(3, Math.max(1, children.filter((child) => !child.display).length));

	const fresh = (): Values => {
		const now = latest?.();
		return isObject(now) ? now : current;
	};

	const patch = (key: string, next: FieldValue): void => {
		if (!locked) {
			onChange({ ...fresh(), [key]: next });
		}
	};

	return (
		<fieldset
			className="bfields-fieldset"
			aria-label={field.title || undefined}
			disabled={locked}
			style={{ '--bfields-fieldset-cols': columns } as CSSProperties}
		>
			{children.map((child, index) => (
				<FieldRenderer
					key={keys[index]}
					unique={unique}
					idPrefix={id}
					field={child}
					values={values}
					row={current}
					basePath={path ?? [field.id]}
					rowId={row ? rowId : undefined}
					readBag={fresh}
					onChange={patch}
				/>
			))}
		</fieldset>
	);
}
