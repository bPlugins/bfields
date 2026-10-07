/**
 * bfields — the Desktop / Tablet / Mobile switch beside a responsive field's title.
 *
 * A pill of three icon buttons after the title, the active one in the
 * primary colour on the strip tint, sized to sit on the title's line without
 * making it taller. A device that holds its own value carries a dot (the rest
 * inherit); on such a device a small × after the pill clears it, so it
 * inherits again, and focus goes back to the device button.
 *
 * Purely presentational. The device is page-wide state in core/responsive.ts
 * (which fires `bfields:device-change`), and FieldRenderer works out which
 * devices are set.
 */

import { useRef } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Monitor, Phone, Tablet, X } from '../core/icons';
import type { Device } from '../core/types';

const DEVICES: Array<{ id: Device; label: string; Icon: typeof Monitor }> = [
	{ id: 'desktop', label: __('Desktop', 'bfields'), Icon: Monitor },
	{ id: 'tablet', label: __('Tablet', 'bfields'), Icon: Tablet },
	{ id: 'mobile', label: __('Mobile', 'bfields'), Icon: Phone },
];

type Props = {
	device: Device;
	onSelect: (device: Device) => void;
	/** Tablet / mobile when they hold a value of their own. */
	overridden: Device[];
	/** Clears the current device's own value. Absent when there is none. */
	onReset?: () => void;
	disabled?: boolean;
};

export default function DeviceSwitcher({ device, onSelect, overridden, onReset, disabled }: Props) {
	const active = DEVICES.find((item) => item.id === device) ?? DEVICES[0]!;
	const group = useRef<HTMLSpanElement>(null);

	const reset = (): void => {
		onReset?.();
		group.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus();
	};

	return (
		<span className="bfields-devswitch">
			<span ref={group} className="bfields-devswitch__pill" role="group" aria-label={__('Device', 'bfields')}>
				{DEVICES.map(({ id, label, Icon }) => {
					const own = overridden.includes(id);
					const name = own
						? sprintf(
								/* translators: %s: device name, e.g. "Tablet". */
								__('%s (has its own value)', 'bfields'),
								label
							)
						: label;

					return (
						<button
							key={id}
							type="button"
							className="bfields-devswitch__btn"
							aria-pressed={device === id}
							aria-label={name}
							title={name}
							onClick={() => onSelect(id)}
						>
							<Icon size={13} />
							{own ? <span className="bfields-devswitch__dot" aria-hidden="true" /> : null}
						</button>
					);
				})}
			</span>

			{onReset ? (
				<button
					type="button"
					className="bfields-devswitch__reset"
					disabled={disabled}
					aria-label={sprintf(
						/* translators: %s: device name, e.g. "Tablet". */
						__('Clear the %s value', 'bfields'),
						active.label
					)}
					title={sprintf(
						/* translators: %s: device name, e.g. "Tablet". */
						__('Clear the %s value and inherit it', 'bfields'),
						active.label
					)}
					onClick={reset}
				>
					<X size={12} />
				</button>
			) : null}
		</span>
	);
}
