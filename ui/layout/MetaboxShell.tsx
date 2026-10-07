/**
 * bfields — a meta box inside the post editor.
 *
 * The framework's plain meta box (php/includes/Metabox.php): it sits in its
 * core postbox inside `#poststuff` and hides nothing else on the screen
 * (decided 2026-09-23, review 3.5). The design's full-screen Add New editor is
 * a host layout built on top of this, not the framework default.
 *
 * Saving is WordPress's: Publish / Update posts the form, and this component's
 * only job is to keep the hidden mirror field in step with the store. The
 * field is printed disabled and empty; it is enabled here, on mount, so a
 * bundle that never runs submits nothing (7.4).
 *
 * The whole value set is mirrored, untouched fields exactly as hydrated (7.2):
 * the server merges what it is given, and a partial payload is how a field
 * silently reverts to a default.
 */

import { useEffect, useMemo, useState } from '@wordpress/element';
import type { KeyboardEvent } from 'react';
import { resolveIcon } from '../core/icons';
import type { Store } from '../core/store';
import type { BootPayload, FieldValue, Values } from '../core/types';
import { renderFields } from './FieldGroup';
import TabError, { sectionHasError } from './TabError';

/** `errors`: the ids the last save's `validate` rejected (Metabox.php, data-errors). */
type Props = { boot: BootPayload; store: Store; input?: string; errors?: string[] };

export default function MetaboxShell({ boot, store, input, errors }: Props) {
	const { schema } = boot;
	const [values, setValues] = useState<Values>(() => store.get());
	const [active, setActive] = useState<string>(() => schema.sections[0]?.id ?? '');
	const invalid = useMemo(() => new Set(errors ?? []), [errors]);

	useEffect(() => {
		const field = input ? (document.getElementById(input) as HTMLTextAreaElement | null) : null;

		const mirror = (next: Values): void => {
			if (field) {
				field.value = JSON.stringify(next);
			}
		};

		if (field) {
			mirror(store.get());
			field.disabled = false;
		}

		return store.subscribe((next) => {
			setValues(next);
			mirror(next);
		});
	}, [store, input]);

	const section = useMemo(
		() => schema.sections.find((item) => item.id === active) ?? schema.sections[0],
		[schema.sections, active]
	);

	if (!section) {
		return null;
	}

	const onChange = (id: string, value: FieldValue): void => store.setValue(id, value);
	const tabId = (sectionId: string): string => `bfields-${schema.unique}-tab-${sectionId}`;
	const panelId = `bfields-${schema.unique}-panel`;

	// APG tabs: arrows move and select (reversed in RTL), Home / End jump.
	const onTabKey = (event: KeyboardEvent<HTMLDivElement>): void => {
		const ids = schema.sections.map((item) => item.id);
		const at = ids.indexOf(section.id);
		const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
		const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[event.key];
		let next = -1;

		if (step !== undefined) {
			next = (at + step + ids.length) % ids.length;
		} else if (event.key === 'Home') {
			next = 0;
		} else if (event.key === 'End') {
			next = ids.length - 1;
		}

		const target = ids[next];

		if (target === undefined) {
			return;
		}

		event.preventDefault();
		setActive(target);
		event.currentTarget.ownerDocument.getElementById(tabId(target))?.focus();
	};
	const showIcons = section.fields.some((field) => field.icon !== '');

	return (
		<div className="bfields-admin bfields-admin--metabox">
			<div className="bfields-panel">
				{schema.sections.length > 1 ? (
					<div className="bfields-tabs" role="tablist" aria-orientation="horizontal" onKeyDown={onTabKey}>
						{schema.sections.map((item) => {
							const Icon = resolveIcon(item.icon);
							const current = item.id === section.id;

							return (
								<button
									key={item.id}
									id={tabId(item.id)}
									type="button"
									role="tab"
									aria-selected={current}
									aria-controls={panelId}
									tabIndex={current ? 0 : -1}
									className={`bfields-tab${current ? ' bfields-tab--active' : ''}`}
									onClick={() => setActive(item.id)}
								>
									<Icon size={17} />
									{item.title}
									{sectionHasError(item, invalid) ? <TabError /> : null}
								</button>
							);
						})}
					</div>
				) : null}

				<div
					className="bfields-settings-body bfields-settings-body--flush"
					{...(schema.sections.length > 1
						? { id: panelId, role: 'tabpanel', 'aria-labelledby': tabId(section.id) }
						: {})}
				>
					{renderFields(section.fields, section.groups, {
						unique: schema.unique,
						values,
						showIcons,
						layout: section.layout,
						onChange,
						invalid,
					})}
				</div>
			</div>
		</div>
	);
}
