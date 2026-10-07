/**
 * bfields — design parity check.
 *
 * Renders the settings screen inside REAL wp-admin and asserts every measured
 * value from the design repo survives contact with WordPress's own stylesheets.
 *
 * This exists because eyeballing a screenshot does not catch the failure mode
 * that actually bit: wp-admin's forms.css styles controls with attribute
 * selectors (`input[type="text"], select, textarea { border-radius: 2px }`),
 * which is (0,1,1) specificity and silently beat the design's 8px corners. The
 * screen still "looked fine" — it was just wrong. A computed-style assertion
 * catches that; a screenshot does not.
 *
 * The contract covers the whole CONTROL VOCABULARY, not one view of it. No
 * single tab renders every control — the tile grid is on General, the radio
 * group on WooCommerce — and no single SCREEN does either: the settings page
 * has no select and its only media field sits behind a dependency, while the
 * viewer editor has both. So every target is walked, tab by tab, and the
 * contract is satisfied across them.
 *
 *   node tests/e2e/design-parity.mjs            # inside real wp-admin
 *   node tests/e2e/design-parity.mjs --static   # the static preview, no WP
 *
 * Requires playwright resolvable. The wp-admin run also needs WP_PATH (a
 * WordPress install with the demo plugin active); BFIELDS_DEMO_URL overrides
 * the targets with a single URL.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const STATIC = process.argv.includes('--static');
const WP_PATH = process.env.WP_PATH;

if (!WP_PATH) {
	// --static still needs it to resolve playwright, which lives in a host
	// plugin rather than in this package's 300MB-lighter dependency list.
	console.error('Set WP_PATH to a WordPress install (--static uses it only to resolve playwright).');
	process.exit(2);
}

// playwright is not a dependency of this package — it lives in whichever host
// plugin already uses it, so resolve from there rather than adding 300MB here.
const PW_FROM = process.env.PLAYWRIGHT_FROM ?? join(WP_PATH, 'wp-content/plugins/3d-viewer-premium/');
const { chromium } = createRequire(PW_FROM)('playwright');

/**
 * Mint admin cookies with WP-CLI rather than driving the login form.
 *
 * wp-admin validates the AUTH cookie (scoped to /wp-admin), not just the
 * logged_in one, and since WP 4.0 both are checked against a stored session
 * token — so a session has to be created, not just a cookie signed.
 */
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
		$scheme = force_ssl_admin() ? 'secure_auth' : 'auth';
		$auth = force_ssl_admin() ? SECURE_AUTH_COOKIE : AUTH_COOKIE;
		echo json_encode(['siteurl' => get_option('siteurl'), 'cookies' => [
			['name' => $auth, 'value' => wp_generate_auth_cookie($u->ID, $expiry, $scheme, $token), 'path' => ADMIN_COOKIE_PATH],
			['name' => LOGGED_IN_COOKIE, 'value' => wp_generate_auth_cookie($u->ID, $expiry, 'logged_in', $token), 'path' => COOKIEPATH ?: '/'],
		]]);`
	);

	const out = execFileSync('wp', ['eval-file', script], { cwd: WP_PATH, encoding: 'utf8' });

	return JSON.parse(out.trim().split('\n').pop());
}

const tokens = JSON.parse(readFileSync(join(HERE, 'design-tokens.json'), 'utf8'));

/**
 * The contract for one screen: the base selectors, minus the ones a screen
 * drops, plus its own overrides. The base is the design repo's Settings-page
 * vocabulary; the viewer editor follows the Add New frames where they differ
 * (see the `screens` block in design-tokens.json).
 */
function contractFor(name) {
	const key = Object.keys(tokens.screens ?? {}).find((screen) => name.startsWith(screen));
	const screen = key ? tokens.screens[key] : { drop: [], selectors: {} };
	const selectors = { ...tokens.selectors };

	(screen.drop ?? []).forEach((selector) => delete selectors[selector]);

	return { selectors: { ...selectors, ...screen.selectors }, grids: tokens.grids };
}

const contract = { _source: tokens._source };
const expectedSet = new Set();

const STATIC_DIR = join(HERE, '../../demo/static');

/** The screens to walk, and where the demo renders them. */
function targets() {
	if (process.env.BFIELDS_DEMO_URL) {
		return [{ name: 'custom', url: process.env.BFIELDS_DEMO_URL }];
	}

	if (STATIC) {
		return [
			{ name: 'settings (static)', url: pathToFileURL(join(STATIC_DIR, 'settings.html')).href },
			{ name: 'viewer editor (static)', url: pathToFileURL(join(STATIC_DIR, 'add-new.html')).href },
		];
	}

	const site = adminCookies().siteurl;

	return [
		{ name: 'settings', url: `${site}/wp-admin/edit.php?post_type=bfields-demo-viewer&page=bfields-demo-settings` },
		{ name: 'viewer editor', url: `${site}/wp-admin/post-new.php?post_type=bfields-demo-viewer` },
	];
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });

if (!STATIC) {
	const auth = adminCookies();
	await context.addCookies(auth.cookies.map((c) => ({ ...c, domain: new URL(auth.siteurl).hostname })));
}

// The contract is the design's top strip; the demo defaults to the sidebar, so pin the switcher's stored choice.
await context.addInitScript(() => {
	try {
		['_bfields_demo_settings_', '_bfields_demo_viewer_'].forEach((u) => window.localStorage.setItem(`bfields-tabs:${u}`, 'top'));
	} catch {}
});

const page = await context.newPage();
const consoleErrors = [];

page.on('console', (m) => {
	if (m.type() === 'error') {
		consoleErrors.push(m.text());
	}
});

/** Measure whatever part of the contract this tab happens to render. */
const measure = (c) =>
	page.evaluate((c) => {
		const seen = [];
		const mismatched = [];
		let checked = 0;

		for (const [selector, props] of Object.entries(c.selectors)) {
			const el = document.querySelector(selector);

			if (!el) {
				continue;
			}

			seen.push(selector);
			const cs = getComputedStyle(el);

			for (const [prop, want] of Object.entries(props)) {
				checked++;
				if (cs[prop] !== want) {
					mismatched.push(`${selector} { ${prop}: ${cs[prop]} } — design says ${want}`);
				}
			}
		}

		for (const [selector, want] of Object.entries(c.grids)) {
			const el = document.querySelector(selector);
			if (!el) {
				continue;
			}
			seen.push(selector);
			checked++;
			const got = getComputedStyle(el).gridTemplateColumns;
			if (got !== want) {
				mismatched.push(`${selector} { grid-template-columns: ${got} } — design says ${want}`);
			}
		}

		return { seen, mismatched, checked };
	}, c);

const report = { missing: [], mismatched: [], checked: 0 };
const seen = new Set();
const walked = [];

for (const target of targets()) {
	await page.goto(target.url, { waitUntil: STATIC ? 'load' : 'networkidle' });
	await page.waitForSelector('.bfields-app', { timeout: 10000 });
	// The React body mounts after load; the static renderer paints on
	// DOMContentLoaded. Either way, wait for a row before measuring one.
	await page.waitForSelector('.bfields-row, .bfields-row--card, .bfields-card', { timeout: 10000 });

	const screenContract = contractFor(target.name);
	[...Object.keys(screenContract.selectors), ...Object.keys(screenContract.grids)].forEach((s) => expectedSet.add(s));

	const tabs = await page.locator('.bfields-tab').count();

	walked.push(`${target.name} (${tabs} tabs)`);

	for (let i = 0; i < tabs; i++) {
		if (i > 0) {
			await page.locator('.bfields-tab').nth(i).click();
			await page.waitForTimeout(250);
		}

		const tab = await measure(screenContract);

		tab.seen.forEach((s) => seen.add(s));
		report.mismatched.push(...tab.mismatched);
		report.checked += tab.checked;
	}
}

const expected = [...expectedSet];
report.missing = expected.filter((s) => !seen.has(s));

// The same selector is measured once per tab it appears on; duplicates in the
// failure list are the same defect seen repeatedly.
report.mismatched = [...new Set(report.mismatched)];

await browser.close();

console.log(`\nbfields design parity${STATIC ? ' — static preview' : ' — wp-admin'}`);
console.log('-'.repeat(60));
console.log(`source:     ${contract._source}`);
console.log(`screens:    ${walked.join(', ')}`);
console.log(`properties: ${report.checked}`);

// A selector that is not on the page is not a pass — the contract covers the
// whole screen, so a missing node means the markup drifted from the design.
if (report.missing.length) {
	console.log(`\nnot rendered (${report.missing.length}):`);
	report.missing.forEach((s) => console.log(`  ${s}`));
}

if (consoleErrors.length) {
	console.log(`\nconsole errors (${consoleErrors.length}):`);
	consoleErrors.slice(0, 5).forEach((e) => console.log(`  ${e}`));
}

if (report.mismatched.length) {
	console.log(`\nmismatched (${report.mismatched.length}):`);
	report.mismatched.forEach((m) => console.log(`  ${m}`));
}

console.log('-'.repeat(60));

if (report.mismatched.length || report.missing.length || consoleErrors.length) {
	console.log('FAIL — the rendered screen does not match the design.\n');
	process.exit(1);
}

console.log(
	STATIC
		? 'PASS — every measured value matches the design in the static preview.\n'
		: 'PASS — every measured value matches the design inside wp-admin.\n'
);
