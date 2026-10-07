/**
 * bfields — Update without a reload (ui/layout/updateInPlace.ts): eligibility,
 * the request body, the sentinel parse, every answer row, store.rebase() and
 * the flight guards.
 */

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import EditorShell from '../../ui/layout/EditorShell';
import type { EditorBoot } from '../../ui/layout/EditorShell';
import { createStore } from '../../ui/core/store';
import type { BootPayload, Field, Values } from '../../ui/core/types';
import {
	BEGIN,
	END,
	MARKER,
	adoptNotices,
	classify,
	createController,
	crlf,
	eligible,
	noticeKey,
	parse,
	serialize,
	snapshotHidden,
} from '../../ui/layout/updateInPlace';
import type { ClassifyInput, InPlaceEditor, Payload } from '../../ui/layout/updateInPlace';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const UNIQUE = '_pf_';
const MIRROR = 'bfields-values-_pf_';
const BOX_NONCE = 'bfields_metabox_nonce__pf_';

const date = (unit: string, value: string) =>
	`<input type="hidden" name="hidden_${unit}" value="${value}"><input type="text" name="${unit}" value="${value}">`;

/** The edit screen as edit-form-advanced.php and post_submit_meta_box() print it for a published post. */
function fixture(extra = ''): HTMLFormElement {
	document.body.innerHTML = `
		<div id="wpbody-content"><div class="wrap">
			<h1>Edit</h1><hr class="wp-header-end">
			<form id="post" name="post" method="post" action="post.php">
				<input type="hidden" id="_wpnonce" name="_wpnonce" value="core1">
				<input type="hidden" name="_wp_http_referer" value="/wp-admin/post.php?post=7&amp;action=edit">
				<input type="hidden" name="user_ID" value="1">
				<input type="hidden" id="hiddenaction" name="action" value="editpost">
				<input type="hidden" name="originalaction" value="editpost">
				<input type="hidden" name="post_author" value="1">
				<input type="hidden" name="post_type" value="viewer">
				<input type="hidden" name="original_post_status" value="publish">
				<input type="hidden" name="referredby" value="">
				<input type="hidden" id="post_ID" name="post_ID" value="7">
				<input type="hidden" id="active_post_lock" value="100:1">
				<input type="hidden" name="wp-preview" id="wp-preview" value="">
				<input type="text" name="post_title" id="title" value="Bee">
				<div id="frame"></div>
				<input type="hidden" id="${BOX_NONCE}" name="${BOX_NONCE}" value="box1">
				<textarea name="bfields_values[${UNIQUE}]" id="${MIRROR}" hidden>{"f":"a","n":3}</textarea>
				<div id="submitdiv"><div id="submitpost">
					<input type="hidden" name="hidden_post_status" value="publish">
					<select name="post_status"><option value="publish" selected>Published</option><option value="draft">Draft</option></select>
					<input type="hidden" name="hidden_post_visibility" value="public">
					<input type="radio" name="visibility" value="public" checked><input type="radio" name="visibility" value="private">
					<input type="hidden" name="hidden_post_password" value="">
					<input type="text" name="post_password" value="">
					${date('aa', '2026')}${date('mm', '10')}${date('jj', '05')}${date('hh', '10')}${date('mn', '30')}
					<input type="hidden" name="ss" value="00">
					<div id="delete-action"><a class="submitdelete deletion" href="post.php?post=7&amp;action=trash">Move to Trash</a></div>
					<input name="original_publish" type="hidden" value="Update">
					<input type="submit" name="save" id="publish" value="Update">
				</div></div>
				${extra}
			</form>
		</div></div>`;

	return document.getElementById('post') as HTMLFormElement;
}

const EDITOR: InPlaceEditor = { published: true, status: 'publish', updateInPlace: true, postId: 7, updatedNotice: 'Model Updated' };

type Handler = { namespace: string; selector?: string };

let events: Map<unknown, Record<string, Handler[]>>;
let triggered: string[];
let speak: jest.Mock;
let postChanged: boolean;

beforeEach(() => {
	events = new Map();
	triggered = [];
	speak = jest.fn();
	postChanged = false;

	const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
	const $ = Object.assign(
		(target: unknown) => ({
			// jQuery's own selector engine: `:checkbox` is not CSS.
			is: (selector: string) => (target as Element).matches(selector.replace(/:checkbox/g, '[type="checkbox"]')),
			trigger: (event: string) => {
				triggered.push(event);
				(listeners.get(event.split('.')[0] ?? '') ?? []).forEach((fn) => fn({}, {}));
			},
			on: (event: string, fn: (...args: unknown[]) => void) => {
				const key = event.split('.')[0] ?? '';
				listeners.set(key, [...(listeners.get(key) ?? []), fn]);
			},
			off: (event: string, fn?: (...args: unknown[]) => void) => {
				const key = event.split('.')[0] ?? '';
				listeners.set(key, (listeners.get(key) ?? []).filter((item) => fn && item !== fn));
			},
			one: (event: string, fn: (...args: unknown[]) => void) => {
				const key = event.split('.')[0] ?? '';
				listeners.set(key, [...(listeners.get(key) ?? []), fn]);
			},
			target,
		}),
		{ _data: (node: unknown) => events.get(node), listeners }
	);

	Object.assign(window, {
		jQuery: $,
		wp: {
			autosave: { server: { postChanged: () => postChanged } },
			heartbeat: { connectNow: jest.fn() },
			a11y: { speak },
		},
		fetch: jest.fn(),
	});
});

const input = (form: HTMLFormElement, over: Partial<Parameters<typeof eligible>[0]> = {}) => ({
	form,
	editor: EDITOR,
	sticky: false,
	hidden: snapshotHidden(form),
	...over,
});

