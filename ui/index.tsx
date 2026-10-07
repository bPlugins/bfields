/**
 * bfields — entry point.
 *
 * One bundle, one React root per screen, one window.bfields on the page (4.7
 * invariant 5). React comes from wp.element via @wordpress/element, never from
 * this bundle: the hosts pin React 19 while "Requires at least: 6.5" ships
 * React 18.2, and two Reacts on one admin page is the failure to avoid (4.6).
 */

import { createRoot } from '@wordpress/element';
import './theme/index.css';

import { createStore } from './core/store';
import { announceReady, attachStore, bfields } from './core/runtime';
import { registerBuiltinFields } from './fields';
import AdminShell from './layout/AdminShell';
import EditorShell, { type EditorBoot } from './layout/EditorShell';
import ErrorBoundary from './layout/ErrorBoundary';
import MetaboxShell from './layout/MetaboxShell';
import titleClippedNotices from './layout/pageNotices';
import type { BootPayload, RuntimeSettings } from './core/types';
import { SCHEMA_VERSION } from './core/types';

declare global {
	interface Window {
		bfields?: typeof bfields;
		bfieldsBoot?: Record<string, BootPayload>;
		bfieldsSettings?: RuntimeSettings;
	}
}

// Published before mounting, so a host script that loads first can register a
// field or an adornment and have it picked up by the render below.
window.bfields = window.bfields ?? bfields;

registerBuiltinFields();

function mount(node: HTMLElement): void {
	const unique = node.dataset.unique;

	if (!unique) {
		return;
	}

	const boot = window.bfieldsBoot?.[unique];

	if (!boot) {
		// No payload means PHP never localized this screen. Leave the node as
		// it is: whatever is stored stays stored, and the fallback notice PHP
		// printed inside it stays visible (4.6).
		return;
	}

	if (boot.schema.schema !== SCHEMA_VERSION) {
		// A stale cached bundle against a newer spine. Refuse to render rather
		// than guess at a format we do not know — guessing is how data changes
		// shape.
		throw new Error(
			`bfields: schema version mismatch (page sent ${boot.schema.schema}, bundle speaks ${SCHEMA_VERSION}). Clear any page or asset cache and reload.`
		);
	}

	const store = createStore(boot.values);

	attachStore(unique, store);

	// The server-rendered escape hatch goes only now, when the screen is about
	// to render. From here on the error boundary carries the same URL.
	node.querySelector(':scope > .bfields-fallback')?.remove();

	const editor = node.dataset.frame === 'page' ? pageEditor(node.dataset.editor) : undefined;

	if (editor || document.body.classList.contains('bfields-screen')) {
		titleClippedNotices();
	}

	createRoot(node).render(
		<ErrorBoundary fallbackUrl={node.dataset.fallback}>
			{editor ? (
				<EditorShell
					boot={boot}
					store={store}
					input={node.dataset.input}
					editor={editor}
					errors={errorIds(node.dataset.errors)}
				/>
			) : boot.schema.kind === 'metabox' ? (
				<MetaboxShell boot={boot} store={store} input={node.dataset.input} errors={errorIds(node.dataset.errors)} />
			) : (
				<AdminShell boot={boot} store={store} />
			)}
		</ErrorBoundary>
	);
}

/** The page frame's furniture (Metabox::render_page()), or nothing. */
function pageEditor(raw: string | undefined): EditorBoot | undefined {
	try {
		const editor: unknown = raw ? JSON.parse(raw) : undefined;
		return editor && typeof editor === 'object' ? (editor as EditorBoot) : undefined;
	} catch {
		return undefined;
	}
}

/** A JSON list of field ids, or nothing. */
function errorIds(raw: string | undefined): string[] | undefined {
	try {
		const ids: unknown = raw ? JSON.parse(raw) : undefined;
		return Array.isArray(ids) ? ids.map(String) : undefined;
	} catch {
		return undefined;
	}
}

function mountAll(): void {
	const roots = [...document.querySelectorAll<HTMLElement>('.bfields-root')];

	// Hosts register adornments on this; ones registered later still render.
	announceReady(roots.map((node) => node.dataset.unique ?? '').filter(Boolean));

	roots.forEach((node) => {
		if (node.dataset.bfieldsMounted === '1') {
			return;
		}

		node.dataset.bfieldsMounted = '1';

		try {
			mount(node);
		} catch (error) {
			// The boundary can only catch what happens inside render. A throw
			// from mount() itself (a schema mismatch, a missing payload) has to
			// be shown here, or the screen is a blank page with no way out.
			// eslint-disable-next-line no-console
			console.error('[bfields]', error);

			// The fallback notice is still inside the node; add the reason
			// beneath it rather than replacing it.
			const reason = document.createElement('p');
			reason.className = 'bfields-boundary notice notice-error inline';
			reason.textContent = (error as Error).message;
			node.appendChild(reason);
		}
	});
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', mountAll);
} else {
	mountAll();
}
