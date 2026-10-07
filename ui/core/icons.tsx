/**
 * bfields — the icon vocabulary.
 *
 * Ported from bPlugins/3d-viewer-new-ui (src/admin/icons.jsx and
 * src/components/icons.jsx). Inline SVG, Lucide-style geometry, no icon
 * package — nothing extra has to be bundled, which is the reason the design
 * repo drew them this way in the first place.
 *
 * A schema's `icon` key names one of these. Unknown names fall back to `box`,
 * so a host can ship an icon name this build does not have yet without
 * breaking a row's layout. Codestar's `'fa fa-cog'` strings are mapped by
 * ALIASES below.
 */

import type { JSX } from 'react';

type IconProps = { size?: number; stroke?: number; className?: string };

const S = ({
	size = 20,
	stroke = 2,
	className,
	children,
}: IconProps & { children: JSX.Element | JSX.Element[] }) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth={stroke}
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		focusable="false"
		className={className}
	>
		{children}
	</svg>
);

export const Box = (p: IconProps) => (
	<S {...p}>
		<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
		<path d="m3.3 7 8.7 5 8.7-5" />
		<path d="M12 22V12" />
	</S>
);

export const Gear = (p: IconProps) => (
	<S {...p}>
		<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
		<circle cx="12" cy="12" r="3" />
	</S>
);

export const Pencil = (p: IconProps) => (
	<S {...p}>
		<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
	</S>
);

export const Eye = (p: IconProps) => (
	<S {...p}>
		<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
		<circle cx="12" cy="12" r="3" />
	</S>
);

export const Search = (p: IconProps) => (
	<S {...p}>
		<circle cx="11" cy="11" r="8" />
		<path d="m21 21-4.3-4.3" />
	</S>
);

export const Save = (p: IconProps) => (
	<S {...p}>
		<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
		<path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
		<path d="M7 3v4a1 1 0 0 0 1 1h7" />
	</S>
);

export const RotateCcw = (p: IconProps) => (
	<S {...p}>
		<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
		<path d="M3 3v5h5" />
	</S>
);

export const Trash = (p: IconProps) => (
	<S {...p}>
		<path d="M3 6h18" />
		<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
		<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
	</S>
);

export const Info = (p: IconProps) => (
	<S {...p}>
		<circle cx="12" cy="12" r="10" />
		<path d="M12 16v-4" />
		<path d="M12 8h.01" />
	</S>
);

export const AlertTriangle = (p: IconProps) => (
	<S {...p}>
		<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
		<path d="M12 9v4" />
		<path d="M12 17h.01" />
	</S>
);

export const Copy = (p: IconProps) => (
	<S {...p}>
		<rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
		<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
	</S>
);

export const Check = ({ size = 12, ...p }: IconProps) => (
	<S size={size} stroke={3} {...p}>
		<path d="M20 6 9 17l-5-5" />
	</S>
);

export const Move = (p: IconProps) => (
	<S {...p}>
		<path d="M12 2v20M2 12h20" />
		<path d="m15 5-3-3-3 3m0 14 3 3 3-3M5 9l-3 3 3 3m14 0 3-3-3-3" />
	</S>
);

export const ZoomIn = (p: IconProps) => (
	<S {...p}>
		<circle cx="11" cy="11" r="8" />
		<path d="m21 21-4.3-4.3M11 8v6M8 11h6" />
	</S>
);

export const ZoomOut = (p: IconProps) => (
	<S {...p}>
		<circle cx="11" cy="11" r="8" />
		<path d="m21 21-4.3-4.3M8 11h6" />
	</S>
);

export const Maximize = (p: IconProps) => (
	<S {...p}>
		<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
	</S>
);

export const Loader = (p: IconProps) => (
	<S {...p}>
		<path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" />
	</S>
);

export const Palette = (p: IconProps) => (
	<S {...p}>
		<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" />
		<circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
		<circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
		<circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
		<circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
	</S>
);

