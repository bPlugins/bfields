/**
 * bfields — the sticky action bar's "stuck" state.
 *
 * The bar sticks to the bottom of the window (admin.css, "Sticky action bar").
 * A zero-height marker right after it is below the window exactly while the
 * bar is pinned, so the band and shadow show only then and the bar at rest
 * stays the measured design.
 */

import { useCallback, useEffect, useRef, useState } from '@wordpress/element';

/** The bar's `bottom` in admin.css: the marker counts as hidden that far up. */
const OFFSET = 20;

export default function useStuckBar(): [(node: HTMLElement | null) => void, boolean] {
	const [stuck, setStuck] = useState(false);
	const observer = useRef<IntersectionObserver | null>(null);

	const marker = useCallback((node: HTMLElement | null): void => {
		observer.current?.disconnect();
		observer.current = null;

		if (!node || typeof IntersectionObserver === 'undefined') {
			setStuck(false);
			return;
		}

		observer.current = new IntersectionObserver(
			(entries) => {
				const entry = entries[entries.length - 1];

				if (!entry) {
					return;
				}

				const bottom = entry.rootBounds?.bottom ?? window.innerHeight;
				setStuck(!entry.isIntersecting && entry.boundingClientRect.top >= bottom);
			},
			{ rootMargin: `0px 0px -${OFFSET}px 0px` }
		);
		observer.current.observe(node);
	}, []);

	useEffect(() => () => observer.current?.disconnect(), []);

	return [marker, stuck];
}

export type BarPhase = 'idle' | 'enter' | 'shown' | 'leave';

/** Matches the keyframes in admin.css. */
const ENTER_MS = 280;
const LEAVE_MS = 220;

/**
 * Pinning follows `active` (unsaved values), with a beat on each side so the
 * bar can slide in from the bottom and back out (the CSS only animates while
 * it is stuck; at rest it just stays put).
 */
export function useBarPhase(active: boolean): BarPhase {
	const [phase, setPhase] = useState<BarPhase>('idle');

	useEffect(() => {
		if (active) {
			setPhase((current) => (current === 'shown' ? current : 'enter'));
			const timer = window.setTimeout(() => setPhase('shown'), ENTER_MS);
			return () => window.clearTimeout(timer);
		}

		setPhase((current) => (current === 'idle' ? current : 'leave'));
		const timer = window.setTimeout(() => setPhase('idle'), LEAVE_MS);
		return () => window.clearTimeout(timer);
	}, [active]);

	return phase;
}