describe('eligible()', () => {
	test('a published post with only core fields saves in place', () => {
		const form = fixture();
		expect(eligible(input(form))).toBe('');
	});

	test.each([
		['opt-in off', (form: HTMLFormElement) => input(form, { editor: { ...EDITOR, updateInPlace: false } }), 'off'],
		['sticky native', (form: HTMLFormElement) => input(form, { sticky: true }), 'off'],
		['draft', (form: HTMLFormElement) => input(form, { editor: { ...EDITOR, published: false, status: 'draft' } }), 'status'],
		['scheduled', (form: HTMLFormElement) => input(form, { editor: { ...EDITOR, status: 'future' } }), 'status'],
	])('%s', (_name, make, reason) => {
		expect(eligible(make(fixture()))).toBe(reason);
	});

	test('core button disabled (autosave running) or renamed', () => {
		let form = fixture();
		document.getElementById('publish')?.classList.add('disabled');
		expect(eligible(input(form))).toBe('button');

		form = fixture();
		(document.getElementById('publish') as HTMLInputElement).name = 'publish';
		expect(eligible(input(form))).toBe('button');
	});

	test('title changed, or no fetch', () => {
		const form = fixture();
		postChanged = true;
		expect(eligible(input(form))).toBe('changed');

		postChanged = false;
		Object.assign(window, { fetch: undefined });
		expect(eligible(input(form))).toBe('changed');
	});

	test.each([
		['status', (form: HTMLFormElement) => ((form.elements.namedItem('post_status') as HTMLSelectElement).value = 'draft')],
		['visibility', (form: HTMLFormElement) => ((form.querySelector('[name=visibility][value=private]') as HTMLInputElement).checked = true)],
		['password', (form: HTMLFormElement) => ((form.elements.namedItem('post_password') as HTMLInputElement).value = 'x')],
		['date', (form: HTMLFormElement) => ((form.elements.namedItem('jj') as HTMLInputElement).value = '06')],
	])('%s edited in the hidden Publish box', (_name, edit) => {
		const form = fixture();
		const snapshot = snapshotHidden(form);
		edit(form);
		expect(eligible(input(form, { hidden: snapshot }))).toBe('fields');
	});

	test('a private post: core posts "publish" with private visibility, which is unchanged', () => {
		const form = fixture();
		(form.elements.namedItem('original_post_status') as HTMLInputElement).value = 'private';
		(form.elements.namedItem('hidden_post_status') as HTMLInputElement).value = 'private';
		(form.elements.namedItem('hidden_post_visibility') as HTMLInputElement).value = 'private';
		(form.querySelector('[name=visibility][value=private]') as HTMLInputElement).checked = true;
		const editor = { ...EDITOR, status: 'private' };
		expect(eligible(input(form, { editor }))).toBe('');

		// Made public in the hidden box: a visibility change, native.
		(form.querySelector('[name=visibility][value=public]') as HTMLInputElement).checked = true;
		expect(eligible(input(form, { editor }))).toBe('fields');
	});

	test('post locked or logged out', () => {
		let form = fixture('<div id="post-lock-dialog" class="notification-dialog-wrap"></div>');
		expect(eligible(input(form))).toBe('locked');

		form = fixture('<div id="post-lock-dialog" class="hidden"></div><div id="wp-auth-check-wrap" class="hidden"></div>');
		expect(eligible(input(form))).toBe('');
		(document.getElementById('wp-auth-check-wrap') as HTMLElement).classList.remove('hidden');
		expect(eligible(input(form))).toBe('locked');
	});

	test('a named control a plugin injected goes native, wherever it sits', () => {
		const inSubmit = fixture();
		document.getElementById('submitpost')?.insertAdjacentHTML('beforeend', '<input type="checkbox" name="notify_subscribers" checked>');
		expect(eligible(input(inSubmit))).toBe('controls');

		const outside = fixture('<input type="text" name="after_title" value="">');
		expect(eligible(input(outside))).toBe('controls');

		// Unchecked boxes and disabled fields are not posted, so they do not count.
		const quiet = fixture('<input type="checkbox" name="notify_subscribers"><input type="text" name="off" disabled>');
		expect(eligible(input(quiet))).toBe('');
	});

	test('a third-party hidden input passes only while unchanged since mount', () => {
		const form = fixture('<input type="hidden" name="acf_token" value="1">');
		const snapshot = snapshotHidden(form);
		expect(eligible(input(form, { hidden: snapshot }))).toBe('');

		(form.elements.namedItem('acf_token') as HTMLInputElement).value = '2';
		expect(eligible(input(form, { hidden: snapshot }))).toBe('controls');
	});

	test('host names from update_in_place_boxes are allowed', () => {
		const form = fixture('<input type="text" name="host_box[a]" value="1">');
		expect(eligible(input(form))).toBe('controls');
		expect(eligible(input(form, { editor: { ...EDITOR, inPlaceNames: ['host_box[*'] } }))).toBe('');
	});

	test('submit handlers: only core ones are allowed', () => {
		const form = fixture();
		events.set(form, { submit: [{ namespace: 'edit-post' }, { namespace: 'autosave-local' }] });
		expect(eligible(input(form))).toBe('');

		events.set(form, { submit: [{ namespace: 'edit-post' }, { namespace: '' }] });
		expect(eligible(input(form))).toBe('handlers');

		document.body.insertAdjacentHTML('beforeend', '<div id="timestampdiv"></div>');
		expect(eligible(input(form))).toBe('');

		events.set(form, { submit: [{ namespace: 'myplugin' }] });
		expect(eligible(input(form))).toBe('handlers');

		events.set(form, {});
		events.set(document, { submit: [{ namespace: '', selector: '#post' }] });
		expect(eligible(input(form))).toBe('handlers');

		events.set(document, { submit: [{ namespace: '', selector: '.other-form' }] });
		expect(eligible(input(form))).toBe('');

		form.onsubmit = () => true;
		expect(eligible(input(form))).toBe('handlers');
	});

	test('click handlers on #publish: only core\'s edit-post one is allowed', () => {
		const form = fixture();
		const publish = document.getElementById('publish');
		events.set(publish, { click: [{ namespace: 'edit-post' }] });
		// common.js delegates on body with a jQuery-only selector.
		events.set(document, { click: [{ namespace: '', selector: '.notice-dismiss' }, { namespace: '' }, { namespace: '', selector: 'tbody > tr > .check-column :checkbox' }] });
		expect(eligible(input(form))).toBe('');

		events.set(publish, { click: [{ namespace: 'edit-post' }, { namespace: '' }] });
		expect(eligible(input(form))).toBe('handlers');

		events.set(publish, { click: [{ namespace: 'edit-post' }] });
		events.set(document, { click: [{ namespace: 'myplugin', selector: '#submitpost :submit' }] });
		expect(eligible(input(form))).toBe('handlers');

		events.delete(document);
		events.set(form, { click: [{ namespace: '', selector: '#publish' }] });
		expect(eligible(input(form))).toBe('handlers');
	});

	test('an out-of-range number fails HTML validation, so the native click shows the bubble', () => {
		const form = fixture('<input type="number" name="bfields_values[x]" min="0" max="10" value="50">');
		expect(eligible(input(form))).toBe('invalid');
	});

	test('a page that is not UTF-8', () => {
		const form = fixture();
		const spy = jest.spyOn(document, 'characterSet', 'get').mockReturnValue('windows-1252');
		expect(eligible(input(form))).toBe('charset');
		spy.mockRestore();
	});
});

