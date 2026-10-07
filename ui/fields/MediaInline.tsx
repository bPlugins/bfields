/**
 * bfields — `media` and `upload` inside a row.
 *
 * The row version of the Model tab's two media cards (./Media.tsx):
 *   url         a URL input with the tinted Upload button (`upload`, the
 *               "3D Source" card at row height);
 *   attachment  a thumbnail chip, the file's name, Replace and Remove
 *               (`media`, the poster block at row height).
 *
 * Pasting a URL is a first-class path for `upload`: model files are routinely
 * hosted off-site (CDN, Cloud Storage), so the input is editable rather than
 * readonly as Codestar's is. Adornments (the host's Cloud Storage button)
 * are FieldRenderer's `before` / `after` slots beside this control.
 */

import { useRef } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Image as ImageIcon, UploadCloud } from '../core/icons';
import type { MediaValue } from '../core/types';

type Props = {
	id: string;
	mode: 'url' | 'attachment';
	current: MediaValue;
	/** The field's title: names the input and the buttons for assistive tech. */
	label?: string;
	placeholder?: string;
	buttonTitle?: string;
	locked?: boolean;
	onUrl: (url: string) => void;
	onOpen: () => void;
	onRemove: () => void;
};

const IMAGE = /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i;

/** The last path segment of a URL, decoded when it decodes. */
function fileName(url: string): string {
	const base = url.split(/[?#]/)[0]?.split('/').pop() ?? '';

	try {
		return decodeURIComponent(base);
	} catch {
		return base;
	}
}

export default function MediaInline({
	id,
	mode,
	current,
	label,
	placeholder,
	buttonTitle,
	locked,
	onUrl,
	onOpen,
	onRemove,
}: Props) {
	const upload = useRef<HTMLButtonElement>(null);
	const hasValue = current.url !== '';
	const isImage = IMAGE.test(current.url);
	const nameId = `${id}-name`;
	const what = label || __('file', 'bfields');

	const remove = (): void => {
		onRemove();
		// The Remove button is about to go; Upload stays.
		upload.current?.focus();
	};

	const removeButton = hasValue ? (
		<button
			type="button"
			className="bfields-media__remove"
			disabled={locked}
			/* translators: %s: field title, e.g. "Spinner Image". */
			aria-label={sprintf(__('Remove %s', 'bfields'), what)}
			onClick={remove}
		>
			{__('Remove', 'bfields')}
		</button>
	) : null;

	if (mode === 'url') {
		return (
			<div className="bfields-media bfields-media--url">
				{hasValue && isImage ? (
					<span className="bfields-media__chip">
						<img src={current.url} alt="" />
					</span>
				) : null}

				<input
					id={id}
					type="text"
					className="bfields-input bfields-media__input"
					value={current.url}
					placeholder={placeholder ?? __('Not selected', 'bfields')}
					disabled={locked}
					spellCheck={false}
					aria-label={label || undefined}
					onChange={(event) => onUrl(event.target.value)}
				/>

				<button
					ref={upload}
					type="button"
					className="bfields-btn bfields-btn--soft bfields-media__upload"
					disabled={locked}
					onClick={onOpen}
				>
					<UploadCloud size={16} />
					{buttonTitle ?? __('Upload', 'bfields')}
				</button>

				{removeButton}
			</div>
		);
	}

	const thumb = current.thumbnail || (isImage ? current.url : '');
	const name = hasValue ? current.title || fileName(current.url) || current.url : __('No file selected', 'bfields');
	const size =
		hasValue && current.width && current.height
			? sprintf(
				/* translators: 1: width in pixels, 2: height in pixels. */
				__('%1$s × %2$spx', 'bfields'),
				current.width,
				current.height
			)
			: '';

	return (
		<div className={`bfields-media bfields-media--attachment${hasValue ? '' : ' is-empty'}`}>
			<span className="bfields-media__chip">
				{hasValue && thumb ? <img src={thumb} alt="" /> : <ImageIcon size={18} />}
			</span>

			<span className="bfields-media__main">
				<span id={nameId} className="bfields-media__name" title={hasValue ? current.url : undefined}>
					{name}
				</span>
				{size ? <span className="bfields-media__meta">{size}</span> : null}
			</span>

			<button
				ref={upload}
				id={id}
				type="button"
				className="bfields-btn bfields-btn--soft bfields-media__upload"
				disabled={locked}
				aria-describedby={hasValue ? nameId : undefined}
				/* translators: %s: field title, e.g. "Spinner Image". */
				aria-label={hasValue ? sprintf(__('Replace %s', 'bfields'), what) : undefined}
				onClick={onOpen}
			>
				<UploadCloud size={16} />
				{hasValue ? __('Replace', 'bfields') : (buttonTitle ?? __('Upload', 'bfields'))}
			</button>

			{removeButton}
		</div>
	);
}
