/**
 * bfields demo — the Add New / Edit viewer screen.
 *
 * DEMO CODE. Structure is the design's `AddNew` page (3d-viewer-new-ui
 * `src/pages/AddNew.jsx`), measured off assets/images/figma/add-new/:
 *
 *   h1.bfields-title                 "Add New"
 *   input.bfields-title-input        the post title
 *   .bfields-shortcode               copy-me bar and chip
 *   .bfields-panel
 *     .bfields-tabs--fixed           one 112px tab per schema section
 *                                    (a left column with `tabs_position: 'left'`)
 *     .bfields-editor
 *       main                         the section (cards | one rows card | stage)
 *       aside.bfields-side           Live Preview, "Active Insights", Publish
 *
 * It is still WordPress's editor underneath. The root sits inside `#post`,
 * WordPress's own editor and `#submitdiv` are hidden rather than removed
 * (demo.css; other plugins' meta boxes stay visible below),
 * and every button that saves is a real submit button of that form:
 *
 *   Publish / Update   name="publish" | name="save" — what #submitdiv sends
 *   Save Draft         name="save"
 *   Save Change        name="save"
 *
 * so the request, the nonce, the redirect and the "Viewer published." notice
 * are all WordPress's. The title is mirrored into the hidden `#title` rather
 * than posted from here, so there is exactly one `post_title` in the request
 * and WordPress's autosave and slug code keep reading the field they know.
 *
 * Fields render through the framework's own FieldRenderer, so the editor and
 * the settings page cannot drift apart: one row markup, one dependency
 * engine, one stylesheet.
 *
 * TWO FRAMES. `page` is the above: the shell owns the screen (Add New).
 * `metabox` is a screen WordPress still draws — WooCommerce's product editor
 * (ProductEditor.php). There the title and the Publish box are WordPress's
 * and stay on the page, so the shell draws neither. Everything else is the
 * page frame's, inside one main-column meta box: shortcode bar, tabs, the
 * section, and the Live Preview card in a right-hand column beside it.
 */

import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Copy, Check, Send, resolveIcon } from '../../../ui/core/icons';
import FieldRenderer from '../../../ui/layout/FieldRenderer';
import revealPanel from '../../../ui/layout/revealPanel';
import type { Store } from '../../../ui/core/store';
import type { BootPayload, Field, FieldValue, Section, Values } from '../../../ui/core/types';
import LivePreview from './LivePreview';
import {
	MAIN_MIN,
	PageHandles,
	Splitter,
	pageBounds,
	sideBounds,
	tabsBounds,
	useResizableLayout,
} from '../../../ui/layout/Resizable';
import { TabsSwitch, useTabsPosition } from '../../../ui/layout/TabsLayout';
import StageCard from './StageCard';

/** What PHP adds to the boot payload for the editor screen (Assets.php). */
export type EditorBoot = {
	/** 'page': the shell owns the screen. 'metabox': it sits in a meta box. */
	frame: 'page' | 'metabox';
	/** '' in the metabox frame: WordPress draws the heading and title. */
	heading: string;
	title: string;
	/** id of WordPress's own (hidden) post title input; '' for none. */
	titleInput: string;
	shortcode: string;
	/** The shortcode bar's sentence, when the screen wants its own. */
	hint?: string;
	published: boolean;
};

type Props = {
	boot: BootPayload & { editor: EditorBoot };
	store: Store;
	/** id of the hidden field the post form submits. */
	input: string;
};

/** A section whose only job is to host the preview stage. */
const isStage = (section: Section): boolean => section.fields.some((field) => field.type === 'callback');

/**
 * The fixed bars a stuck strip has to clear on a screen the shell does not
 * own. The admin bar everywhere; on WooCommerce's screens also its own
 * header, fixed under the admin bar and drawn late by its React embed.
 */
const FIXED_BARS = '#wpadminbar, .woocommerce-layout__header';

/** Bottom edge of the lowest fixed bar, in px from the top of the window. */
const fixedBarsBottom = (): number =>
	Array.from(document.querySelectorAll<HTMLElement>(FIXED_BARS)).reduce((bottom, bar) => {
		if (getComputedStyle(bar).position !== 'fixed') {
			return bottom;
		}

		return Math.max(bottom, Math.round(bar.getBoundingClientRect().bottom));
	}, 0);

