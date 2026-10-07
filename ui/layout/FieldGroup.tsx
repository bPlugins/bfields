/**
 * bfields — `field_group`: a Repeater-row style card around sibling fields; Schema.php keeps it out of storage.
 */

import { useEffect, useState } from '@wordpress/element';
import type { ReactElement } from 'react';
import { isVisible } from '../core/dependency';
import { ChevronDown, resolveIcon } from '../core/icons';
import type { Field, FieldGroup, FieldValue, Values } from '../core/types';
import FieldRenderer, { fieldKeys } from './FieldRenderer';
import { holds } from './TabError';

type Common = {
	unique: string;
	values: Values;
	showIcons?: boolean;
	layout?: string;
	onChange: (id: string, value: FieldValue) => void;
	/** Open every group regardless of its state (a search is running). */
	forceOpen?: boolean;
	/** Ids the last save rejected: a group holding one opens. */
	invalid?: ReadonlySet<string>;
};

type CardProps = Common & { group: FieldGroup; fields: Field[]; keys: string[] };

/** Does the search box match the group's own title, subtitle, description or id? */
export function groupMatches(group: FieldGroup, needle: string): boolean {
	return [group.title, group.subtitle, group.desc, group.id].join(' ').toLowerCase().includes(needle);
}

export function FieldGroupCard({ group, fields, keys, forceOpen = false, invalid, ...common }: CardProps) {
	const [open, setOpen] = useState(() => !group.collapsed || (invalid !== undefined && holds(fields, invalid)));
	// A toggle during a search closes the card for that search only; its own state stays put.
	const [searchClosed, setSearchClosed] = useState(false);

	useEffect(() => setSearchClosed(false), [forceOpen]);

	useEffect(() => {
		if (invalid && holds(fields, invalid)) {
			setOpen(true);
		}
		// Only a new set of rejected ids opens the card; the fields list is stable per render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [invalid]);

	const { unique, values } = common;

	// The group's own rule hides the card; so does every field in it being hidden.
	if (!isVisible(group.dependency, values) || !fields.some((field) => isVisible(field.dependency, values))) {
		return null;
	}

	const collapsible = group.collapsible !== false;
	const expanded = !collapsible || (forceOpen ? !searchClosed : open);
	const base = `bfields-${unique}-group-${group.id}`;
	const Icon = group.icon ? resolveIcon(group.icon) : null;

	const inRow = group.layout === 'row';

	const label = (
		<>
			{Icon ? (
				<span className="bfields-field-group__icon">
					<Icon size={18} />
				</span>
			) : null}
			<span className="bfields-field-group__title">{(inRow && group.card_title) || group.title}</span>
		</>
	);

	const card = (
		<div
			className={['bfields-field-group', expanded ? 'is-open' : '', collapsible ? '' : 'bfields-field-group--plain', inRow ? '' : group.class]
				.filter(Boolean)
				.join(' ')}
			data-group={inRow ? undefined : group.id}
		>
			<h3 className="bfields-field-group__head">
				{collapsible ? (
					<button
						type="button"
						id={`${base}-toggle`}
						className="bfields-field-group__toggle"
						aria-expanded={expanded}
						aria-controls={`${base}-body`}
						aria-describedby={group.subtitle ? `${base}-desc` : undefined}
						onClick={() => (forceOpen ? setSearchClosed(expanded) : setOpen(!open))}
					>
						{label}
						<span className="bfields-field-group__chevron">
							<ChevronDown size={16} />
						</span>
					</button>
				) : (
					<span id={`${base}-toggle`} className="bfields-field-group__toggle">
						{label}
					</span>
				)}
			</h3>

			{group.subtitle && !inRow ? (
				<p id={`${base}-desc`} className="bfields-field-group__desc">
					{group.subtitle}
				</p>
			) : null}

			<div
				id={`${base}-body`}
				className="bfields-field-group__body"
				role="region"
				aria-labelledby={`${base}-toggle`}
				hidden={!expanded}
			>
				{group.desc ? <p className="bfields-hint" dangerouslySetInnerHTML={{ __html: group.desc }} /> : null}

				{fields.map((field, index) => (
					<FieldRenderer
						key={keys[index]}
						unique={unique}
						field={field}
						values={values}
						showIcons={common.showIcons}
						layout={common.layout}
						onChange={common.onChange}
					/>
				))}
			</div>
		</div>
	);

	if (!inRow) {
		return card;
	}

	return (
		<div className={['bfields-row bfields-row--wide bfields-row--group', group.class].filter(Boolean).join(' ')} data-group={group.id}>
			<div className="bfields-row__main">
				<h4 className="bfields-row__title">{group.title}</h4>
				{group.subtitle ? (
					<p id={`${base}-desc`} className="bfields-row__desc">
						{group.subtitle}
					</p>
				) : null}
			</div>
			<div className="bfields-row__control">{card}</div>
		</div>
	);
}

/** Draws each contiguous run of fields tagged with a known group inside its card; keys match an ungrouped render. */
export function renderFields(fields: Field[], groups: FieldGroup[] | undefined, common: Common): ReactElement[] {
	const keys = fieldKeys(fields);
	const known = new Map<string, FieldGroup>();
	const seen = new Map<string, number>();
	const out: ReactElement[] = [];

	(groups ?? []).forEach((group) => {
		if (!known.has(group.id)) {
			known.set(group.id, group);
		}
	});

	const row = { unique: common.unique, values: common.values, showIcons: common.showIcons, layout: common.layout, onChange: common.onChange };

	for (let index = 0; index < fields.length; ) {
		const field = fields[index] as Field;
		const group = field.fieldGroup ? known.get(field.fieldGroup) : undefined;

		if (!group) {
			out.push(<FieldRenderer key={keys[index]} {...row} field={field} />);
			index++;
			continue;
		}

		let end = index + 1;

		while (end < fields.length && fields[end]?.fieldGroup === group.id) {
			end++;
		}

		const count = (seen.get(group.id) ?? 0) + 1;
		seen.set(group.id, count);

		out.push(
			<FieldGroupCard
				key={count === 1 ? `group:${group.id}` : `group:${group.id}#${count}`}
				{...common}
				group={group}
				fields={fields.slice(index, end)}
				keys={keys.slice(index, end)}
			/>
		);
		index = end;
	}

	return out;
}
