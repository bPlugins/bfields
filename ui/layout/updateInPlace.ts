/**
 * bfields — Update without a reload (`'page' => ['update_in_place' => true]`).
 *
 * The page frame's Update sends the SAME #post form to the same post.php in the
 * background, so the server runs today's save untouched (core nonce, edit_post(),
 * every save_post hook, Metabox::save()). Only the answer differs: the request
 * carries `bfields_in_place`, and Metabox::redirect_location() replies with a
 * JSON payload between two sentinels instead of the 302.
 *
 * Anything unusual falls back to today: an ineligible click goes through core's
 * own button, and an unusual answer navigates to the edit screen or leaves the
 * next click to the native submit. A save is never retried on its own.
 */

import { __ } from '@wordpress/i18n';
import { identical } from '../core/store';
import type { Store } from '../core/store';
import type { Values } from '../core/types';
import { hideToast, plainText, showToast } from './toast';

export const MARKER = 'bfields_in_place';
export const SETTLE = 'bfields_settle';
export const BEGIN = 'BFIELDS-UIP-BEGIN';
export const END = 'BFIELDS-UIP-END';

/** What Metabox::in_place_response() sends. */
export type Payload = {
	bfields: 'update-in-place';
	version: number;
	postId: number;
	unique: string;
	inPlace: boolean;
	reason: string;
	location: string;
	status: string;
	box: string;
	errors: Record<string, string>;
	values?: Values;
	nonces: Record<string, string>;
	lock: string;
	/** Another bfields box on the form was not saved, whatever this box did. */
	othersFailed?: boolean;
	/** Tags this save's errors transient: only a settle GET carrying it may consume it. */
	token?: string;
};

export type Outcome = 'saved' | 'partial' | 'navigate' | 'renewed' | 'retry' | 'failed';

export type InPlaceEditor = {
	published: boolean;
	status?: string;
	updateInPlace?: boolean;
	postId?: number;
	updatedNotice?: string;
	/** Extra POST names the host allows (`page.update_in_place_boxes`); a trailing `*` is a prefix. */
	inPlaceNames?: string[];
};

type JQueryHandler = { namespace?: string; selector?: string };
type JQueryLike = {
	(target: unknown): { is?(selector: string): boolean; trigger(event: string): unknown; on(event: string, fn: (...args: never[]) => void): unknown; off(event: string, fn?: (...args: never[]) => void): unknown; one(event: string, fn: (...args: never[]) => void): unknown };
	_data?: (node: unknown, key: string) => Record<string, JQueryHandler[]> | undefined;
};
type WpGlobals = {
	autosave?: { server?: { postChanged?: () => boolean } };
	heartbeat?: { connectNow?: () => void };
	a11y?: { speak?: (message: string, ariaLive?: 'polite' | 'assertive') => void };
};
type Globals = Window & { jQuery?: JQueryLike; wp?: WpGlobals; tinymce?: { triggerSave?: () => void } };

const win = (): Globals => window as Globals;

/* ------------------------------------------------------------------ eligibility */

const CORE_NAMES = new Set([
	'_wpnonce',
	'_wp_http_referer',
	'user_ID',
	'action',
	'originalaction',
	'post_author',
	'post_type',
	'original_post_status',
	'referredby',
	'_wp_original_http_referer',
	'post_ID',
	'meta-box-order-nonce',
	'closedpostboxesnonce',
	'samplepermalinknonce',
	'getpermalinknonce',
	'_ajax_linking_nonce',
	'post_title',
	'post_name',
	// post_submit_meta_box()
	'save',
	'original_publish',
	'post_status',
	'visibility',
	'post_password',
	'sticky',
	'aa',
	'mm',
	'jj',
	'hh',
	'mn',
	'ss',
]);
const CORE_PREFIXES = ['hidden_', 'cur_', 'bfields_values[', 'bfields_metabox_nonce_'];
const DATE_UNITS = ['aa', 'mm', 'jj', 'hh', 'mn'];

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** The controls a native submit would post (buttons excluded: only the submitter posts). */
export function submittable(form: HTMLFormElement): Control[] {
	return Array.from(form.elements).filter((node): node is Control => {
		if (!(node instanceof HTMLInputElement || node instanceof HTMLSelectElement || node instanceof HTMLTextAreaElement)) {
			return false;
		}

		if (!node.name || node.disabled || node.matches(':disabled')) {
			return false;
		}

		if (node instanceof HTMLInputElement) {
			const type = node.type;

			if (['submit', 'button', 'reset', 'image'].includes(type)) {
				return false;
			}

			if ((type === 'checkbox' || type === 'radio') && !node.checked) {
				return false;
			}
		}

		return true;
	});
}

/** Hidden inputs by name, taken when the frame mounts. */
export function snapshotHidden(form: HTMLFormElement): Map<string, string[]> {
	const out = new Map<string, string[]>();

	submittable(form).forEach((node) => {
		if (node instanceof HTMLInputElement && node.type === 'hidden') {
			out.set(node.name, [...(out.get(node.name) ?? []), node.value]);
		}
	});

	return out;
}