/** Whether a top-level field with this id is on the screen. */
const declares = (sections: Section[], id: string): boolean =>
	sections.some((section) => section.fields.some((field) => field.id === id));

/** Every storable field in a section, nested ones excluded: they reset with their parent. */
const resettable = (fields: Field[]): Field[] =>
	fields.filter((field) => field.id !== '' && !field.display && !field.pro && 'default' in field);

export default function EditorShell({ boot, store, input }: Props) {
	const { schema, editor } = boot;

	const [values, setValues] = useState<Values>(() => store.get());
	const [dirty, setDirty] = useState(false);
	const [active, setActive] = useState<string>(() => schema.sections[0]?.id ?? '');
	const [title, setTitle] = useState(editor.title);
	const [copied, setCopied] = useState(false);
	const page = useRef<HTMLDivElement>(null);
	const editorRef = useRef<HTMLDivElement>(null);
	const tabList = useRef<HTMLDivElement>(null);
	const main = useRef<HTMLDivElement>(null);
	const framed = editor.frame === 'metabox';
	const resizable = Boolean(schema.args.resizable);
	// The page width is WordPress's .wrap. The shell owns it only in the page
	// frame; in a meta box only the columns inside the box resize.
	const pageResizable = resizable && !framed;
	// 1185 and 369: the column and sidebar the Add New frames draw; 300, the
	// sidebar the meta box has room for (demo.css). 200: the sidebar tab
	// column's width in admin.css.
	const layout = useResizableLayout(`bfields-layout:${schema.unique}`, {
		page: 1185,
		side: framed ? 300 : 369,
		tabs: 200,
	});
	const tabs = useTabsPosition(schema.unique, schema.args);
	const sidebar = tabs.position === 'left';
	const resizableTabs = resizable && sidebar;

	// The column is WordPress's .wrap, outside this root, so its width travels
	// as a custom property demo.css reads.
	const customPage = pageResizable ? layout.custom.page : null;

	useEffect(() => {
		const root = document.documentElement.style;

		if (customPage === null) {
			root.removeProperty('--bfields-demo-page');
		} else {
			root.setProperty('--bfields-demo-page', `${customPage}px`);
		}

		return () => {
			root.removeProperty('--bfields-demo-page');
		};
	}, [customPage]);

	// Sticky tabs in a meta box: the strip wraps to as many rows as the box
	// needs, so the sidebar's stuck offset cannot be Add New's fixed 64px
	// strip. Its height travels as a custom property demo.css reads.
	const stickyFramed = framed && Boolean(schema.args.stickyTabs);

	useEffect(() => {
		const strip = tabList.current;
		const target = editorRef.current;

		if (!stickyFramed || !strip || !target || typeof ResizeObserver === 'undefined') {
			return undefined;
		}

		const observer = new ResizeObserver(() => {
			target.style.setProperty('--bfields-demo-strip', `${strip.offsetHeight}px`);
		});

		observer.observe(strip);

		return () => observer.disconnect();
	}, [stickyFramed]);

	// ...and what it sticks under is not only the admin bar (FIXED_BARS).
	// WooCommerce's header appears after this mounts, at no set time, so this
	// measures again once the page has loaded, on resize, whenever a bar
	// changes size, and on scroll — which is when a stuck strip could first
	// meet a late bar. Two rects per frame at most, written only on a change.
	useEffect(() => {
		const root = page.current;

		if (!framed || !root) {
			return undefined;
		}

		let last = -1;
		let frame = 0;

		const measure = (): void => {
			const bottom = fixedBarsBottom();

			if (bottom > 0 && bottom !== last) {
				last = bottom;
				root.style.setProperty('--bfields-demo-top', `${bottom}px`);
			}
		};

		const onScroll = (): void => {
			if (!frame) {
				frame = window.requestAnimationFrame(() => {
					frame = 0;
					measure();
				});
			}
		};

		const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
		const watch = (): void => {
			measure();
			document.querySelectorAll(FIXED_BARS).forEach((bar) => observer?.observe(bar));
		};

		watch();
		const late = window.setTimeout(watch, 1500);
		window.addEventListener('load', watch);
		window.addEventListener('resize', measure);
		window.addEventListener('scroll', onScroll, { passive: true });

		return () => {
			window.clearTimeout(late);
			window.cancelAnimationFrame(frame);
			window.removeEventListener('load', watch);
			window.removeEventListener('resize', measure);
			window.removeEventListener('scroll', onScroll);
			observer?.disconnect();
		};
	}, [framed]);

	useEffect(
		() =>
			store.subscribe((next) => {
				setValues(next);
				setDirty(store.isDirty());
			}),
		[store]
	);

	// The mirror. Writing on every change rather than on submit means the
	// payload is already correct when the user hits Publish with a field still
	// focused — a change/blur race is exactly how the last edit goes missing.
	useEffect(() => {
		const node = document.getElementById(input) as HTMLTextAreaElement | null;

		if (node) {
			node.value = JSON.stringify(values);
		}
	}, [values, input]);

	useEffect(() => {
		const node = editor.titleInput ? (document.getElementById(editor.titleInput) as HTMLInputElement | null) : null;

		if (node && node.value !== title) {
			node.value = title;
			// WordPress's own listeners (the slug box, the title prompt) watch
			// this field's input event, not its value.
			node.dispatchEvent(new Event('input', { bubbles: true }));
		}
	}, [title, editor.titleInput]);

	// Enter in a text field would submit #post through its FIRST submit button
	// — which is Publish. WordPress's own title field guards against that;
	// every input here needs the same guard. A native listener rather than a
	// JSX handler: it is page behaviour, not an interaction of the wrapper.
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
		// The clipboard API is undefined on http:// origins, which many local
		// installs are. Failing quietly beats throwing at the user.
		navigator.clipboard?.writeText(editor.shortcode).then(
			() => {
				setCopied(true);
				window.setTimeout(() => setCopied(false), 1500);
			},
			() => undefined
		);
	};

	const resetSection = (): void => {
		// eslint-disable-next-line no-alert
		if (!window.confirm(__('Reset every setting on this tab to its default?', 'bfields-demo'))) {
			return;
		}

		const patch: Values = {};

		resettable(section.fields).forEach((field) => {
			patch[field.id] = field.default as FieldValue;
		});

		// Nothing is deleted and nothing is saved: the defaults land in the
		// editor, and the next save writes them like any other edit (3.2).
		store.setMany(patch);
	};

	const actions = (
		<>
			<button type="button" className="bfields-btn bfields-btn--ghost" onClick={resetSection}>
				{__('Reset to Default', 'bfields-demo')}
			</button>

			{/* Only once there is something to save: the Figma frames show it on
			    the tabs that have been edited and not on the pristine ones. */}
			{dirty ? (
				<button type="submit" name="save" value="save" className="bfields-btn bfields-btn--save">
					{__('Save Change', 'bfields-demo')}
				</button>
			) : null}
		</>
	);

	const publish = (
		<div className="bfields-publish">
			<button
				type="submit"
				name={editor.published ? 'save' : 'publish'}
				value={editor.published ? __('Update', 'bfields-demo') : __('Publish', 'bfields-demo')}
				className="bfields-btn bfields-btn--primary"
			>
				<Send size={17} />
				{editor.published ? __('Update', 'bfields-demo') : __('Publish', 'bfields-demo')}
			</button>

			{editor.published ? null : (
				<button
					type="submit"
					name="save"
					value={__('Save Draft', 'bfields-demo')}
					className="bfields-btn bfields-btn--ghost"
				>
					{__('Save Draft', 'bfields-demo')}
				</button>
			)}
		</div>
	);

	const preview = <LivePreview values={values} />;
	const heading = <h3 className="bfields-side__heading">{__('Active Insights & Promotion', 'bfields-demo')}</h3>;

	const stage = isStage(section);
	const cards = section.layout === 'cards';

	const rows = section.fields.map((field, index) => (
		<FieldRenderer
			key={field.id || `${field.type}-${index}`}
			unique={schema.unique}
			field={field}
			values={values}
			showIcons
			layout={section.layout}
			onChange={onChange}
		/>
	));

	const styleSection = schema.sections.find((item) => /style/i.test(item.title));
	// The stage's rotate button IS the Auto Rotate setting; a screen without
	// one gets no button rather than a value nothing saves.
	const rotateId = declares(schema.sections, 'bp_3d_rotate') ? 'bp_3d_rotate' : undefined;

	const shortcode = (
		<div className="bfields-shortcode">
			<span className="bfields-shortcode__hint">
				{editor.hint ?? __('Copy and paste this shortcode into your posts, pages and widget', 'bfields-demo')}
			</span>
			<button
				type="button"
				className="bfields-shortcode__chip"
				onClick={copy}
				aria-label={__('Copy shortcode', 'bfields-demo')}
				title={copied ? __('Copied', 'bfields-demo') : __('Copy', 'bfields-demo')}
			>
				{editor.shortcode} {copied ? <Check size={16} /> : <Copy size={16} />}
			</button>
		</div>
	);

	// In the metabox frame Publish is WordPress's own box, so the column
	// holds the Live Preview card alone.
	const aside = framed ? (
		<aside className="bfields-side">{preview}</aside>
	) : (
		<aside className="bfields-side">
			{stage ? (
				<>
					{publish}
					{preview}
					{heading}
				</>
			) : (
				<>
					{preview}
					{heading}
					{publish}
				</>
			)}
		</aside>
	);

	return (
		<div className="bfields-editor-page" ref={page}>
			{pageResizable ? (
				<PageHandles
					value={layout.page}
					bounds={pageBounds(() => page.current?.closest('.wrap')?.parentElement)}
					onChange={layout.setPage}
				/>
			) : null}

			{framed ? null : (
				<>
					{schema.args.tabsSwitcher ? (
						<div className="bfields-title-row">
							<h1 className="bfields-title">{editor.heading}</h1>
							<TabsSwitch value={tabs.position} onChange={tabs.setPosition} />
						</div>
					) : (
						<h1 className="bfields-title">{editor.heading}</h1>
					)}

					<input
						className="bfields-title-input"
						type="text"
						value={title}
						placeholder={__('Add title', 'bfields-demo')}
						aria-label={__('Add title', 'bfields-demo')}
						spellCheck
						autoComplete="off"
						onChange={(event) => setTitle(event.target.value)}
					/>
				</>
			)}

			{shortcode}

			<div
				className={`bfields-panel${sidebar ? ' bfields-panel--sidebar' : ''}`}
				style={
					{
						marginTop: 21,
						...(resizableTabs && layout.custom.tabs !== null
							? { '--bfields-tabs-width': `${layout.tabs}px` }
							: {}),
					} as React.CSSProperties
				}
			>
				{resizableTabs ? (
					<Splitter
						className="bfields-splitter--tabs"
						label={__('Tab column width', 'bfields-demo')}
						value={layout.tabs}
						direction={1}
						bounds={tabsBounds(() => tabList.current, () => main.current, MAIN_MIN)}
						onChange={layout.setTabs}
					/>
				) : null}

				<div
					ref={tabList}
					className={`bfields-tabs bfields-tabs--fixed${schema.args.stickyTabs ? ' bfields-tabs--sticky' : ''}`}
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
								}}
							>
								<span className="bfields-tab__label">
									<Icon size={17} />
									{item.title}
								</span>
							</button>
						);
					})}
				</div>

				<div
					className={`bfields-editor${schema.args.stickyTabs ? ' bfields-editor--sticky' : ''}${framed ? ' bfields-editor--framed' : ''}`}
					ref={editorRef}
					style={
						resizable && layout.custom.side !== null
							? ({ '--bfields-side-width': `${layout.side}px` } as React.CSSProperties)
							: undefined
					}
				>
					{resizable ? (
						<Splitter
							className="bfields-splitter--side"
							label={__('Sidebar width', 'bfields-demo')}
							value={layout.side}
							direction={-1}
							bounds={sideBounds(() => editorRef.current, framed ? 24 : 40)}
							onChange={layout.setSide}
						/>
					) : null}

					<div ref={main}>
						{stage ? (
							<StageCard
								values={values}
								onChange={onChange}
								onStyle={() => styleSection && setActive(styleSection.id)}
								rotate={rotateId}
								actions={actions}
							/>
						) : (
							<>
								{cards ? (
									rows
								) : (
									<div className="bfields-card bfields-card--rows">
										<h3 className="bfields-section-title">
											{schema.args.title || section.title}
										</h3>
										{rows}
									</div>
								)}

								<div className="bfields-editor__actions">{actions}</div>
							</>
						)}
					</div>

					{aside}
				</div>
			</div>
		</div>
	);
}
