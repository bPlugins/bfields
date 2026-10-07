/**
 * bfields — the options screen.
 *
 * Structure ported from 3d-viewer-new-ui `src/pages/Settings.jsx`:
 *
 *   .bfields-admin > __inner
 *     .bfields-settings-head   title + search (+ the `tabs_switcher` switch)
 *     .bfields-panel
 *       .bfields-tabs          pill tabs with icons, on a pale blue strip
 *                              (a left sidebar with `tabs_position: 'left'`)
 *       .bfields-settings-body rows
 *       .bfields-actions       Save / Reset Section / Reset All
 *
 * Dropped from the port (plan 4.6): the Screen Options bar, the mock admin
 * notice and the WordPress footer. Those exist so the standalone design preview
 * looks like wp-admin; inside wp-admin, WordPress draws them itself.
 *
 * This component also owns the four behaviours Codestar provides that the
 * design prototype does not (Appendix D.4): the unsaved-changes guard, the
 * three save/reset actions with confirmation, search across fields, and
 * success/error feedback.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { saveOptions, SaveError } from '../core/api';
import { resolveIcon, Search, Save, RotateCcw, Trash } from '../core/icons';
import type { Store } from '../core/store';
import type { BootPayload, Field, FieldValue, Section, Values } from '../core/types';
import FieldRenderer, { fieldKeys } from './FieldRenderer';
import { groupMatches, renderFields } from './FieldGroup';
import revealPanel from './revealPanel';
import { PageHandles, Splitter, pageBounds, tabsBounds, useResizableLayout } from './Resizable';
import useStuckBar, { useBarPhase } from './stickyBar';
import TabError, { sectionHasError } from './TabError';
import { TabsSwitch, useTabsPosition } from './TabsLayout';

type Status = { kind: 'success' | 'error'; text: string } | null;

type Props = { boot: BootPayload; store: Store };

/**
 * Resolve the section to open from the URL hash.
 *
 * Accepts Codestar's legacy `#tab=<slug>` form, because
 * AnalyticsPro::handleNoticeAction() hard-codes `#tab=analytics` and the e2e
 * suite navigates by it (7.7).
 */