export const Image = (p: IconProps) => (
	<S {...p}>
		<rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
		<circle cx="9" cy="9" r="2" />
		<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
	</S>
);

export const Code = (p: IconProps) => (
	<S {...p}>
		<path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
	</S>
);

export const Cart = (p: IconProps) => (
	<S {...p}>
		<circle cx="8" cy="21" r="1" />
		<circle cx="19" cy="21" r="1" />
		<path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
	</S>
);

export const Chart = (p: IconProps) => (
	<S {...p}>
		<path d="M3 3v16a2 2 0 0 0 2 2h16" />
		<path d="M18 17V9M13 17V5M8 17v-3" />
	</S>
);

export const Layers = (p: IconProps) => (
	<S {...p}>
		<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
		<path d="m6.08 10.37-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59" />
		<path d="m6.08 15.37-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59" />
	</S>
);

export const Sliders = (p: IconProps) => (
	<S {...p}>
		<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
	</S>
);

export const Link = (p: IconProps) => (
	<S {...p}>
		<path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 1 1 0 10h-2M8 12h8" />
	</S>
);

/**
 * `zap` — the Lite viewer's mark in the Add New mode grid.
 *
 * Ported from the design repo's ZapIcon (src/components/icons.jsx) rather than
 * approximated with `loader`: the mode grid is one of the few places the design
 * names a specific glyph, and the whole point of this file is that the geometry
 * lives in one place.
 */
export const Zap = (p: IconProps) => (
	<S {...p}>
		<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
	</S>
);

export const Puzzle = (p: IconProps) => (
	<S {...p}>
		<path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z" />
	</S>
);

/*
 * The Add New editor's furniture: the Decoder card, the upload buttons, the
 * Publish box, the Live Preview card and the Preview tab's stage. Lifted from
 * the design repo's src/admin/icons.jsx and src/components/icons.jsx with the
 * geometry unchanged.
 */

/**
 * `chain` — the dimensions field's link button. Lucide's diagonal `link`,
 * which is what the Add New frames draw; the design repo used the horizontal
 * `link-2` (`Link` above) there instead.
 */
export const Chain = (p: IconProps) => (
	<S {...p}>
		<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
		<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
	</S>
);

/**
 * `diamond` — the material tool on the Preview tab's stage rail. The design
 * repo exports it as `Palette`; it is a plain diamond in both the repo and the
 * frame, so it is named for what it draws.
 */
export const Diamond = (p: IconProps) => (
	<S {...p}>
		<path d="M12 3 21 12l-9 9-9-9z" />
	</S>
);

export const Terminal = (p: IconProps) => (
	<S {...p}>
		<path d="m4 17 6-6-6-6" />
		<path d="M12 19h8" />
	</S>
);

export const UploadCloud = (p: IconProps) => (
	<S {...p}>
		<path d="M12 13v8" />
		<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
		<path d="m8 17 4-4 4 4" />
	</S>
);

export const Send = (p: IconProps) => (
	<S {...p}>
		<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
		<path d="m21.854 2.147-10.94 10.939" />
	</S>
);

export const ExternalLink = (p: IconProps) => (
	<S {...p}>
		<path d="M15 3h6v6" />
		<path d="M10 14 21 3" />
		<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
	</S>
);

export const RefreshCw = (p: IconProps) => (
	<S {...p}>
		<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
		<path d="M21 3v5h-5" />
		<path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
		<path d="M8 16H3v5" />
	</S>
);

export const Maximize2 = (p: IconProps) => (
	<S {...p}>
		<polyline points="15 3 21 3 21 9" />
		<polyline points="9 21 3 21 3 15" />
		<line x1="21" y1="3" x2="14" y2="10" />
		<line x1="3" y1="21" x2="10" y2="14" />
	</S>
);

