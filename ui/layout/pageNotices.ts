/**
 * bfields — page frame, settings pages and the `notices` bundle: admin notices
 * are drawn one line each (notices.css). A line cut short carries its full text
 * as a tooltip and gets a "Show more" button that unclips the notice (click,
 * keyboard or touch). Notices added later, by common.js or by other plugins,
 * are picked up too.
 */

import { __ } from '@wordpress/i18n';

const BASE = ':is(.notice, div.updated, div.error, div.update-nag, .tutor-user-registration-notice)';
const NOTICES = `#wpbody-content ${BASE}:not(.hidden, .hide-if-js, .inline)`;
const TEXT = ':is(p, h1, h2, h3, h4, li, div)';
const EXPANDED = 'bfields-notice--expanded';
const TOGGLE = 'bfields-notice__more';

let started = false;

const isClipped = (node: HTMLElement): boolean =>
	node.scrollWidth > node.clientWidth + 1 && getComputedStyle(node).textOverflow === 'ellipsis';

function toggleFor(notice: HTMLElement): HTMLButtonElement {
	const existing = notice.querySelector<HTMLButtonElement>(`:scope > .${TOGGLE}`);

	if (existing) {
		return existing;
	}

	const button = document.createElement('button');

	button.type = 'button';
	button.className = TOGGLE;
	button.setAttribute('aria-expanded', 'false');
	button.textContent = __('Show more', 'bfields');
	button.addEventListener('click', () => {
		const open = notice.classList.toggle(EXPANDED);

		button.setAttribute('aria-expanded', String(open));
		button.textContent = open ? __('Show less', 'bfields') : __('Show more', 'bfields');
	});

	// Before core's dismiss button, so Tab reaches it first.
	notice.insertBefore(button, notice.querySelector(':scope > .notice-dismiss'));

	return button;
}

function run(): void {
	document.querySelectorAll<HTMLElement>(NOTICES).forEach((notice) => {
		if (notice.classList.contains(EXPANDED)) {
			return;
		}

		const clipped = Array.from(notice.querySelectorAll<HTMLElement>(TEXT)).filter(isClipped);

		clipped.forEach((node) => {
			if (!node.title) {
				node.title = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
			}
		});

		if (clipped.length) {
			toggleFor(notice).hidden = false;
		} else {
			const toggle = notice.querySelector<HTMLButtonElement>(`:scope > .${TOGGLE}`);

			if (toggle) {
				toggle.hidden = true;
			}
		}
	});
}

export default function titleClippedNotices(): void {
	if (started) {
		return;
	}

	started = true;

	let frame = 0;
	const schedule = (): void => {
		if (!frame) {
			frame = window.requestAnimationFrame(() => {
				frame = 0;
				run();
			});
		}
	};

	// common.js moves notices under the heading on DOMContentLoaded; measure after it.
	window.setTimeout(run, 0);
	window.addEventListener('load', schedule);
	window.addEventListener('resize', schedule);

	if (typeof MutationObserver === 'undefined') {
		return;
	}

	// Only additions that are or hold a notice, so the frame's own React renders cost nothing.
	const holdsNotice = (node: Node): boolean =>
		node instanceof Element && (node.matches(BASE) || node.querySelector(BASE) !== null);

	new MutationObserver((records) => {
		if (records.some((record) => Array.from(record.addedNodes).some(holdsNotice))) {
			schedule();
		}
	}).observe(document.getElementById('wpbody-content') ?? document.body, { childList: true, subtree: true });
}
