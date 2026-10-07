/**
 * bfields — `button_set`, `radio`, `select`, `checkbox` (with options),
 * `image_select`.
 *
 * One component, five presentations ported from 3d-viewer-new-ui:
 *   segmented  → `Segmented`  (pill group on a grey field)
 *   radio      → `RadioGroup` (custom dot, not a native input, always inline)
 *   tiles      → `MimeTile`   (the Allowed MIME Types grid, with Select All)
 *   cards      → the Add New Viewer Mode grid (Lite / Advanced)
 *   select     → `.bp3d-select` (native select with the chevron background)
 *
 * A multi-select as a short list is `Checklist`, a source searched over REST
 * (`'options' => 'posts'`) is `SourceSelect`, and `image_select` renders the
 * `ImageTiles` stand-in from ./claude/.
 *
 * The stored shape is a string for single-value choices and a list for
 * `multiple` ones. An empty option key ('' => 'Neutral (default)') is a real
 * choice and must round-trip as '' rather than becoming "no selection" (D.1).
 */

import { __, sprintf } from '@wordpress/i18n';
import { Check, resolveIcon } from '../core/icons';
import type { FieldComponentProps } from '../core/registry';
import Checklist, { isChecklist } from './Checklist';
import SourceSelect from './SourceSelect';
import { ImageTiles } from './claude';

type Option = { key: string; label: string };

export function toOptions(
	raw: FieldComponentProps['field']['props']['options'],
	order?: string[]
): Option[] {
	if (!raw) {
		return [];
	}

	if (Array.isArray(raw)) {
		return raw.map((label) => ({ key: String(label), label: String(label) }));
	}

	// `optionOrder` restores the PHP order JS lost by listing integer keys first.
	const keys = Array.isArray(order) ? order.filter((key) => Object.prototype.hasOwnProperty.call(raw, key)) : [];
	const rest = Object.keys(raw).filter((key) => !keys.includes(key));

	return [...keys, ...rest].map((key) => ({ key, label: String(raw[key]) }));
}

/**
 * Split "GLB (.glb)" into its bold name and muted extension, the way the
 * design renders a MIME tile. Labels without a parenthesised tail render whole.
 */
function splitTile(label: string): { name: string; ext: string } {
	const match = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(label);

	return match?.[1] !== undefined && match[2] !== undefined
		? { name: match[1], ext: match[2] }
		: { name: label, ext: '' };
}

/**
 * The label of an option drawn for a stored value the field does not offer.
 * Shared with the unit select (Dimension, Spacing).
 */
export function staleLabel(key: string): string {
	return key === ''
		? __('(not set)', 'bfields')
		: sprintf(
				/* translators: %s: a stored value that is no longer one of the options. */
				__('%s (not available)', 'bfields'),
				key
			);
}

