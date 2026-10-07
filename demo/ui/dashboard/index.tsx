/**
 * bfields demo — the Help & Demos dashboard.
 *
 * A copy of 3D Viewer's dashboard (3d-viewer/src/admin/dashboard), which was
 * itself ported from the 3d-viewer-new-ui prototype. It is not a bfields
 * screen and uses no bfields field: it is here so the demo menu shows every
 * screen 3D Viewer has, not just the two the framework renders.
 *
 * Its styles sit under `.bp3d-app`, never `.bfields-app`, so they cannot touch
 * the framework's screens even though they ship in the same stylesheet.
 */

import { createRoot } from '@wordpress/element';

// base.scss must come first: its element resets rely on losing the specificity
// tie to the component rules on source order.
import './theme/base.scss';
import './theme/dashboard.scss';

import App from './App';
import { MOUNT_ID } from './lib/config';

export function mountDashboard(): void {
	const node = document.getElementById(MOUNT_ID);

	if (!node || node.dataset.bfieldsMounted === '1') {
		return;
	}

	node.dataset.bfieldsMounted = '1';
	createRoot(node).render(<App />);
}
