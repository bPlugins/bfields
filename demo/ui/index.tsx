/**
 * bfields demo — entry point.
 *
 * DEMO BUNDLE. It registers NO fields. Every control on both screens is the
 * library's — `ui/fields/` — and this bundle exists for the one thing the
 * framework has no answer for yet: a post-editor shell, because the framework
 * renders options screens only.
 *
 * It also mounts the Help & Demos dashboard, a copy of 3D Viewer's, which is
 * plain React and uses no bfields field at all (dashboard/index.tsx).
 *
 * On the settings screen it therefore does almost nothing; the framework
 * bundle renders that page end to end. On the viewer editor it renders the
 * whole screen — title, shortcode bar, tabs, sidebar — reusing the
 * framework's own FieldRenderer, registry and stylesheet so the two screens
 * cannot drift apart. That half is the demo standing in for a framework
 * feature, and it is the first thing to delete when the framework grows one.
 *
 * React comes from wp.element in both bundles, so there is exactly one React
 * on the page no matter which combination of scripts a screen loads.
 */

import { createRoot } from '@wordpress/element';
import './theme/demo.css';

import { registerBuiltinFields } from '../../ui/fields';
import { createStore } from '../../ui/core/store';
import { attachStore } from '../../ui/core/runtime';
import ErrorBoundary from '../../ui/layout/ErrorBoundary';
import type { BootPayload } from '../../ui/core/types';
import { SCHEMA_VERSION } from '../../ui/core/types';

import EditorShell, { type EditorBoot } from './layout/EditorShell';
import { mountDashboard } from './dashboard';

type EditorPayload = BootPayload & { editor: EditorBoot };

declare global {
	interface Window {
		bfieldsDemoBoot?: Record<string, EditorPayload>;
	}
}

// The library's own field set, into this bundle's copy of the registry —
// the transcribed components and the ui/fields/claude stand-ins alike. The
// demo adds nothing to it.
registerBuiltinFields();

/**
 * Mount the editor root.
 */
function mountEditor(node: HTMLElement): void {
	const unique = node.dataset.unique;
	const input = node.dataset.input;

	if (!unique || !input) {
		return;
	}

	const boot = window.bfieldsDemoBoot?.[unique];

	if (!boot) {
		return;
	}

	if (boot.schema.schema !== SCHEMA_VERSION) {
		throw new Error(
			`bfields demo: schema version mismatch (page sent ${boot.schema.schema}, bundle speaks ${SCHEMA_VERSION}).`
		);
	}

	const store = createStore(boot.values);

	// This bundle's own runtime copy: lets late row writes read the store.
	attachStore(unique, store);

	createRoot(node).render(
		<ErrorBoundary>
			<EditorShell boot={boot} store={store} input={input} />
		</ErrorBoundary>
	);
}

function boot(): void {
	// Help & Demos (demo/includes/Dashboard.php). Not a bfields screen — see
	// dashboard/index.tsx.
	mountDashboard();

	document.querySelectorAll<HTMLElement>('.bfields-demo-root').forEach((node) => {
		if (node.dataset.bfieldsMounted === '1') {
			return;
		}

		node.dataset.bfieldsMounted = '1';

		try {
			mountEditor(node);
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error('[bfields-demo]', error);

			// The screen's own editor is hidden while this root is meant to
			// replace it (PostType.php). A failed mount must hand it back, or
			// the user is left with no way to save.
			document.body.classList.remove('bfields-demo-editor');
			node.classList.add('notice', 'notice-error');
			node.textContent = (error as Error).message;
		}
	});
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', boot);
} else {
	boot();
}
