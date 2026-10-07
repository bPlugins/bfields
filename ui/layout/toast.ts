/**
 * bfields — a snackbar-style toast, like the block editor's "Post updated."
 *
 * Plain text only, and silent: the caller announces it through wp.a11y.speak,
 * so a live region here would read it twice.
 */

const TOAST_CLASS = 'bfields-toast';
const DURATION = 4000;

let timer: ReturnType<typeof setTimeout> | undefined;

/** The text of server HTML, parsed inertly (no scripts, no image loads). */
export function plainText(html: string): string {
	const doc = new DOMParser().parseFromString(html, 'text/html');

	return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function host(): HTMLElement {
	// Inside the frame's .bfields-app so the theme tokens and font apply.
	return document.querySelector<HTMLElement>('.bfields-editor')?.closest<HTMLElement>('.bfields-app') ?? document.body;
}

export function hideToast(): void {
	clearTimeout(timer);
	document.querySelectorAll(`.${TOAST_CLASS}`).forEach((node) => node.remove());
}

export function showToast(text: string): HTMLElement | null {
	hideToast();

	if ('' === text) {
		return null;
	}

	const toast = document.createElement('div');
	toast.className = TOAST_CLASS;
	toast.textContent = text;
	toast.addEventListener('click', hideToast);

	const arm = () => {
		clearTimeout(timer);
		timer = setTimeout(hideToast, DURATION);
	};

	// Kept while hovered, so it can be read.
	toast.addEventListener('mouseenter', () => clearTimeout(timer));
	toast.addEventListener('mouseleave', arm);

	host().appendChild(toast);
	arm();

	return toast;
}