function sectionFromHash(sections: Section[], aliases: Record<string, string>): string {
	const hash = window.location.hash.replace(/^#/, '');
	const match = /(?:^|&)tab=([^&]+)/.exec(hash);
	const wanted = match?.[1] ? decodeURIComponent(match[1]) : hash;

	if (!wanted) {
		return sections[0]?.id ?? '';
	}

	const resolved = aliases[wanted] ?? wanted;

	return sections.some((section) => section.id === resolved) ? resolved : (sections[0]?.id ?? '');
}

/** Does a field match the search box? Title, subtitle, description and id. */
function matches(field: Field, needle: string): boolean {
	if (needle === '') {
		return true;
	}

	return [field.title, field.subtitle, field.desc, field.id]
		.join(' ')
		.toLowerCase()
		.includes(needle);
}

/** Every top-level field of every section, in order. */
function allFields(sections: Section[]): Field[] {
	return sections.flatMap((item) => item.fields);
}

export default function AdminShell({ boot, store }: Props) {
	const { schema, aliases } = boot;

	const [values, setValues] = useState<Values>(() => store.get());
	const [active, setActive] = useState<string>(() => sectionFromHash(schema.sections, aliases));
	const [search, setSearch] = useState('');
	const [busy, setBusy] = useState(false);
	const [status, setStatus] = useState<Status>(null);
	const [dirty, setDirty] = useState(false);
	const [invalid, setInvalid] = useState<ReadonlySet<string>>(() => new Set());
	const admin = useRef<HTMLDivElement>(null);
	const tabList = useRef<HTMLDivElement>(null);
	const body = useRef<HTMLDivElement>(null);
	const head = useRef<HTMLDivElement>(null);
	const panel = useRef<HTMLDivElement>(null);
	const [headStuck, setHeadStuck] = useState(false);
	const full = schema.args.pageWidth === 'full';
	// 240: the sidebar tab column's width in admin.css.
	const layout = useResizableLayout(`bfields-layout:${schema.unique}`, { page: full ? Infinity : 1185, side: 0, tabs: 240 });
	const customPage = schema.args.resizable ? layout.custom.page : null;
	const pageWidth = customPage !== null ? `${customPage}px` : full ? 'none' : null;
	const alignStart = schema.args.pageAlign === 'start';
	const tabs = useTabsPosition(schema.unique, schema.args);
	const [actionsEnd, actionsStuck] = useStuckBar();
	const barPhase = useBarPhase(dirty);
	const pinned = barPhase !== 'idle';

	useEffect(
		() =>
			store.subscribe((next) => {
				setValues(next);
				setDirty(store.isDirty());
			}),
		[store]
	);

	// The pinned tabs sit under the pinned head, whose height changes when it wraps.
	useEffect(() => {
		const node = head.current;
		const root = admin.current;

		if (!schema.args.stickyTabs || !node || !root || typeof ResizeObserver === 'undefined') {
			return undefined;
		}

		const observer = new ResizeObserver(() => root.style.setProperty('--bfields-head-h', `${node.offsetHeight}px`));
		observer.observe(node);

		return () => observer.disconnect();
	}, [schema.args.stickyTabs]);

		// Once the panel's own top edge has scrolled under the pinned head, the head draws one (admin.css).
	useEffect(() => {
		if (!schema.args.stickyTabs) {
			return undefined;
		}

		let frame = 0;
		const measure = (): void => {
			frame = 0;
			const top = head.current?.getBoundingClientRect();
			const edge = panel.current?.getBoundingClientRect().top;
			// 12px: the band under the head (box-shadow spread).
			setHeadStuck(top !== undefined && edge !== undefined && edge < top.bottom + 12);
		};
		const onScroll = (): void => {
			if (!frame) {
				frame = window.requestAnimationFrame(measure);
			}
		};

		measure();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll);

		return () => {
			window.cancelAnimationFrame(frame);
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
		};
	}, [schema.args.stickyTabs]);

		// page.css lines the admin notices up with the column, which sits outside them.
	useEffect(() => {
		const root = document.documentElement.style;
		const width =
			pageWidth === 'none'
				? '100vw'
				: (pageWidth ?? (admin.current ? getComputedStyle(admin.current).getPropertyValue('--bfields-container').trim() : ''));

		if (width) {
			root.setProperty('--bfields-screen-width', width);
		}
		// notices.css: 0 keeps the bars at the column's start edge instead of centring them.
		root.setProperty('--bfields-screen-center', alignStart ? '0' : '1');

		return () => {
			root.removeProperty('--bfields-screen-width');
			root.removeProperty('--bfields-screen-center');
		};
	}, [pageWidth, alignStart]);

	// Keep the hash in step so a deep link, a reload and the browser's back
	// button all land on the same tab.
	useEffect(() => {
		const onHashChange = (): void => setActive(sectionFromHash(schema.sections, aliases));
		window.addEventListener('hashchange', onHashChange);
		return () => window.removeEventListener('hashchange', onHashChange);
	}, [schema.sections, aliases]);

	// The unsaved-changes guard (Codestar's show_form_warning).
	useEffect(() => {
		if (!dirty || !schema.args.showFormWarning) {
			return undefined;
		}

		const onBeforeUnload = (event: BeforeUnloadEvent): void => {
			event.preventDefault();
			event.returnValue = '';
		};

		window.addEventListener('beforeunload', onBeforeUnload);
		return () => window.removeEventListener('beforeunload', onBeforeUnload);
	}, [dirty, schema.args.showFormWarning]);

	const section = useMemo(
		() => schema.sections.find((item) => item.id === active) ?? schema.sections[0],
		[schema.sections, active]
	);

	const needle = search.trim().toLowerCase();

	const onChange = useCallback((id: string, value: FieldValue) => store.setValue(id, value), [store]);

	const run = useCallback(
		async (action: 'save' | 'reset_section' | 'reset_all', sectionId?: string) => {
			setBusy(true);
			setStatus(null);

			try {
				// Every declared field is sent, untouched ones exactly as they
				// were hydrated (7.2). A partial payload is how a field
				// silently reverts to its default.
				const result = await saveOptions(schema.unique, store.get(), action, sectionId);

				store.commit(result.values);

				// A field whose PHP `validate` callback failed kept its stored
				// value (the commit above shows it again); say which and why,
				// as Codestar does.
				const invalid = Object.entries(result.errors);

				setInvalid(new Set(invalid.map(([id]) => id)));

				if (invalid.length > 0) {
					const titles = new Map(allFields(schema.sections).map((field) => [field.id, field.title || field.id]));

					setStatus({
						kind: 'error',
						text: sprintf(
							/* translators: %s: list of "Field: message" pairs. */
							__('Saved, except: %s', 'bfields'),
							invalid.map(([id, message]) => `${titles.get(id) ?? id}: ${message}`).join('; ')
						),
					});
					return;
				}

				setStatus({
					kind: 'success',
					text:
						action === 'save'
							? __('Settings saved.', 'bfields')
							: __('Settings restored to their defaults.', 'bfields'),
				});
			} catch (error) {
				// The store is deliberately untouched: a failed save must never
				// discard the user's edits (4.4).
				setStatus({
					kind: 'error',
					text: error instanceof SaveError ? error.message : __('Could not save.', 'bfields'),
				});
			} finally {
				setBusy(false);
			}
		},
		[schema.unique, store]
	);

	// A reset commits the server's row, which also throws away unsaved edits
	// in every OTHER section. Say so when there are any.
	const unsavedWarning = dirty
		? ' ' + __('Unsaved changes on this page will be lost.', 'bfields')
		: '';

	const confirmThen = (message: string, action: () => void): void => {
		// eslint-disable-next-line no-alert
		if (window.confirm(message)) {
			action();
		}
	};

	if (!section) {
		return null;
	}

	// Searching looks through EVERY section, as Codestar's search does, not
	// just the open tab. A group whose own title matches keeps all its fields.
	const groups = needle !== '' ? schema.sections.flatMap((item) => item.groups ?? []) : section.groups;
	const matchedGroups = new Set(
		needle !== '' ? (groups ?? []).filter((group) => groupMatches(group, needle)).map((group) => group.id) : []
	);
	const visibleFields = (needle !== '' ? allFields(schema.sections) : section.fields).filter(
		(field) => matches(field, needle) || (field.fieldGroup !== undefined && matchedGroups.has(field.fieldGroup))
	);

	// Either every row in the section gets an icon tile or none does — see
	// FieldRenderer's `showIcons`.
	const showIcons = section.fields.some((field) => field.icon !== '');

	// The uninstall-style cards sit below the row list in the design, not in it.
	const rows = visibleFields.filter((field) => field.layout !== 'danger');
	const cards = visibleFields.filter((field) => field.layout === 'danger');
	const cardKeys = fieldKeys(cards);

	// `tabs_position: 'left'` moves the strip into a sidebar beside the body.
	const sidebar = tabs.position === 'left';
	const resizableTabs = Boolean(schema.args.resizable) && sidebar;

	return (
		<div
			className={`bfields-admin${schema.args.stickyTabs ? ' bfields-admin--sticky-head' : ''}${alignStart ? ' bfields-admin--align-start' : ''}`}
			ref={admin}
		>
			<div
				className="bfields-admin__inner"
				style={pageWidth !== null ? ({ '--bfields-container': pageWidth } as React.CSSProperties) : undefined}
			>
				{schema.args.resizable ? (
					<PageHandles
						value={layout.page}
						fill={full}
						align={alignStart ? 'start' : 'center'}
						bounds={pageBounds(() => admin.current)}
						onChange={layout.setPage}
					/>
				) : null}

				<div className={`bfields-settings-head${headStuck ? ' is-stuck' : ''}`} ref={head}>
					{schema.args.brand.logo ? (
						<img className="bfields-settings-head__logo" src={schema.args.brand.logo} alt="" />
					) : null}

					<h1 className="bfields-settings-head__title">{schema.args.title}</h1>

					{schema.args.showSearch ? (
						<div className="bfields-search">
							<Search size={20} />
							<input
								type="search"
								value={search}
								placeholder={__('Search settings...', 'bfields')}
								aria-label={__('Search settings', 'bfields')}
								onChange={(event) => setSearch(event.target.value)}
							/>
						</div>
					) : null}

					{schema.args.tabsSwitcher ? (
						<TabsSwitch value={tabs.position} onChange={tabs.setPosition} />
					) : null}
				</div>

				<div
					ref={panel}
					className={`bfields-panel${sidebar ? ' bfields-panel--sidebar' : ''}`}
					style={
						resizableTabs && layout.custom.tabs !== null
							? ({ '--bfields-tabs-width': `${layout.tabs}px` } as React.CSSProperties)
							: undefined
					}
				>
					{resizableTabs ? (
						<Splitter
							className="bfields-splitter--tabs"
							label={__('Tab column width', 'bfields')}
							value={layout.tabs}
							direction={1}
							bounds={tabsBounds(() => tabList.current, () => body.current, 480)}
							onChange={layout.setTabs}
						/>
					) : null}

					<div
						ref={tabList}
						className={`bfields-tabs${schema.args.stickyTabs ? ' bfields-tabs--sticky' : ''}`}
						role="tablist"
						aria-orientation={sidebar ? 'vertical' : 'horizontal'}
					>
						{schema.sections.map((item) => {
							const Icon = resolveIcon(item.icon);
							const current = item.id === section.id;

							return (
								<button
									key={item.id}
									type="button"
									role="tab"
									aria-selected={current}
									className={`bfields-tab${current ? ' bfields-tab--active' : ''}`}
									onClick={(event) => {
										setActive(item.id);

										if (schema.args.stickyTabs) {
											revealPanel(event.currentTarget.parentElement);
										}

										// Written in Codestar's form so existing
										// links, bookmarks and the e2e suite keep
										// working.
										window.location.hash = `tab=${item.slug || item.id}`;
									}}
								>
									<Icon size={17} />
									{item.title}
									{sectionHasError(item, invalid) ? <TabError /> : null}
								</button>
							);
						})}
					</div>

					<div
						ref={body}
						className={`bfields-settings-body${
							// The design's tabs sit on the panel's 32px inset
							// unless they open with the full-width tile card
							// (General → Allowed MIME Types), which carries its
							// own padding.
							['tiles', 'images'].includes(rows[0]?.props.presentation ?? '')
								? ''
								: ' bfields-settings-body--flush'
						}`}
					>
						{needle !== '' && visibleFields.length === 0 ? (
							<p className="bfields-empty">
								{sprintf(
									/* translators: %s: the user's search term. */
									__('No settings match “%s”.', 'bfields'),
									search.trim()
								)}
							</p>
						) : null}

						{renderFields(rows, groups, {
							unique: schema.unique,
							values,
							showIcons,
							layout: section.layout,
							onChange,
							forceOpen: needle !== '',
							invalid,
						})}

						{cards.map((field, index) => (
							<FieldRenderer
								key={cardKeys[index]}
								unique={schema.unique}
								field={field}
								values={values}
								onChange={onChange}
							/>
						))}

						<div
							className={`bfields-actions${pinned ? ' is-dirty' : ''}${pinned && actionsStuck ? ' is-stuck' : ''}${
								barPhase === 'enter' ? ' is-entering' : barPhase === 'leave' ? ' is-leaving' : ''
							}`}
						>
							{status ? (
								<span className={`bfields-actions__status bfields-actions__status--${status.kind}`} role="status">
									{status.text}
								</span>
							) : dirty ? (
								<span className="bfields-actions__status bfields-actions__status--dirty" role="status">
									{__('Unsaved changes', 'bfields')}
								</span>
							) : null}

							<button
								type="button"
								className="bfields-btn bfields-btn--save"
								disabled={busy}
								onClick={() => run('save')}
							>
								<Save size={17} />
								{busy ? __('Saving...', 'bfields') : __('Save Changes', 'bfields')}
							</button>

							{schema.args.showResetSection ? (
								<button
									type="button"
									className="bfields-btn bfields-btn--reset"
									disabled={busy}
									onClick={() =>
										confirmThen(
											__('Restore this section to its default settings?', 'bfields') + unsavedWarning,
											() => run('reset_section', section.id)
										)
									}
								>
									<RotateCcw size={17} />
									{__('Reset Section', 'bfields')}
								</button>
							) : null}

							{schema.args.showResetAll ? (
								<button
									type="button"
									className="bfields-btn bfields-btn--danger"
									disabled={busy}
									onClick={() =>
										confirmThen(
											__(
												'Restore every setting on this page to its default? This cannot be undone.',
												'bfields'
											) + unsavedWarning,
											() => run('reset_all')
										)
									}
								>
									<Trash size={17} />
									{__('Reset All', 'bfields')}
								</button>
							) : null}
						</div>
						<span className="bfields-actions__end" ref={actionsEnd} aria-hidden="true" />
					</div>
				</div>
			</div>
		</div>
	);
}
