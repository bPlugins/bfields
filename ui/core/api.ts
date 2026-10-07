/**
 * bfields — the REST client.
 *
 * One rule governs this file: a failed save must leave the store exactly as it
 * was (4.4). Network error, expired nonce, lost capability, schema mismatch —
 * the user's edits survive all of them and they get a toast, not a blank form.
 */

import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { SCHEMA_VERSION } from './types';
import type { Values } from './types';

export type SaveAction = 'save' | 'reset_section' | 'reset_all';

export type SaveResult = {
	values: Values;
	undeclared: string[];
	/**
	 * Field id => message from a PHP `validate` callback. Those fields kept
	 * their stored value; the rest of the save went through (Codestar's rule).
	 */
	errors: Record<string, string>;
};

export class SaveError extends Error {
	public readonly code: string;

	constructor(message: string, code: string) {
		super(message);
		this.name = 'SaveError';
		this.code = code;
	}
}

/**
 * POST /bfields/v1/options/<unique>.
 *
 * The UI sends EVERY declared field, with untouched ones exactly as they were
 * hydrated (7.2). Sending only the dirty ones would look tidier and would be
 * wrong: the server merges what it is given, and a partial payload is how a
 * field silently reverts to a default.
 */
export async function saveOptions(
	unique: string,
	values: Values,
	action: SaveAction = 'save',
	section?: string
): Promise<SaveResult> {
	try {
		const response = await apiFetch<{
			values: Values;
			undeclared: string[];
			errors?: Record<string, string>;
		}>({
			path: `/bfields/v1/options/${encodeURIComponent(unique)}`,
			method: 'POST',
			data: {
				schema: SCHEMA_VERSION,
				action,
				...(section ? { section } : {}),
				...(action === 'save' ? { values } : {}),
			},
		});

		return {
			values: response.values,
			undeclared: response.undeclared ?? [],
			errors: response.errors ?? {},
		};
	} catch (error) {
		const detail = error as { code?: string; message?: string };

		if (detail.code === 'bfields_schema_mismatch') {
			throw new SaveError(
				__('This page is out of date. Reload and try again.', 'bfields'),
				detail.code
			);
		}

		if (detail.code === 'rest_cookie_invalid_nonce') {
			throw new SaveError(
				__('Your session expired. Reload the page and save again — your changes are still here.', 'bfields'),
				detail.code
			);
		}

		throw new SaveError(
			detail.message ?? __('Could not save. Your changes have not been lost.', 'bfields'),
			detail.code ?? 'bfields_save_failed'
		);
	}
}

/** `thumbnail` (URL) and `price` (plain text) are drawn when the route sends them. */
export type ChoiceOption = { value: string; label: string; thumbnail?: string; price?: string };

/**
 * GET /bfields/v1/choices/<unique> — the options of an `'options' => 'posts'`
 * style field (php/includes/Choices.php).
 *
 * `term` searches; `include` resolves the labels of values already stored.
 * Only the field is named: its query is authored in PHP and never sent from
 * here. Rejects on failure, so a caller can tell "no match" from "no answer".
 */
export async function requestChoices(
	unique: string,
	field: string,
	query: { term: string } | { include: string[] }
): Promise<ChoiceOption[]> {
	const params = new URLSearchParams({ field });

	if ('term' in query) {
		params.set('term', query.term);
	} else {
		params.set('include', query.include.join(','));
	}

	const response = await apiFetch<{ options?: ChoiceOption[] }>({
		path: `/bfields/v1/choices/${encodeURIComponent(unique)}?${params.toString()}`,
	});

	return response.options ?? [];
}

/** requestChoices(), resolving to no options on failure; the field keeps its value. */
export async function fetchChoices(
	unique: string,
	field: string,
	query: { term: string } | { include: string[] }
): Promise<ChoiceOption[]> {
	try {
		return await requestChoices(unique, field, query);
	} catch {
		return [];
	}
}