const named = (form: HTMLFormElement, name: string): Control | null => {
	const item = form.elements.namedItem(name);

	if (!item) {
		return null;
	}

	if (typeof RadioNodeList !== 'undefined' && item instanceof RadioNodeList) {
		const checked = Array.from(item).find((node) => (node as HTMLInputElement).checked);
		return (checked as Control | undefined) ?? null;
	}

	return item instanceof HTMLInputElement || item instanceof HTMLSelectElement || item instanceof HTMLTextAreaElement ? item : null;
};

const valueOf = (form: HTMLFormElement, name: string): string | null => {
	const node = named(form, name);

	if (!node) {
		return null;
	}

	if (node instanceof HTMLInputElement && node.type === 'checkbox') {
		return node.checked ? node.value : '';
	}

	return node.value;
};

/** Shown, the way core toggles these: a `hidden` class or an inline display. */
export function isShown(node: Element | null): boolean {
	if (!(node instanceof HTMLElement)) {
		return false;
	}

	if (node.style.display === 'none') {
		return false;
	}

	return node.style.display !== '' || !node.classList.contains('hidden');
}

const allowedName = (name: string, extra: string[]): boolean =>
	CORE_NAMES.has(name) ||
	CORE_PREFIXES.some((prefix) => name.startsWith(prefix)) ||
	extra.some((item) => (item.endsWith('*') ? name.startsWith(item.slice(0, -1)) : item === name));

/** A delegated handler's selector, matched the way jQuery does (`:checkbox` and friends are not CSS); unreadable counts as a match. */
function delegatesTo(node: Element, selector: string): boolean {
	try {
		const wrapped = win().jQuery?.(node);
		return typeof wrapped?.is === 'function' ? wrapped.is(selector) : node.matches(selector);
	} catch {
		return true;
	}
}

/** A plugin's submit handler on #post (or delegated above it) would not run on the background path. */
export function foreignSubmitHandlers(form: HTMLFormElement): boolean {
	if (form.onsubmit) {
		return true;
	}

	const $ = win().jQuery;

	if (!$ || typeof $._data !== 'function') {
		return false;
	}

	let bare = 0;

	for (const handler of $._data(form, 'events')?.submit ?? []) {
		const ns = handler.namespace ?? '';

		if (ns === 'edit-post' || ns === 'autosave-local') {
			continue;
		}

		if (ns !== '') {
			return true;
		}

		bare += 1;
	}

	// Core binds one bare handler for the timestamp box and one for the tags box.
	const coreBare = (document.getElementById('timestampdiv') ? 1 : 0) + (document.querySelector('div.tagsdiv') ? 1 : 0);

	if (bare > coreBare) {
		return true;
	}

	const above: unknown[] = [];

	for (let node: Node | null = form.parentNode; node; node = node.parentNode) {
		above.push(node);
	}

	above.push(window);

	return above.some((node) =>
		($._data?.(node, 'events')?.submit ?? []).some((handler) => {
			if (!handler.selector) {
				return true;
			}

			return delegatesTo(form, handler.selector);
		})
	);
}

export type EligibilityInput = {
	form: HTMLFormElement;
	editor: InPlaceEditor;
	/** Set when the server may not speak the protocol: every later click goes native. */
	sticky: boolean;
	hidden: Map<string, string[]>;
};

/** A plugin's click handler on #publish (direct, or delegated to it) would not run either: core's button is never clicked. */
export function foreignClickHandlers(button: Element): boolean {
	const $ = win().jQuery;

	if (!$ || typeof $._data !== 'function') {
		return false;
	}

	if (($._data(button, 'events')?.click ?? []).some((handler) => (handler.namespace ?? '') !== 'edit-post')) {
		return true;
	}

	for (let node: Node | null = button.parentNode; node; node = node.parentNode) {
		const delegated = ($._data(node, 'events')?.click ?? []).some((handler) => {
			return handler.selector ? delegatesTo(button, handler.selector) : false;
		});

		if (delegated) {
			return true;
		}
	}

	return false;
}

