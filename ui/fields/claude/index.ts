/**
 * bfields — stand-in field components.
 *
 * Everything in this folder was composed without a design: the design repo
 * (bPlugins/3d-viewer-new-ui) drew seven controls, and Codestar needs more
 * than that. Each file here is a placeholder built from the design's tokens,
 * kept apart from the transcribed components in ../ so it can be swapped out
 * wholesale when the real design for it arrives. See ./README.md.
 *
 * Two kinds of file live here:
 *
 *   whole fields      registered below under their core type — replacing one
 *                     is a new component and a changed line in this function.
 *   presentations     imported by a designed component in ../ for the one
 *                     variant the design never drew (image tiles beside the
 *                     tile grid). Replacing one keeps its props and changes
 *                     nothing else.
 */

import { registerField } from '../../core/registry';

import Link from './Link';

export { default as ImageTiles } from './ImageTiles';

export function registerStandInFields(): void {
	registerField('link', Link);
}
