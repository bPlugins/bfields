/**
 * The colour panel writes colours in the shapes 3D Viewer already stores:
 * `#rrggbb`, `rgba(r, g, b, a)` with Codestar's spacing, `transparent`, ''.
 */

import { formatColor, parseColor } from '../../ui/fields/ColorPanel';

describe('colour panel values', () => {
	it('reads the stored shapes', () => {
		expect(parseColor('#1b5cf0')).toEqual({ r: 27, g: 92, b: 240, a: 1 });
		expect(parseColor('#FFF')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
		expect(parseColor('rgba(0, 0, 0, 0.4)')).toEqual({ r: 0, g: 0, b: 0, a: 0.4 });
		expect(parseColor('rgba(0,0,0,.4)')).toEqual({ r: 0, g: 0, b: 0, a: 0.4 });
		expect(parseColor('rgb(10, 20, 30)')).toEqual({ r: 10, g: 20, b: 30, a: 1 });
	});

	it('leaves what it cannot edit alone', () => {
		expect(parseColor('')).toBeNull();
		expect(parseColor('transparent')).toBeNull();
		expect(parseColor('red')).toBeNull();
		expect(parseColor('#12345')).toBeNull();
	});

	it("writes Codestar's authored rgba spacing and opaque hex", () => {
		expect(formatColor({ r: 0, g: 0, b: 0, a: 0.4 })).toBe('rgba(0, 0, 0, 0.4)');
		expect(formatColor({ r: 27, g: 92, b: 240, a: 1 })).toBe('#1b5cf0');
		expect(formatColor({ r: 1, g: 2, b: 3, a: 0.333333 })).toBe('rgba(1, 2, 3, 0.33)');
		expect(formatColor({ r: 1, g: 2, b: 3, a: 0 })).toBe('rgba(1, 2, 3, 0)');
	});

	it('round-trips the default the progress bar ships with', () => {
		const stored = 'rgba(0, 0, 0, 0.4)';
		const parsed = parseColor(stored);

		expect(parsed && formatColor(parsed)).toBe(stored);
	});
});
