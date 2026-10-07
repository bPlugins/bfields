/**
 * bfields — the page frame keeps other plugins' side boxes (V-M1), labels its
 * buttons the way core's Publish box does (V-L35), and clipped notices get a
 * "Show more" button, also on notices added later (V-L41).
 */

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import EditorShell, { submitLabels } from '../../ui/layout/EditorShell';
import type { EditorBoot } from '../../ui/layout/EditorShell';
import titleClippedNotices from '../../ui/layout/pageNotices';
import { createStore } from '../../ui/core/store';
import type { BootPayload, Field } from '../../ui/core/types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const editor = (over: Partial<EditorBoot> = {}): EditorBoot => ({
	heading: 'Add New',
	title: '',
	titleInput: '',
	shortcode: '',
	hint: '',
	sideHeading: '',
	published: false,
	trashUrl: '',
	trashLabel: 'Move to Trash',
	...over,
});

describe('core Publish box labels', () => {
	test.each([
		['draft, can publish', { status: 'draft', canPublish: true }, 'Publish', 'Save Draft'],
		['auto-draft, can publish', { status: 'auto-draft', canPublish: true }, 'Publish', 'Save Draft'],
		['draft dated ahead', { status: 'draft', canPublish: true, scheduled: true }, 'Schedule', 'Save Draft'],
		['contributor draft', { status: 'draft', canPublish: false }, 'Submit for Review', 'Save Draft'],
		['pending, editor', { status: 'pending', canPublish: true }, 'Publish', 'Save as Pending'],
		['pending, contributor', { status: 'pending', canPublish: false }, 'Submit for Review', ''],
		['published', { status: 'publish', canPublish: true, published: true }, 'Update', ''],
		['scheduled', { status: 'future', canPublish: true, published: true, scheduled: true }, 'Update', ''],
		['private', { status: 'private', canPublish: true, published: true }, 'Update', ''],
		['older boot, draft', {}, 'Publish', 'Save Draft'],
		['older boot, published', { published: true }, 'Update', ''],
	])('%s', (_name, over, primary, secondary) => {
		expect(submitLabels(editor(over as Partial<EditorBoot>))).toEqual({ primary, secondary });
	});
});

describe('side meta boxes', () => {
	test('move into the frame inside #post, and go back when it unmounts', () => {
		document.body.innerHTML = `
			<form id="post">
				<div id="frame"></div>
				<div id="poststuff"><div id="post-body"><div id="postbox-container-1">
					<div id="side-sortables" class="meta-box-sortables">
						<div id="submitdiv" class="postbox"></div>
						<div id="acf-side" class="postbox"><input name="acf[field]" value="x" /></div>
					</div>
				</div></div></div>
			</form>`;

		const field = { id: 'f', type: 'text', core: 'text', title: 'F', props: {}, default: '' } as unknown as Field;
		const boot = {
			schema: { schema: 1, unique: 'pf', args: {}, sections: [{ id: 's', slug: 's', title: 'S', icon: '', layout: 'rows', fields: [field] }] },
			values: {},
		} as unknown as BootPayload;
		const root = createRoot(document.getElementById('frame') as HTMLElement);

		act(() => root.render(createElement(EditorShell, { boot, store: createStore({}), editor: editor() })));

		const box = document.getElementById('acf-side') as HTMLElement;
		expect(box.closest('.bfields-side__boxes')).not.toBeNull();
		expect(box.closest('form#post')).not.toBeNull();
		expect(document.getElementById('submitdiv')?.closest('.bfields-side__boxes')).not.toBeNull();
		expect(document.getElementById('postbox-container-1')?.children).toHaveLength(0);

		act(() => root.unmount());

		expect(document.getElementById('side-sortables')?.parentElement?.id).toBe('postbox-container-1');
	});
});

describe('clipped notices', () => {
	const clip = (node: HTMLElement): void => {
		node.style.textOverflow = 'ellipsis';
		Object.defineProperty(node, 'scrollWidth', { configurable: true, value: 600 });
		Object.defineProperty(node, 'clientWidth', { configurable: true, value: 200 });
	};

	test('get a Show more toggle, now and when added later', async () => {
		document.body.innerHTML = '<div id="wpbody-content"><div class="notice notice-info"><p>A long notice</p></div></div>';
		clip(document.querySelector('.notice p') as HTMLElement);

		titleClippedNotices();
		await new Promise((resolve) => setTimeout(resolve, 0));

		const first = document.querySelector('.notice') as HTMLElement;
		const toggle = first.querySelector<HTMLButtonElement>(':scope > .bfields-notice__more');
		expect(toggle).not.toBeNull();
		expect(toggle?.hidden).toBe(false);
		expect(toggle?.getAttribute('aria-expanded')).toBe('false');
		expect(first.querySelector('p')?.title).toBe('A long notice');

		toggle?.click();
		expect(first.classList.contains('bfields-notice--expanded')).toBe(true);
		expect(toggle?.getAttribute('aria-expanded')).toBe('true');

		const late = document.createElement('div');
		late.className = 'notice notice-warning';
		late.innerHTML = '<p>Added by a plugin later</p>';
		clip(late.querySelector('p') as HTMLElement);
		document.getElementById('wpbody-content')?.appendChild(late);

		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(late.querySelector(':scope > .bfields-notice__more')).not.toBeNull();
	});
});
