/**
 * bfields demo — the Preview tab's stage card.
 *
 * DEMO CODE. Markup is the design's `PreviewTab` (3d-viewer-new-ui
 * `AddNew.jsx`): a header with the status badge and the Desktop / Tablet /
 * Mobile switch, a large stage with its corner button, tool rail and variant
 * strip, a note, and the tab's actions.
 *
 * Like the sidebar card it draws a stand-in rather than a model. What each
 * piece of chrome does here:
 *
 *   devices       narrows the stage to a tablet or phone width
 *   corner, grid  lays the transparency grid over the stage
 *   palette       opens the Style tab
 *   rotate        IS the Auto Rotate setting — same value, same store; absent
 *                 on a screen with no such setting (the product box)
 *   variant strip the cycle list, when the viewer cycles models
 */

import type { JSX } from 'react';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	Box,
	Grid,
	Monitor,
	Diamond,
	Phone,
	RefreshCw,
	Tablet,
} from '../../../ui/core/icons';
import type { FieldValue, Values } from '../../../ui/core/types';
import { on, readModel } from './model';

type Device = 'desktop' | 'tablet' | 'mobile';

type Props = {
	values: Values;
	onChange: (id: string, value: FieldValue) => void;
	onStyle: () => void;
	/** The Auto Rotate field's id, when the screen has one. */
	rotate?: string;
	actions: JSX.Element;
};

const DEVICES: Array<{ id: Device; label: string; Icon: typeof Monitor; width: string }> = [
	{ id: 'desktop', label: __('Desktop', 'bfields-demo'), Icon: Monitor, width: '100%' },
	{ id: 'tablet', label: __('Tablet', 'bfields-demo'), Icon: Tablet, width: '62%' },
	{ id: 'mobile', label: __('Mobile', 'bfields-demo'), Icon: Phone, width: '36%' },
];

export default function StageCard({ values, onChange, onStyle, rotate, actions }: Props) {
	const { cycling, source, poster, models } = readModel(values);
	const [device, setDevice] = useState<Device>('desktop');
	const [grid, setGrid] = useState(false);
	const [current, setCurrent] = useState(0);

	const rotating = rotate ? on(values[rotate]) : false;
	const showing = cycling ? (models[current]?.poster ?? '') : poster;
	const ready = source !== '';

	const step = (by: number): void => {
		if (models.length > 0) {
			setCurrent((current + by + models.length) % models.length);
		}
	};

	const width = DEVICES.find((item) => item.id === device)?.width ?? '100%';

	return (
		<div className="bfields-stagecard">
			<div className="bfields-stagecard__head">
				<span className="bfields-stagecard__left">
					<span className="bfields-dot" />
					{__('Live Preview', 'bfields-demo')}
					{ready ? <span className="bfields-badge-ready">{__('Ready', 'bfields-demo')}</span> : null}
				</span>

				<div className="bfields-devices">
					{DEVICES.map(({ id, label, Icon }) => (
						<button
							key={id}
							type="button"
							className="bfields-device"
							aria-pressed={device === id}
							onClick={() => setDevice(id)}
						>
							<Icon size={10} /> {label}
						</button>
					))}
				</div>
			</div>

			<div className="bfields-stagecard__body">
				<div
					className="bfields-stagecard__stage"
					style={{
						maxWidth: width,
						...(grid
							? {
								backgroundImage:
									'linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)',
								backgroundSize: '24px 24px',
							}
							: {}),
					}}
				>
					{showing !== '' ? (
						<img src={showing} alt={__('Poster of the 3D model', 'bfields-demo')} />
					) : (
						<Box size={64} stroke={1.25} />
					)}

					<button
						type="button"
						className="bfields-stage-corner"
						aria-label={__('Toggle grid', 'bfields-demo')}
						aria-pressed={grid}
						onClick={() => setGrid(!grid)}
					>
						<Grid size={12} />
					</button>

					<div className="bfields-stage-tools">
						<button type="button" aria-label={__('Style', 'bfields-demo')} onClick={onStyle}>
							<Diamond size={12} />
						</button>
						{rotate ? (
							<button
								type="button"
								aria-label={__('Auto rotate', 'bfields-demo')}
								aria-pressed={rotating}
								onClick={() => onChange(rotate, rotating ? '0' : '1')}
							>
								<RefreshCw size={12} />
							</button>
						) : null}
						<button
							type="button"
							aria-label={__('Grid', 'bfields-demo')}
							aria-pressed={grid}
							onClick={() => setGrid(!grid)}
						>
							<Grid size={12} />
						</button>
					</div>

					{cycling && models.length > 0 ? (
						<div className="bfields-variants">
							<button
								type="button"
								className="bfields-variants__nav"
								aria-label={__('Previous model', 'bfields-demo')}
								onClick={() => step(-1)}
							>
								‹
							</button>
							<span className="bfields-variants__deg">360°</span>
							{models.map((model, index) => (
								<button
									// eslint-disable-next-line react/no-array-index-key
									key={index}
									type="button"
									className="bfields-variant"
									aria-pressed={index === current}
									aria-label={model.label}
									onClick={() => setCurrent(index)}
								>
									{model.poster ? <img src={model.poster} alt="" /> : index + 1}
								</button>
							))}
							<button
								type="button"
								className="bfields-variants__nav"
								aria-label={__('Next model', 'bfields-demo')}
								onClick={() => step(1)}
							>
								›
							</button>
						</div>
					) : null}
				</div>

				<p className="bfields-stagecard__note">
					{ready
						? __(
							'Your 3D model is ready to preview. Make sure all settings are configured correctly for the best experience.',
							'bfields-demo'
						)
						: __('Add a 3D model on the Model tab to preview it here.', 'bfields-demo')}
				</p>
			</div>

			<div className="bfields-stagecard__actions">{actions}</div>
		</div>
	);
}
