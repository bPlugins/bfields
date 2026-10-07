/**
 * bfields — pixel diff of the demo viewer editor against the Figma exports.
 *
 * design-parity.mjs asserts computed styles, one component at a time. That
 * cannot see LAYOUT: a header that is a WordPress postbox instead of the
 * design's title bar, a sidebar that is a stock meta box, a system font where
 * Inter was measured — every component can pass while the screen is plainly
 * not the design. This compares pixels.
 *
 * Method — the one the design repo used for its own fidelity table:
 *
 *   1. Render the editor in real wp-admin at 1440×N, so the content well is the
 *      1280px the frames were drawn at, with admin notices hidden (the frames
 *      carry a mock notice; a real one only shifts everything down).
 *   2. For each region of each frame, find the vertical offset at which the
 *      render lines up with the export, within ±40px by default (the page
 *      starts a few pixels lower in wp-admin than in the frame), or within a
 *      region's own `search` window where the demo carries real-plugin
 *      fields above it that the Figma does not. Then compare.
 *   3. A pixel counts as different only if NO pixel within 1px of it in the
 *      other image is within 40/255 on every channel, checked both ways. That
 *      cancels font-rasteriser halos and sub-pixel rounding, so what remains
 *      is genuine layout or colour difference.
 *
 * Regions are drawn around what the demo renders WITH THE SAME CONTENT as the
 * frame. Where the frame shows content the demo does not have (the headphones
 * photo, a mock notice, a fifth tab it lacks), the region stops short of it.
 *
 *   WP_PATH=/path/to/wordpress node tests/e2e/figma-diff.mjs [--out=dir] [--max=0.5]
 *
 * CALIBRATION. `--design=<url>` runs the same regions against the design
 * repo's own build (e.g. http://localhost:8765/3d-viewer-new-ui/) instead of
 * wp-admin. Chrome and Figma do not rasterise Inter identically, so no render
 * scores 0%: the design repo's score on a region is the floor for that
 * region, and the number to hold this screen to is the gap above it.
 *
 * Each region carries that floor as `floor`: the design repo build's score on
 * it (measured 2026-09-23 against the exports in its assets/images/figma/).
 * A region FAILS when this screen scores worse than the design's own build
 * did. `--max=<pct>` replaces the floors with one absolute threshold.
 *
 * FIGMA_DIR overrides the export folder (default: the design repo checked out
 * beside this one).
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const arg = (name, fallback) => {
	const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
	return hit ? hit.slice(name.length + 3) : fallback;
};

const WP_PATH = process.env.WP_PATH;

if (!WP_PATH) {
	console.error('Set WP_PATH to a WordPress install with the bfields demo plugin active.');
	process.exit(2);
}

const FIGMA_DIR =
	process.env.FIGMA_DIR ?? join(homedir(), 'Development/3d-viewer-new-ui/assets/images/figma/add-new');

if (!existsSync(FIGMA_DIR)) {
	console.error(`Figma exports not found at ${FIGMA_DIR}. Set FIGMA_DIR.`);
	process.exit(2);
}

const DESIGN = arg('design', '');
const OUT = arg('out', mkdtempSync(join(tmpdir(), 'bfields-figma-')));
const MAX = arg('max', '') === '' ? null : Number(arg('max', ''));
mkdirSync(OUT, { recursive: true });

const PW_FROM = process.env.PLAYWRIGHT_FROM ?? join(WP_PATH, 'wp-content/plugins/3d-viewer-premium/');
const { chromium } = createRequire(PW_FROM)('playwright');

/**
 * Frame → tab → regions, in the frame's own pixel coordinates.
 *
 * `tab` is the tab's label, not its index: the demo has twelve tabs where the
 * frames draw four, so indices do not line up. The frames' Settings tab is
 * the demo's Options, which opens with the same ten rows; the eleventh,
 * Enable AR, moved to the AR tab and has no region.
 *
 * Twelve tabs wrap the strip onto a second row, 56px the frames do not have,
 * so every region below the strip searches a window that reaches past it.
 */
const BELOW_TABS = [-40, 110];

