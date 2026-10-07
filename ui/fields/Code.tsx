/**
 * bfields — `code_editor` (custom CSS).
 *
 * WordPress's own CodeMirror (`wp.codeEditor`, enqueued by Assets.php when a
 * screen has a code field), looked up when the field mounts, never at load.
 * Without it (syntax highlighting turned off in the user's profile, or a CSP
 * that blocks the script) the same box is a plain monospace textarea.
 *
 * This field's stored value is already peculiar — Codestar kses's it, so `>`
 * is stored as `&gt;` and EnqueueAssets::renderCustomCSS() decodes it again
 * (3.2). So the editor never writes on load: its own normalisation (`\r\n`
 * read as `\n`) reaches the store only with a real edit, and then as the
 * same `\n` text the textarea stores.
 */

import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import type { FieldComponentProps } from '../core/registry';
import { placeholderText } from '../core/responsive';

type Change = { origin?: string };

export type CodeMirrorLike = {
	getValue: () => string;
	setValue: (value: string) => void;
	on: (event: 'change', handler: (editor: CodeMirrorLike, change: Change) => void) => void;
	setOption: (option: string, value: unknown) => void;
	getInputField: () => HTMLElement;
	getWrapperElement: () => HTMLElement;
	refresh: () => void;
	toTextArea: () => void;
};

type EditorSettings = { codemirror?: Record<string, unknown>; [key: string]: unknown };

type WpCodeEditor = {
	initialize: (textarea: HTMLTextAreaElement, settings?: EditorSettings) => { codemirror: CodeMirrorLike };
	defaultSettings?: EditorSettings;
};

/** Codestar `settings` keys CodeMirror takes as they are. `theme` is not one: core ships none. */
const PASSED = ['indentWithTabs', 'smartIndent', 'lineNumbers', 'tabSize', 'indentUnit', 'lineWrapping'];

const normalise = (text: string): string => text.replace(/\r\n?/g, '\n');

const TABBABLE =
	'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Escape, then Tab: core leaves where focus goes to the caller. */
function leave(editor: CodeMirrorLike, forward: boolean): void {
	const wrapper = editor.getWrapperElement();
	const outside = [...document.querySelectorAll<HTMLElement>(TABBABLE)].filter(
		(element) => !wrapper.contains(element) && element.getClientRects().length > 0
	);
	const after = (element: HTMLElement): boolean =>
		Boolean(wrapper.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING);
	const target = forward ? outside.find(after) : outside.filter((element) => !after(element)).pop();

	target?.focus();
}

/** The settings handed to wp.codeEditor.initialize(): core's defaults, the field's mode and options. */
export function editorSettings(
	defaults: EditorSettings | undefined,
	own: Record<string, unknown> | undefined,
	readOnly: boolean
): EditorSettings {
	const mode = typeof own?.mode === 'string' && own.mode !== '' ? own.mode : 'css';
	const codemirror: Record<string, unknown> = { ...(defaults?.codemirror ?? {}) };

	PASSED.forEach((key) => {
		if (own && own[key] !== undefined) {
			codemirror[key] = own[key];
		}
	});

	codemirror.mode = mode;
	codemirror.readOnly = readOnly ? 'nocursor' : false;

	// Core lints only what it enqueued, and Assets.php asks for CSS.
	if (!/css$/i.test(mode)) {
		codemirror.lint = false;
	}

	return {
		...(defaults ?? {}),
		codemirror,
		onTabNext: (editor: CodeMirrorLike) => leave(editor, true),
		onTabPrevious: (editor: CodeMirrorLike) => leave(editor, false),
	};
}

function codeEditor(): WpCodeEditor | undefined {
	const editor = (window as unknown as { wp?: { codeEditor?: WpCodeEditor } }).wp?.codeEditor;

	return typeof editor?.initialize === 'function' ? editor : undefined;
}

export default function Code({ field, value, onChange, locked, id }: FieldComponentProps) {
	const text = typeof value === 'string' ? value : '';
	const area = useRef<HTMLTextAreaElement>(null);
	const wrap = useRef<HTMLDivElement>(null);
	const mirror = useRef<CodeMirrorLike | null>(null);
	const write = useRef(onChange);
	const [rich, setRich] = useState(false);
	const hintId = `${id}-keys`;

	write.current = onChange;

	useEffect(() => {
		const node = area.current;
		const editor = codeEditor();

		if (!node || !editor) {
			return undefined;
		}

		let instance: CodeMirrorLike;

		try {
			instance = editor.initialize(node, editorSettings(editor.defaultSettings, field.props.settings, Boolean(locked)))
				.codemirror;
		} catch {
			return undefined;
		}

		mirror.current = instance;
		instance.on('change', (cm, change) => {
			if (change.origin !== 'setValue') {
				write.current(cm.getValue());
			}
		});

		const input = instance.getInputField();

		if (field.title) {
			input.setAttribute('aria-label', field.title);
		}
		input.setAttribute('aria-describedby', hintId);
		setRich(true);

		// Measured once it is on screen; a hidden mount lays out at zero.
		const frame = window.requestAnimationFrame(() => instance.refresh());

		// Mounted inside a closed card (display:none): measure again once it is shown.
		const box = wrap.current;
		let width = box?.offsetWidth ?? 0;
		const observer =
			box && typeof ResizeObserver !== 'undefined'
				? new ResizeObserver(() => {
						const now = box.offsetWidth;
						if (width === 0 && now > 0) {
							instance.refresh();
						}
						width = now;
					})
				: null;

		if (box) {
			observer?.observe(box);
		}

		return () => {
			window.cancelAnimationFrame(frame);
			observer?.disconnect();
			mirror.current = null;

			try {
				instance.toTextArea();
			} catch {
				// Already detached with its container.
			}
		};
		// Mount once: later value and lock changes are synced below.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		mirror.current?.setOption('readOnly', locked ? 'nocursor' : false);
	}, [locked]);

	// A value from outside (Reset, a host's setValue) replaces the buffer without a write.
	useEffect(() => {
		const cm = mirror.current;

		if (cm && normalise(text) !== cm.getValue()) {
			cm.setValue(text);
		}
	}, [text]);

	return (
		<div ref={wrap} className={`bfields-code${rich ? ' bfields-code--rich' : ''}${locked ? ' is-locked' : ''}`}>
			<textarea
				ref={area}
				id={id}
				className="bfields-code__input"
				value={text}
				placeholder={placeholderText(field.props.placeholder)}
				disabled={locked}
				spellCheck={false}
				rows={12}
				aria-label={field.title || undefined}
				onChange={(event) => onChange(event.target.value)}
			/>
			{rich ? (
				<span id={hintId} hidden>
					{__('In the editor, Tab indents. Press Escape, then Tab, to move on.', 'bfields')}
				</span>
			) : null}
		</div>
	);
}
