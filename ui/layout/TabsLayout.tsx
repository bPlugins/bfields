/**
 * bfields — where a screen's section tabs sit.
 *
 * `tabs_position` is the host's choice: 'top' (the design's strip) or 'left'
 * (a sidebar column). With `tabs_switcher` on, each admin can flip it from
 * the screen itself, and the flip is remembered per browser in localStorage,
 * keyed per screen, the way `resizable` keeps its sizes. Nothing is saved to
 * the server, and without `tabs_switcher` the host's choice always wins.
 */

import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { PanelLeft, PanelTop } from '../core/icons';
import type { ScreenArgs } from '../core/types';

export type TabsPosition = 'top' | 'left';

const isPosition = (value: unknown): value is TabsPosition => value === 'top' || value === 'left';

function load(key: string): TabsPosition | null {
	try {
		const saved = window.localStorage.getItem(key);

		return isPosition(saved) ? saved : null;
	} catch {
		return null;
	}
}

/**
 * The position a screen should draw its tabs in, and a setter for the switch.
 * `stored` is null until the admin flips it, which keeps following the host's
 * default if the host later changes `tabs_position`.
 */
export function useTabsPosition(unique: string, args: ScreenArgs) {
	const key = `bfields-tabs:${unique}`;
	const fallback: TabsPosition = args.tabsPosition === 'left' ? 'left' : 'top';
	const [stored, setStored] = useState<TabsPosition | null>(() => (args.tabsSwitcher ? load(key) : null));

	useEffect(() => {
		if (!args.tabsSwitcher || stored === null) {
			return;
		}

		try {
			window.localStorage.setItem(key, stored);
		} catch {
			// Private windows and blocked storage: the choice just won't stick.
		}
	}, [key, stored, args.tabsSwitcher]);

	return {
		position: stored ?? fallback,
		setPosition: setStored,
	};
}

type SwitchProps = {
	value: TabsPosition;
	onChange: (value: TabsPosition) => void;
};

/** The two-button switch: tabs on top, tabs in a left sidebar. */
export function TabsSwitch({ value, onChange }: SwitchProps) {
	const options: Array<{ id: TabsPosition; label: string; Icon: typeof PanelTop }> = [
		{ id: 'top', label: __('Tabs on top', 'bfields'), Icon: PanelTop },
		{ id: 'left', label: __('Tabs in a sidebar', 'bfields'), Icon: PanelLeft },
	];

	return (
		<div className="bfields-tabs-switch" role="group" aria-label={__('Tab layout', 'bfields')}>
			{options.map(({ id, label, Icon }) => (
				<button
					key={id}
					type="button"
					aria-pressed={value === id}
					aria-label={label}
					title={label}
					onClick={() => onChange(id)}
				>
					<Icon size={18} />
				</button>
			))}
		</div>
	);
}