const FRAMES = [
	{
		file: 'Model (1).png',
		tab: 'Model',
		route: 'model',
		regions: [
			{ name: 'title + title field + shortcode bar', box: [48, 150, 1233, 347], ignore: [[880, 290, 1220, 340]], floor: 0.59 },
			// The first tab only: the second is Settings in the frame and
			// Lighting & Environment here. `floor` was measured on the pair;
			// re-measure it with --design.
			{ name: 'tab strip (first tab)', box: [68, 386, 204, 450], search: BELOW_TABS, floor: 3.3 },
			{ name: 'Viewer Mode card', box: [88, 469, 783, 650], search: BELOW_TABS, floor: 7.26 },
			{ name: 'sidebar: Live Preview frame (head)', box: [822, 469, 1192, 530], search: BELOW_TABS, floor: 3.7 },
			{ name: 'sidebar: Live Preview controls', box: [822, 733, 1192, 791], search: BELOW_TABS, floor: 0.84 },
			{ name: 'sidebar: heading + Publish + Save Draft', box: [822, 800, 1192, 938], search: BELOW_TABS, floor: 5.56 },
		],
	},
	{
		file: 'Model (2).png',
		tab: 'Options',
		route: 'settings',
		regions: [
			{ name: 'rows card: title + six toggles', box: [88, 469, 803, 996], search: BELOW_TABS, floor: 3.24 },
			{ name: 'rows card: Loading Type (radio)', box: [88, 996, 803, 1090], search: BELOW_TABS, floor: 2.55 },
			{ name: 'rows card: Progressbar', box: [88, 1110, 803, 1185], search: BELOW_TABS, floor: 2.45 },
		],
	},
	{
		file: 'Model (3).png',
		tab: 'Style',
		route: 'style',
		regions: [
			{ name: 'rows card: Width, Height, Align', box: [88, 469, 803, 826], search: BELOW_TABS, floor: 3.57 },
			{ name: 'rows card: Background Color (label)', box: [88, 826, 640, 918], search: BELOW_TABS, floor: 5.09 },
		],
	},
	{
		file: 'Model (4).png',
		tab: 'Preview',
		route: 'preview',
		regions: [
			{ name: 'sidebar: Publish + Save Draft', box: [822, 469, 1192, 566], search: BELOW_TABS, floor: 3.58 },
			{ name: 'stage card: head (no badge)', box: [88, 470, 797, 522], ignore: [[230, 480, 305, 512]], search: BELOW_TABS, floor: 3.82 },
		],
	},
];

function adminCookies() {
	const script = mkdtempSync(join(tmpdir(), 'bfields-')) + '/cookie.php';

	writeFileSync(
		script,
		`<?php
		$admins = get_users(['role' => 'administrator', 'number' => 1]);
		if (!$admins) { echo "{}"; return; }
		$u = $admins[0];
		$expiry = time() + 3600;
		$token = WP_Session_Tokens::get_instance($u->ID)->create($expiry);
		echo json_encode(['siteurl' => get_option('siteurl'), 'cookies' => [
			['name' => AUTH_COOKIE, 'value' => wp_generate_auth_cookie($u->ID, $expiry, 'auth', $token), 'path' => ADMIN_COOKIE_PATH],
			['name' => LOGGED_IN_COOKIE, 'value' => wp_generate_auth_cookie($u->ID, $expiry, 'logged_in', $token), 'path' => COOKIEPATH ?: '/'],
		]]);`
	);

	return JSON.parse(execFileSync('wp', ['eval-file', script], { cwd: WP_PATH, encoding: 'utf8' }).trim().split('\n').pop());
}

const browser = await chromium.launch();

/**
 * Open the screen and return a function that shows one frame's tab and
 * screenshots the 1280px content well.
 */
async function openScreen() {
	if (DESIGN) {
		const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
		const page = await context.newPage();

		return async (frame) => {
			await page.goto(`${DESIGN.replace(/\/?$/, '/')}?chrome=0#/add-new/${frame.route}`, { waitUntil: 'networkidle' });
			await page.evaluate(() => document.fonts.ready);
			return page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 1700 } });
		};
	}

	const auth = adminCookies();
	const context = await browser.newContext({ viewport: { width: 1440, height: 1800 } });
	await context.addCookies(auth.cookies.map((c) => ({ ...c, domain: new URL(auth.siteurl).hostname })));
	// The frames draw the top strip; the demo defaults to the sidebar, so pin the switcher's stored choice.
	await context.addInitScript(() => {
		try {
			window.localStorage.setItem('bfields-tabs:_bfields_demo_viewer_', 'top');
		} catch {}
	});

	const page = await context.newPage();
	await page.goto(`${auth.siteurl}/wp-admin/post-new.php?post_type=bfields-demo-viewer`, { waitUntil: 'networkidle' });
	await page.waitForSelector('.bfields-editor', { timeout: 15000 });
	// The frames draw no tab-layout switch either; `visibility` keeps its box so nothing moves.
	await page.addStyleTag({
		content: '.notice, .update-nag, .updated, .error { display: none !important; } .bfields-tabs-switch { visibility: hidden; }',
	});
	await page.evaluate(() => document.fonts.ready);

	return async (frame) => {
		await page.locator('.bfields-tab', { hasText: frame.tab }).first().click();
		await page.waitForTimeout(300);
		return page.screenshot({ clip: { x: 160, y: 32, width: 1280, height: 1700 } });
	};
}

const shoot = await openScreen();
const context = browser.contexts()[0];

/** A scratch page that does the pixel work on canvases. */
const lab = await context.newPage();
await lab.setContent('<html><body></body></html>');

const rows = [];
let failed = false;