export default function Choice(props: FieldComponentProps) {
	const { field, value, onChange, locked, id } = props;

	// A Codestar string source (`'options' => 'posts'`, with `query_args` /
	// `ajax`) is chosen by search when bfields can list it (Choices.php).
	// Any other source is shown as it is and never written. Drawing it as a
	// list gave the options p, o, s, t, s and let a click overwrite the stored
	// id (review 5).
	if (field.props.optionsSource && field.props.searchable) {
		return <SourceSelect {...props} />;
	}

	if (field.props.optionsSource) {
		const current = Array.isArray(value) ? value.join(', ') : String(value ?? '');

		return (
			<span id={id} className="bfields-infobar bfields-infobar--warning">
				{current === ''
					? sprintf(
							/* translators: %s: options source, e.g. "posts". */
							__('Options from “%s” cannot be chosen in this interface yet.', 'bfields'),
							field.props.optionsSource
						)
					: sprintf(
							/* translators: 1: the stored value, 2: options source, e.g. "posts". */
							__('Saved value: %1$s. Options from “%2$s” cannot be chosen in this interface yet; it is kept as it is.', 'bfields'),
							current,
							field.props.optionsSource
						)}
			</span>
		);
	}

	const options = toOptions(field.props.options, field.props.optionOrder);
	const multiple = Boolean(field.props.multiple) || field.type === 'checkbox';
	const presentation = field.props.presentation ?? 'select';

	const selected: string[] = multiple
		? Array.isArray(value)
			? value.map(String)
			: []
		: [typeof value === 'string' ? value : String(value ?? '')];

	const isSelected = (key: string): boolean => selected.includes(key);

	const pick = (key: string): void => {
		if (!multiple) {
			onChange(key);
			return;
		}

		onChange(isSelected(key) ? selected.filter((item) => item !== key) : [...selected, key]);
	};

	if (multiple && isChecklist(field)) {
		return <Checklist field={field} locked={locked} options={options} selected={selected} pick={pick} />;
	}

	if (presentation === 'select') {
		// Codestar's placeholder option (value '') on a single select.
		const placeholder = !multiple && field.props.placeholder ? String(field.props.placeholder) : '';
		const offered = (key: string): boolean =>
			options.some((option) => option.key === key) || (placeholder !== '' && key === '');
		// A single select holding a value it does not offer ('' or a deleted
		// preset id) shows the placeholder, else the first option, as
		// Codestar's form does and as its dependency rules read it
		// (dependency.ts shown()). The store keeps the stored value until
		// another option is picked. Any other select lists it on its own.
		const firstShown = field.type === 'select' && !multiple && (placeholder !== '' || options.length > 0);
		const stale = firstShown ? [] : selected.filter((key) => !offered(key));
		const single =
			firstShown && !offered(selected[0] ?? '')
				? placeholder !== ''
					? ''
					: (options[0]?.key ?? '')
				: (selected[0] ?? '');

		return (
			<select
				id={id}
				className="bfields-select"
				multiple={multiple}
				disabled={locked}
				aria-label={field.title || undefined}
				value={multiple ? selected : single}
				onChange={(event) =>
					multiple
						? onChange(Array.from(event.target.selectedOptions).map((option) => option.value))
						: onChange(event.target.value)
				}
			>
				{placeholder !== '' ? <option value="">{placeholder}</option> : null}
				{stale.map((key) => (
					<option key={`stale-${key}`} value={key}>
						{staleLabel(key)}
					</option>
				))}
				{options.map((option) => (
					<option key={option.key} value={option.key}>
						{option.label}
					</option>
				))}
			</select>
		);
	}

	if (presentation === 'segmented') {
		return (
			<div className="bfields-segmented" role={multiple ? 'group' : 'radiogroup'}>
				{options.map((option) => (
					<button
						key={option.key}
						type="button"
						aria-pressed={isSelected(option.key)}
						disabled={locked}
						onClick={() => pick(option.key)}
					>
						{option.label}
					</button>
				))}
			</div>
		);
	}

	if (presentation === 'cards') {
		// The mode grid — 3d-viewer-new-ui `AddNew.jsx`, the Lite / Advanced
		// pair. Schema.php has mapped `layout: 'mode-grid'` to this
		// presentation since v1; until now nothing drew it and the field fell
		// through to the radio list below.
		//
		// The per-option icon, the "Recommended" tag and the perk list have no
		// Codestar equivalent, so they come from the field's own `option_meta`
		// (D.1). An option without one still renders — as the plain card the
		// design gives "Advanced" — because a control must not depend on
		// presentation metadata to work.
		const meta = field.props.optionMeta ?? {};

		return (
			<div
				className="bfields-mode-grid"
				role={multiple ? 'group' : 'radiogroup'}
				aria-label={field.title || undefined}
				id={id}
			>
				{options.map((option) => {
					const on = isSelected(option.key);
					const chrome = meta[option.key] ?? {};
					const ModeIcon = resolveIcon(chrome.icon || field.icon);

					return (
						<button
							key={option.key}
							type="button"
							role={multiple ? 'checkbox' : 'radio'}
							aria-checked={on}
							disabled={locked}
							onClick={() => pick(option.key)}
							className={[
								'bfields-mode',
								chrome.tag ? '' : 'bfields-mode--plain',
								on ? 'bfields-mode--on' : '',
							]
								.filter(Boolean)
								.join(' ')}
						>
							<span className="bfields-mode__icon">
								<ModeIcon size={18} />
							</span>

							<span className="bfields-mode__body">
								<span className="bfields-mode__name">
									{option.label}
									{chrome.tag ? <span className="bfields-mode__tag">{chrome.tag}</span> : null}
								</span>

								{chrome.perks?.length ? (
									<span className="bfields-mode__perks">
										{chrome.perks.map((perk) => (
											<span key={perk}>{`\u2713 ${perk}`}</span>
										))}
									</span>
								) : null}
							</span>

							<span className="bfields-mode__radio" />
						</button>
					);
				})}
			</div>
		);
	}

	if (presentation === 'images') {
		return (
			<ImageTiles
				field={field}
				locked={locked}
				id={id}
				options={options}
				selected={selected}
				multiple={multiple}
				pick={pick}
			/>
		);
	}

	if (presentation === 'tiles') {
		// The tile grid is a full-width CARD in the design, not a row control:
		// its own title, description and Select All / Deselect All buttons in
		// the head, the grid beneath. FieldRenderer therefore renders this
		// field bare — the card below IS the row.
		return (
			<div className="bfields-subcard">
				<div className="bfields-subcard__head">
					<div>
						<h3 className="bfields-subcard__title">{field.title}</h3>
						{field.desc ? (
							<p
								className="bfields-subcard__desc"
								dangerouslySetInnerHTML={{ __html: field.desc }}
							/>
						) : null}
					</div>

					{multiple && options.length > 3 ? (
						<div className="bfields-linkbtns">
							<button
								type="button"
								className="bfields-linkbtn"
								disabled={locked}
								onClick={() => onChange(options.map((option) => option.key))}
							>
								{__('Select All', 'bfields')}
							</button>
							<button
								type="button"
								className="bfields-linkbtn bfields-linkbtn--muted"
								disabled={locked}
								onClick={() => onChange([])}
							>
								{__('Deselect All', 'bfields')}
							</button>
						</div>
					) : null}
				</div>

				<div
					className="bfields-mime-grid"
					role={multiple ? 'group' : 'radiogroup'}
					aria-label={field.title || undefined}
					id={id}
				>
					{options.map((option) => {
						const { name, ext } = splitTile(option.label);
						const on = isSelected(option.key);

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
								<span>
									<strong style={{ fontWeight: 600 }}>{name}</strong>
									{ext ? <span className="bfields-mime__ext"> ({ext})</span> : null}
								</span>
							</button>
						);
					})}
				</div>
			</div>
		);
	}

	if (multiple) {
		return <Checklist field={field} locked={locked} options={options} selected={selected} pick={pick} />;
	}

	// radio — `RadioGroup` from the design: the custom dot, not a native
	// input, laid out inline with a 26px gap (Loading Type: Auto · Lazy ·
	// Eager). Long labels wrap onto a second line rather than stacking into a
	// layout the design does not have.
	return (
		<div className="bfields-radios" role="radiogroup" aria-label={field.title || undefined}>
			{options.map((option) => {
				const on = isSelected(option.key);

				return (
					<button
						key={option.key}
						type="button"
						role="radio"
						aria-checked={on}
						disabled={locked}
						onClick={() => pick(option.key)}
						className={`bfields-radio${on ? ' bfields-radio--on' : ''}`}
					>
						<span className="bfields-radio__dot" />
						{option.label}
					</button>
				);
			})}
		</div>
	);
}