/** '' when the click may save in place, else the first check that failed (§6.1). */
export function eligible({ form, editor, sticky, hidden }: EligibilityInput): string {
	const g = win();

	if (!editor.updateInPlace || sticky) {
		return 'off';
	}

	if (!editor.published || !['publish', 'private'].includes(editor.status ?? '')) {
		return 'status';
	}

	const button = document.querySelector('#submitpost #publish');

	if (!(button instanceof HTMLInputElement || button instanceof HTMLButtonElement) || button.name !== 'save' || button.classList.contains('disabled')) {
		return 'button';
	}

	if (
		typeof g.fetch !== 'function' ||
		typeof URLSearchParams === 'undefined' ||
		typeof DOMParser === 'undefined' ||
		typeof g.wp?.autosave?.server?.postChanged !== 'function' ||
		g.wp.autosave.server.postChanged()
	) {
		return 'changed';
	}

	const shown = valueOf(form, 'post_status');
	// Core prints a private post's status select as "Privately Published" with the value 'publish'.
	const status =
		shown === 'publish' && valueOf(form, 'hidden_post_status') === 'private' && valueOf(form, 'visibility') === 'private' ? 'private' : shown;

	if (
		status !== valueOf(form, 'hidden_post_status') ||
		status !== valueOf(form, 'original_post_status') ||
		valueOf(form, 'visibility') !== valueOf(form, 'hidden_post_visibility') ||
		valueOf(form, 'post_password') !== valueOf(form, 'hidden_post_password') ||
		(valueOf(form, 'sticky') ?? '') !== (valueOf(form, 'hidden_post_sticky') ?? '') ||
		DATE_UNITS.some((unit) => valueOf(form, unit) !== valueOf(form, `hidden_${unit}`))
	) {
		return 'fields';
	}

	if (isShown(document.getElementById('post-lock-dialog')) || isShown(document.getElementById('wp-auth-check-wrap'))) {
		return 'locked';
	}

	const extra = editor.inPlaceNames ?? [];
	const current = snapshotHidden(form);

	for (const node of submittable(form)) {
		if (allowedName(node.name, extra)) {
			continue;
		}

		const isHidden = node instanceof HTMLInputElement && node.type === 'hidden';

		if (!isHidden || !identical(hidden.get(node.name), current.get(node.name))) {
			return 'controls';
		}
	}

	if (foreignSubmitHandlers(form) || foreignClickHandlers(button)) {
		return 'handlers';
	}

	if (!form.checkValidity()) {
		return 'invalid';
	}

	if ((document.characterSet || '').toUpperCase() !== 'UTF-8') {
		return 'charset';
	}

	return '';
}

/* ------------------------------------------------------------------ request */

export type InPlaceRequest = {
	url: string;
	body: string | FormData;
	/** Set for a urlencoded string body; multipart lets the browser add the boundary. */
	contentType: string | null;
	snapshot: Values;
	snapshotText: string;
};

/** Native form submission sends every line break as CRLF. */
export const crlf = (value: string): string => value.replace(/\r\n|\r|\n/g, '\r\n');

/** The form's own URL: `form.action` is clobbered by core's `<input name="action">`. */
export function actionUrl(form: HTMLFormElement): string {
	return new URL(form.getAttribute('action') || window.location.href, window.location.href).href;
}

/** The body a native click on `submitter` would send, plus the marker; null means "go native". */
export function serialize(form: HTMLFormElement, submitter: HTMLElement, unique: string, mirror: HTMLTextAreaElement | null): InPlaceRequest | null {
	win().tinymce?.triggerSave?.();

	const enctype = (form.getAttribute('enctype') || 'application/x-www-form-urlencoded').toLowerCase();

	if (enctype !== 'application/x-www-form-urlencoded' && enctype !== 'multipart/form-data') {
		return null;
	}

	let data: FormData;

	try {
		data = new FormData(form, submitter);
	} catch {
		data = new FormData(form);
	}

	const name = submitter.getAttribute('name');
	const value = (submitter as HTMLInputElement).value ?? '';

	// Browsers without the submitter argument: append it (at the end, not its DOM position).
	if (name && !data.getAll(name).includes(value)) {
		data.append(name, value);
	}

	// Taken in the same tick as the entries, so the new baseline is exactly what was posted.
	const snapshotText = mirror && !mirror.disabled ? mirror.value : '';
	let snapshot: Values;

	try {
		const parsed: unknown = JSON.parse(snapshotText);

		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return null;
		}

		snapshot = parsed as Values;
	} catch {
		return null;
	}

	const entries: Array<[string, string | File]> = [];

	for (const [key, entry] of data.entries()) {
		if (typeof entry !== 'string') {
			// A native urlencoded submit sends the file name; URLSearchParams would not.
			if (enctype !== 'multipart/form-data') {
				return null;
			}
			entries.push([crlf(key), entry]);
		} else {
			entries.push([crlf(key), crlf(entry)]);
		}
	}

	entries.push([MARKER, unique]);

	const url = actionUrl(form);

	if (enctype === 'multipart/form-data') {
		const body = new FormData();
		entries.forEach(([key, entry]) => body.append(key, entry));
		return { url, body, contentType: null, snapshot, snapshotText };
	}

	const params = new URLSearchParams();
	entries.forEach(([key, entry]) => params.append(key, entry as string));

	return { url, body: params.toString(), contentType: 'application/x-www-form-urlencoded', snapshot, snapshotText };
}

/* ------------------------------------------------------------------ response */

/** The payload between the sentinels, ignoring PHP notices before and shutdown output after. */
export function parse(text: string): Payload | null {
	const start = text.indexOf(BEGIN);

	if (start < 0) {
		return null;
	}

	const first = text.indexOf(END, start + BEGIN.length);
	const last = text.lastIndexOf(END);

	if (first < 0) {
		return null;
	}

	let data: unknown = null;

	// The server escapes the sentinel inside values; the last END is the fallback if one slips through.
	for (const end of first === last ? [first] : [first, last]) {
		try {
			data = JSON.parse(text.slice(start + BEGIN.length, end));
			break;
		} catch {
			data = null;
		}
	}

	if (!data || typeof data !== 'object') {
		return null;
	}

	const payload = data as Payload;

	if (payload.bfields !== 'update-in-place' || payload.version !== 1) {
		return null;
	}

	if (!payload.errors || typeof payload.errors !== 'object' || Array.isArray(payload.errors)) {
		payload.errors = {};
	}

	if (!payload.nonces || typeof payload.nonces !== 'object') {
		payload.nonces = {};
	}

	return payload;
}

