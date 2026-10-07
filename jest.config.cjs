/**
 * bfields — unit test config.
 *
 * Extends @wordpress/scripts' Jest preset so `wp.element` and the WordPress
 * package mocks resolve the same way they do in the plugins that host bfields.
 */
const base = require('@wordpress/scripts/config/jest-unit.config.js');

module.exports = {
	...base,
	rootDir: __dirname,
	testMatch: ['<rootDir>/tests/ts/**/*.test.ts', '<rootDir>/tests/ts/**/*.test.tsx'],
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};
