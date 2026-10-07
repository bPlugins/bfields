/**
 * bfields — the schema types.
 *
 * These mirror, exactly, what php/includes/Schema.php emits. The JSON document
 * is the API between the two halves (plan 4.0), so this file and Schema.php
 * change together or not at all.
 */

/** Bump only for additive changes; the wire format is never broken. */
export const SCHEMA_VERSION = 1;

/** Value shapes, as they are stored — never a "nicer" representation (7.12). */
export type MediaValue = {
	url: string;
	id: string;
	width: string;
	height: string;
	thumbnail: string;
	alt: string;
	title: string;
	description: string;
	[extra: string]: string;
};

export type DimensionValue = { width?: string; height?: string; unit?: string };
export type SpacingValue = { top?: string; right?: string; bottom?: string; left?: string; unit?: string };
export type LinkValue = { url: string; text: string; target: string };
export type RepeaterRow = Record<string, FieldValue> & { __id?: string };

/**
 * `boolean` and `number` are stored shapes too: Codestar's Reset and seeding
 * write the raw authored default (PHP true, an int), and the codec keeps a
 * value the user has not touched exactly as it is (review 4.1).
 */
export type FieldValue =
	| string
	| boolean
	| number
	| string[]
	| MediaValue
	| DimensionValue
	| SpacingValue
	| LinkValue
	| RepeaterRow[]
	| Record<string, unknown>;

export type Values = Record<string, FieldValue>;

/** Keys and list positions from a screen's root to one value; a list segment may be a row id. */
export type FieldPath = Array<string | number>;

export type SpacingSide = 'top' | 'right' | 'bottom' | 'left';

/** The authoring vocabulary (Codestar's), kept on every field. */
export type AuthoringType =
	| 'switcher' | 'checkbox' | 'button_set' | 'radio' | 'select' | 'image_select'
	| 'text' | 'textarea' | 'password' | 'number' | 'spinner' | 'slider'
	| 'color' | 'media' | 'upload' | 'dimensions' | 'spacing' | 'fieldset'
	| 'group' | 'repeater' | 'code_editor'
	| 'content' | 'notice' | 'callback' | 'heading' | 'subheading' | 'submessage'
	| 'link'
	// Authoring only: Schema.php splices a field_group into its fields and
	// describes it in `Section.groups`, so no field on the wire has this type.
	| 'field_group'
	// Any type bfields has no mapping for (core `unknown`).
	| (string & {});

/** Which component renders it. */
export type CoreType =
	| 'toggle' | 'choice' | 'text' | 'number' | 'color' | 'media'
	| 'dimension' | 'spacing' | 'fieldset' | 'repeater' | 'code'
	| 'display' | 'link'
	/** No renderer: the value is carried verbatim and shown read-only. */
	| 'unknown';

/** The breakpoints a responsive field holds a value for. */
export type Device = 'desktop' | 'tablet' | 'mobile';

/**
 * Where a `'responsive' => true` field keeps its tablet and mobile values
 * (Schema::responsive()). Desktop is always the field's own value.
 *
 *   nested   inside the object: `{width, unit, tablet: {…}, mobile: {…}}`.
 *   suffix   sibling keys in the same row: `{id}_tablet`, `{id}_mobile`.
 *
 * `keys` names them either way, so the UI never derives a key itself.
 */
export type Responsive = {
	mode: 'nested' | 'suffix';
	keys: { tablet: string; mobile: string };
};

export type DependencyRule = {
	controller: string;
	condition: string;
	value: string;
	/** `local` resolves inside the group row first; `global` skips it (4.2). */
	scope: 'local' | 'global';
	/** On a rule whose controller is a single select: its option values ('' first for a placeholder). */
	choices?: string[];
	/** What that select shows, and its rules read, for a value outside `choices`. */
	shown?: string;
};

export type FieldProps = {
	options?: Record<string, string> | string[];
	/** The PHP key order of `options`, sent when a JS object would reorder its integer keys. */
	optionOrder?: string[];
	/**
	 * A Codestar string source ('posts', 'pages', a function name…) instead
	 * of an option list. Chosen by search when `searchable`, else read-only.
	 */
	optionsSource?: string;
	/** The source can be listed through GET /bfields/v1/choices (php/includes/Choices.php). */
	searchable?: boolean;
	/** group/repeater row limits (Codestar's `max` / `min`; 0 = none). */
	maxRows?: number | string;
	minRows?: number | string;
	/** A string, or per side on `spacing` (`{top: 'X'}`). */
	placeholder?: string | Partial<Record<SpacingSide, string>>;
	attributes?: Record<string, string | number>;
	multiple?: boolean;
	unit?: string;
	units?: string[];
	min?: number | string;
	max?: number | string;
	step?: number | string;
	textOn?: string;
	textOff?: string;
	label?: string;
	library?: string | string[];
	buttonTitle?: string;
	addTitle?: string;
	titlePrefix?: string;
	titleNumber?: boolean;
	/** On a group's sub-field: the row tab it starts (display only). */
	tab?: string;
	/** On a group: row tab name => icon. */
	tabIcons?: Record<string, string>;
	style?: string;
	settings?: Record<string, unknown>;
	maxLength?: number;
	/** Per-option chrome for the `cards` mode grid (D.1). */
	optionMeta?: Record<string, { icon?: string; tag?: string; perks?: string[] }>;
	width?: false;
	height?: false;
	left?: false;
	showUnits?: false;
	/** `spacing`: Codestar's `{side}_icon` (plain text only is shown) and a per-side caption. */
	topIcon?: string;
	rightIcon?: string;
	bottomIcon?: string;
	leftIcon?: string;
	labels?: Partial<Record<SpacingSide, string>>;
	multiline?: boolean;
	secret?: boolean;
	level?: number;
	/** Trusted HTML, already run through wp_kses_post on the server. */
	html?: string;
	presentation?:
		| 'segmented' | 'radio' | 'select' | 'checklist' | 'images' | 'tiles' | 'cards'
		| 'stepper' | 'slider' | 'input'
		| 'url' | 'attachment'
		| 'collapsible' | 'plain';
};

