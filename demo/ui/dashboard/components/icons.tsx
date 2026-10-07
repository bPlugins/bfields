import type React from 'react';

/*
 * Dashboard icons (Welcome · Demos · Pricing · Feature Comparison).
 *
 * Ported verbatim from the 3d-viewer-new-ui prototype — do not hand-edit paths:
 *   - Lucide glyphs are copied from lucide-static v1.47.0 (ISC).
 *   - The rest are not Lucide (HugeIcons-style quick-access glyphs, the
 *     changelog glyphs, the Pro crown); their paths come straight from the
 *     vector networks in the .fig, rescaled to the same 24-unit box.
 *
 * `weight` is the stroke weight in *pixels*, as Figma reports it — the design
 * draws the same glyph at many sizes with a hand-picked weight each time, so
 * the viewBox stroke is derived from it rather than fixed at Lucide's 2.
 */

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'weight'> {
    size?: number;
    weight?: number;
}

export type IconComponent = React.FC<IconProps>;

const Icon: React.FC<IconProps> = ({ size = 16, weight = 1.5, children, ...rest }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={(weight * 24) / size}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...rest}
    >
        {children}
    </svg>
);
/* ---- Lucide ---- */
export const Box: IconComponent = (p) => (<Icon {...p}><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></Icon>)
export const CircleX: IconComponent = (p) => (<Icon {...p}><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></Icon>)
export const Check: IconComponent = (p) => (<Icon {...p}><path d="M20 6 9 17l-5-5" /></Icon>)
export const List: IconComponent = (p) => (<Icon {...p}><path d="M3 5h.01" /><path d="M3 12h.01" /><path d="M3 19h.01" /><path d="M8 5h13" /><path d="M8 12h13" /><path d="M8 19h13" /></Icon>)
export const Search: IconComponent = (p) => (<Icon {...p}><path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" /></Icon>)
export const Cuboid: IconComponent = (p) => (<Icon {...p}><path d="M10 22v-8" /><path d="M2.336 8.89 10 14l11.715-7.029" /><path d="M22 14a2 2 0 0 1-.971 1.715l-10 6a2 2 0 0 1-2.138-.05l-6-4A2 2 0 0 1 2 16v-6a2 2 0 0 1 .971-1.715l10-6a2 2 0 0 1 2.138.05l6 4A2 2 0 0 1 22 8z" /></Icon>)
export const RefreshCw: IconComponent = (p) => (<Icon {...p}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></Icon>)
export const ZoomIn: IconComponent = (p) => (<Icon {...p}><circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" /><line x1="11" x2="11" y1="8" y2="14" /><line x1="8" x2="14" y1="11" y2="11" /></Icon>)
export const ZoomOut: IconComponent = (p) => (<Icon {...p}><circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" /><line x1="8" x2="14" y1="11" y2="11" /></Icon>)
export const ChevronDown: IconComponent = (p) => (<Icon {...p}><path d="m6 9 6 6 6-6" /></Icon>)
export const ChevronUp: IconComponent = (p) => (<Icon {...p}><path d="m18 15-6-6-6 6" /></Icon>)
export const ChevronRight: IconComponent = (p) => (<Icon {...p}><path d="m9 18 6-6-6-6" /></Icon>)
export const EllipsisVertical: IconComponent = (p) => (<Icon {...p}><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></Icon>)
export const ArrowRight: IconComponent = (p) => (<Icon {...p}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></Icon>)
export const CircleHelp: IconComponent = (p) => (<Icon {...p}><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></Icon>)
export const ExternalLink: IconComponent = (p) => (<Icon {...p}><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></Icon>)
export const Mail: IconComponent = (p) => (<Icon {...p}><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" /><rect x="2" y="4" width="20" height="16" rx="2" /></Icon>)
export const Power: IconComponent = (p) => (<Icon {...p}><path d="M12 2v10" /><path d="M18.4 6.6a9 9 0 1 1-12.77.04" /></Icon>)
export const Puzzle: IconComponent = (p) => (<Icon {...p}><path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z" /></Icon>)
export const Maximize: IconComponent = (p) => (<Icon {...p}><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></Icon>)
export const ShoppingCart: IconComponent = (p) => (<Icon {...p}><path d="m2.05 2.05 1.099-.028a1 1 0 0 1 1.008.815l2.69 14.347A1 1 0 0 0 7.83 18H18" /><path d="M4.563 5h16.435a1 1 0 0 1 .981 1.204l-1.026 6.226A2 2 0 0 1 18.962 14H6.25" /><circle cx="18" cy="20" r="2" /><circle cx="8" cy="20" r="2" /></Icon>)
export const Compass: IconComponent = (p) => (<Icon {...p}><circle cx="12" cy="12" r="10" /><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" /></Icon>)
export const Lightbulb: IconComponent = (p) => (<Icon {...p}><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></Icon>)
export const Star: IconComponent = (p) => (<Icon {...p}><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" /></Icon>)
export const ShieldCheck: IconComponent = (p) => (<Icon {...p}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></Icon>)
export const Headset: IconComponent = (p) => (<Icon {...p}><path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z" /><path d="M21 16v2a4 4 0 0 1-4 4h-5" /></Icon>)
export const Lock: IconComponent = (p) => (<Icon {...p}><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></Icon>)
export const Plus: IconComponent = (p) => (<Icon {...p}><path d="M5 12h14" /><path d="M12 5v14" /></Icon>)
export const Eye: IconComponent = (p) => (<Icon {...p}><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></Icon>)
export const Rocket: IconComponent = (p) => (<Icon {...p}><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09" /><path d="M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05" /></Icon>)
export const Book: IconComponent = (p) => (<Icon {...p}><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" /></Icon>)
export const MessageCircle: IconComponent = (p) => (<Icon {...p}><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" /></Icon>)
export const Users: IconComponent = (p) => (<Icon {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><path d="M16 3.128a4 4 0 0 1 0 7.744" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="9" cy="7" r="4" /></Icon>)
export const Heart: IconComponent = (p) => (<Icon {...p}><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" /></Icon>)
export const Zap: IconComponent = (p) => (<Icon {...p}><path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z" /></Icon>)
export const CircleCheck: IconComponent = (p) => (<Icon {...p}><circle cx="12" cy="12" r="10" /><path d="m16 9-5.5 5.5L8 12" /></Icon>)

/* ---- From the .fig ---- */
// cursor-remove-selection-02
export const CursorSelect: IconComponent = (p) => (<Icon {...p}><path d="M8.55 4.97L13.93 7.07C17.01 8.28 18.56 8.88 18.51 9.84C18.46 10.8 16.84 11.24 13.61 12.13C12.65 12.38 12.18 12.52 11.84 12.84C11.51 13.18 11.37 13.66 11.12 14.63C10.23 17.85 9.79 19.47 8.83 19.52C7.87 19.56 7.27 18.02 6.06 14.93L3.96 9.56C2.7 6.33 2.05 4.7 2.88 3.89C3.69 3.06 5.32 3.71 8.55 4.97" fill="currentColor" strokeLinecap="butt" /><path d="M20.51 18.02L13.51 18.02" /></Icon>)
// code
export const CodeBrackets: IconComponent = (p) => (<Icon {...p}><path d="M16.23 6.53L19.3 9.16C20.6 10.27 21.24 10.83 21.24 11.52C21.24 12.21 20.6 12.77 19.3 13.88L16.23 16.51" /><path d="M8.24 6.53L5.16 9.16C3.88 10.27 3.23 10.83 3.23 11.52C3.23 12.21 3.88 12.77 5.16 13.88L8.24 16.51" /></Icon>)
// settings-02
export const Settings02: IconComponent = (p) => (<Icon {...p}><path d="M15.49 11.73C15.49 13.66 13.94 15.23 11.99 15.23C10.06 15.23 8.49 13.66 8.49 11.73C8.49 9.79 10.06 8.23 11.99 8.23C13.94 8.23 15.49 9.79 15.49 11.73" strokeLinecap="butt" strokeLinejoin="miter" /><path d="M21.01 13.82C21.53 13.68 21.79 13.61 21.9 13.48C21.99 13.34 21.99 13.12 21.99 12.69L21.99 10.75C21.99 10.32 21.99 10.11 21.9 9.98C21.79 9.83 21.53 9.77 21.01 9.62C19.05 9.1 17.84 7.06 18.34 5.13C18.48 4.59 18.56 4.33 18.48 4.17C18.42 4.01 18.23 3.9 17.85 3.68L16.13 2.71C15.75 2.49 15.57 2.39 15.4 2.42C15.23 2.43 15.04 2.62 14.67 3C13.21 4.46 10.79 4.46 9.33 3C8.96 2.62 8.77 2.43 8.6 2.42C8.43 2.39 8.25 2.49 7.87 2.71L6.15 3.68C5.77 3.9 5.58 4.01 5.52 4.17C5.46 4.33 5.52 4.59 5.66 5.13C6.16 7.06 4.93 9.1 2.99 9.62C2.47 9.77 2.21 9.83 2.1 9.98C2.01 10.11 2.01 10.32 2.01 10.75L2.01 12.69C2.01 13.12 2.01 13.34 2.1 13.48C2.21 13.61 2.47 13.68 2.99 13.82C4.93 14.34 6.16 16.38 5.65 18.33C5.52 18.86 5.44 19.11 5.52 19.27C5.58 19.43 5.77 19.54 6.15 19.76L7.87 20.73C8.25 20.95 8.43 21.05 8.6 21.03C8.76 21.01 8.96 20.82 9.33 20.44C10.79 18.98 13.21 18.98 14.67 20.44C15.04 20.82 15.24 21.01 15.4 21.03C15.57 21.05 15.75 20.95 16.13 20.73L17.85 19.76C18.23 19.54 18.42 19.43 18.48 19.27C18.56 19.11 18.48 18.85 18.35 18.33C17.84 16.38 19.07 14.34 21.01 13.82" strokeLinejoin="miter" /></Icon>)
// file-01
export const File01: IconComponent = (p) => (<Icon {...p}><path d="M7.51 6.72L15.51 6.72" /><path d="M7.51 10.72L11.51 10.72" /><path d="M12.5 21.22L12.5 20.72C12.5 17.89 12.5 16.48 13.39 15.6C14.27 14.72 15.68 14.72 18.51 14.72L19.01 14.72M19.52 13.06L19.52 9.72C19.52 5.95 19.52 4.07 18.34 2.89C17.17 1.73 15.29 1.73 11.51 1.73C7.74 1.73 5.86 1.73 4.68 2.89C3.51 4.07 3.51 5.95 3.51 9.72L3.51 14.27C3.51 17.51 3.51 19.14 4.4 20.23C4.58 20.45 4.78 20.66 4.99 20.84C6.1 21.73 7.72 21.73 10.96 21.73C11.67 21.73 12.03 21.73 12.35 21.61C12.42 21.58 12.48 21.56 12.54 21.52C12.86 21.38 13.1 21.13 13.6 20.63L18.34 15.89C18.92 15.31 19.2 15.03 19.36 14.66C19.52 14.29 19.52 13.88 19.52 13.06" /></Icon>)
// plug-01
export const Plug01: IconComponent = (p) => (<Icon {...p}><path d="M15.74 1.73L15.74 5.72M8.74 5.72L8.74 1.73" /><path d="M6.25 7.34C6.17 6.46 6.88 5.72 7.77 5.72L16.71 5.72C17.6 5.72 18.3 6.46 18.23 7.34L18.05 9.71C17.91 11.42 17.34 13.08 16.37 14.5L15.77 15.38C15.2 16.22 14.24 16.72 13.22 16.72L11.25 16.72C10.23 16.72 9.27 16.22 8.7 15.38L8.11 14.5C7.13 13.08 6.56 11.42 6.43 9.71L6.25 7.34" strokeLinecap="butt" strokeLinejoin="miter" /><path d="M12.24 16.72L12.24 21.73" /><path d="M11.24 8.73L13.23 8.73" /></Icon>)
// rotate-3d
export const Rotate3d: IconComponent = (p) => (<Icon {...p}><path d="M11.99 16.51C6.46 16.51 1.99 14.28 1.99 11.52C1.99 10.12 3.15 8.86 4.99 7.95M19.36 14.9C20.99 14.01 21.99 12.82 21.99 11.52C21.99 8.76 17.51 6.53 11.99 6.53C11.4 6.53 10.83 6.55 10.27 6.6" /><path d="M7.05 12.52C7.01 12.05 6.99 11.57 6.99 11.08C6.99 5.8 9.34 1.52 12.24 1.52C13.71 1.52 15.04 2.62 15.99 4.4" /><path d="M16.88 9.51C16.95 10.21 16.99 10.91 16.99 11.64C16.99 17.1 14.75 21.52 11.99 21.52" /><path d="M9.99 13.53L10.85 14.18C12.29 15.26 12.99 15.8 12.99 16.51C12.99 17.24 12.29 17.78 10.85 18.86L9.99 19.52" /></Icon>)
// star
export const StarRound: IconComponent = (p) => (<Icon {...p}><path d="M11.52 0.95C11.57 0.87 11.63 0.79 11.72 0.73C11.8 0.69 11.9 0.66 12.01 0.66C12.1 0.66 12.2 0.69 12.28 0.73C12.37 0.79 12.43 0.87 12.48 0.95L14.78 5.64C14.94 5.94 15.16 6.21 15.44 6.4C15.72 6.61 16.04 6.74 16.38 6.79L21.55 7.54C21.64 7.57 21.74 7.6 21.81 7.67C21.89 7.73 21.94 7.82 21.98 7.91C22 8.01 22.01 8.1 21.99 8.2C21.96 8.29 21.91 8.38 21.84 8.45L18.1 12.08C17.86 12.33 17.68 12.63 17.56 12.95C17.46 13.28 17.44 13.63 17.49 13.97L18.38 19.11C18.4 19.2 18.39 19.3 18.34 19.4C18.31 19.49 18.24 19.57 18.16 19.63C18.08 19.69 17.99 19.72 17.89 19.73C17.79 19.73 17.69 19.72 17.61 19.66L12.99 17.23C12.68 17.08 12.34 17 11.99 17C11.66 17 11.32 17.08 11.01 17.23L6.39 19.66C6.31 19.72 6.21 19.73 6.11 19.73C6.01 19.72 5.92 19.69 5.84 19.63C5.76 19.57 5.69 19.49 5.66 19.4C5.62 19.3 5.61 19.2 5.62 19.11L6.51 13.97C6.56 13.63 6.54 13.28 6.44 12.95C6.32 12.63 6.14 12.33 5.9 12.08L2.16 8.45C2.09 8.38 2.03 8.3 2.01 8.2C1.99 8.11 2 8.01 2.02 7.91C2.06 7.82 2.11 7.73 2.19 7.67C2.26 7.6 2.36 7.56 2.45 7.54L7.62 6.79C7.96 6.74 8.28 6.61 8.56 6.4C8.84 6.21 9.07 5.94 9.22 5.64L11.52 0.95" strokeLinejoin="miter" /></Icon>)
// settings
export const SettingsRound: IconComponent = (p) => (<Icon {...p}><path d="M9.67 2.76C9.73 2.19 9.99 1.64 10.42 1.25C10.86 0.86 11.42 0.65 11.99 0.65C12.58 0.65 13.14 0.86 13.58 1.25C14.01 1.64 14.27 2.19 14.33 2.76C14.37 3.13 14.48 3.49 14.69 3.82C14.89 4.13 15.16 4.4 15.49 4.58C15.81 4.78 16.18 4.88 16.56 4.89C16.93 4.92 17.3 4.83 17.65 4.67C18.18 4.44 18.77 4.41 19.33 4.58C19.88 4.75 20.36 5.14 20.65 5.63C20.93 6.14 21.03 6.73 20.9 7.3C20.78 7.87 20.45 8.37 19.97 8.71C19.67 8.93 19.42 9.22 19.25 9.54C19.07 9.88 18.98 10.25 18.98 10.63C18.98 11 19.07 11.37 19.25 11.71C19.42 12.04 19.67 12.33 19.97 12.54C20.45 12.88 20.78 13.38 20.9 13.95C21.03 14.52 20.93 15.12 20.65 15.61C20.36 16.12 19.88 16.49 19.33 16.67C18.77 16.85 18.18 16.82 17.65 16.57C17.3 16.41 16.93 16.34 16.56 16.35C16.18 16.38 15.81 16.48 15.49 16.67C15.16 16.85 14.89 17.12 14.69 17.44C14.48 17.75 14.37 18.11 14.33 18.49C14.27 19.07 14.01 19.6 13.58 20C13.14 20.39 12.58 20.61 11.99 20.61C11.42 20.61 10.86 20.39 10.42 20C9.99 19.6 9.73 19.07 9.67 18.49C9.63 18.11 9.52 17.75 9.31 17.44C9.11 17.12 8.84 16.85 8.51 16.67C8.18 16.48 7.82 16.38 7.44 16.35C7.07 16.34 6.69 16.41 6.35 16.57C5.82 16.82 5.22 16.85 4.67 16.67C4.12 16.49 3.64 16.12 3.35 15.61C3.07 15.12 2.97 14.52 3.1 13.95C3.22 13.38 3.55 12.88 4.03 12.54C4.33 12.33 4.58 12.04 4.75 11.71C4.93 11.37 5.02 11 5.02 10.63C5.02 10.25 4.93 9.88 4.75 9.54C4.58 9.22 4.33 8.93 4.03 8.71C3.55 8.37 3.22 7.87 3.1 7.3C2.97 6.73 3.07 6.14 3.35 5.64C3.64 5.14 4.12 4.77 4.67 4.58C5.22 4.41 5.82 4.44 6.35 4.67C6.69 4.83 7.07 4.92 7.44 4.89C7.82 4.88 8.18 4.78 8.5 4.58C8.84 4.4 9.1 4.13 9.31 3.82C9.51 3.49 9.63 3.13 9.67 2.76M15 10.63C15 12.28 13.66 13.63 11.99 13.63C10.34 13.63 9 12.28 9 10.63C9 8.98 10.34 7.62 11.99 7.62C13.66 7.62 15 8.98 15 10.63" strokeLinejoin="miter" /></Icon>)
// grid
export const Grid: IconComponent = (p) => (<Icon {...p}><path d="M3 7.62L21 7.62M3 13.63L21 13.63M9 1.63L9 19.63M15 1.63L15 19.63M5 1.63L19 1.63C20.1 1.63 21 2.52 21 3.62L21 17.63C21 18.73 20.1 19.63 19 19.63L5 19.63C3.9 19.63 3 18.73 3 17.63L3 3.62C3 2.52 3.9 1.63 5 1.63" strokeLinejoin="miter" /></Icon>)
// crown 2 — swapped into the Upgrade button
export const CrownLine: IconComponent = (p) => (<Icon {...p}><path d="M8.4 10.96L2 8.1L4.54 20M8.4 10.96L12.01 4M4.54 20C6.98 19.25 9.5 18.88 12.01 18.88M15.6 10.96L22 8.1L19.46 20C17.02 19.25 14.5 18.88 11.99 18.88M15.6 10.96L12.01 4" /></Icon>)

// Filled rounded square with the check knocked out — the hero feature bullets.
export const SquareCheckFilled: React.FC<{ size?: number }> = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M5.99 0C4.4 0 2.89 0.63 1.76 1.76C0.63 2.89 0 4.4 0 5.99L0 17.99C0 19.6 0.63 21.11 1.76 22.24C2.89 23.36 4.4 24 5.99 24L17.99 24C19.6 24 21.11 23.36 22.24 22.24C23.36 21.11 24 19.6 24 17.99L24 5.99C24 4.4 23.36 2.89 22.24 1.76C21.11 0.63 19.6 0 17.99 0L5.99 0M16.48 10.43C16.58 10.31 16.67 10.16 16.72 10.02C16.78 9.87 16.8 9.71 16.8 9.57C16.8 9.4 16.75 9.24 16.7 9.1C16.62 8.97 16.53 8.84 16.42 8.72C16.3 8.62 16.17 8.53 16.02 8.47C15.88 8.41 15.72 8.4 15.56 8.4C15.4 8.4 15.25 8.44 15.11 8.5C14.96 8.57 14.83 8.66 14.73 8.78L11.02 12.73L9.2 11.1C8.95 10.91 8.65 10.8 8.34 10.83C8.03 10.85 7.74 10.99 7.54 11.23C7.32 11.46 7.22 11.77 7.23 12.07C7.25 12.39 7.38 12.69 7.6 12.89L10.31 15.3C10.54 15.5 10.85 15.62 11.15 15.6C11.46 15.59 11.77 15.44 11.97 15.22L16.48 10.43" />
    </svg>
);

// Go Pro crown — 19.46 × 15.57 in the design, stroked with a top-to-bottom
// blue → pink gradient, so it keeps its own box instead of the 24-unit one.
export const Crown: React.FC<{ weight?: number }> = ({ weight = 2.19 }) => (
    <svg width={19.46} height={15.57} viewBox="0 0 19.46 15.57" fill="none" overflow="visible" aria-hidden="true">
        <defs>
            <linearGradient id="bp3d-crown-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#1E60F2" />
                <stop offset="1" stopColor="#FDD2F0" />
            </linearGradient>
        </defs>
        <path d="M6.23 6.77L0 3.99L2.47 15.57M6.23 6.77L9.74 0M2.47 15.57C4.85 14.84 7.29 14.48 9.74 14.48M13.23 6.77L19.46 3.99L16.99 15.57C14.61 14.84 12.16 14.48 9.72 14.48M13.23 6.77L9.74 0" stroke="url(#bp3d-crown-grad)" strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
