/**
 * bfields demo — the sidebar Live Preview card.
 *
 * DEMO CODE. Markup is the design's `LivePreviewCard` (3d-viewer-new-ui
 * `AddNew.jsx`): a header with the eye mark and an open-in-new-tab button, a
 * 337×193 stage, and a row of view controls under a hairline.
 *
 * It exists to show one thing: a panel outside the field tree that stays in
 * step with the fields WITHOUT touching their DOM. It is handed the store's
 * values and re-renders.
 *
 * The stage draws a stand-in, not a model — no WebGL, no CDN, nothing to fail
 * offline: the poster when there is one, otherwise the empty stage. The
 * controls work on that stand-in (zoom, reset, fullscreen, open the file).
 */

import { useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	Box,
	Eye,
	ExternalLink,
	Maximize2,
	RefreshCw,
	ZoomIn,
	ZoomOut,
} from '../../../ui/core/icons';
import type { Values } from '../../../ui/core/types';
import { readModel } from './model';

const STEP = 0.25;

export default function LivePreview({ values }: { values: Values }) {
	const { source, poster } = readModel(values);
	const [zoom, setZoom] = useState(1);
	const stage = useRef<HTMLDivElement>(null);

	const clamp = (next: number): number => Math.min(3, Math.max(1, next));

	return (
		<div className="bfields-preview">
			<div className="bfields-preview__head">
				<h3 className="bfields-preview__title">
					<Eye size={20} /> {__('Live Preview', 'bfields-demo')}
				</h3>
				<button
					type="button"
					className="bfields-icon-btn"
					aria-label={__('Open the model file in a new tab', 'bfields-demo')}
					disabled={source === ''}
					onClick={() => window.open(source, '_blank', 'noopener')}
				>
					<ExternalLink size={20} />
				</button>
			</div>

			<div className="bfields-preview__stage" ref={stage}>
				{poster !== '' ? (
					<img
						src={poster}
						alt={__('Poster of the 3D model', 'bfields-demo')}
						style={{ transform: `scale(${zoom})` }}
					/>
				) : (
					<Box size={48} stroke={1.25} />
				)}
			</div>

			<div className="bfields-preview__controls">
				<div>
					<button
						type="button"
						className="bfields-icon-btn"
						aria-label={__('Reset view', 'bfields-demo')}
						onClick={() => setZoom(1)}
					>
						<RefreshCw size={20} />
					</button>
					<button
						type="button"
						className="bfields-icon-btn"
						aria-label={__('Zoom in', 'bfields-demo')}
						onClick={() => setZoom(clamp(zoom + STEP))}
					>
						<ZoomIn size={20} />
					</button>
					<button
						type="button"
						className="bfields-icon-btn"
						aria-label={__('Zoom out', 'bfields-demo')}
						onClick={() => setZoom(clamp(zoom - STEP))}
					>
						<ZoomOut size={20} />
					</button>
				</div>
				<button
					type="button"
					className="bfields-icon-btn"
					aria-label={__('Fullscreen', 'bfields-demo')}
					onClick={() => stage.current?.requestFullscreen?.()}
				>
					<Maximize2 size={20} />
				</button>
			</div>
		</div>
	);
}