export type Field = {
	id: string;
	type: AuthoringType;
	core: CoreType;
	title: string;
	subtitle: string;
	desc: string;
	before: string;
	after: string;
	class: string;
	/** Rendered locked and excluded from save (3.3). */
	pro: boolean;
	/** Holds no value and is never stored. */
	display: boolean;
	layout: string;
	icon: string;
	props: FieldProps;
	default?: FieldValue;
	dependency?: DependencyRule[];
	adornments?: string[];
	/** Present only on a field authored with `'responsive' => true`. */
	responsive?: Responsive;
	fields?: Field[];
	/** The `Section.groups` id of the field_group this top-level field was authored in. */
	fieldGroup?: string;
};

/**
 * A `field_group` as drawn: a titled card around the contiguous run of the
 * section's fields tagged with its id. Presentation only; it holds no value.
 */
export type FieldGroup = {
	id: string;
	title: string;
	subtitle: string;
	/** Trusted HTML, already run through wp_kses_post on the server. */
	desc: string;
	icon: string;
	class: string;
	collapsible: boolean;
	/** The initial state; search and a rejected field inside open it. */
	collapsed: boolean;
	/** 'row' puts title and subtitle in a row's label column and the card beside them (absent from older payloads). */
	layout?: 'card' | 'row';
	/** The card head's label in a 'row' layout; empty repeats the title. */
	card_title?: string;
	dependency?: DependencyRule[];
};

export type Section = {
	id: string;
	/** The slug Codestar would have produced — the legacy `#tab=` alias (7.7). */
	slug: string;
	title: string;
	icon: string;
	layout: 'rows' | 'cards' | string;
	fields: Field[];
	/** The section's field_group cards, in order (absent from pre-1.1 payloads). */
	groups?: FieldGroup[];
};

export type ScreenArgs = {
	title: string;
	menuTitle: string;
	menuSlug: string;
	saveDefaults: boolean;
	showResetAll: boolean;
	showResetSection: boolean;
	showSearch: boolean;
	/** Pin the tab strip under the admin bar while the panel scrolls. */
	stickyTabs?: boolean;
	/**
	 * Where the section tabs sit: the design's strip on top, or a left
	 * sidebar. PHP: `'tabs_position' => 'top' | 'left'`, default 'top'.
	 */
	tabsPosition?: 'top' | 'left';
	/**
	 * Show a switch that lets each admin flip `tabsPosition` for themselves,
	 * remembered per browser. PHP: `'tabs_switcher' => true`, default false.
	 */
	tabsSwitcher?: boolean;
	/** Let the user drag the column's width (and the editor's sidebar). Experimental. */
	resizable?: boolean;
	/**
	 * The column's width until the user drags it: the design's 1185px, or the
	 * whole content well. PHP: `'page_width' => 'design' | 'full'`, default 'design'.
	 */
	pageWidth?: 'design' | 'full';
	/** Where a column narrower than the well sits. PHP: `'page_align' => 'center' | 'start'`, default 'center'. */
	pageAlign?: 'center' | 'start';
	showFormWarning: boolean;
	showRestore: boolean;
	dataType: string;
	/** Codestar's `database`. Only '' (wp_options) is implemented. */
	database?: string;
	context: string;
	brand: { primary?: string; save?: string; obPrimary?: string; logo?: string };
};

export type Schema = {
	schema: number;
	unique: string;
	kind: 'options' | 'metabox';
	args: ScreenArgs;
	sections: Section[];
};

/** What PHP hands each screen through window.bfieldsBoot. */
export type BootPayload = {
	schema: Schema;
	values: Values;
	aliases: Record<string, string>;
	undeclared: string[];
};

/** Runtime settings shared by every screen on the page. */
export type RuntimeSettings = {
	schema: number;
	version: string;
	rest: string;
	nonce: string;
	assets: string;
	locale: string;
	rtl: boolean;
};