describe('serialize()', () => {
	const submitter = () => document.getElementById('publish') as HTMLElement;
	const mirror = () => document.getElementById(MIRROR) as HTMLTextAreaElement;

	test('the native body plus the marker, once, to the attribute URL', () => {
		const form = fixture('<input type="text" name="cur_note" value="x">');
		const request = serialize(form, submitter(), UNIQUE, mirror());

		expect(request).not.toBeNull();
		expect(request?.url).toBe(new URL('post.php', window.location.href).href);
		expect(request?.contentType).toBe('application/x-www-form-urlencoded');

		const params = new URLSearchParams(request?.body as string);
		expect(params.getAll('save')).toEqual(['Update']);
		expect(params.getAll(MARKER)).toEqual([UNIQUE]);
		expect(params.get('action')).toBe('editpost');
		expect(params.get(`bfields_values[${UNIQUE}]`)).toBe('{"f":"a","n":3}');
		expect(params.get('visibility')).toBe('public');
		expect(request?.snapshot).toEqual({ f: 'a', n: 3 });
		expect(request?.snapshotText).toBe(mirror().value);
	});

	test('a clobbered form.action is not used', () => {
		const form = fixture();
		expect(form.action).not.toBe('post.php');
		expect(serialize(form, submitter(), UNIQUE, mirror())?.url.endsWith('/post.php')).toBe(true);
	});

	test('line breaks become CRLF, without doubling an existing CR', () => {
		expect(crlf('a\nb\r\nc\rd')).toBe('a\r\nb\r\nc\r\nd');

		const form = fixture('<textarea name="excerpt_like"></textarea>');
		(form.elements.namedItem('excerpt_like') as HTMLTextAreaElement).value = 'one\ntwo\r\nthree';
		const params = new URLSearchParams(serialize(form, submitter(), UNIQUE, mirror())?.body as string);
		expect(params.get('excerpt_like')).toBe('one\r\ntwo\r\nthree');
	});

	test('disabled fields and other submit buttons are left out', () => {
		const form = fixture('<input type="text" name="gone" value="1" disabled><button type="submit" name="other" value="x">x</button>');
		const params = new URLSearchParams(serialize(form, submitter(), UNIQUE, mirror())?.body as string);
		expect(params.has('gone')).toBe(false);
		expect(params.has('other')).toBe(false);
	});

	test('a file entry in a urlencoded form goes native; multipart sends FormData', () => {
		let form = fixture('<input type="file" name="upload">');
		expect(serialize(form, submitter(), UNIQUE, mirror())).toBeNull();

		form = fixture('<input type="file" name="upload">');
		form.setAttribute('enctype', 'multipart/form-data');
		const request = serialize(form, submitter(), UNIQUE, mirror());
		expect(request?.body).toBeInstanceOf(FormData);
		expect(request?.contentType).toBeNull();
		expect((request?.body as FormData).getAll(MARKER)).toEqual([UNIQUE]);
	});

	test('a disabled or broken mirror goes native', () => {
		const form = fixture();
		mirror().value = 'not json';
		expect(serialize(form, submitter(), UNIQUE, mirror())).toBeNull();
	});
});

const payload = (over: Partial<Payload> = {}): Payload => ({
	bfields: 'update-in-place',
	version: 1,
	postId: 7,
	unique: UNIQUE,
	inPlace: true,
	reason: '',
	location: 'http://localhost/post.php?post=7&action=edit&message=1',
	status: 'publish',
	box: 'saved',
	errors: {},
	values: { f: 'a', n: 3 },
	nonces: { _wpnonce: 'core2', [BOX_NONCE]: 'box2' },
	lock: '200:1',
	...over,
});

const wrap = (data: unknown, before = '', after = ''): string => `${before}${BEGIN}${JSON.stringify(data)}${END}${after}`;

describe('parse()', () => {
	test.each([
		['clean', '', ''],
		['PHP notice before', '<b>Notice</b>: Undefined index in x.php\n', ''],
		['HTML after (Query Monitor)', '', '<div id="qm">…</div>'],
		['both', 'Warning: x\n', '<!-- shutdown --><script>1</script>'],
	])('%s', (_name, before, after) => {
		expect(parse(wrap(payload(), before, after))?.postId).toBe(7);
	});

	test('a value holding the end sentinel still parses', () => {
		const text = wrap(payload({ values: { f: `x ${END} y`, n: 3 } }), '', '<!-- shutdown -->');
		expect(parse(text)?.values?.f).toBe(`x ${END} y`);
	});

	test('no sentinels, an unknown version or broken JSON', () => {
		expect(parse('<html>')).toBeNull();
		expect(parse(wrap({ ...payload(), version: 2 }))).toBeNull();
		expect(parse(`${BEGIN}{oops${END}`)).toBeNull();
	});
});

