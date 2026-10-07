/**
 * bfields — `media` and `upload`.
 *
 * Two stored shapes behind one component (3.1):
 *   media  -> the 8-key array {url,id,width,height,thumbnail,alt,title,description}
 *   upload -> a bare URL string
 *
 * The array's key ORDER is part of the contract, because PHP's serialize()
 * preserves insertion order — so an existing value is always PATCHED, never
 * rebuilt.
 *
 * The design draws media twice, both as Add New Model-tab CARDS: the "3D
 * Source" URL input with a soft Upload Source button, and the "Poster Image"
 * block. Those two are transcribed here. A media field in a settings ROW
 * renders their row-height version, ./MediaInline.tsx.
 *
 * Remove writes Codestar's empty value: '' for `upload`, and for `media` the
 * 8-key array with every key '' in Codestar's order (its Remove clears all
 * eight inputs, and the form posts exactly those).
 */

import { __, sprintf } from '@wordpress/i18n';
import { Image as ImageIcon, UploadCloud } from '../core/icons';
import type { FieldComponentProps } from '../core/registry';
import { placeholderText } from '../core/responsive';
import type { FieldValue, MediaValue } from '../core/types';
import MediaInline from './MediaInline';

type WpMedia = {
	media?: (args: Record<string, unknown>) => {
		on: (event: string, handler: () => void) => void;
		open: () => void;
		state: () => { get: (key: string) => { first: () => { toJSON: () => Record<string, unknown> } } };
	};
};

const EMPTY: MediaValue = {
	url: '', id: '', width: '', height: '', thumbnail: '',
	alt: '', title: '', description: '',
};

/** What Remove stores. A fresh object each time, never one the store holds. */
export function removedValue(isUrlShape: boolean): FieldValue {
	return isUrlShape ? '' : { ...EMPTY };
}

type Attachment = {
	type?: string;
	url?: string;
	icon?: string;
	sizes?: Record<string, { url?: string }>;
	[key: string]: unknown;
};

/** Codestar's preview source: the thumbnail size, then full, then the file itself or its type icon. */
export function thumbnailOf(attachment: Attachment): string {
	const sizes = attachment.sizes ?? {};

	return String(
		sizes.thumbnail?.url ?? sizes.full?.url ?? (attachment.type === 'image' ? attachment.url : attachment.icon) ?? ''
	);
}

export default function Media({ field, value, onChange, locked, card, id }: FieldComponentProps) {
	const isUrlShape = field.type === 'upload';

	const current: MediaValue = isUrlShape
		? { ...EMPTY, url: typeof value === 'string' ? value : '' }
		: { ...EMPTY, ...(typeof value === 'object' && value ? (value as MediaValue) : {}) };

	const emit = (next: MediaValue): void => {
		if (isUrlShape) {
			onChange(next.url);
			return;
		}

		// Patch onto whatever is in the store so key order, and any extra key a
		// previous version wrote, survive.
		const base = (typeof value === 'object' && value ? value : EMPTY) as MediaValue;
		onChange({ ...base, ...next });
	};

	const openFrame = (): void => {
		const wp = (window as unknown as { wp?: WpMedia }).wp;

		if (!wp?.media) {
			return;
		}

		const frame = wp.media({
			title: field.props.buttonTitle ?? __('Select file', 'bfields'),
			multiple: false,
			...(field.props.library ? { library: { type: field.props.library } } : {}),
		});

		frame.on('select', () => {
			const attachment = frame.state().get('selection').first().toJSON() as Attachment;

			emit({
				url: String(attachment.url ?? ''),
				// Every sub-value is a string in Codestar's shape, id included.
				id: String(attachment.id ?? ''),
				width: String(attachment.width ?? ''),
				height: String(attachment.height ?? ''),
				thumbnail: thumbnailOf(attachment),
				alt: String(attachment.alt ?? ''),
				title: String(attachment.title ?? ''),
				description: String(attachment.description ?? ''),
			});
		});

		frame.open();
	};

	const hasValue = current.url !== '';
	const isImage = /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(current.url);

	// In a card section the design gives media two bigger treatments instead of
	// the compact row control: `upload` becomes an input with a soft-tinted
	// Upload button beside it ("3D Source"), and `media` becomes the poster
	// block — thumbnail, file name, a line of guidance and a primary button.
	// Both need the full width of a card, which is why they are not the row
	// default rather than an improvement nobody applied there.
	if (card && isUrlShape) {
		return (
			<div className="bfields-field-row">
				<input
					id={id}
					type="text"
					className="bfields-input"
					value={current.url}
					placeholder={placeholderText(field.props.placeholder) ?? 'https://'}
					disabled={locked}
					onChange={(event) => emit({ ...current, url: event.target.value })}
				/>

				<button
					type="button"
					className="bfields-btn bfields-btn--soft"
					onClick={openFrame}
					disabled={locked}
				>
					<UploadCloud size={17} />
					{field.props.buttonTitle ?? __('Upload', 'bfields')}
				</button>
			</div>
		);
	}

	if (card) {
		// The image wording only where the host limits the picker to images.
		const imageOnly = field.props.library === 'image';
		const name = hasValue
			? (current.title || current.url.split('/').pop() || current.url)
			: imageOnly
				? __('No image selected', 'bfields')
				: __('No file selected', 'bfields');
		const meta =
			hasValue && current.width && current.height
				? sprintf(
					/* translators: 1: width in pixels, 2: height in pixels. */
					__('%1$s \u00D7 %2$spx', 'bfields'),
					current.width,
					current.height
				)
				: (placeholderText(field.props.placeholder) ?? (imageOnly ? __('JPG, PNG, WebP or SVG', 'bfields') : ''));

		return (
			<div className="bfields-poster">
				<span className="bfields-poster__thumb">
					{hasValue && isImage ? (
						<img src={current.thumbnail || current.url} alt="" />
					) : (
						<ImageIcon size={20} />
					)}
				</span>

				<div className="bfields-poster__main">
					<p className="bfields-poster__name">{name}</p>
					{meta ? <p className="bfields-poster__meta">{meta}</p> : null}
				</div>

				<button
					type="button"
					className="bfields-btn bfields-btn--primary"
					onClick={openFrame}
					disabled={locked}
				>
					<UploadCloud size={17} />
					{field.props.buttonTitle ?? __('Upload', 'bfields')}
				</button>

				{hasValue ? (
					<button
						type="button"
						className="bfields-btn bfields-btn--link"
						disabled={locked}
						onClick={() => onChange(removedValue(false))}
					>
						{__('Remove', 'bfields')}
					</button>
				) : null}
			</div>
		);
	}

	return (
		<MediaInline
			id={id}
			mode={isUrlShape ? 'url' : 'attachment'}
			current={current}
			label={field.title}
			placeholder={placeholderText(field.props.placeholder)}
			buttonTitle={field.props.buttonTitle}
			locked={locked}
			onUrl={(url) => emit({ ...current, url })}
			onOpen={openFrame}
			onRemove={() => {
				if (!locked) {
					onChange(removedValue(isUrlShape));
				}
			}}
		/>
	);
}
