/**
 * bfields — a meta box drawn as the whole post editor page (`'frame' => 'page'`).
 *
 * The design's Add New screen (3d-viewer-new-ui `src/pages/AddNew.jsx`),
 * promoted from the demo (demo/ui/layout/EditorShell.tsx):
 *
 *   h1.bfields-title                 "Add New" / "Edit …"
 *   .bfields-title-field             the post title (mirrored into #title), shortcode chip at its end
 *   .bfields-panel
 *     .bfields-tabs--fixed           the tab strip
 *     .bfields-editor
 *       main                         the section (cards | one rows card | stage)
 *       aside.bfields-side           host slot, heading, Publish, shortcode chip
 *
 * It is still WordPress's editor underneath: the root sits inside `#post`
 * (Metabox::render_page()), and every button that saves is a real submit
 * button of that form, so the request, nonce, redirect and notices are
 * WordPress's. Values travel in the same mirror field the plain meta box uses,
 * so Metabox::save() is the one save path for both frames.
 *
 * The side column's first block is an empty node the host fills (a live
 * preview): `#bfields-side-<unique>`. Other plugins' side meta boxes are moved
 * into its last block, still inside `#post`, so they keep posting; only the
 * Publish box (#submitdiv) stays hidden. A section with a `callback` field is
 * the stage: its server output is rendered inside the stage card.
 */