for (const frame of FRAMES) {
	const shot = await shoot(frame);
	const figma = readFileSync(join(FIGMA_DIR, frame.file));

	const results = await lab.evaluate(
		async ({ ours, theirs, regions }) => {
			const load = (b64) =>
				new Promise((resolve) => {
					const img = new Image();
					img.onload = () => {
						const c = document.createElement('canvas');
						c.width = img.width;
						c.height = img.height;
						const ctx = c.getContext('2d');
						ctx.drawImage(img, 0, 0);
						resolve({ w: img.width, h: img.height, d: ctx.getImageData(0, 0, img.width, img.height).data, c });
					};
					img.src = `data:image/png;base64,${b64}`;
				});

			const A = await load(ours);
			const B = await load(theirs);
			const T = 40;

			const px = (I, x, y) => {
				const i = (y * I.w + x) * 4;
				return [I.d[i], I.d[i + 1], I.d[i + 2]];
			};

			const close = (p, q) => Math.abs(p[0] - q[0]) <= T && Math.abs(p[1] - q[1]) <= T && Math.abs(p[2] - q[2]) <= T;

			const matchNear = (I, x, y, p) => {
				for (let dy = -1; dy <= 1; dy++) {
					for (let dx = -1; dx <= 1; dx++) {
						const X = x + dx;
						const Y = y + dy;
						if (X >= 0 && Y >= 0 && X < I.w && Y < I.h && close(px(I, X, Y), p)) {
							return true;
						}
					}
				}
				return false;
			};

			return regions.map(({ name, box, floor, ignore = [], search = [-40, 40] }) => {
				const [x0, y0, x1, y1] = box;
				const skip = (x, y) => ignore.some(([a, b, c, d]) => x >= a && x < c && y >= b && y < d);

				// 1. Vertical alignment: coarse grey-level error over dy.
				let best = 0;
				let bestErr = Infinity;
				for (let dy = search[0]; dy <= search[1]; dy++) {
					let err = 0;
					let n = 0;
					for (let y = y0; y < y1; y += 3) {
						const Y = y + dy;
						if (Y < 0 || Y >= A.h) {
							err += 255;
							n++;
							continue;
						}
						for (let x = x0; x < x1; x += 3) {
							const p = px(B, x, y);
							const q = px(A, x, Y);
							err += Math.abs(p[0] + p[1] + p[2] - q[0] - q[1] - q[2]) / 3;
							n++;
						}
					}
					if (err / n < bestErr) {
						bestErr = err / n;
						best = dy;
					}
				}

				// 2. Tolerant diff at that offset, both directions.
				let diff = 0;
				let total = 0;
				const out = document.createElement('canvas');
				out.width = x1 - x0;
				out.height = y1 - y0;
				const octx = out.getContext('2d');
				const img = octx.createImageData(out.width, out.height);

				for (let y = y0; y < y1; y++) {
					for (let x = x0; x < x1; x++) {
						const k = ((y - y0) * out.width + (x - x0)) * 4;
						const theirsPx = px(B, x, y);
						const Y = y + best;

						if (skip(x, y)) {
							img.data.set([200, 200, 255, 255], k);
							continue;
						}

						total++;
						const oursPx = Y >= 0 && Y < A.h ? px(A, x, Y) : [255, 0, 255];
						const bad =
							!(Y >= 0 && Y < A.h && matchNear(A, x, Y, theirsPx)) || !matchNear(B, x, y, oursPx);

						if (bad) {
							diff++;
							img.data.set([255, 0, 0, 255], k);
						} else {
							const g = (theirsPx[0] + theirsPx[1] + theirsPx[2]) / 3;
							img.data.set([g, g, g, 90], k);
						}
					}
				}

				octx.putImageData(img, 0, 0);

				return { name, floor, dy: best, pct: (diff / total) * 100, png: out.toDataURL('image/png').split(',')[1] };
			});
		},
		{ ours: shot.toString('base64'), theirs: figma.toString('base64'), regions: frame.regions }
	);

	for (const r of results) {
		const slug = `${frame.tab}-${r.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
		writeFileSync(join(OUT, `${slug}.png`), Buffer.from(r.png, 'base64'));
		const limit = MAX ?? r.floor;
		rows.push({ frame: frame.file, tab: frame.tab, region: r.name, dy: r.dy, pct: r.pct, limit });
		if (!DESIGN && r.pct > limit) {
			failed = true;
		}
	}

	writeFileSync(join(OUT, `ours-${frame.tab.toLowerCase()}.png`), shot);
}

await browser.close();

console.log(`\nbfields — ${DESIGN ? 'design repo build' : 'viewer editor'} vs Figma`);
console.log('-'.repeat(78));
console.log(`        this   ${MAX === null ? 'design' : ' limit'}`);
for (const r of rows) {
	const mark = DESIGN ? '    ' : r.pct > r.limit ? 'FAIL' : ' ok ';
	console.log(
		`${mark}  ${r.pct.toFixed(2).padStart(5)}%  ${r.limit.toFixed(2).padStart(5)}%  dy ${String(r.dy).padStart(3)}  ${r.tab.padEnd(9)} ${r.region}`
	);
}
console.log('-'.repeat(78));
console.log(`diff images: ${OUT}  (red = differs)\n`);

process.exit(failed ? 1 : 0);