describe('classify()', () => {
	const base = (over: Partial<ClassifyInput> = {}): ClassifyInput => ({
		reply: { kind: 'http', status: 200, text: wrap(payload()) },
		unique: UNIQUE,
		postId: 7,
		snapshot: { f: 'a', n: 3 },
		midFlight: false,
		editLink: 'http://localhost/post.php?post=7&action=edit',
		origin: 'http://localhost',
		...over,
	});

	test('ordinary success stays and rebases on the snapshot', () => {
		const decision = classify(base());
		expect(decision).toMatchObject({ outcome: 'saved', action: 'stay', settle: true, sticky: false, invalid: [], clearBoxNotices: true });
		expect(decision.rebase).toEqual({ f: 'a', n: 3 });
		expect(decision.notice?.kind).toBe('updated');
	});

	test('values compared over the union of keys, not key order', () => {
		const decision = classify(base({ reply: { kind: 'http', status: 200, text: wrap(payload({ values: { n: 3, f: 'a' } })) } }));
		expect(decision.outcome).toBe('saved');
	});

	test.each(['errors', 'status', 'date', 'location', 'button', 'off'])('reason %s without mid-flight edits navigates', (reason) => {
		const decision = classify(base({ reply: { kind: 'http', status: 200, text: wrap(payload({ inPlace: false, reason })) } }));
		expect(decision).toMatchObject({ outcome: 'navigate', action: 'navigate', location: payload().location });
	});

	test('a sanitiser changed a value: navigate', () => {
		const decision = classify(base({ reply: { kind: 'http', status: 200, text: wrap(payload({ values: { f: 'A', n: 3 } })) } }));
		expect(decision.action).toBe('navigate');
	});

	test('saved but unusual, with mid-flight edits: stay on the server values, sticky', () => {
		const text = wrap(payload({ inPlace: false, reason: 'errors', errors: { n: 'Too big.' }, values: { f: 'a', n: 0 } }));
		const decision = classify(base({ reply: { kind: 'http', status: 200, text }, midFlight: true }));
		expect(decision).toMatchObject({ outcome: 'partial', action: 'stay', sticky: true, settle: true, invalid: ['n'] });
		expect(decision.rebase).toEqual({ f: 'a', n: 0 });
		expect(decision.notice?.text).toContain('Too big.');
	});

	test('stale box nonce: stay, renewed, in place again', () => {
		const decision = classify(base({ reply: { kind: 'http', status: 200, text: wrap(payload({ inPlace: false, reason: 'nonce', box: 'nonce', values: undefined })) } }));
		expect(decision).toMatchObject({ outcome: 'renewed', action: 'stay', sticky: false, settle: true, rebase: null });
	});

	test('box not saved (capability): navigate, or stay without a rebase when edits arrived', () => {
		const text = wrap(payload({ inPlace: false, reason: 'capability', box: 'capability', values: undefined }));
		expect(classify(base({ reply: { kind: 'http', status: 200, text } })).action).toBe('navigate');

		const stay = classify(base({ reply: { kind: 'http', status: 200, text }, midFlight: true }));
		expect(stay).toMatchObject({ outcome: 'partial', action: 'stay', rebase: null, sticky: true });
	});

	test('opaque redirect: logged out retries in place; logged in or silent goes sticky', () => {
		expect(classify(base({ reply: { kind: 'opaque' }, auth: false }))).toMatchObject({ outcome: 'retry', sticky: false });
		expect(classify(base({ reply: { kind: 'opaque' }, auth: true }))).toMatchObject({ outcome: 'failed', sticky: true });
		expect(classify(base({ reply: { kind: 'opaque' }, auth: null }))).toMatchObject({ outcome: 'failed', sticky: true });
	});

	test('403 refreshes nonces and retries; a second 403 goes native', () => {
		const reply = { kind: 'http' as const, status: 403, text: '<body id="error-page">The link you followed has expired.</body>' };
		expect(classify(base({ reply }))).toMatchObject({ outcome: 'retry', refreshNonces: true, sticky: false });
		expect(classify(base({ reply, refusedBefore: true }))).toMatchObject({ outcome: 'retry', sticky: true });
	});

	test('5xx or a network failure: failed, in place next time', () => {
		expect(classify(base({ reply: { kind: 'http', status: 500, text: 'fatal' } }))).toMatchObject({ outcome: 'failed', sticky: false });
		expect(classify(base({ reply: { kind: 'network' } }))).toMatchObject({ outcome: 'failed', sticky: false });
	});

	test('a 5xx die page, or a second 5xx, goes native so the server\'s error shows', () => {
		const died = { kind: 'http' as const, status: 500, text: '<body id="error-page">Sorry, you are not allowed to edit this post.</body>' };
		expect(classify(base({ reply: died }))).toMatchObject({ outcome: 'failed', sticky: true });
		expect(classify(base({ reply: { kind: 'http', status: 502, text: 'bad gateway' }, serverErrorBefore: true }))).toMatchObject({ outcome: 'failed', sticky: true });
	});

	test('another box on the form was not saved: navigate, or stay sticky without a settle', () => {
		const text = wrap(payload({ inPlace: false, reason: 'others' }));
		expect(classify(base({ reply: { kind: 'http', status: 200, text } })).action).toBe('navigate');

		const stay = classify(base({ reply: { kind: 'http', status: 200, text }, midFlight: true }));
		expect(stay).toMatchObject({ outcome: 'partial', action: 'stay', sticky: true, settle: false, rebase: { f: 'a', n: 3 } });
		expect(stay.notice?.kind).toBe('error');
	});

	test('2xx without sentinels, or another post: failed, sticky', () => {
		expect(classify(base({ reply: { kind: 'http', status: 200, text: '<html>edit screen</html>' } }))).toMatchObject({ outcome: 'failed', sticky: true });
		expect(classify(base({ reply: { kind: 'http', status: 200, text: wrap(payload({ postId: 8 })) } }))).toMatchObject({ outcome: 'failed', sticky: true });
	});

	test('saved with edits made during the save: a warning, not "updated"', () => {
		const decision = classify(base({ midFlight: true }));
		expect(decision).toMatchObject({ outcome: 'saved', action: 'stay', sticky: false, settle: true, rebase: { f: 'a', n: 3 } });
		expect(decision.notice).toMatchObject({ kind: 'warning', text: expect.stringContaining('newer changes') });
	});

	test('a hook changed the status: navigate, or block further saves when edits arrived', () => {
		const text = wrap(payload({ inPlace: false, reason: 'status', status: 'pending' }));
		expect(classify(base({ reply: { kind: 'http', status: 200, text }, status: 'publish' })).action).toBe('navigate');

		const stay = classify(base({ reply: { kind: 'http', status: 200, text }, status: 'publish', midFlight: true }));
		expect(stay).toMatchObject({ outcome: 'partial', action: 'stay', sticky: true, settle: false, block: true, rebase: { f: 'a', n: 3 } });
		expect(stay.notice?.kind).toBe('error');

		// A stale box nonce would otherwise stay and retry in place with the old status.
		const nonce = wrap(payload({ inPlace: false, reason: 'nonce', box: 'nonce', status: 'pending', values: undefined }));
		expect(classify(base({ reply: { kind: 'http', status: 200, text: nonce }, status: 'publish' })).action).toBe('navigate');
		expect(classify(base({ reply: { kind: 'http', status: 200, text: nonce }, status: 'publish', midFlight: true }))).toMatchObject({ block: true, rebase: null });

		expect(classify(base({ status: 'publish' })).outcome).toBe('saved');
	});

	test('another box failed while this one did not save cleanly: no settle GET', () => {
		const nonce = wrap(payload({ inPlace: false, reason: 'nonce', box: 'nonce', values: undefined, othersFailed: true }));
		expect(classify(base({ reply: { kind: 'http', status: 200, text: nonce } }))).toMatchObject({ outcome: 'renewed', settle: false });

		const errors = wrap(payload({ inPlace: false, reason: 'errors', errors: { n: 'Too big.' }, othersFailed: true }));
		expect(classify(base({ reply: { kind: 'http', status: 200, text: errors }, midFlight: true }))).toMatchObject({ outcome: 'partial', settle: false });
	});

	test('a cross-origin location falls back to the edit link', () => {
		const text = wrap(payload({ inPlace: false, reason: 'location', location: 'https://evil.example/x' }));
		expect(classify(base({ reply: { kind: 'http', status: 200, text } })).location).toBe('http://localhost/post.php?post=7&action=edit');
	});
});

