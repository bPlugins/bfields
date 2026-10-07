/**
 * bfields — one setting row: dependency gate, icon, title/desc, control.
 *
 * Markup ported from 3d-viewer-new-ui `controls.jsx` → `SettingRow`: a 40px
 * icon tile, a title and description stack, and the control pushed to the
 * right, separated by a hairline rule.
 *
 * A field with `layout: 'danger'` renders instead as the bordered card the
 * "Delete data on uninstall" row uses in the Figma export.
 *
 * A responsive field (`'responsive' => true`) gets the device switch beside
 * its title, and its control is handed the value for the device on screen
 * (core/responsive.ts). The component itself never learns about devices.
 */

import { __, sprintf } from '@wordpress/i18n';
import { isVisible } from '../core/dependency';
import { resolveField, resolveAdornments, useRegistryVersion } from '../core/registry';
import { getStore } from '../core/runtime';
import { resolveIcon, Trash } from '../core/icons';
import {
	DEVICES,
	clearDevice,
	deviceView,
	hasOwnValue,
	setDevice,
	useDevice,
	writeDevice,
} from '../core/responsive';
import type { Field, FieldPath, FieldValue, Values } from '../core/types';
import DeviceSwitcher from '../fields/DeviceSwitcher';
import { isChecklist } from '../fields/Checklist';

type Props = {
	/** The screen's storage key — what adornments are registered against. */
	unique: string;
	/**
	 * Element-id prefix inside a group row or fieldset — the parent control's
	 * own id, plus the row index. Defaults to `bfields-<unique>`. Never used for adornment
	 * lookup: `addAdornment('_bp3dimages_', 'model_link', …)` must match the
	 * `model_link` inside every model row (review 5).
	 */
	idPrefix?: string;
	field: Field;
	values: Values;
	row?: Values;
	/** Where `row` sits from the screen's root (`['items', 2]`); empty at the root. */
	basePath?: FieldPath;
	/** The repeater row's client id, when `row` is one. */
	rowId?: string;
	/** `row` (or the root values) as the store holds them now. */
	readBag?: () => Values | undefined;
	onChange: (id: string, value: FieldValue) => void;
	/**
	 * Whether this section renders icon tiles.
	 *
	 * The design gives every row a 40px tile, but Codestar field arrays carry
	 * no icons, so a ported screen has them only where a host has added the
	 * `icon` key. Deciding per SECTION rather than per field keeps the title
	 * column on one vertical line: either every row in the section has a tile
	 * (falling back to the generic mark) or none does. Mixing the two is what
	 * looks broken.
	 */
	showIcons?: boolean;
	/**
	 * The section's layout.
	 *
	 * `cards` is the Add New Model tab in the design: each field is a bordered
	 * card with the icon, title and description stacked at the top and the
	 * control full width beneath. `rows` is the Settings screen. The schema
	 * names both on the SECTION, and it stays a section-level decision for the
	 * same reason `showIcons` does — a tab that mixes the two reads as broken.
	 */
	layout?: 'rows' | 'cards' | string;
};

/**
 * React keys for a list of fields.
 *
 * A field id is unique within a row, not always within a screen: 3D Viewer's
 * product box has two `content` fields with the id `shortcode`. A repeat is
 * keyed `shortcode#2`, so keys never collide and a field keeps its key (and
 * its component state) when search or a row tab filters the list.
 */
export function fieldKeys(fields: Field[]): string[] {
	const seen = new Map<string, number>();

	return fields.map((field, index) => {
		const base = field.id || `${field.type}-${index}`;
		const count = (seen.get(base) ?? 0) + 1;

		seen.set(base, count);

		return count === 1 ? base : `${base}#${count}`;
	});
}