export const Monitor = (p: IconProps) => (
	<S {...p}>
		<rect width="20" height="14" x="2" y="3" rx="2" />
		<path d="M8 21h8" />
		<path d="M12 17v4" />
	</S>
);

export const Tablet = (p: IconProps) => (
	<S {...p}>
		<rect width="16" height="20" x="4" y="2" rx="2" />
		<path d="M12 18h.01" />
	</S>
);

export const Phone = (p: IconProps) => (
	<S {...p}>
		<rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
		<path d="M12 18h.01" />
	</S>
);

export const Grid = (p: IconProps) => (
	<S {...p}>
		<rect width="7" height="7" x="3" y="3" rx="1" />
		<rect width="7" height="7" x="14" y="3" rx="1" />
		<rect width="7" height="7" x="14" y="14" rx="1" />
		<rect width="7" height="7" x="3" y="14" rx="1" />
	</S>
);

export const PanelTop = (p: IconProps) => (
	<S {...p}>
		<rect width="18" height="18" x="3" y="3" rx="2" />
		<path d="M3 9h18" />
	</S>
);

export const PanelLeft = (p: IconProps) => (
	<S {...p}>
		<rect width="18" height="18" x="3" y="3" rx="2" />
		<path d="M9 3v18" />
	</S>
);

export const Sun = (p: IconProps) => (
	<S {...p}>
		<circle cx="12" cy="12" r="4" />
		<path d="M12 2v2M12 20v2m-7.07-17.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
	</S>
);

export const CloudDrizzle = (p: IconProps) => (
	<S {...p}>
		<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
		<path d="M8 19v1M8 14v1M16 19v1M16 14v1M12 21v1M12 16v1" />
	</S>
);

export const Download = (p: IconProps) => (
	<S {...p}>
		<path d="M12 15V3" />
		<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
		<path d="m7 10 5 5 5-5" />
	</S>
);

export const Camera = (p: IconProps) => (
	<S {...p}>
		<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
		<circle cx="12" cy="13" r="3" />
	</S>
);

export const Grip = (p: IconProps) => (
	<S {...p}>
		<circle cx="9" cy="5" r="1" />
		<circle cx="9" cy="12" r="1" />
		<circle cx="9" cy="19" r="1" />
		<circle cx="15" cy="5" r="1" />
		<circle cx="15" cy="12" r="1" />
		<circle cx="15" cy="19" r="1" />
	</S>
);

export const ChevronDown = (p: IconProps) => (
	<S {...p}>
		<path d="m6 9 6 6 6-6" />
	</S>
);

export const ArrowUp = (p: IconProps) => (
	<S {...p}>
		<path d="m5 12 7-7 7 7" />
		<path d="M12 19V5" />
	</S>
);

export const ArrowDown = (p: IconProps) => (
	<S {...p}>
		<path d="M12 5v14" />
		<path d="m19 12-7 7-7-7" />
	</S>
);

export const Plus = (p: IconProps) => (
	<S {...p}>
		<path d="M5 12h14" />
		<path d="M12 5v14" />
	</S>
);

export const Minus = (p: IconProps) => (
	<S {...p}>
		<path d="M5 12h14" />
	</S>
);

export const ArrowLeft = (p: IconProps) => (
	<S {...p}>
		<path d="m12 19-7-7 7-7" />
		<path d="M19 12H5" />
	</S>
);

export const ArrowRight = (p: IconProps) => (
	<S {...p}>
		<path d="M5 12h14" />
		<path d="m12 5 7 7-7 7" />
	</S>
);

export const X = (p: IconProps) => (
	<S {...p}>
		<path d="M18 6 6 18" />
		<path d="m6 6 12 12" />
	</S>
);

export type IconComponent = (props: IconProps) => JSX.Element;

