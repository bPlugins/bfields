/**
 * bfields demo — regenerate the static preview's icon set.
 *
 * ui/core/icons.tsx is inline SVG on purpose (no icon package to bundle), which
 * also means the geometry lives in exactly one place. Rather than redrawing it
 * for the static preview, this lifts the paths straight out of the TSX and
 * writes them as plain HTML strings.
 *
 *   node demo/static/dump-icons.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, '../../ui/core/icons.tsx'), 'utf8');

/** `export const Name = (p: IconProps) => (<S {...p}>…</S>);` */
const ICON = /export const (\w+) = \(([^)]*)\) => \(\s*<S [^>]*>([\s\S]*?)<\/S>\s*\);/g;

const icons = {};

for (const [, name, params, body] of source.matchAll(ICON)) {
	const size = /size\s*=\s*(\d+)/.exec(params);

	// The children are already plain SVG elements with lowercase attributes;
	// only self-closing syntax and JSX whitespace need normalising.
	const svg = body
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.join('');

	icons[name] = { svg, size: size ? Number(size[1]) : 20 };
}

/** The name → component map and the Codestar alias table, as authored. */
const block = (label) => {
	const start = source.indexOf(`const ${label}`);
	const open = source.indexOf('{', start);
	const close = source.indexOf('\n};', open);

	return source.slice(open + 1, close);
};

const pairs = (label) => {
	const out = {};

	for (const line of block(label).split('\n')) {
		const match = /^\s*'?([\w-]+)'?:\s*'?([\w-]+)'?,\s*$/.exec(line);

		if (match) {
			out[match[1]] = match[2];
		}
	}

	return out;
};

const map = pairs('ICONS');
const aliases = pairs('ALIASES');

const missing = Object.values(map).filter((component) => !icons[component]);

if (missing.length) {
	throw new Error(`icons.tsx maps to components this script did not extract: ${missing.join(', ')}`);
}

const out = `/*
 * bfields demo — the static preview's icons. GENERATED, do not edit.
 *
 * Lifted from ui/core/icons.tsx by demo/static/dump-icons.mjs, so the preview
 * and the plugin draw the same geometry.
 *
 *   node demo/static/dump-icons.mjs
 */

window.BFIELDS_ICONS = ${JSON.stringify(icons, null, '\t')};

window.BFIELDS_ICON_MAP = ${JSON.stringify(map, null, '\t')};

window.BFIELDS_ICON_ALIASES = ${JSON.stringify(aliases, null, '\t')};
`;

writeFileSync(resolve(here, 'assets/icons.js'), out);

// eslint-disable-next-line no-console
console.log(
	`Wrote assets/icons.js — ${Object.keys(icons).length} icons, ${Object.keys(map).length} names, ${Object.keys(aliases).length} aliases.`
);