/** Structural equality over the union of keys; nested key order still counts (stored bytes). */
export function sameValues(a: Values, b: Values): boolean {
	const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

	return [...keys].every((key) => identical(a[key], b[key]));
}

export type Reply =
	| { kind: 'network' }
	| { kind: 'opaque' }
	| { kind: 'http'; status: number; text: string };

export type ClassifyInput = {
	reply: Reply;
	unique: string;
	postId: number;
	snapshot: Values;
	midFlight: boolean;
	/** Opaque redirect only: heartbeat's `wp-auth-check` (null = no answer). */
	auth?: boolean | null;
	/** The previous attempt was a refused (403) one too. */
	refusedBefore?: boolean;
	/** The previous attempt was a 5xx without a payload too. */
	serverErrorBefore?: boolean;
	/** original_post_status the request posted; a different stored status makes this form stale. */
	status?: string;
	editLink: string;
	origin: string;
};

export type Decision = {
	outcome: Outcome;
	action: 'stay' | 'navigate';
	location: string;
	payload: Payload | null;
	rebase: Values | null;
	/** 'updated' is core's message from the boot; the others carry their text. */
	notice: { kind: 'updated' | 'error' | 'warning'; text: string } | null;
	sticky: boolean;
	settle: boolean;
	/** Field ids to mark invalid; null leaves the current marks. */
	invalid: string[] | null;
	refreshNonces: boolean;
	/** Remove this box's boot-time error notices. */
	clearBoxNotices: boolean;
	/** The form no longer matches the post: no further save from this page. */
	block?: boolean;
};

/** Same-origin URL or the fallback: navigation never leaves the site. */
export function safeLocation(url: string, origin: string, fallback: string): string {
	try {
		const parsed = new URL(url, origin);
		return parsed.origin === origin ? parsed.href : fallback;
	} catch {
		return fallback;
	}
}

const MESSAGES = {
	unclear: () => __('Could not confirm the save. Click Update again to save normally.', 'bfields'),
	connection: () => __('Could not confirm the save. Check your connection and click Update again.', 'bfields'),
	loggedOut: () => __('You were logged out. Log in, then click Update again.', 'bfields'),
	refreshed: () => __('Your session was refreshed. Click Update again.', 'bfields'),
	stale: () => __('These settings were not saved because the page was open too long. Click Update again.', 'bfields'),
	newer: () => __('Saved. Update again to save your newer changes.', 'bfields'),
	capability: () => __('These settings were not saved: your account is not allowed to change them.', 'bfields'),
	boxNotSaved: () => __('The post was saved, but these settings were not. Click Update again to save them.', 'bfields'),
	someErrors: () => __('Some settings were not saved:', 'bfields'),
	others: () => __('The post was saved, but other settings on this page were not. Click Update again to see why.', 'bfields'),
	statusChanged: () => __('The post was saved, but its status was changed on the server. Reload the page before saving again: changes made during the save were not saved.', 'bfields'),
};

/** Every row of §6.3: what to do with an answer. Pure. */
export function classify(input: ClassifyInput): Decision {
	const decision = decide(input);

	// The settle GET would render (and consume) the other box's notices: they wait for the next reload.
	return decision.payload?.othersFailed && decision.settle ? { ...decision, settle: false } : decision;
}

