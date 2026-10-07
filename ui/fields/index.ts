/**
 * bfields — register the built-in field components.
 *
 * Registered by CORE type, so a Codestar type resolves through the map in
 * Schema.php. A host that needs to override just one authoring type registers
 * it by that name and wins the lookup (see core/registry.ts).
 *
 * Two sources, kept apart on purpose:
 *
 *   ./           transcribed from the design repo — the seven controls in
 *                3d-viewer-new-ui `controls.jsx` plus the Add New cards. Every
 *                value is measured; change them only against the Figma exports.
 *   ./claude/    stand-ins for the controls the design never drew. Composed
 *                from the design's tokens, to be replaced when the real design
 *                arrives. See ./claude/README.md.
 */

import { registerField } from '../core/registry';

import Toggle from './Toggle';
import Text from './Text';
import NumberField from './Number';
import Choice from './Choice';
import Color from './Color';
import Dimension from './Dimension';
import Media from './Media';
import Display from './Display';
import Repeater from './Repeater';
import Fieldset from './Fieldset';
import Code from './Code';
import Spacing from './Spacing';
import { registerStandInFields } from './claude';

export function registerBuiltinFields(): void {
	registerField('toggle', Toggle);
	registerField('text', Text);
	registerField('number', NumberField);
	registerField('choice', Choice);
	registerField('color', Color);
	registerField('dimension', Dimension);
	registerField('media', Media);
	registerField('display', Display);
	// `group` and `repeater` both map onto core `repeater` (Schema.php).
	registerField('repeater', Repeater);
	registerField('fieldset', Fieldset);
	registerField('code', Code);
	registerField('spacing', Spacing);

	// link.
	registerStandInFields();
}
