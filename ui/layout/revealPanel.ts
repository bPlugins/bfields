/**
 * bfields — bring a sticky tab strip's panel back into view.
 *
 * With `sticky_tabs` the strip stays on screen while its panel scrolls, so a
 * tab can be clicked from far down the previous tab's content. The new tab
 * would then open mid-way down. This scrolls the page back to where the strip
 * sits at rest, so the tab opens at its top. It does nothing when the strip is
 * not stuck: the tab's top is already in view.
 */
export default function revealPanel(strip: HTMLElement | null): void {
	const panel = strip?.parentElement;

	if (!strip || !panel) {
		return;
	}

	const top = parseFloat(window.getComputedStyle(strip).top) || 0;
	const box = window.getComputedStyle(panel);
	const inset = (parseFloat(box.borderTopWidth) || 0) + (parseFloat(box.paddingTop) || 0);
	// The scroll position at which the strip reaches its sticky offset, and
	// the panel above it is out of view.
	const target = window.scrollY + panel.getBoundingClientRect().top + inset - top;

	if (window.scrollY <= target) {
		return;
	}

	const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	window.scrollTo({ top: target, behavior: still ? 'auto' : 'smooth' });
}
