/**
 * bfields — copy text to the clipboard.
 *
 * `navigator.clipboard` exists only in secure contexts, and many installs are
 * plain http://, so a rejected or missing API falls back to execCommand.
 */
export default async function copyText(text: string): Promise<boolean> {
	if (navigator.clipboard && window.isSecureContext) {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch {
			// The legacy path below.
		}
	}

	const active = document.activeElement as HTMLElement | null;
	const area = document.createElement('textarea');
	area.value = text;
	area.setAttribute('readonly', '');
	area.style.position = 'fixed';
	area.style.opacity = '0';
	document.body.appendChild(area);
	area.select();

	let copied = false;

	try {
		copied = document.execCommand('copy');
	} catch {
		copied = false;
	}

	area.remove();
	// The click's button keeps focus, so a keyboard user stays where they were.
	active?.focus();

	return copied;
}
