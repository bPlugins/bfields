/**
 * bfields — @wordpress/scripts' config plus one extra entry for the main
 * build: `notices`, the one-line admin notices on their own (no React, no
 * field runtime) for host screens that are not bfields screens. The demo
 * build (`--webpack-src-dir=demo/ui`) keeps the default entries.
 *
 * An ES module because package.json is `"type": "module"`.
 */
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const defaultConfig = require('@wordpress/scripts/config/webpack.config');
// wp-scripts' own copy, so no new dependency.
const CopyWebpackPlugin = createRequire(require.resolve('@wordpress/scripts/package.json'))('copy-webpack-plugin');
const here = dirname(fileURLToPath(import.meta.url));
const main = process.env.WP_SOURCE_PATH === 'ui';

export default {
	...defaultConfig,
	entry: () => {
		const entries = typeof defaultConfig.entry === 'function' ? defaultConfig.entry() : defaultConfig.entry;

		return main ? { ...entries, notices: resolve(here, 'ui/notices.ts') } : entries;
	},
	// Inter's OFL-1.1 text travels with the woff2 files it covers.
	plugins: main
		? [
				...defaultConfig.plugins,
				new CopyWebpackPlugin({ patterns: [{ from: resolve(here, 'ui/theme/fonts/OFL.txt'), to: 'fonts/OFL.txt' }] }),
			]
		: defaultConfig.plugins,
};
