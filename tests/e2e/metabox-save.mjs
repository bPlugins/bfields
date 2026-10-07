/**
 * bfields — the framework's plain meta box, saved end to end.
 *
 * Every screen the demo draws itself registers with `'render' => false`, so
 * none of them exercises BFields\Metabox or Storage\PostMeta's own save path.
 * The demo's Postbox Demo screen (post type `bfields-demo-box`, key
 * `_bfields_demo_postbox_`, demo/includes/Fields/Postbox.php) does, and this
 * drives it in real wp-admin:
 *
 *   1. The bundle mounts, and enables the mirror field it was printed without.
 *   2. A heartbeat autosave of the draft carrying a valid payload and nonce
 *      writes nothing (DOING_AUTOSAVE guard), while the autosave itself runs.
 *   3. Publish writes the hydrated defaults, every leaf a string (Codestar).
 *   4. Update with a changed text, a toggled switcher and a tablet width
 *      writes those and leaves every other field as it was; the revision the
 *      save creates carries no meta.
 *   5. Update with no changes writes identical bytes.
 *   6. Update with the `validate`-rejected value keeps the stored one and
 *      shows the error after the redirect, once (transient).
 *   7. The colour panel (alpha, `transparent`) and the searched posts
 *      select (`'options' => 'posts'`, GET /bfields/v1/choices) write what
 *      Codestar's picker and Chosen box would.
 *
 *   WP_PATH=/path/to/wordpress node tests/e2e/metabox-save.mjs
 *
 * Requires playwright resolvable (PLAYWRIGHT_FROM, default the 3D Viewer
 * Premium plugin beside this one) and the demo plugin active. The post it
 * creates is deleted at the end, pass or fail.
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const WP_PATH = process.env.WP_PATH;

if (!WP_PATH) {
	console.error('Set WP_PATH to a WordPress install with the bfields demo plugin active.');
	process.exit(2);
}

const PW_FROM = process.env.PLAYWRIGHT_FROM ?? join(WP_PATH, 'wp-content/plugins/3d-viewer-premium/');
const { chromium } = createRequire(PW_FROM)('playwright');

const KEY = '_bfields_demo_postbox_';
const POST_TYPE = 'bfields-demo-box';
const BOX = `#${KEY}`;

const wp = (args) => execFileSync('wp', args, { cwd: WP_PATH, encoding: 'utf8' }).trim();

/** wp eval-file, returning the last line of output parsed as JSON. */
function wpEval(php) {
	const script = mkdtempSync(join(tmpdir(), 'bfields-')) + '/eval.php';
	writeFileSync(script, `<?php\n${php}`);
	return JSON.parse(wp(['eval-file', script]).split('\n').pop());
}

/** Admin cookies minted with WP-CLI, as design-parity.mjs does. */
function adminCookies() {
	return wpEval(`
		$admins = get_users(['role' => 'administrator', 'number' => 1]);
		if (!$admins) { echo "{}"; return; }
		$u = $admins[0];
		$expiry = time() + 3600;
		$token = WP_Session_Tokens::get_instance($u->ID)->create($expiry);
		$scheme = force_ssl_admin() ? 'secure_auth' : 'auth';
		$auth = force_ssl_admin() ? SECURE_AUTH_COOKIE : AUTH_COOKIE;
		echo json_encode(['siteurl' => get_option('siteurl'), 'user' => $u->ID, 'cookies' => [
			['name' => $auth, 'value' => wp_generate_auth_cookie($u->ID, $expiry, $scheme, $token), 'path' => ADMIN_COOKIE_PATH],
			['name' => LOGGED_IN_COOKIE, 'value' => wp_generate_auth_cookie($u->ID, $expiry, 'logged_in', $token), 'path' => COOKIEPATH ?: '/'],
		]]);`);
}

/** The stored row: decoded (null when absent) and its raw serialized bytes. */
const readMeta = (id) =>
	wpEval(`
		global $wpdb;
		$raw = $wpdb->get_var($wpdb->prepare("SELECT meta_value FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key = %s", ${id}, '${KEY}'));
		echo json_encode(['value' => null === $raw ? null : get_post_meta(${id}, '${KEY}', true), 'raw' => $raw, 'title' => get_the_title(${id})]);`);

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok: Boolean(ok), detail });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Every leaf a string, as Codestar stores them. */
const leavesAreStrings = (value) =>
	value !== null && typeof value === 'object' ? Object.values(value).every(leavesAreStrings) : typeof value === 'string';

const auth = adminCookies();
const site = auth.siteurl;
const postId = Number(
	wp(['post', 'create', `--post_type=${POST_TYPE}`, '--post_status=draft', '--post_title=bfields metabox-save e2e', `--post_author=${auth.user}`, '--porcelain'])
);
const editUrl = `${site}/wp-admin/post.php?post=${postId}&action=edit`;
const marker = `bfieldse2e${Date.now()}`;
const relatedId = Number(wp(['post', 'create', '--post_type=post', '--post_status=publish', `--post_title=${marker} related`, '--porcelain']));
const privateId = Number(wp(['post', 'create', '--post_type=post', '--post_status=private', `--post_title=${marker} private`, '--porcelain']));