function decide(input: ClassifyInput): Decision {
	const { reply, unique, postId, snapshot, midFlight, editLink, origin } = input;
	const base: Decision = {
		outcome: 'failed',
		action: 'stay',
		location: editLink,
		payload: null,
		rebase: null,
		notice: null,
		sticky: false,
		settle: false,
		invalid: null,
		refreshNonces: false,
		clearBoxNotices: false,
	};

	if (reply.kind === 'network') {
		return { ...base, notice: { kind: 'error', text: MESSAGES.connection() } };
	}

	if (reply.kind === 'opaque') {
		// auth_redirect() runs before any save, so "logged out" means nothing was saved.
		return input.auth === false
			? { ...base, outcome: 'retry', notice: { kind: 'error', text: MESSAGES.loggedOut() } }
			: { ...base, sticky: true, notice: { kind: 'error', text: MESSAGES.unclear() } };
	}

	const payload = parse(reply.text);

	if (!payload) {
		const died = reply.text.includes('id="error-page"');

		// A core nonce or capability failure dies before edit_post(): nothing saved.
		if (reply.status === 403 || (died && reply.status < 500)) {
			return input.refusedBefore
				? { ...base, outcome: 'retry', sticky: true, notice: { kind: 'error', text: MESSAGES.unclear() } }
				: { ...base, outcome: 'retry', refreshNonces: true, notice: { kind: 'error', text: MESSAGES.refreshed() } };
		}

		if (reply.status >= 500) {
			// WordPress's die page, or the same failure twice, is not the connection: let the native submit show it.
			return died || input.serverErrorBefore
				? { ...base, sticky: true, notice: { kind: 'error', text: MESSAGES.unclear() } }
				: { ...base, notice: { kind: 'error', text: MESSAGES.connection() } };
		}

		return { ...base, sticky: true, notice: { kind: 'error', text: MESSAGES.unclear() } };
	}

	if (payload.postId !== postId || payload.unique !== unique) {
		return { ...base, sticky: true, notice: { kind: 'error', text: MESSAGES.unclear() } };
	}

	const location = safeLocation(payload.location, origin, editLink);
	const withPayload: Decision = { ...base, payload, location };
	const errors = payload.errors;
	const errorIds = Object.keys(errors);

	if (payload.inPlace && payload.box === 'saved' && payload.values && sameValues(payload.values, snapshot)) {
		return {
			...withPayload,
			outcome: 'saved',
			rebase: snapshot,
			// Edits made during the save are still unsaved: say so instead of "updated".
			notice: midFlight ? { kind: 'warning', text: MESSAGES.newer() } : { kind: 'updated', text: '' },
			settle: true,
			invalid: [],
			clearBoxNotices: true,
		};
	}

	// A hook changed the status: the form's status fields are stale, and a later save from it would revert that.
	if (input.status !== undefined && payload.status !== input.status) {
		if (!midFlight) {
			return { ...withPayload, outcome: 'navigate', action: 'navigate' };
		}

		return {
			...withPayload,
			outcome: 'partial',
			rebase: payload.box === 'saved' ? payload.values ?? null : null,
			notice: { kind: 'error', text: MESSAGES.statusChanged() },
			sticky: true,
			invalid: errorIds.length ? errorIds : null,
			block: true,
		};
	}

	// The post saved but the box was dropped for a stale nonce: the payload renewed it, so retry.
	if (payload.box === 'nonce') {
		return {
			...withPayload,
			outcome: 'renewed',
			notice: { kind: 'error', text: MESSAGES.stale() },
			settle: true,
			sticky: payload.reason === 'off',
		};
	}

	if (!midFlight) {
		// Saved but unusual: show it the way a reload does (errors render from the transient).
		return { ...withPayload, outcome: 'navigate', action: 'navigate' };
	}

	// Another bfields box on the form was not saved: no settle, so its notices wait for the native reload.
	if (payload.reason === 'others') {
		return {
			...withPayload,
			outcome: 'partial',
			rebase: payload.values ?? null,
			notice: { kind: 'error', text: MESSAGES.others() },
			sticky: true,
		};
	}

	if (payload.box === 'saved') {
		const text = errorIds.length ? `${MESSAGES.someErrors()} ${Object.values(errors).join(' ')}` : MESSAGES.newer();

		return {
			...withPayload,
			outcome: 'partial',
			rebase: payload.values ?? null,
			notice: { kind: errorIds.length ? 'error' : 'warning', text },
			sticky: true,
			settle: true,
			invalid: errorIds.length ? errorIds : null,
			clearBoxNotices: true,
		};
	}

	return {
		...withPayload,
		outcome: 'partial',
		notice: { kind: 'error', text: payload.box === 'capability' ? MESSAGES.capability() : MESSAGES.boxNotSaved() },
		sticky: true,
		settle: true,
	};
}

/* ------------------------------------------------------------------ DOM effects */

const NOTICE_CLASS = 'bfields-update-notice';

function trigger(event: string): void {
	const $ = win().jQuery;

	if ($) {
		$(document).trigger(event);
	}
}

function headerEnd(): { parent: Node; before: Node | null } | null {
	const end = document.querySelector('.wp-header-end');

	if (end?.parentNode) {
		return { parent: end.parentNode, before: end.nextSibling };
	}

	const wrap = document.querySelector('#wpbody-content > .wrap') ?? document.getElementById('wpbody-content');

	return wrap ? { parent: wrap, before: wrap.firstChild } : null;
}

let lastNotice: { kind: 'updated' | 'error' | 'warning'; content: string; html: boolean } | null = null;

export function clearNotices(): void {
	document.querySelectorAll(`#message, .${NOTICE_CLASS}`).forEach((node) => node.remove());
	lastNotice = null;
}

/** One notice after `.wp-header-end`, replacing the previous save's. */
export function showNotice(kind: 'updated' | 'error' | 'warning', content: string, html = false): HTMLElement | null {
	clearNotices();
	lastNotice = { kind, content, html };

	const at = headerEnd();

	if (!at) {
		return null;
	}

	const notice = document.createElement('div');
	const text = document.createElement('p');

	if (kind === 'updated') {
		notice.id = 'message';
		notice.className = `updated notice notice-success is-dismissible ${NOTICE_CLASS}`;
	} else {
		notice.className = `notice notice-${kind} is-dismissible ${NOTICE_CLASS}`;
	}

	// The updated message is core's own HTML, already wp_kses_post()ed by the server.
	if (html) {
		text.innerHTML = content;
	} else {
		text.textContent = content;
	}

	notice.appendChild(text);
	at.parent.insertBefore(notice, at.before);
	trigger('wp-notice-added');

	return notice;
}

/** Bring the last save's notice into view and move focus to it (the frame's Update stays on screen, the notice does not). */
export function revealNotice(): void {
	// Dismissed (common.js removes it): show the same message again.
	const notice = document.querySelector<HTMLElement>(`.${NOTICE_CLASS}`) ?? (lastNotice ? showNotice(lastNotice.kind, lastNotice.content, lastNotice.html) : null);

	if (!notice) {
		return;
	}

	notice.tabIndex = -1;
	notice.scrollIntoView?.({ block: 'center' });
	notice.focus({ preventScroll: true });
}