export default function FieldRenderer({
	unique,
	idPrefix,
	field,
	values,
	row,
	basePath,
	rowId,
	readBag,
	onChange,
	showIcons = false,
	layout = 'rows',
}: Props) {
	// Before the dependency gate: a hook may not be skipped by an early return.
	const device = useDevice(Boolean(field.responsive));
	// A field or adornment registered after mount re-renders the row.
	useRegistryVersion();

	if (!isVisible(field.dependency, values, row)) {
		return null;
	}

	const Component = resolveField(field);
	const inputId = `${idPrefix ?? `bfields-${unique}`}-${field.id || field.type}`;
	const stored = (row ? row[field.id] : values[field.id]) as FieldValue;

	// On desktop, or for a field that is not responsive, `value` is `stored`
	// and a change is written to the field's own key, exactly as before.
	const bag = row ?? values;
	const view = deviceView(field, device, stored, bag);
	const value = view.value;
	const path: FieldPath = [...(basePath ?? []), field.id];
	const currentBag = (): Values | undefined => (readBag ? readBag() : (getStore(unique)?.get() ?? bag));
	const latest = (): FieldValue | undefined => currentBag()?.[field.id];
	// Read at call time, so a late write (after a modal) patches today's value.
	const change = (next: FieldValue): void =>
		writeDevice(field, device, next, (latest() ?? stored) as FieldValue, onChange);

	const switcher = field.responsive ? (
		<DeviceSwitcher
			device={device}
			onSelect={setDevice}
			overridden={DEVICES.filter((item) => item !== 'desktop' && hasOwnValue(field, item, stored, bag))}
			onReset={
				device !== 'desktop' && hasOwnValue(field, device, stored, bag)
					? () => clearDevice(field, device, stored, onChange)
					: undefined
			}
			disabled={field.pro}
		/>
	) : null;

	// An unknown type must be loud, not silent. Its value is still sent back
	// verbatim (7.2), but the user needs to know the UI could not show it
	// rather than assuming the setting is gone. PHP maps every type it has no
	// renderer for to core `unknown`, so this is where those land unless a
	// host registered a component for the authoring type.
	const card = layout === 'cards';

	const control = Component ? (
		<Component
			// A fresh instance per device, so a control's own state (a pressed
			// link button, an editor's buffer) never carries across devices.
			key={device}
			unique={unique}
			field={field}
			value={value}
			values={values}
			row={row}
			id={inputId}
			locked={field.pro}
			card={card}
			inherited={view.inherited}
			path={path}
			rowId={rowId}
			latest={latest}
			onChange={change}
		/>
	) : (
		<span className="bfields-infobar bfields-infobar--warning">
			{sprintf(
				/* translators: %s: field type, e.g. "repeater". */
				__('“%s” cannot be edited in this interface yet. Its saved value is preserved.', 'bfields'),
				field.type
			)}
		</span>
	);

	const before = resolveAdornments(unique, field.id, 'before');
	const after = resolveAdornments(unique, field.id, 'after');
	const below = resolveAdornments(unique, field.id, 'below');

	const adornmentProps = {
		unique,
		field,
		value,
		values,
		row,
		id: inputId,
		locked: field.pro,
		inherited: view.inherited,
		path,
		rowId,
		latest,
		onChange: change,
	};

	const belowBlock = (className: string) =>
		below.length > 0 ? (
			<div className={className}>
				{below.map((Adornment, index) => (
					<Adornment key={`below-${index}`} slot="below" {...adornmentProps} />
				))}
			</div>
		) : null;

	// A card section draws every field the same way, control included — the
	// tile grid's own card and the danger card are row idioms and do not apply
	// here, so this branch comes first.
	// A titled content field (a button, a link) is a card too, not a bare row between cards.
	const titledDisplay = field.display && field.title.trim() !== '' && field.type !== 'heading' && field.type !== 'subheading';

	if (card && (!field.display || titledDisplay)) {
		const CardIcon = resolveIcon(field.icon);
		// A compact control (segmented, switch, number, slider, colour) sits
		// beside the head rather than on a line of its own under it.
		const compact = field.core === 'toggle' || field.core === 'number' || field.core === 'color';
		const inline = field.props.presentation === 'segmented' || titledDisplay || compact;

		return (
			<div
				className={`bfields-card${inline ? ' bfields-card--inline' : ''} ${field.class}`.trim()}
				data-field={field.id}
			>
				<div className="bfields-card__head">
					<span className="bfields-card__head-icon">
						<CardIcon size={20} />
					</span>
					<div>
						<h4 className="bfields-card__title">
							{field.title}
							{switcher}
							{field.pro ? (
								<span className="bfields-badge--pro">{__('Pro', 'bfields')}</span>
							) : null}
						</h4>
						{field.subtitle ? <p className="bfields-card__desc">{field.subtitle}</p> : null}
					</div>
				</div>

				<div className="bfields-card__control">
					{before.map((Adornment, index) => (
						<Adornment key={`before-${index}`} slot="before" {...adornmentProps} />
					))}

					{control}

					{after.map((Adornment, index) => (
						<Adornment key={`after-${index}`} slot="after" {...adornmentProps} />
					))}
				</div>

				{belowBlock('bfields-card__below')}

				{field.desc ? (
					<p className="bfields-hint" dangerouslySetInnerHTML={{ __html: field.desc }} />
				) : null}
			</div>
		);
	}

	// Display-only fields (content, notice, heading) span the whole row,
	// unless they carry a title. Codestar draws a titled `content`,
	// `callback` or `notice` with the title in the title column, as it does
	// any field ("Support", "Shortcode" on 3D Viewer's product box), so the
	// HTML takes the control column. A heading's title IS its text.
	if (field.display) {
		// Codestar's `' '` title only indents the content to the control column.
		if (field.title.trim() === '' || field.type === 'heading' || field.type === 'subheading') {
			return <div className={`bfields-row bfields-row--display ${field.class}`.trim()}>{control}</div>;
		}

		const DisplayIcon = resolveIcon(field.icon);

		return (
			<div className={`bfields-row bfields-row--fill bfields-row--titled ${field.class}`.trim()}>
				{showIcons ? (
					<span className="bfields-row__icon">
						<DisplayIcon size={18} />
					</span>
				) : null}
				<div className="bfields-row__main">
					<h4 className="bfields-row__title">{field.title}</h4>
					{field.subtitle ? <p className="bfields-row__desc">{field.subtitle}</p> : null}
				</div>
				<div className="bfields-row__control">
					{control}
					{field.desc ? (
						<p className="bfields-hint" dangerouslySetInnerHTML={{ __html: field.desc }} />
					) : null}
				</div>
			</div>
		);
	}

	// The tile grid renders its OWN card, head and bulk actions (see Choice),
	// so it gets no row chrome — wrapping it in a row would squeeze the grid
	// into the narrow control column.
	if ((field.props.presentation === 'tiles' && !isChecklist(field)) || field.props.presentation === 'images') {
		return <div className={`bfields-row--card ${field.class}`.trim()}>{control}</div>;
	}

	const body = (
		<>
			<div className="bfields-row__main">
				<h4 className="bfields-row__title">
					{field.title}
					{switcher}
					{field.pro ? (
						<span className="bfields-badge--pro">{__('Pro', 'bfields')}</span>
					) : null}
				</h4>

				{field.subtitle ? <p className="bfields-row__desc">{field.subtitle}</p> : null}
				{field.desc ? (
					<p className="bfields-row__desc" dangerouslySetInnerHTML={{ __html: field.desc }} />
				) : null}
			</div>

			<div className="bfields-row__control">
				{field.before ? <span dangerouslySetInnerHTML={{ __html: field.before }} /> : null}

				{before.map((Adornment, index) => (
					<Adornment key={`before-${index}`} slot="before" {...adornmentProps} />
				))}

				{control}

				{after.map((Adornment, index) => (
					<Adornment key={`after-${index}`} slot="after" {...adornmentProps} />
				))}

				{field.after ? <span dangerouslySetInnerHTML={{ __html: field.after }} /> : null}
			</div>

			{belowBlock('bfields-row__below')}
		</>
	);

	if (field.layout === 'danger') {
		return (
			<div className="bfields-danger-card" data-field={field.id}>
				<span className="bfields-danger-card__icon">
					<Trash size={22} />
				</span>
				{body}
			</div>
		);
	}

	const Icon = resolveIcon(field.icon);

	// `spaced` reproduces the taller block the design gives rows whose control
	// is a radio group rather than a toggle (e.g. Loading Type).
	const spaced = field.core === 'choice' && field.props.presentation === 'radio';

	// A list or a sub-form cannot live in the row's right-hand column: that
	// column is `flex: none` and sized to a toggle. Deciding it from the CORE
	// rather than from an authored class means a field file cannot forget, and
	// there is no class for a stylesheet to leak through a descendant selector.
	// An upload inside a repeater row or a fieldset joins them: that column is
	// too narrow for a URL beside its label, so it gets a line of its own.
	// A mode grid is a row of cards, not a toggle-sized control, so it does too.
	const wide =
		['repeater', 'fieldset'].includes(field.core) ||
		(row !== undefined && field.core === 'media') ||
		(field.core === 'choice' && field.props.presentation === 'cards');

	// Text fields and the code editor take the rest of the row: the title keeps
	// a fixed column and the control fills what is left, top-aligned, so a long
	// CSS selector or a stylesheet has room. The selector chip keeps its own size.
	const fill = field.core === 'code' || (field.core === 'text' && field.layout !== 'selector');

	const className = [
		'bfields-row',
		spaced ? 'bfields-row--spaced' : '',
		wide ? 'bfields-row--wide' : '',
		fill ? 'bfields-row--fill' : '',
		field.core === 'code' ? 'bfields-row--code' : '',
		!wide && field.core === 'media' ? 'bfields-row--media' : '',
		field.layout === 'selector' ? 'bfields-row--selector' : '',
		below.length > 0 ? 'bfields-row--below' : '',
		field.pro ? 'bfields-row--locked' : '',
		field.class,
	]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={className} data-field={field.id}>
			{showIcons ? (
				<span className="bfields-row__icon">
					<Icon size={18} />
				</span>
			) : null}
			{body}
		</div>
	);
}
