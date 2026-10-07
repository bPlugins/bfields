/**
 * bfields — a `select` whose options come from a source (`'options' =>
 * 'posts'`, `'categories'`…), chosen by search.
 *
 * At rest it is the design's select: a 44px box with the chevron, holding
 * the chosen item (with a × to clear it) or, when nothing is chosen, the
 * search input. Opening it (a click on the chosen item, or typing) shows a
 * result list under the box: a hint until enough is typed, then searching,
 * the matches, "No matches." or an error. Arrow keys move through the
 * matches and Enter picks one (APG combobox, list autocomplete, focus kept
 * in the input with `aria-activedescendant`). A polite status line
 * announces what the list holds.
 *
 * Codestar draws these as a Chosen select that searches over admin-ajax
 * (`ajax => true`). Here the search goes to GET /bfields/v1/choices, which
 * runs the field's own PHP-authored query, so the browser only names the
 * field (php/includes/Choices.php). A match shows its thumbnail and price
 * when the route sends them; today it sends the title only.
 *
 * Stored as Codestar stores them: the id as a string, a list of them when
 * `multiple`, '' when nothing is chosen (3.1). The value is written only when
 * the user picks or removes an item. Loading the labels of a stored id never
 * writes, so an id the search cannot see any more (a trashed product) is kept
 * and shown as `#id`. (Its label now reads "12 (not available)", the B1 rule.)
 */

