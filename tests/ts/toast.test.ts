import { hideToast, plainText, showToast } from '../../ui/layout/toast';

describe('toast', () => {
	afterEach(() => {
		hideToast();
		jest.useRealTimers();
	});

	test('plainText keeps only the text of server HTML', () => {
		expect(plainText('Model <a href="x">updated</a>.<img src=x onerror="alert(1)">')).toBe('Model updated.');
	});

	test('one toast at a time, gone after 4 s, kept while hovered', () => {
		jest.useFakeTimers();
		showToast('First');
		const toast = showToast('Second');

		expect(document.querySelectorAll('.bfields-toast')).toHaveLength(1);
		expect(toast?.textContent).toBe('Second');
		expect(toast?.getAttribute('role')).toBeNull();

		toast?.dispatchEvent(new MouseEvent('mouseenter'));
		jest.advanceTimersByTime(5000);
		expect(document.querySelector('.bfields-toast')).not.toBeNull();

		toast?.dispatchEvent(new MouseEvent('mouseleave'));
		jest.advanceTimersByTime(4000);
		expect(document.querySelector('.bfields-toast')).toBeNull();
	});

	test('a click dismisses it; empty text shows nothing', () => {
		showToast('Saved')?.click();
		expect(document.querySelector('.bfields-toast')).toBeNull();
		expect(showToast('')).toBeNull();
	});
});