const browser = await chromium.launch();
const consoleErrors = [];

try {
	const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
	await context.addCookies(auth.cookies.map((c) => ({ ...c, domain: new URL(site).hostname })));

	const page = await context.newPage();
	page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
	page.on('pageerror', (e) => consoleErrors.push(String(e)));

	const mounted = async () => {
		await page.waitForSelector(`${BOX} .bfields-root[data-bfields-mounted="1"] .bfields-admin--metabox`, { timeout: 15000 });
		await page.waitForSelector(`${BOX} [data-field="label"]`, { timeout: 15000 });
	};

	const submit = async (message) => {
		await Promise.all([page.waitForURL(new RegExp(`message=${message}`), { timeout: 20000 }), page.click('#publish')]);
		await mounted();
	};

	const field = (id) => page.locator(`${BOX} [data-field="${id}"]`);

	// 1. Mount.
	await page.goto(editUrl, { waitUntil: 'load' });
	await mounted();

	const mirror = await page.evaluate((key) => {
		const el = document.getElementById(`bfields-values-${key}`);
		return el ? { disabled: el.disabled, name: el.name, json: el.value } : null;
	}, KEY);

	check('postbox mounts and removes the fallback notice', (await page.locator(`${BOX} .bfields-fallback`).count()) === 0);
	check(
		'mirror field enabled and filled on mount',
		mirror && !mirror.disabled && mirror.name === `bfields_values[${KEY}]` && mirror.json.startsWith('{'),
		JSON.stringify(mirror && { ...mirror, json: mirror.json.slice(0, 60) })
	);

	// 2. Heartbeat autosave of the draft, with a payload that WOULD save.
	const autosave = await page.evaluate(
		async ({ key, postId, postType }) => {
			const values = JSON.parse(document.getElementById(`bfields-values-${key}`).value);
			values.label = 'autosaved';

			const nonce = document.querySelector(`[name^="bfields_metabox_nonce_"]`);
			const body = new URLSearchParams({
				action: 'heartbeat',
				_nonce: window.heartbeatSettings.nonce,
				screen_id: window.pagenow,
				has_focus: 'true',
				interval: '60',
				'data[wp_autosave][post_id]': String(postId),
				'data[wp_autosave][_wpnonce]': document.getElementById('_wpnonce').value,
				'data[wp_autosave][post_type]': postType,
				'data[wp_autosave][post_author]': document.getElementById('post_author')?.value ?? '',
				'data[wp_autosave][post_title]': 'bfields metabox-save e2e (autosaved)',
				[`bfields_values[${key}]`]: JSON.stringify(values),
				[nonce.name]: nonce.value,
			});

			const response = await fetch(window.ajaxurl, { method: 'POST', credentials: 'same-origin', body });
			return response.json();
		},
		{ key: KEY, postId, postType: POST_TYPE }
	);

	const afterAutosave = readMeta(postId);

	check('autosave request ran', autosave?.wp_autosave?.success === true, JSON.stringify(autosave?.wp_autosave));
	check('autosave updated the post title', afterAutosave.title === 'bfields metabox-save e2e (autosaved)', afterAutosave.title);
	check('autosave wrote no meta', afterAutosave.raw === null, String(afterAutosave.raw).slice(0, 80));

	// 3. Publish: the hydrated defaults.
	await page.goto(editUrl, { waitUntil: 'load' });
	await mounted();
	await submit(6);

	const m0 = readMeta(postId);
	const defaults = {
		label: 'Hello',
		enabled: '',
		align: 'center',
		size: { width: '100', height: '50', unit: 'px' },
		items: [{ item_label: 'First' }],
		code: 'ok',
		tint: 'rgba(0, 0, 0, 0.4)',
		related: '',
	};

	check('publish writes the defaults in Codestar shape', same(m0.value, defaults), JSON.stringify(m0.value));
	check('publish: every stored leaf is a string', leavesAreStrings(m0.value));

	// 4. Change a text, a switcher and a tablet width; retitle so a revision is made.
	await page.fill('#title', 'bfields metabox-save e2e (edited)');
	await field('label').locator('input.bfields-input').fill('Changed label');
	await field('enabled').locator('[role="switch"]').click();
	await field('size').locator('.bfields-devswitch__btn[title^="Tablet"]').click();
	await field('size').locator('input[type="number"]').first().fill('80');
	await submit(1);

	const m1 = readMeta(postId);
	const v1 = m1.value ?? {};

	check('text stored', v1.label === 'Changed label', JSON.stringify(v1.label));
	check('switcher stored as "1"', v1.enabled === '1', JSON.stringify(v1.enabled));
	check(
		'tablet width nested inside the dimension, desktop untouched',
		v1.size?.tablet?.width === '80' && v1.size?.width === '100' && v1.size?.height === '50' && v1.size?.unit === 'px',
		JSON.stringify(v1.size)
	);
	check(
		'untouched fields unchanged',
		v1.align === m0.value.align && same(v1.items, m0.value.items) && v1.code === m0.value.code,
		JSON.stringify({ align: v1.align, items: v1.items, code: v1.code })
	);
	check('update: every stored leaf is a string', leavesAreStrings(v1), JSON.stringify(v1));

	const revisions = wp(['post', 'list', '--post_type=revision', `--post_parent=${postId}`, '--post_status=inherit', '--format=ids'])
		.split(/\s+/)
		.filter(Boolean);
	const revisionMeta = revisions.filter((rev) => readMeta(rev).raw !== null);

	check('the save made a revision', revisions.length > 0, `revisions: ${revisions.join(',') || 'none'}`);
	check('no revision carries the meta', revisionMeta.length === 0, revisionMeta.join(','));

	// 5. Update with no changes: identical bytes.
	await submit(1);

	const m2 = readMeta(postId);

	check('no-change update writes identical bytes', m2.raw === m1.raw, m2.raw === m1.raw ? '' : `${m1.raw}\n     -> ${m2.raw}`);

	// 6. The validate-rejected value.
	await field('code').locator('input.bfields-input').fill('invalid');
	await submit(1);

	const m3 = readMeta(postId);
	const notice = page.locator(`${BOX} .notice-error`);
	const noticeText = (await notice.count()) ? (await notice.first().innerText()).trim() : '';

	check('rejected value not stored, old value kept', m3.value?.code === 'ok', JSON.stringify(m3.value?.code));
	check('rest of the row unchanged by the rejected save', m3.raw === m2.raw);
	check('error notice shown after the redirect', /code/.test(noticeText) && /not an accepted code/.test(noticeText), noticeText);

	await page.reload({ waitUntil: 'load' });
	await mounted();

	check('error notice shown once (transient consumed)', (await page.locator(`${BOX} .notice-error`).count()) === 0);

	// 7. Colour alpha and a searched post.
	const setRange = (locator, value) =>
		locator.evaluate((el, v) => {
			Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
			el.dispatchEvent(new Event('input', { bubbles: true }));
		}, value);

	await field('code').locator('input.bfields-input').fill('ok');
	await field('tint').locator('.bfields-colorpick').click();
	check('colour panel opens from the designed button', await field('tint').locator('.bfields-colorpanel').isVisible());
	await setRange(field('tint').locator('.bfields-colorpanel__alpha input'), '50');
	await page.keyboard.press('Escape');

	await field('related').locator('input[type="search"]').fill(marker);
	await field('related').locator('.bfields-source__option').first().waitFor({ timeout: 10000 });
	const offered = await field('related').locator('.bfields-source__option').allInnerTexts();
	check('search offers the published post only', same(offered, [`${marker} related`]), JSON.stringify(offered));
	await field('related').locator('.bfields-source__option').first().click();
	await submit(1);

	const m4 = readMeta(postId);

	check('alpha stored as rgba(r, g, b, a)', m4.value?.tint === 'rgba(0, 0, 0, 0.5)', JSON.stringify(m4.value?.tint));
	check('searched post stored as its id, a string', m4.value?.related === String(relatedId), JSON.stringify(m4.value?.related));
	check(
		'the stored post shows its title after reload',
		// The chip's title arrives by REST after mount; wait for it rather than read once.
		await field('related').locator('.bfields-source__chip', { hasText: `${marker} related` }).waitFor({ timeout: 10000 }).then(() => true, () => false)
	);

	await field('tint').locator('.bfields-colorpick').click();
	await field('tint').locator('.bfields-colorpanel__action', { hasText: 'Transparent' }).click();
	await page.keyboard.press('Escape');
	await field('related').locator('.bfields-source__remove').click();
	await submit(1);

	const m5 = readMeta(postId);

	check('transparent stored', m5.value?.tint === 'transparent', JSON.stringify(m5.value?.tint));
	check('removed post stored as empty', m5.value?.related === '', JSON.stringify(m5.value?.related));
	check('update: every stored leaf is a string (colour and source)', leavesAreStrings(m5.value), JSON.stringify(m5.value));
} catch (error) {
	check('run completed', false, String(error?.stack ?? error));
} finally {
	await browser.close();
	try {
		wp(['post', 'delete', String(postId), String(relatedId), String(privateId), '--force']);
	} catch (error) {
		console.error(`cleanup: could not delete post ${postId}: ${error.message}`);
	}
}

check('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 5).join('\n     '));

console.log('\nbfields metabox save — framework postbox, wp-admin');
console.log('-'.repeat(60));
console.log(`screen: ${editUrl}`);

for (const r of results) {
	console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${!r.ok && r.detail ? `\n      ${r.detail}` : ''}`);
}

console.log('-'.repeat(60));

const failed = results.filter((r) => !r.ok).length;

if (failed) {
	console.log(`FAIL — ${failed} of ${results.length} checks failed.\n`);
	process.exit(1);
}

console.log(`PASS — all ${results.length} checks passed.\n`);