export function speak(text: string, assertive = false): void {
	win().wp?.a11y?.speak?.(text.replace(/\s+/g, ' ').trim(), assertive ? 'assertive' : 'polite');
}

/** Write each `id => value` into `#id`, as post.js does with heartbeat's nonces. */
export function adoptValues(map: Record<string, string>): void {
	Object.entries(map).forEach(([id, value]) => {
		const node = document.getElementById(id);

		if (node instanceof HTMLInputElement) {
			node.value = String(value);
		}
	});
}

/** The text the server printed: common.js and pageNotices.ts add buttons to the live copy. */
export function noticeKey(node: Element): string {
	if (node.id) {
		return `#${node.id}`;
	}

	const clone = node.cloneNode(true) as Element;
	clone.querySelectorAll('.notice-dismiss, .bfields-notice__more, script, style').forEach((item) => item.remove());

	return `${node.tagName}|${(clone.textContent ?? '').replace(/\s+/g, ' ').trim()}`;
}

/** Notices the edit screen printed (other plugins' queued ones), copied after `.wp-header-end`. */
export function adoptNotices(doc: Document): number {
	const SELECTOR = '.notice, div.updated, div.error';
	const SKIP = `#message, .hidden, #lost-connection-notice, .${NOTICE_CLASS}`;
	const present = SELECTOR.split(', ').map((item) => `#wpbody-content ${item}`).join(', ');
	const known = new Set(Array.from(document.querySelectorAll(present)).map(noticeKey));
	const sources = [doc.getElementById('wpbody-content'), doc.querySelector('#wpbody-content > .wrap')];
	const at = headerEnd();
	let count = 0;

	if (!at) {
		return 0;
	}

	let before = at.before;

	sources.forEach((source) => {
		Array.from(source?.children ?? []).forEach((node) => {
			if (!node.matches(SELECTOR) || node.matches(SKIP) || known.has(noticeKey(node))) {
				return;
			}

			const copy = document.importNode(node, true) as Element;
			copy.querySelectorAll('script').forEach((script) => script.remove());
			at.parent.insertBefore(copy, before);
			before = copy.nextSibling;
			known.add(noticeKey(node));
			count += 1;
		});
	});

	if (count) {
		trigger('wp-notice-added');
	}

	return count;
}

/* ------------------------------------------------------------------ controller */

const CORE_BUTTONS =
	'#submitpost input[type="submit"], #submitpost button[type="submit"], #submitpost button:not([type]), #submitpost a.submitdelete, #post-preview';

export type ResultInfo = {
	outcome: Outcome;
	/** Field ids to mark invalid; null leaves them. */
	invalid: string[] | null;
	notice: Decision['notice'];
};

export type ControllerOptions = {
	form: HTMLFormElement;
	unique: string;
	/** id of the mirror textarea. */
	input: string;
	editor: InPlaceEditor;
	store: Store;
	onBusy(busy: boolean): void;
	onResult(info: ResultInfo): void;
	/** Today's submit (core's button), for a click that waited on the settle GET and is not eligible any more. */
	native?(): void;
	/** Heartbeat answer wait for an opaque redirect, in ms. */
	authTimeout?: number;
	/** Longest wait for a running settle GET before a new click goes ahead, in ms. */
	settleWait?: number;
};

export type Controller = {
	/** True when the click was taken (saved in place, or swallowed while busy); false means "go native". */
	click(event: { preventDefault(): void }): boolean;
	busy(): boolean;
	/** Drop the leave guard before a native submit or navigation. */
	release(): void;
	dispose(): void;
};

function waitForAuth(timeout: number): Promise<boolean | null> {
	const g = win();
	const $ = g.jQuery;
	const connect = g.wp?.heartbeat?.connectNow;

	if (!$ || typeof connect !== 'function') {
		return Promise.resolve(null);
	}

	return new Promise((resolve) => {
		let timer = 0;

		const onTick = (_event: unknown, data: Record<string, unknown> | undefined): void => {
			if (data && 'wp-auth-check' in data) {
				done(Boolean(data['wp-auth-check']));
			}
		};

		const done = (value: boolean | null): void => {
			window.clearTimeout(timer);
			$(document).off('heartbeat-tick.bfields-uip', onTick as never);
			resolve(value);
		};

		$(document).on('heartbeat-tick.bfields-uip', onTick as never);
		timer = window.setTimeout(() => done(null), timeout);
		connect.call(g.wp?.heartbeat);
	});
}

function refreshNonces(postId: number): void {
	const g = win();
	const $ = g.jQuery;

	if (!$ || typeof g.wp?.heartbeat?.connectNow !== 'function') {
		return;
	}

	// post.js writes each returned nonce into #<key>; Metabox::refresh_nonces() adds the box's.
	$(document).one('heartbeat-send.bfields-uip', ((_event: unknown, data: Record<string, unknown>) => {
		data['wp-refresh-post-nonces'] = { post_id: String(postId) };
	}) as never);
	g.wp.heartbeat.connectNow();
}