describe('store.rebase()', () => {
	test('moves the baseline only: values, identity and later edits stay', () => {
		const rows = [{ a: '1' }];
		const store = createStore({ f: 'a', rows });
		const seen: string[][] = [];
		store.subscribe((_values, changed) => seen.push(changed));

		store.setValue('f', 'X');
		const snapshot = JSON.parse(JSON.stringify(store.get())) as Values;
		store.setValue('f', 'Y');

		store.rebase(snapshot);

		expect(store.get().f).toBe('Y');
		expect(store.get().rows).toBe(rows);
		expect(store.isDirty()).toBe(true);
		expect(store.dirtyIds()).toEqual(['f']);
		expect(seen[seen.length - 1]).toEqual([]);

		store.setValue('f', 'X');
		expect(store.isDirty()).toBe(false);
	});

	test('A→X→A: the server sanitised another value, so the reverted field is dirty against it', () => {
		const store = createStore({ f: 'A', g: ' pad ' });
		store.setValue('f', 'X');
		store.setValue('f', 'A');
		store.rebase({ f: 'X', g: 'pad' });
		expect(store.dirtyIds().sort()).toEqual(['f', 'g']);
	});
});

const flush = async (): Promise<void> => {
	for (let i = 0; i < 6; i += 1) {
		await Promise.resolve();
	}
};