import type { CSSProperties, MouseEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import copyText from '../core/clipboard';
import { Check, Copy, Monitor, Phone, Send, Tablet, resolveIcon } from '../core/icons';
import { getDevice, onDeviceChange, setDevice } from '../core/responsive';
import type { Store } from '../core/store';
import type { BootPayload, Device, Field, FieldValue, Section, Values } from '../core/types';
import { renderFields } from './FieldGroup';
import revealPanel from './revealPanel';
import { MAIN_MIN, PageHandles, Splitter, pageBounds, sideBounds, tabsBounds, useResizableLayout } from './Resizable';
import TabError, { sectionHasError } from './TabError';
import { TabsSwitch, useTabsPosition } from './TabsLayout';
import { createController, revealNotice, type Controller } from './updateInPlace';

/** What Metabox::render_page() prints in `data-editor`. */
export type EditorBoot = {
	heading: string;
	title: string;
	/** id of WordPress's own (hidden) title input; '' for none. */
	titleInput: string;
	/** '' for no shortcode bar. */
	shortcode: string;
	hint: string;
	/** '' for no heading under the side slot. */
	sideHeading: string;
	published: boolean;
	/** The post's status and the user's publish_posts capability, for core's button labels. Older boots lack them. */
	status?: string;
	canPublish?: boolean;
	/** A draft dated in the future: core's primary button reads "Schedule". */
	scheduled?: boolean;
	/** '' on a new post or without the capability. */
	trashUrl: string;
	trashLabel: string;
	/** `page.update_in_place`: Update saves without a reload (published posts only). */
	updateInPlace?: boolean;
	postId?: number;
	/** Core's message=1 notice for this post type, as HTML. */
	updatedNotice?: string;
	/** `page.update_in_place_boxes`: extra POST names that may travel in place. */
	inPlaceNames?: string[];
};

type Props = {
	boot: BootPayload;
	store: Store;
	input?: string;
	editor: EditorBoot;
	errors?: string[];
};

const isStage = (section: Section): boolean => section.fields.some((field) => field.type === 'callback');

/** Every storable field in a section, nested ones excluded: they reset with their parent. */
const resettable = (fields: Field[]): Field[] =>
	fields.filter((field) => field.id !== '' && !field.display && !field.pro && 'default' in field);

/**
 * Core's Publish box labels (post_submit_meta_box()): the primary button and,
 * where core prints one, the secondary save button.
 */
export function submitLabels(editor: EditorBoot): { primary: string; secondary: string } {
	const status = editor.status ?? (editor.published ? 'publish' : 'draft');
	const canPublish = editor.canPublish ?? true;
	let primary: string = __('Update', 'bfields');

	if (!editor.published) {
		if (!canPublish) {
			primary = __('Submit for Review', 'bfields');
		} else {
			primary = editor.scheduled ? __('Schedule', 'bfields') : __('Publish', 'bfields');
		}
	}

	let secondary = '';

	if (!['publish', 'future', 'pending', 'private'].includes(status)) {
		secondary = __('Save Draft', 'bfields');
	} else if ('pending' === status && canPublish) {
		secondary = __('Save as Pending', 'bfields');
	}

	return { primary, secondary };
}

/** Moves every node of `from` into `to`, and returns the function that puts them back. */
function relocate(from: Element | null, to: Element | null): () => void {
	if (!from || !to) {
		return () => undefined;
	}

	const nodes = Array.from(from.childNodes);

	nodes.forEach((node) => to.appendChild(node));

	return () => nodes.forEach((node) => from.appendChild(node));
}

const DEVICES: Array<{ id: Device; label: string; Icon: typeof Monitor; width: string }> = [
	{ id: 'desktop', label: __('Desktop', 'bfields'), Icon: Monitor, width: '100%' },
	{ id: 'tablet', label: __('Tablet', 'bfields'), Icon: Tablet, width: '62%' },
	{ id: 'mobile', label: __('Mobile', 'bfields'), Icon: Phone, width: '36%' },
];

export default function EditorShell({ boot, store, input, editor, errors }: Props) {
	const { schema } = boot;

	const [values, setValues] = useState<Values>(() => store.get());
	const [dirty, setDirty] = useState(false);
	const [active, setActive] = useState<string>(() => schema.sections[0]?.id ?? '');
	const [title, setTitle] = useState(editor.title);
	const [copied, setCopied] = useState(false);
	const [device, setDeviceState] = useState<Device>(getDevice);
	const page = useRef<HTMLDivElement>(null);
	const editorRef = useRef<HTMLDivElement>(null);
	const tabList = useRef<HTMLDivElement>(null);
	const main = useRef<HTMLDivElement>(null);
	const sideBoxes = useRef<HTMLDivElement>(null);
	const [invalid, setInvalid] = useState<Set<string>>(() => new Set(errors ?? []));
	const [busy, setBusy] = useState(false);
	// Beside Update after an in-place save: 'saved', or a pointer to the notice at the top.
	const [note, setNote] = useState<'' | 'saved' | 'not-saved' | 'partly' | 'unconfirmed'>('');
	const inPlace = useRef<Controller | null>(null);
	const primaryRef = useRef<HTMLButtonElement>(null);
	const focusPrimary = useRef(false);
	const resizable = Boolean(schema.args.resizable);
	const full = schema.args.pageWidth === 'full';
	// 1185 and 369: the column and sidebar the Add New frames draw; 200, the
	// left tab column's width in admin.css.
	const layout = useResizableLayout(`bfields-layout:${schema.unique}`, { page: full ? Infinity : 1185, side: 369, tabs: 200 });
	const tabs = useTabsPosition(schema.unique, schema.args);
	const sidebar = tabs.position === 'left';
	const resizableTabs = resizable && sidebar;
	const customPage = resizable ? layout.custom.page : null;
	const pageWidth = customPage !== null ? `${customPage}px` : full ? 'none' : null;

	useEffect(() => onDeviceChange(setDeviceState), []);

	// The column is WordPress's .wrap, outside this root, so its width travels
	// as a custom property page.css reads.
	useEffect(() => {
		const root = document.documentElement.style;

		if (pageWidth === null) {
			root.removeProperty('--bfields-page-width');
		} else {
			root.setProperty('--bfields-page-width', pageWidth);
		}

		return () => {
			root.removeProperty('--bfields-page-width');
		};
	}, [pageWidth]);

	// The mirror: enabled on mount (printed disabled, 7.4), then kept in step on
	// every change, so a Publish with a field still focused posts the last edit.
	useEffect(() => {
		const field = input ? (document.getElementById(input) as HTMLTextAreaElement | null) : null;

		const mirror = (next: Values): void => {
			if (field) {
				field.value = JSON.stringify(next);
			}
		};

		if (field) {
			mirror(store.get());
			field.disabled = false;
		}

		return store.subscribe((next, changed) => {
			setValues(next);
			setDirty(store.isDirty());
			mirror(next);

			if (changed.length) {
				setNote((current) => ('saved' === current ? '' : current));
			}
		});
	}, [store, input]);

	// Update in place (opt-in): built after the mirror is enabled, so its hidden-input snapshot is the mounted form.
	useEffect(() => {
		const form = page.current?.closest('form') ?? document.getElementById('post');

		if (!editor.updateInPlace || !input || !(form instanceof HTMLFormElement)) {
			return undefined;
		}

		const controller = createController({
			form,
			unique: schema.unique,
			input,
			editor,
			store,
			onBusy: (value) => {
				setBusy(value);

				if (value) {
					setNote('');
				}
			},
			onResult: ({ outcome, invalid: ids, notice }) => {
				if (ids) {
					setInvalid(new Set(ids));
				}

				if (outcome === 'saved' && 'updated' === notice?.kind) {
					setNote('saved');
					return;
				}

				focusPrimary.current = false;

				if (!notice) {
					setNote('');
				} else if ('failed' === outcome) {
					// No answer the client could read: the post may have saved.
					setNote('unconfirmed');
				} else {
					setNote('partial' === outcome || 'warning' === notice.kind ? 'partly' : 'not-saved');
				}
			},
			native: () => document.querySelector<HTMLElement>('#submitpost #publish')?.click(),
		});

		inPlace.current = controller;

		return () => {
			inPlace.current = null;
			controller.dispose();
		};
		// The boot never changes after mount.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [store, input]);

	// Save Change unmounts once the store is clean: its focus moves to Update.
	useEffect(() => {
		if (!busy && !dirty && focusPrimary.current) {
			focusPrimary.current = false;

			if (primaryRef.current && (!document.activeElement || document.activeElement === document.body)) {
				primaryRef.current.focus();
			}
		}
	}, [busy, dirty]);

	useEffect(() => {
		const node = editor.titleInput ? (document.getElementById(editor.titleInput) as HTMLInputElement | null) : null;

		if (node && node.value !== title) {
			node.value = title;
			// WordPress's slug box and title prompt listen for input, not value.
			node.dispatchEvent(new Event('input', { bubbles: true }));
		}
	}, [title, editor.titleInput]);

	// Other plugins' side boxes join the sidebar; if the frame unmounts (the error boundary), they go back.
	useEffect(() => relocate(document.getElementById('postbox-container-1'), sideBoxes.current), []);

	// Enter in a text field would submit #post through its first submit button.
	useEffect(() => {
		const node = page.current;

		if (!node) {
			return undefined;
		}

		const guard = (event: KeyboardEvent): void => {
			if (event.key === 'Enter' && (event.target as HTMLElement).tagName === 'INPUT') {
				event.preventDefault();
			}
		};

		node.addEventListener('keydown', guard);

		return () => node.removeEventListener('keydown', guard);
	}, []);

	const section = useMemo(
		() => schema.sections.find((item) => item.id === active) ?? schema.sections[0],
		[schema.sections, active]
	);

	if (!section) {
		return null;
	}

	const onChange = (id: string, value: FieldValue): void => store.setValue(id, value);

	const copy = (): void => {
		void copyText(editor.shortcode).then((done) => {
			if (done) {
				setCopied(true);
				window.setTimeout(() => setCopied(false), 1500);
			}
		});
	};

	const resetSection = (): void => {
		// eslint-disable-next-line no-alert
		if (!window.confirm(__('Reset every setting on this tab to its default?', 'bfields'))) {
			return;
		}

		const patch: Values = {};

		resettable(section.fields).forEach((field) => {
			patch[field.id] = field.default as FieldValue;
		});

		// Nothing is deleted or saved: the defaults land in the editor, and the
		// next save writes them like any other edit (3.2).
		store.setMany(patch);
	};

	/*
	 * WordPress binds its submit handling (autosave lock, the "Leave site?"
	 * guard switched off, the spinner) to the buttons inside #submitpost only.
	 * That box is hidden, so each button here clicks its twin in it.
	 */
	const through =
		(id: string) =>
		(event: MouseEvent<HTMLElement>): void => {
			const core = document.querySelector<HTMLElement>(id);

			if (core) {
				event.preventDefault();
				core.click();
			}
		};

	/** Update / Save Change on a published post: in place when the controller takes it, else core's button. */
	const save =
		(from: 'primary' | 'change') =>
		(event: MouseEvent<HTMLElement>): void => {
			const controller = inPlace.current;

			if (controller && editor.published) {
				if (controller.click(event)) {
					if ('change' === from) {
						focusPrimary.current = true;
					}
					return;
				}
			}

			through('#submitpost #publish')(event);
		};

	const showReset = schema.args.showResetSection;
	const labels = submitLabels(editor);

	const actions = (
		<>
			{showReset ? (
				<button type="button" className="bfields-btn bfields-btn--ghost" onClick={resetSection}>
					{__('Reset to Default', 'bfields')}
				</button>
			) : null}
			{dirty ? (
				<button
					type="submit"
					name="save"
					value="save"
					className="bfields-btn bfields-btn--save"
					aria-disabled={busy || undefined}
					aria-busy={busy || undefined}
					onClick={editor.published ? save('change') : through(labels.secondary ? '#submitpost #save-post' : '#submitpost #publish')}
				>
					{__('Save Change', 'bfields')}
				</button>
			) : null}
		</>
	);

	// Drawn in two places (title row, under Publish) until one is picked.
	const shortcodeChip = (place: 'title' | 'side') =>
		editor.shortcode ? (
			<button
				type="button"
				className={`bfields-shortcode__chip bfields-shortcode__chip--${place}`}
				onClick={copy}
				aria-label={`${__('Copy shortcode', 'bfields')}: ${editor.shortcode}`}
				title={copied ? __('Copied', 'bfields') : editor.hint}
			>
				{'side' === place ? <span className="bfields-shortcode__label">{__('Shortcode', 'bfields')}</span> : null}
				<code>{editor.shortcode}</code>
				<span className="bfields-shortcode__icon">{copied ? <Check size={14} /> : <Copy size={14} />}</span>
			</button>
		) : null;

	const publishLabel = labels.primary;

	const publish = (
		<div className="bfields-publish">
			<button
				ref={primaryRef}
				type="submit"
				name={editor.published ? 'save' : 'publish'}
				value={publishLabel}
				className="bfields-btn bfields-btn--primary"
				aria-disabled={busy || undefined}
				aria-busy={busy || undefined}
				onClick={editor.published ? save('primary') : through('#submitpost #publish')}
			>
				{busy ? (
					<>
						<span className="bfields-btn__spinner" aria-hidden="true" />
						<span aria-hidden="true">{__('Updating…', 'bfields')}</span>
						<span className="screen-reader-text">{publishLabel}</span>
					</>
				) : (
					<>
						<Send size={17} />
						{publishLabel}
					</>
				)}
			</button>

			{'saved' === note ? <span className="bfields-publish__saved">{__('Saved', 'bfields')}</span> : null}

			{'not-saved' === note || 'partly' === note || 'unconfirmed' === note ? (
				<button type="button" className="bfields-publish__unsaved" onClick={revealNotice}>
					{'partly' === note
						? __('Partly saved — show message', 'bfields')
						: 'unconfirmed' === note
							? __('Not confirmed — show message', 'bfields')
							: __('Not saved — show message', 'bfields')}
				</button>
			) : null}

			{editor.published || !labels.secondary ? null : (
				<button
					type="submit"
					name="save"
					value={labels.secondary}
					className="bfields-btn bfields-btn--ghost"
					onClick={through('#submitpost #save-post')}
				>
					{labels.secondary}
				</button>
			)}

			{shortcodeChip('side')}

			{editor.trashUrl ? (
				<a
					className="bfields-publish__trash"
					href={editor.trashUrl}
					aria-disabled={busy || undefined}
					onClick={(event) => {
						if (inPlace.current?.busy()) {
							event.preventDefault();
							return;
						}
						through('#submitpost #delete-action a.submitdelete')(event);
					}}
				>
					{editor.trashLabel}
				</a>
			) : null}
		</div>
	);

	// A stable node React never re-renders into: the host mounts its own root here.
	const slot = <div id={`bfields-side-${schema.unique}`} className="bfields-side__slot" />;
	const heading = editor.sideHeading ? <h3 className="bfields-side__heading">{editor.sideHeading}</h3> : null;

	const stage = isStage(section);
	const rows = renderFields(section.fields, section.groups, {
		unique: schema.unique,
		values,
		showIcons: true,
		layout: section.layout,
		onChange,
		invalid,
	});

	const width = DEVICES.find((item) => item.id === device)?.width ?? '100%';

	const stageCard = (
		<div className="bfields-stagecard bfields-stagecard--host">
			<div className="bfields-stagecard__head">
				<span className="bfields-stagecard__left">
					<span className="bfields-dot" />
					{section.title}
				</span>

				<div className="bfields-devices">
					{DEVICES.map(({ id, label, Icon }) => (
						<button
							key={id}
							type="button"
							className="bfields-device"
							aria-pressed={device === id}
							onClick={() => setDevice(id)}
						>
							<Icon size={10} /> {label}
						</button>
					))}
				</div>
			</div>

			<div className="bfields-stagecard__body">
				<div className="bfields-stagecard__stage" style={{ maxWidth: width }}>
					{rows}
				</div>
			</div>

			{showReset || dirty ? <div className="bfields-stagecard__actions">{actions}</div> : null}
		</div>
	);

	return (
		<div className="bfields-editor-page" ref={page}>
			{resizable ? (
				<PageHandles
					value={layout.page}
					fill={full}
					align={schema.args.pageAlign === 'start' ? 'start' : 'center'}
					bounds={pageBounds(() => page.current?.closest('.wrap')?.parentElement)}
					onChange={layout.setPage}
				/>
			) : null}

			{schema.args.tabsSwitcher ? (
				<div className="bfields-title-row">
					<h1 className="bfields-title">{editor.heading}</h1>
					<TabsSwitch value={tabs.position} onChange={tabs.setPosition} />
				</div>
			) : (
				<h1 className="bfields-title">{editor.heading}</h1>
			)}

			<div className={`bfields-title-field${editor.shortcode ? ' bfields-title-field--chip' : ''}`}>
				<input
					className="bfields-title-input"
					type="text"
					value={title}
					placeholder={__('Add title', 'bfields')}
					aria-label={__('Add title', 'bfields')}
					spellCheck
					autoComplete="off"
					onChange={(event) => {
						setTitle(event.target.value);
						// The title is not in the store: an edit to it is unsaved too.
						setNote((current) => ('saved' === current ? '' : current));
					}}
				/>
				{shortcodeChip('title')}
			</div>

			<div
				className={`bfields-panel${sidebar ? ' bfields-panel--sidebar' : ''}`}
				style={
					{
						marginTop: 21,
						...(resizableTabs && layout.custom.tabs !== null ? { '--bfields-tabs-width': `${layout.tabs}px` } : {}),
					} as CSSProperties
				}
			>
				{resizableTabs ? (
					<Splitter
						className="bfields-splitter--tabs"
						label={__('Tab column width', 'bfields')}
						value={layout.tabs}
						direction={1}
						bounds={tabsBounds(() => tabList.current, () => main.current, MAIN_MIN)}
						onChange={layout.setTabs}
					/>
				) : null}

				<div
					ref={tabList}
					className={`bfields-tabs bfields-tabs--fixed${schema.args.stickyTabs ? ' bfields-tabs--sticky' : ''}`}
				>
					<div className="bfields-tabs__list" role="tablist" aria-orientation={sidebar ? 'vertical' : 'horizontal'}>
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
								onClick={() => {
									setActive(item.id);

									if (schema.args.stickyTabs) {
										revealPanel(tabList.current);
									}
								}}
							>
								<span className="bfields-tab__label">
									<Icon size={17} />
									{item.title}
									{sectionHasError(item, invalid) ? <TabError /> : null}
								</span>
							</button>
						);
					})}
					</div>
				</div>

				<div
					className={`bfields-editor${schema.args.stickyTabs ? ' bfields-editor--sticky' : ''}`}
					ref={editorRef}
					style={
						resizable && layout.custom.side !== null
							? ({ '--bfields-side-width': `${layout.side}px` } as CSSProperties)
							: undefined
					}
				>
					{resizable ? (
						<Splitter
							className="bfields-splitter--side"
							label={__('Sidebar width', 'bfields')}
							value={layout.side}
							direction={-1}
							bounds={sideBounds(() => editorRef.current, 40)}
							onChange={layout.setSide}
						/>
					) : null}

					<div ref={main}>
						{stage ? (
							stageCard
						) : (
							<>
								{section.layout === 'cards' ? (
									rows
								) : (
									<div className="bfields-card bfields-card--rows">
										<h3 className="bfields-section-title">{schema.args.title || section.title}</h3>
										{rows}
									</div>
								)}

								{showReset || dirty ? <div className="bfields-editor__actions">{actions}</div> : null}
							</>
						)}
					</div>

					{/* One tree for every tab, so the host's slot node is never re-created. */}
					<aside className={`bfields-side${stage ? ' bfields-side--stage' : ''}`}>
						{slot}
						{heading}
						{publish}
						<div ref={sideBoxes} className="bfields-side__boxes bfields-foreign" />
					</aside>
				</div>
			</div>
		</div>
	);
}