export function createController(options: ControllerOptions): Controller {
	const { form, unique, input, editor, store } = options;
	const postId = Number(editor.postId ?? 0);
	const hidden = snapshotHidden(form);
	let inFlight = false;
	let leaving = false;
	let sticky = false;
	let armed = false;
	let refused = false;
	let serverError = false;
	let disposed = false;
	let settling: Promise<void> | null = null;
	let blocked = false;
	let seq = 0;
	let unloadOn = false;
	let undoLocks: (() => void) | null = null;

	const onUnload = (event: BeforeUnloadEvent): void => {
		event.preventDefault();
		// Older browsers need returnValue set.
		event.returnValue = '';
	};

	const syncUnload = (): void => {
		const need = !leaving && (inFlight || (armed && store.isDirty()));

		if (need && !unloadOn) {
			window.addEventListener('beforeunload', onUnload);
		} else if (!need && unloadOn) {
			window.removeEventListener('beforeunload', onUnload);
		}

		unloadOn = need;
	};

	const unsubscribe = store.subscribe(() => {
		if (armed && !store.isDirty()) {
			armed = false;
		}
		syncUnload();
	});

	const lockCore = (): (() => void) => {
		const added: Element[] = [];

		document.querySelectorAll(CORE_BUTTONS).forEach((node) => {
			if (!node.classList.contains('disabled')) {
				node.classList.add('disabled');
				added.push(node);
			}
		});

		// autosave-enable-buttons can drop the class mid-flight, so guard in capture too.
		const block = (event: Event): void => {
			const target = event.target;

			if (event.type === 'submit' ? target === form : target instanceof Element && target.closest(CORE_BUTTONS)) {
				event.preventDefault();
				event.stopPropagation();
			}
		};

		document.addEventListener('click', block, true);
		document.addEventListener('submit', block, true);

		return () => {
			added.forEach((node) => node.classList.remove('disabled'));
			document.removeEventListener('click', block, true);
			document.removeEventListener('submit', block, true);
		};
	};

	const setBusy = (busy: boolean): void => {
		inFlight = busy;

		if (busy) {
			undoLocks = lockCore();
		} else if (undoLocks) {
			undoLocks();
			undoLocks = null;
		}

		syncUnload();
		options.onBusy(busy);
	};

	const editLink = (): string => {
		const url = new URL(actionUrl(form));
		url.search = `?post=${postId}&action=edit`;
		url.hash = '';
		return url.href;
	};

	const dispatch = (name: string, detail: Record<string, unknown>): void => {
		document.dispatchEvent(new CustomEvent(name, { detail: { unique, postId, ...detail } }));
	};

	const release = (): void => {
		armed = false;
		syncUnload();
	};

	/** Drop the guard for the native submit that follows; put it back if core or the browser stops that submit. */
	const releaseForNative = (): void => {
		const wasArmed = armed;
		let submit: Event | null = null;
		const seen = (event: Event): void => {
			if (event.target === form) {
				submit = event;
			}
		};

		release();
		document.addEventListener('submit', seen, true);

		window.setTimeout(() => {
			document.removeEventListener('submit', seen, true);

			if (!disposed && !leaving && wasArmed && (!submit || (submit as Event).defaultPrevented)) {
				armed = store.isDirty();
				syncUnload();
			}
		}, 0);
	};

	const navigate = (url: string): void => {
		// Blank the lock so the leaving page's pagehide beacon cannot release the one the next page takes.
		const lock = document.getElementById('active_post_lock');

		if (lock instanceof HTMLInputElement) {
			lock.value = '';
		}

		// Stays busy while the page leaves, so no second save can start.
		leaving = true;
		release();
		window.location.assign(url);

		// Another script's leave prompt was cancelled: the data is saved, so unlock and go native next time.
		window.setTimeout(() => {
			leaving = false;
			sticky = true;
			setBusy(false);
		}, 15000);
	};

	const settle = async (location: string, token: string): Promise<void> => {
		const mine = seq;
		let ok = false;

		try {
			// The token lets this GET consume only the errors its own save wrote, never a later save's.
			const url = new URL(location, window.location.href);
			url.searchParams.set(SETTLE, token);

			const response = await window.fetch(url.href, { credentials: 'same-origin' });

			if (response.ok) {
				const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
				const id = doc.getElementById('post_ID');

				if (mine === seq && id instanceof HTMLInputElement && Number(id.value) === postId) {
					adoptNotices(doc);

					const adopt: Record<string, string> = {};

					['_wpnonce', `bfields_metabox_nonce_${unique.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`, 'active_post_lock'].forEach((key) => {
						const node = doc.getElementById(key);

						if (node instanceof HTMLInputElement) {
							adopt[key] = node.value;
						}
					});

					adoptValues(adopt);
					ok = true;
				}
			}
		} catch {
			ok = false;
		}

		if (mine === seq) {
			dispatch('bfields:update-settled', { ok });
		}
	};

	const apply = (decision: Decision): void => {
		const { payload } = decision;

		if (payload) {
			adoptValues(payload.nonces);
			adoptValues({ active_post_lock: payload.lock });
		}

		if (decision.sticky) {
			sticky = true;
		}

		if (decision.block) {
			blocked = true;
		}

		if (decision.action === 'navigate') {
			dispatch('bfields:update', { outcome: decision.outcome, location: decision.location });
			navigate(decision.location);
			return;
		}

		if (decision.rebase) {
			store.rebase(decision.rebase);
		}

		if (decision.clearBoxNotices) {
			document.querySelectorAll<HTMLElement>('.bfields-box-notice').forEach((node) => {
				if (node.dataset.unique === unique) {
					node.remove();
				}
			});
		}

		if (decision.notice && decision.notice.kind === 'updated') {
			// Success is a toast; the previous save's notice goes, as a reload would drop it.
			clearNotices();
			const text = plainText(editor.updatedNotice || __('Post updated.', 'bfields'));
			showToast(text);
			speak(text);
		} else if (decision.notice) {
			hideToast();
			const node = showNotice(decision.notice.kind, decision.notice.text);

			// The paragraph only: common.js adds a "Dismiss this notice." button beside it.
			speak(node?.querySelector('p')?.textContent ?? decision.notice.text, true);
		}

		if (decision.refreshNonces) {
			refreshNonces(postId);
		}

		// Edits the server does not hold yet: guard the page until they are saved.
		armed = store.isDirty();
		syncUnload();

		options.onResult({ outcome: decision.outcome, invalid: decision.invalid, notice: decision.notice });
		dispatch('bfields:update', { outcome: decision.outcome, location: decision.location });

		if (decision.settle) {
			const pending = settle(decision.location, payload?.token ?? '');

			settling = pending;
			void pending.then(() => {
				if (settling === pending) {
					settling = null;
				}
			});
		}
	};

	const run = async (request: InPlaceRequest, title: string, status: string): Promise<void> => {
		const mirror = document.getElementById(input) as HTMLTextAreaElement | null;
		const titleNode = document.getElementById('title') as HTMLInputElement | null;
		let reply: Reply;

		try {
			const response = await window.fetch(request.url, {
				method: 'POST',
				body: request.body,
				credentials: 'same-origin',
				redirect: 'manual',
				// No Accept header: wp_is_json_request() would change how core answers.
				headers: request.contentType ? { 'Content-Type': request.contentType } : undefined,
			});

			reply = response.type === 'opaqueredirect' ? { kind: 'opaque' } : { kind: 'http', status: response.status, text: await response.text() };
		} catch {
			reply = { kind: 'network' };
		}

		const auth = reply.kind === 'opaque' ? await waitForAuth(options.authTimeout ?? 15000) : undefined;
		const midFlight = (mirror ? mirror.value !== request.snapshotText : false) || (titleNode ? titleNode.value !== title : false);

		const decision = classify({
			reply,
			unique,
			postId,
			snapshot: request.snapshot,
			midFlight,
			auth,
			refusedBefore: refused,
			serverErrorBefore: serverError,
			status,
			editLink: editLink(),
			origin: window.location.origin,
		});

		refused = decision.outcome === 'retry' && reply.kind === 'http';
		serverError = reply.kind === 'http' && reply.status >= 500 && !decision.payload;

		if (decision.action !== 'navigate') {
			setBusy(false);
		}

		apply(decision);
	};

	/** Saves in place, or returns false (guard released) so the caller submits natively. */
	const start = (): boolean => {
		if (eligible({ form, editor, sticky, hidden })) {
			releaseForNative();
			return false;
		}

		const submitter = document.querySelector<HTMLElement>('#submitpost #publish');
		const mirror = document.getElementById(input) as HTMLTextAreaElement | null;
		const request = submitter ? serialize(form, submitter, unique, mirror) : null;

		if (!request) {
			releaseForNative();
			return false;
		}

		seq += 1;

		const title = (document.getElementById('title') as HTMLInputElement | null)?.value ?? '';
		const status = valueOf(form, 'original_post_status') ?? '';

		setBusy(true);
		void run(request, title, status).catch(() => {
			if (inFlight) {
				setBusy(false);
			}
		});

		return true;
	};

	return {
		click(event) {
			if (inFlight || leaving) {
				event.preventDefault();
				return true;
			}

			// The post's status changed under this form: neither path may post it again.
			if (blocked) {
				event.preventDefault();
				revealNotice();
				speak(MESSAGES.statusChanged(), true);
				return true;
			}

			// Let a running settle GET finish first; past the cap its token still keeps it off the next save's errors.
			if (settling) {
				const pending = settling;

				event.preventDefault();
				setBusy(true);

				void Promise.race([pending, new Promise<void>((done) => window.setTimeout(done, options.settleWait ?? 10000))]).then(() => {
					if (disposed) {
						return;
					}

					settling = null;
					setBusy(false);

					if (!start()) {
						options.native?.();
					}
				});

				return true;
			}

			if (!start()) {
				return false;
			}

			event.preventDefault();
			return true;
		},

		busy: () => inFlight,

		release,

		dispose() {
			disposed = true;
			unsubscribe();

			if (undoLocks) {
				undoLocks();
				undoLocks = null;
			}

			inFlight = false;
			armed = false;
			syncUnload();
		},
	};
}
