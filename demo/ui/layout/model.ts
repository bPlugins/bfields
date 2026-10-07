/**
 * bfields demo — read the model a viewer points at, from store values.
 *
 * DEMO CODE. Both previews (the sidebar card and the Preview tab's stage) need
 * the same three facts — the model file, the poster, and the cycle list — and
 * they must agree, so the mapping lives once. Under Codestar the 3D Viewer
 * preview gets these by querying `[name="_bp3dimages_[…]"]` on a debounce;
 * here they come from the values the fields write, in stored shape.
 *
 * The product box (`_bp3d_product_` shape) keeps its models in `bp3d_models`
 * — no underscore after bp3d, unlike the viewer's `bp_3d_models` — one row
 * per model with `model_src` / `poster_src`, and shows more than one as a
 * slider, which is what `cycling` means to the previews.
 */

import type { MediaValue, Values } from '../../../ui/core/types';

export type ModelFacts = {
	cycling: boolean;
	source: string;
	poster: string;
	models: Array<{ source: string; poster: string; label: string }>;
};

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/** A `media` value is the 8-key array; an `upload` value is a bare URL. */
export function url(value: unknown): string {
	if (typeof value === 'string') {
		return value;
	}

	if (value && typeof value === 'object' && 'url' in (value as MediaValue)) {
		return String((value as MediaValue).url ?? '');
	}

	return '';
}

export function on(value: unknown): boolean {
	return ['1', 'true', 'yes', 'on', true, 1].includes(value as string);
}

export function readModel(values: Values): ModelFacts {
	if (Array.isArray(values.bp3d_models)) {
		const models = (values.bp3d_models as Values[]).map((row, index) => ({
			source: url(row.model_src),
			poster: url(row.poster_src),
			label: String(index + 1),
		}));

		return {
			cycling: models.length > 1,
			source: models[0]?.source ?? '',
			poster: models[0]?.poster ?? '',
			models,
		};
	}

	const cycling = text(values.bp_3d_model_type) === 'mcycle';
	const rows = Array.isArray(values.bp_3d_models) ? (values.bp_3d_models as Values[]) : [];

	const models = rows.map((row, index) => ({
		source: url(row.model_link),
		poster: url(row.poster_src),
		label: String(index + 1),
	}));

	if (cycling) {
		return {
			cycling,
			source: models[0]?.source ?? '',
			poster: models[0]?.poster ?? '',
			models,
		};
	}

	return {
		cycling,
		source: text(values.bp_3d_src_type) === 'link' ? text(values.bp_3d_src_link) : url(values.bp_3d_src),
		poster: url(values.bp_3d_poster),
		models: [],
	};
}