const ICONS: Record<string, IconComponent> = {
	chain: Chain,
	diamond: Diamond,
	terminal: Terminal,
	upload: UploadCloud,
	send: Send,
	'external-link': ExternalLink,
	refresh: RefreshCw,
	'maximize-2': Maximize2,
	monitor: Monitor,
	tablet: Tablet,
	phone: Phone,
	mobile: Phone,
	grid: Grid,
	sun: Sun,
	'cloud-drizzle': CloudDrizzle,
	download: Download,
	camera: Camera,
	box: Box,
	gear: Gear,
	pencil: Pencil,
	eye: Eye,
	search: Search,
	save: Save,
	reset: RotateCcw,
	trash: Trash,
	info: Info,
	warning: AlertTriangle,
	copy: Copy,
	check: Check,
	move: Move,
	'zoom-in': ZoomIn,
	'zoom-out': ZoomOut,
	maximize: Maximize,
	loader: Loader,
	palette: Palette,
	image: Image,
	code: Code,
	cart: Cart,
	chart: Chart,
	layers: Layers,
	sliders: Sliders,
	link: Link,
	zap: Zap,
	puzzle: Puzzle,
	grip: Grip,
	'chevron-down': ChevronDown,
	'arrow-up': ArrowUp,
	'arrow-down': ArrowDown,
	plus: Plus,
	minus: Minus,
	'arrow-left': ArrowLeft,
	'arrow-right': ArrowRight,
	x: X,
};

/**
 * Codestar icon strings mapped onto the vocabulary above.
 *
 * Field files carry Font Awesome class names (`'fa fa-cog'`) because that is
 * what Codestar renders. bfields ships no icon font, so those are translated
 * rather than ignored — otherwise every ported section would lose its icon.
 */
const ALIASES: Record<string, string> = {
	cog: 'gear',
	cogs: 'gear',
	wrench: 'gear',
	'shopping-cart': 'cart',
	shop: 'cart',
	woocommerce: 'cart',
	'bar-chart': 'chart',
	'chart-bar': 'chart',
	analytics: 'chart',
	'line-chart': 'chart',
	// Font Awesome 5's spelling — 3D Viewer's Analytics tab ('fas fa-chart-line').
	'chart-line': 'chart',
	cube: 'box',
	cubes: 'layers',
	image: 'image',
	photo: 'image',
	picture: 'image',
	paint: 'palette',
	// The design draws the Style tab with the pencil, and Codestar field files
	// name that tab 'fa fa-paint-brush' — so the brush maps to the design's glyph.
	'paint-brush': 'pencil',
	brush: 'pencil',
	style: 'palette',
	edit: 'pencil',
	pen: 'pencil',
	'code-fork': 'code',
	shortcode: 'code',
	eye: 'eye',
	preview: 'eye',
	selector: 'eye',
	// 3D Viewer's "Woocommerce Selectors" tab ('fa fa-crosshairs').
	crosshairs: 'eye',
	crosshair: 'eye',
	plug: 'puzzle',
	plugin: 'puzzle',
	module: 'puzzle',
	modules: 'puzzle',
	sliders: 'sliders',
	adjust: 'sliders',
	preset: 'layers',
	general: 'gear',
	bolt: 'zap',
	lightning: 'zap',
	flash: 'zap',
	close: 'x',
	times: 'x',
};

/**
 * Resolve a schema `icon` value to a component.
 *
 * Accepts a bfields name ('box'), a Codestar/Font Awesome string
 * ('fa fa-cog', 'fas fa-shopping-cart'), or a Dashicon
 * ('dashicons-admin-generic'). Always returns something.
 */
export function resolveIcon(name: string | undefined): IconComponent {
	if (!name) {
		return Box;
	}

	const cleaned = name
		.trim()
		.toLowerCase()
		.replace(/^(fa[srlbd]?|dashicons)[\s-]+/, '')
		.replace(/^fa-/, '')
		.replace(/^admin-/, '')
		.trim();

	return ICONS[cleaned] ?? ICONS[ALIASES[cleaned] ?? ''] ?? Box;
}