import { useEffect, useRef, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import type { FocusEvent, KeyboardEvent } from 'react';
import { requestChoices } from '../core/api';
import type { ChoiceOption } from '../core/api';
import { ChevronDown, Search, X } from '../core/icons';
import type { FieldComponentProps } from '../core/registry';
import { placeholderText } from '../core/responsive';
import { staleLabel } from './Choice';

/** Codestar's Chosen waits for a few characters before it searches. */
export const MIN_TERM = 2;

type SearchState = { state: 'idle' | 'loading' | 'done' | 'error'; options: ChoiceOption[] };

export default function SourceSelect({ unique, field, value, onChange, locked, id }: FieldComponentProps) {
	const multiple = Boolean(field.props.multiple);
	const selected: string[] = (Array.isArray(value) ? value.map(String) : [String(value ?? '')]).filter((item) => item !== '');
	const title = field.title || __('Search', 'bfields');

	const [labels, setLabels] = useState<Record<string, string>>({});
	const [term, setTerm] = useState('');
	const [search, setSearch] = useState<SearchState>({ state: 'idle', options: [] });
	const [focused, setFocused] = useState(false);
	const [editing, setEditing] = useState(false);
	const [active, setActive] = useState(-1);
	const [expanded, setExpanded] = useState(false);
	const latest = useRef(0);
	const root = useRef<HTMLDivElement>(null);
	const input = useRef<HTMLInputElement>(null);
	const valueButton = useRef<HTMLButtonElement>(null);
	const focusNext = useRef<'input' | 'value' | null>(null);

	// Labels for stored ids the component has not seen yet.
	const missing = selected.filter((item) => labels[item] === undefined);
	const missingKey = missing.join(',');

	useEffect(() => {
		if (missing.length === 0) {
			return;
		}

		let live = true;

		requestChoices(unique, field.id, { include: missing }).then(
			(options) => {
				if (!live) {
					return;
				}
				const next: Record<string, string> = {};
				// An id the query no longer returns is marked, so it is not
				// fetched again on every render.
				missing.forEach((item) => {
					next[item] = staleLabel(item);
				});
				options.forEach((option) => {
					next[option.value] = option.label;
				});
				setLabels((current) => ({ ...current, ...next }));
			},
			() => {
				if (live) {
					setLabels((current) => ({ ...current, ...Object.fromEntries(missing.map((item) => [item, item])) }));
				}
			}
		);

		return () => {
			live = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the ids themselves.
	}, [unique, field.id, missingKey]);

	useEffect(() => {
		const query = term.trim();

		if (query.length < MIN_TERM) {
			latest.current++;
			setSearch({ state: 'idle', options: [] });
			return;
		}

		const request = ++latest.current;
		setSearch((current) => ({ state: 'loading', options: current.options }));

		const timer = window.setTimeout(() => {
			requestChoices(unique, field.id, { term: query }).then(
				(options) => request === latest.current && setSearch({ state: 'done', options }),
				() => request === latest.current && setSearch({ state: 'error', options: [] })
			);
		}, 250);

		return () => window.clearTimeout(timer);
	}, [unique, field.id, term]);

	useEffect(() => {
		if (focusNext.current === 'input') {
			input.current?.focus();
		} else if (focusNext.current === 'value') {
			valueButton.current?.focus();
		}
		focusNext.current = null;
	});

	const shown = search.state === 'done' ? search.options.filter((option) => !selected.includes(option.value)) : [];
	const showInput = multiple || selected.length === 0 || editing;
	const open = focused && showInput && !locked && (expanded || editing || term.trim() !== '');
	const listId = `${id}-results`;
	const optionId = (index: number): string => `${id}-option-${index}`;

	useEffect(() => setActive(-1), [search]);

	const pick = (option: ChoiceOption): void => {
		setLabels((current) => ({ ...current, [option.value]: option.label }));
		setTerm('');
		setEditing(false);
		setExpanded(false);
		focusNext.current = multiple ? 'input' : 'value';
		onChange(multiple ? [...selected.filter((item) => item !== option.value), option.value] : option.value);
	};

	const remove = (item: string): void => {
		focusNext.current = 'input';
		onChange(multiple ? selected.filter((other) => other !== item) : '');
	};

	const startEditing = (): void => {
		if (!locked) {
			setEditing(true);
			focusNext.current = 'input';
		}
	};

	const stopEditing = (): void => {
		setTerm('');
		setEditing(false);
		if (!multiple && selected.length > 0) {
			focusNext.current = 'value';
		}
	};

	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			setExpanded(true);
			if (shown.length > 0) {
				const step = event.key === 'ArrowDown' ? 1 : -1;
				setActive((current) => (current + step + shown.length) % shown.length);
			}
			return;
		}

		if (event.key === 'Enter') {
			event.preventDefault();
			const option = shown[active] ?? shown[0];
			if (option) {
				pick(option);
			}
			return;
		}

		if (event.key === 'Escape') {
			event.preventDefault();
			setExpanded(false);
			if (term !== '') {
				setTerm('');
			} else if (editing) {
				stopEditing();
			}
		}
	};

	const onBlur = (event: FocusEvent<HTMLDivElement>): void => {
		if (!root.current?.contains(event.relatedTarget as Node | null)) {
			setFocused(false);
			setExpanded(false);
			if (editing) {
				setTerm('');
				setEditing(false);
			}
		}
	};

	const status = (() => {
		if (term.trim().length < MIN_TERM) {
			return sprintf(
				/* translators: %d: how many characters to type before a search runs. */
				_n('Type at least %d character to search.', 'Type at least %d characters to search.', MIN_TERM, 'bfields'),
				MIN_TERM
			);
		}
		if (search.state === 'loading') {
			return __('Searching…', 'bfields');
		}
		if (search.state === 'error') {
			return __('Could not load the results. Try again.', 'bfields');
		}
		if (search.state === 'done' && shown.length === 0) {
			return __('No matches.', 'bfields');
		}
		return '';
	})();

	const announcement =
		open && search.state === 'done' && shown.length > 0
			? sprintf(
					/* translators: %d: number of search results. */
					_n('%d result available.', '%d results available.', shown.length, 'bfields'),
					shown.length
				)
			: open && search.state !== 'idle'
				? status
				: '';

	const labelOf = (item: string): string => labels[item] ?? item;
	const placeholder =
		editing && selected[0] !== undefined
			? labelOf(selected[0])
			: placeholderText(field.props.placeholder) || __('Type to search…', 'bfields');

	return (
		<div
			ref={root}
			className={`bfields-source${multiple ? ' bfields-source--multiple' : ''}${open ? ' bfields-source--open' : ''}`}
			onFocus={() => setFocused(true)}
			onBlur={onBlur}
		>
			{multiple && selected.length > 0 ? (
				<div className="bfields-source__chips">
					{selected.map((item) => (
						<span key={item} className="bfields-source__chip">
							{labelOf(item)}
							<button
								type="button"
								className="bfields-source__remove"
								disabled={locked}
								onClick={() => remove(item)}
								aria-label={sprintf(
									/* translators: %s: the chosen item, e.g. a product name. */
									__('Remove %s', 'bfields'),
									labelOf(item)
								)}
								title={__('Remove', 'bfields')}
							>
								<X size={12} />
							</button>
						</span>
					))}
				</div>
			) : null}

			{showInput ? (
				<div className="bfields-source__box">
					<Search size={14} />
					<input
						ref={input}
						id={id}
						type="search"
						className="bfields-source__input"
						value={term}
						disabled={locked}
						placeholder={placeholder}
						aria-label={title}
						aria-controls={open && shown.length > 0 ? listId : undefined}
						aria-expanded={open}
						aria-autocomplete="list"
						aria-activedescendant={open && active >= 0 && shown[active] ? optionId(active) : undefined}
						role="combobox"
						autoComplete="off"
						onChange={(event) => setTerm(event.target.value)}
						onMouseDown={() => setExpanded(true)}
						onKeyDown={onKeyDown}
					/>
					<ChevronDown size={16} className="bfields-source__chevron" />
				</div>
			) : (
				<div className="bfields-source__box bfields-source__box--value">
					<button
						ref={valueButton}
						id={id}
						type="button"
						className="bfields-source__value"
						disabled={locked}
						aria-haspopup="listbox"
						aria-expanded={false}
						aria-label={`${title}: ${labelOf(selected[0] ?? '')}`}
						onClick={startEditing}
						onKeyDown={(event) => {
							if (event.key === 'ArrowDown') {
								event.preventDefault();
								startEditing();
							}
						}}
					>
						<span className="bfields-source__chip">{labelOf(selected[0] ?? '')}</span>
						<ChevronDown size={16} className="bfields-source__chevron" />
					</button>
					<button
						type="button"
						className="bfields-source__remove"
						disabled={locked}
						onClick={() => remove(selected[0] ?? '')}
						aria-label={sprintf(
							/* translators: %s: the chosen item, e.g. a product name. */
							__('Remove %s', 'bfields'),
							labelOf(selected[0] ?? '')
						)}
						title={__('Remove', 'bfields')}
					>
						<X size={14} />
					</button>
				</div>
			)}

			{open ? (
				<div className="bfields-source__popover">
					{shown.length > 0 ? (
					<ul id={listId} className="bfields-source__list" role="listbox" aria-label={title}>
						{shown.map((option, index) => (
							<li
								key={option.value}
								id={optionId(index)}
								role="option"
								aria-selected={index === active}
								className={`bfields-source__option${index === active ? ' bfields-source__option--active' : ''}`}
								// Keep focus in the input while the pointer picks.
								onMouseDown={(event) => event.preventDefault()}
								onClick={() => pick(option)}
							>
								{option.thumbnail ? (
									<img className="bfields-source__thumb" src={option.thumbnail} alt="" loading="lazy" />
								) : null}
								<span className="bfields-source__name">{option.label}</span>
								{option.price ? <span className="bfields-source__price">{option.price}</span> : null}
							</li>
						))}
					</ul>
					) : null}
					{status ? (
						<p className={`bfields-source__status${search.state === 'error' ? ' bfields-source__status--error' : ''}`}>
							{status}
						</p>
					) : null}
				</div>
			) : null}

			<span className="screen-reader-text" role="status" aria-live="polite">
				{announcement}
			</span>
		</div>
	);
}