describe('controller', () => {
	const settleHtml = `<html><body><div id="wpbody-content">
		<div class="notice notice-warning"><p>Queued by a plugin</p></div>
		<div class="wrap"><hr class="wp-header-end"><div id="message" class="updated notice"><p>Model Updated</p></div>
		<form><input id="post_ID" value="7"><input id="_wpnonce" value="core3"><input id="${BOX_NONCE}" value="box3"><input id="active_post_lock" value="300:1"></form>
		</div></div></body></html>`;

	const reply = (text: string, status = 200) => ({ type: 'basic', status, ok: status < 400, text: async () => text });

	const setup = () => {
		const form = fixture();
		const store = createStore({ f: 'a', n: 3 });
		const busy: boolean[] = [];
		const results: string[] = [];
		const updates: Array<Record<string, unknown>> = [];

		document.addEventListener('bfields:update', (event) => updates.push((event as CustomEvent).detail));

		const controller = createController({
			form,
			unique: UNIQUE,
			input: MIRROR,
			editor: EDITOR,
			store,
			onBusy: (value) => busy.push(value),
			onResult: ({ outcome }) => results.push(outcome),
			authTimeout: 10,
		});

		return { form, store, busy, results, updates, controller };
	};

	test('success: one POST, nonces and lock adopted, notice, speech, settle', async () => {
		const { store, busy, results, updates, controller } = setup();
		const fetch = window.fetch as jest.Mock;

		fetch.mockResolvedValueOnce(reply(wrap(payload({ values: { f: 'b', n: 3 } })))).mockResolvedValueOnce(reply(settleHtml));
		document.querySelector('.wrap')?.insertAdjacentHTML('afterbegin', `<div class="notice notice-error inline bfields-box-notice" data-unique="${UNIQUE}"><p>old</p></div>`);

		store.setValue('f', 'b');
		(document.getElementById(MIRROR) as HTMLTextAreaElement).value = JSON.stringify(store.get());
		expect(store.isDirty()).toBe(true);

		const event = { preventDefault: jest.fn() };
		expect(controller.click(event)).toBe(true);
		expect(event.preventDefault).toHaveBeenCalled();
		expect(controller.busy()).toBe(true);

		// A second click while in flight is swallowed.
		const again = { preventDefault: jest.fn() };
		expect(controller.click(again)).toBe(true);
		expect(fetch).toHaveBeenCalledTimes(1);

		const [url, init] = fetch.mock.calls[0];
		expect(url).toBe('http://localhost/post.php');
		expect(init).toMatchObject({ method: 'POST', credentials: 'same-origin', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
		expect(init.headers.Accept).toBeUndefined();

		await flush();
		await flush();

		expect(busy).toEqual([true, false]);
		expect(results).toEqual(['saved']);
		expect(updates[0]).toMatchObject({ unique: UNIQUE, postId: 7, outcome: 'saved' });
		expect(document.querySelector('.bfields-toast')?.textContent).toBe('Model Updated');
		expect(document.querySelector('#message')).toBeNull();
		expect(document.querySelector('.bfields-box-notice')).toBeNull();
		expect(speak).toHaveBeenCalledWith('Model Updated', 'polite');

		// Settle GET adopted its notices, nonces and lock.
		expect(fetch).toHaveBeenCalledTimes(2);
		expect(document.body.textContent).toContain('Queued by a plugin');
		expect((document.getElementById('_wpnonce') as HTMLInputElement).value).toBe('core3');
		expect((document.getElementById(BOX_NONCE) as HTMLInputElement).value).toBe('box3');
		expect((document.getElementById('active_post_lock') as HTMLInputElement).value).toBe('300:1');
		expect(document.querySelectorAll('#message')).toHaveLength(0);
		expect(document.querySelectorAll('.bfields-toast')).toHaveLength(1);
		expect(store.isDirty()).toBe(false);
	});

	test('a fetch failure keeps the edits dirty and guards leaving', async () => {
		const { store, results, controller } = setup();
		(window.fetch as jest.Mock).mockRejectedValueOnce(new TypeError('offline'));
		const add = jest.spyOn(window, 'addEventListener');

		store.setValue('f', 'b');
		(document.getElementById(MIRROR) as HTMLTextAreaElement).value = JSON.stringify(store.get());

		controller.click({ preventDefault: jest.fn() });
		await flush();

		expect(results).toEqual(['failed']);
		expect(store.isDirty()).toBe(true);
		expect(add.mock.calls.some(([type]) => type === 'beforeunload')).toBe(true);

		// The guard is live after the outcome, not only while in flight.
		const leave = new Event('beforeunload', { cancelable: true });
		window.dispatchEvent(leave);
		expect(leave.defaultPrevented).toBe(true);

		expect(document.querySelector('.bfields-update-notice')?.className).toContain('notice-error');
		expect(speak).toHaveBeenCalledWith(expect.stringContaining('Could not confirm'), 'assertive');
		add.mockRestore();
		controller.dispose();
	});

	test('saved with edits made during the save: those edits stay guarded', async () => {
		const { store, results, controller } = setup();
		const fetch = window.fetch as jest.Mock;
		let resolve: (value: unknown) => void = () => undefined;
		fetch.mockReturnValueOnce(new Promise((done) => (resolve = done))).mockResolvedValueOnce(reply(settleHtml));

		store.setValue('f', 'b');
		(document.getElementById(MIRROR) as HTMLTextAreaElement).value = JSON.stringify(store.get());
		controller.click({ preventDefault: jest.fn() });

		store.setValue('n', 4);
		resolve(reply(wrap(payload({ values: { f: 'b', n: 3 } }))));
		await flush();
		await flush();

		expect(results).toEqual(['saved']);
		expect(store.dirtyIds()).toEqual(['n']);

		const leave = new Event('beforeunload', { cancelable: true });
		window.dispatchEvent(leave);
		expect(leave.defaultPrevented).toBe(true);
		controller.dispose();
	});

	test('a click while the settle GET runs waits for it, so the GET cannot consume the next save\'s errors', async () => {
		const { store, busy, results, controller } = setup();
		const fetch = window.fetch as jest.Mock;
		let settled: (value: unknown) => void = () => undefined;
		fetch
			.mockResolvedValueOnce(reply(wrap(payload({ values: { f: 'b', n: 3 } }))))
			.mockReturnValueOnce(new Promise((done) => (settled = done)))
			.mockResolvedValueOnce(reply(wrap(payload({ values: { f: 'c', n: 3 } }))))
			.mockResolvedValueOnce(reply(settleHtml));

		store.setValue('f', 'b');
		(document.getElementById(MIRROR) as HTMLTextAreaElement).value = JSON.stringify(store.get());
		controller.click({ preventDefault: jest.fn() });
		await flush();
		expect(fetch).toHaveBeenCalledTimes(2);

		store.setValue('f', 'c');
		(document.getElementById(MIRROR) as HTMLTextAreaElement).value = JSON.stringify(store.get());
		const event = { preventDefault: jest.fn() };
		expect(controller.click(event)).toBe(true);
		expect(event.preventDefault).toHaveBeenCalled();
		expect(controller.busy()).toBe(true);
		await flush();
		expect(fetch).toHaveBeenCalledTimes(2);

		settled(reply(settleHtml));
		await flush();
		await flush();

		expect(fetch).toHaveBeenCalledTimes(4);
		expect(fetch.mock.calls[2][1]).toMatchObject({ method: 'POST' });
		expect(results).toEqual(['saved', 'saved']);
		expect(busy[busy.length - 1]).toBe(false);
		controller.dispose();
	});

	test('a click that waited on the settle GET and is no longer eligible goes native', async () => {
		const form = fixture();
		const store = createStore({ f: 'a', n: 3 });
		const native = jest.fn();
		const fetch = window.fetch as jest.Mock;
		let settled: (value: unknown) => void = () => undefined;
		fetch.mockResolvedValueOnce(reply(wrap(payload()))).mockReturnValueOnce(new Promise((done) => (settled = done)));

		const controller = createController({ form, unique: UNIQUE, input: MIRROR, editor: EDITOR, store, onBusy: () => undefined, onResult: () => undefined, native });
		controller.click({ preventDefault: jest.fn() });
		await flush();

		(form.elements.namedItem('post_status') as HTMLSelectElement).value = 'draft';
		expect(controller.click({ preventDefault: jest.fn() })).toBe(true);
		settled(reply(settleHtml));
		await flush();

		expect(native).toHaveBeenCalledTimes(1);
		expect(fetch).toHaveBeenCalledTimes(2);
		controller.dispose();
	});

	test('flight guards: trash and requestSubmit are blocked; only the classes we added come off', async () => {
		const { form, controller } = setup();
		let resolve: (value: unknown) => void = () => undefined;
		(window.fetch as jest.Mock).mockReturnValueOnce(new Promise((done) => (resolve = done)));

		const preview = document.createElement('a');
		preview.id = 'post-preview';
		preview.className = 'disabled';
		document.getElementById('submitpost')?.appendChild(preview);

		controller.click({ preventDefault: jest.fn() });

		const trash = document.querySelector('a.submitdelete') as HTMLAnchorElement;
		expect(trash.classList.contains('disabled')).toBe(true);

		// autosave-enable-buttons drops the class mid-flight: the capture guard still holds.
		trash.classList.remove('disabled');
		const click = new MouseEvent('click', { bubbles: true, cancelable: true });
		trash.dispatchEvent(click);
		expect(click.defaultPrevented).toBe(true);

		const submit = new Event('submit', { bubbles: true, cancelable: true });
		form.dispatchEvent(submit);
		expect(submit.defaultPrevented).toBe(true);

		resolve({ type: 'basic', status: 500, ok: false, text: async () => 'fatal' });
		await flush();

		expect(document.getElementById('publish')?.classList.contains('disabled')).toBe(false);
		expect(preview.classList.contains('disabled')).toBe(true);

		const after = new MouseEvent('click', { bubbles: true, cancelable: true });
		trash.addEventListener('click', (event) => event.preventDefault());
		trash.dispatchEvent(after);
		expect(controller.busy()).toBe(false);
	});

	test('the settle GET carries the save\'s token, so it only consumes that save\'s errors', async () => {
		const { controller } = setup();
		const fetch = window.fetch as jest.Mock;
		fetch.mockResolvedValueOnce(reply(wrap(payload({ token: 'tok1' })))).mockResolvedValueOnce(reply(settleHtml));

		controller.click({ preventDefault: jest.fn() });
		await flush();
		await flush();

		const url = new URL(fetch.mock.calls[1][0]);
		expect(url.searchParams.get('bfields_settle')).toBe('tok1');
		expect(url.searchParams.get('message')).toBe('1');
		controller.dispose();
	});

	test('a status changed under the form blocks every later save from this page', async () => {
		const form = fixture();
		const store = createStore({ f: 'a', n: 3 });
		const native = jest.fn();
		const fetch = window.fetch as jest.Mock;
		let resolve: (value: unknown) => void = () => undefined;
		fetch.mockReturnValueOnce(new Promise((done) => (resolve = done)));

		const controller = createController({ form, unique: UNIQUE, input: MIRROR, editor: EDITOR, store, onBusy: () => undefined, onResult: () => undefined, native });
		controller.click({ preventDefault: jest.fn() });

		store.setValue('n', 4);
		(document.getElementById(MIRROR) as HTMLTextAreaElement).value = JSON.stringify(store.get());
		resolve(reply(wrap(payload({ inPlace: false, reason: 'status', status: 'pending' }))));
		await flush();
		await flush();

		expect(store.dirtyIds()).toEqual(['n']);
		document.querySelector('.bfields-update-notice')?.remove();

		const event = { preventDefault: jest.fn() };
		expect(controller.click(event)).toBe(true);
		expect(event.preventDefault).toHaveBeenCalled();
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(native).not.toHaveBeenCalled();
		expect(document.querySelector('.bfields-update-notice')?.textContent).toContain('status was changed');

		const leave = new Event('beforeunload', { cancelable: true });
		window.dispatchEvent(leave);
		expect(leave.defaultPrevented).toBe(true);
		controller.dispose();
	});

	test('the leave guard comes back when the native submit it was dropped for never happens', async () => {
		const { form, store, controller } = setup();
		(window.fetch as jest.Mock).mockRejectedValueOnce(new TypeError('offline'));

		store.setValue('f', 'b');
		(document.getElementById(MIRROR) as HTMLTextAreaElement).value = JSON.stringify(store.get());
		controller.click({ preventDefault: jest.fn() });
		await flush();

		const leaving = (): boolean => {
			const event = new Event('beforeunload', { cancelable: true });
			window.dispatchEvent(event);
			return event.defaultPrevented;
		};
		expect(leaving()).toBe(true);

		// Ineligible: the caller clicks core's button, which core (or the browser) stops.
		postChanged = true;
		expect(controller.click({ preventDefault: jest.fn() })).toBe(false);
		expect(leaving()).toBe(false);
		await new Promise((done) => setTimeout(done, 5));
		expect(leaving()).toBe(true);

		// A submit that goes through keeps it dropped.
		expect(controller.click({ preventDefault: jest.fn() })).toBe(false);
		form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		await new Promise((done) => setTimeout(done, 5));
		expect(leaving()).toBe(false);
		controller.dispose();
	});

	test('an ineligible click is left to core', () => {
		const { controller } = setup();
		postChanged = true;
		const event = { preventDefault: jest.fn() };
		expect(controller.click(event)).toBe(false);
		expect(event.preventDefault).not.toHaveBeenCalled();
		expect(window.fetch).not.toHaveBeenCalled();
	});

	test('a server that does not speak the protocol makes the next click native', async () => {
		const { results, controller } = setup();
		(window.fetch as jest.Mock).mockResolvedValueOnce(reply('<html>edit screen</html>'));

		controller.click({ preventDefault: jest.fn() });
		await flush();

		expect(results).toEqual(['failed']);
		expect(controller.click({ preventDefault: jest.fn() })).toBe(false);
	});

	test('an opaque redirect with no heartbeat answer is not retried on its own', async () => {
		const { results, controller } = setup();
		(window.fetch as jest.Mock).mockResolvedValueOnce({ type: 'opaqueredirect', status: 0, ok: false, text: async () => '' });

		controller.click({ preventDefault: jest.fn() });
		await new Promise((done) => setTimeout(done, 30));
		await flush();

		expect(results).toEqual(['failed']);
		expect(window.fetch).toHaveBeenCalledTimes(1);
	});
});

describe('adoptNotices()', () => {
	test('copies queued notices, never #message, hidden ones or duplicates, and drops scripts', () => {
		fixture();
		document.querySelector('.wrap')?.insertAdjacentHTML('afterbegin', '<div class="notice notice-info"><p>Already here</p></div>');

		const doc = new DOMParser().parseFromString(
			`<div id="wpbody-content">
				<div class="notice notice-info"><p>Already here</p></div>
				<div class="notice notice-warning"><p>New one</p><script>window.ran = 1</script></div>
				<div class="notice hidden"><p>Hidden</p></div>
				<div class="wrap"><div id="message" class="updated"><p>Updated</p></div><div class="error"><p>Plugin error</p></div></div>
			</div>`,
			'text/html'
		);

		expect(adoptNotices(doc)).toBe(2);
		expect(document.body.textContent).toContain('New one');
		expect(document.body.textContent).toContain('Plugin error');
		expect(document.body.textContent).not.toContain('Hidden');
		expect(document.querySelectorAll('#message')).toHaveLength(0);
		expect(document.querySelector('script')).toBeNull();
	});

	test('a live notice that common.js and pageNotices.ts gave buttons is not copied again', () => {
		fixture();
		document
			.querySelector('.wrap')
			?.insertAdjacentHTML(
				'afterbegin',
				'<div class="notice notice-info is-dismissible bp3d-analytics-notice"><p>Turn on analytics</p><button type="button" class="bfields-notice__more">Show more</button><button type="button" class="notice-dismiss"><span class="screen-reader-text">Dismiss this notice.</span></button></div>'
			);

		const doc = new DOMParser().parseFromString(
			'<div id="wpbody-content"><div class="wrap"><div class="notice notice-info is-dismissible bp3d-analytics-notice">\n\t<p>Turn on analytics</p>\n</div></div></div>',
			'text/html'
		);

		expect(noticeKey(document.querySelector('.bp3d-analytics-notice') as Element)).toBe(noticeKey(doc.querySelector('.bp3d-analytics-notice') as Element));
		expect(adoptNotices(doc)).toBe(0);
		expect(adoptNotices(doc)).toBe(0);
		expect(document.querySelectorAll('.bp3d-analytics-notice')).toHaveLength(1);
	});
});

describe('EditorShell', () => {
	const field = { id: 'f', type: 'text', core: 'text', title: 'F', props: {}, default: '' } as unknown as Field;
	const boot = {
		schema: { schema: 1, unique: UNIQUE, args: {}, sections: [{ id: 's', slug: 's', title: 'S', icon: '', layout: 'rows', fields: [field] }] },
		values: { f: 'a' },
	} as unknown as BootPayload;
	const editor = (over: Partial<EditorBoot> = {}): EditorBoot => ({
		heading: 'Edit',
		title: 'Bee',
		titleInput: '',
		shortcode: '',
		hint: '',
		sideHeading: '',
		published: true,
		status: 'publish',
		trashUrl: '',
		trashLabel: 'Move to Trash',
		...over,
	});

	const mount = (over: Partial<EditorBoot>) => {
		fixture();
		const store = createStore({ f: 'a' });
		const root = createRoot(document.getElementById('frame') as HTMLElement);
		act(() => root.render(createElement(EditorShell, { boot, store, input: MIRROR, editor: editor(over) })));
		return { root, store };
	};

	test('opted in: Update posts in the background and shows busy, then Saved', async () => {
		const { root } = mount({ updateInPlace: true, postId: 7, updatedNotice: 'Model Updated' });
		const fetch = window.fetch as jest.Mock;
		let resolve: (value: unknown) => void = () => undefined;
		fetch.mockReturnValueOnce(new Promise((done) => (resolve = done))).mockResolvedValueOnce({ type: 'basic', status: 200, ok: true, text: async () => '' });
		const core = jest.fn();
		document.getElementById('publish')?.addEventListener('click', core);

		const primary = document.querySelector('.bfields-btn--primary') as HTMLButtonElement;
		act(() => primary.click());

		expect(core).not.toHaveBeenCalled();
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(primary.getAttribute('aria-busy')).toBe('true');
		expect(primary.getAttribute('aria-disabled')).toBe('true');
		expect(primary.querySelector('.screen-reader-text')?.textContent).toBe('Update');

		await act(async () => {
			resolve({ type: 'basic', status: 200, ok: true, text: async () => wrap(payload({ values: { f: 'a' } })) });
			await flush();
		});

		expect(primary.getAttribute('aria-busy')).toBeNull();
		expect(document.querySelector('.bfields-publish__saved')?.textContent).toBe('Saved');
		act(() => root.unmount());
	});

	test('a failed Update after a saved one drops "Saved" and points at the notice', async () => {
		const { root } = mount({ updateInPlace: true, postId: 7, updatedNotice: 'Model Updated' });
		const fetch = window.fetch as jest.Mock;
		fetch
			.mockResolvedValueOnce({ type: 'basic', status: 200, ok: true, text: async () => wrap(payload({ values: { f: 'a' } })) })
			.mockResolvedValueOnce({ type: 'basic', status: 200, ok: true, text: async () => '' })
			.mockRejectedValueOnce(new TypeError('offline'));

		const primary = document.querySelector('.bfields-btn--primary') as HTMLButtonElement;

		await act(async () => {
			primary.click();
			await flush();
			await flush();
		});
		expect(document.querySelector('.bfields-publish__saved')).not.toBeNull();

		await act(async () => {
			primary.click();
			await flush();
			await flush();
		});

		expect(document.querySelector('.bfields-publish__saved')).toBeNull();

		// No readable answer: the post may have saved, so not "Not saved".
		const pointer = document.querySelector('.bfields-publish__unsaved') as HTMLButtonElement;
		expect(pointer?.textContent).toContain('Not confirmed');

		act(() => pointer.click());
		expect(document.activeElement?.classList.contains('bfields-update-notice')).toBe(true);

		// Dismissed notice: the pointer brings the same message back.
		document.querySelector('.bfields-update-notice')?.remove();
		act(() => pointer.click());
		expect(document.querySelector('.bfields-update-notice')?.textContent).toContain('Could not confirm');
		expect(document.activeElement?.classList.contains('bfields-update-notice')).toBe(true);
		act(() => root.unmount());
	});

	test('a title edit after a save, or a field edit during it, is not shown as Saved', async () => {
		const { root, store } = mount({ updateInPlace: true, postId: 7, updatedNotice: 'Model Updated' });
		const fetch = window.fetch as jest.Mock;
		let resolve: (value: unknown) => void = () => undefined;
		const settleReply = { type: 'basic', status: 200, ok: true, text: async () => '' };
		fetch
			.mockResolvedValueOnce({ type: 'basic', status: 200, ok: true, text: async () => wrap(payload({ values: { f: 'a' } })) })
			.mockResolvedValueOnce(settleReply)
			.mockReturnValueOnce(new Promise((done) => (resolve = done)))
			.mockResolvedValueOnce(settleReply);

		const primary = document.querySelector('.bfields-btn--primary') as HTMLButtonElement;

		await act(async () => {
			primary.click();
			await flush();
			await flush();
		});
		expect(document.querySelector('.bfields-publish__saved')).not.toBeNull();

		const title = document.querySelector('.bfields-title-input') as HTMLInputElement;
		act(() => {
			Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(title, 'Bee 2');
			title.dispatchEvent(new Event('input', { bubbles: true }));
		});
		expect(document.querySelector('.bfields-publish__saved')).toBeNull();

		act(() => primary.click());
		act(() => store.setValue('f', 'b'));
		await act(async () => {
			resolve({ type: 'basic', status: 200, ok: true, text: async () => wrap(payload({ values: { f: 'a' } })) });
			await flush();
			await flush();
		});

		expect(document.querySelector('.bfields-publish__saved')).toBeNull();
		expect(document.querySelector('.bfields-publish__unsaved')?.textContent).toContain('Partly saved');
		expect(document.querySelector('.bfields-update-notice')?.className).toContain('notice-warning');
		act(() => root.unmount());
	});

	test('not opted in: Update clicks core\'s button as before', () => {
		const { root } = mount({});
		const core = jest.fn((event: Event) => event.preventDefault());
		document.getElementById('publish')?.addEventListener('click', core);

		act(() => (document.querySelector('.bfields-btn--primary') as HTMLButtonElement).click());

		expect(core).toHaveBeenCalledTimes(1);
		expect(window.fetch).not.toHaveBeenCalled();
		act(() => root.unmount());
	});
});
