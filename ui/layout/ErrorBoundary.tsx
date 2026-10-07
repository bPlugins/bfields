/**
 * bfields — the boundary that stops a broken bundle becoming a locked door.
 *
 * Codestar renders server HTML; React renders an empty div. If this bundle 404s
 * behind a caching or optimisation plugin, or throws at boot, the settings
 * screen would otherwise be a blank page with no way out (4.6). So: a visible
 * error, and a link to the classic interface that needs no JavaScript to
 * follow.
 *
 * Section 3.2's "absent payload is a no-op" protects the data. This protects
 * the screen.
 */

import { Component } from '@wordpress/element';
import type { ReactNode } from 'react';
import { __ } from '@wordpress/i18n';

type Props = { children: ReactNode; fallbackUrl?: string };
type State = { error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
	public override state: State = { error: null };

	public static getDerivedStateFromError(error: Error): State {
		return { error };
	}

	public override componentDidCatch(error: Error): void {
		// eslint-disable-next-line no-console
		console.error('[bfields] The settings interface failed to render.', error);
	}

	public override render(): ReactNode {
		const { error } = this.state;

		if (!error) {
			return this.props.children;
		}

		return (
			<div className="bfields-boundary notice notice-error">
				<h2>{__('The settings interface failed to load', 'bfields')}</h2>
				<p>
					{this.props.fallbackUrl
						? __(
								'Your saved settings are safe and unchanged. You can keep working in the classic interface while this is fixed.',
								'bfields'
							)
						: __(
								'Your saved settings are safe and unchanged. Reload the page, and if this keeps happening, ask a site administrator for help.',
								'bfields'
							)}
				</p>

				{this.props.fallbackUrl ? (
					<p>
						<a className="button button-primary" href={this.props.fallbackUrl}>
							{__('Switch to the classic interface', 'bfields')}
						</a>
					</p>
				) : null}

				<details>
					<summary>{__('Technical details', 'bfields')}</summary>
					<pre>{error.message}</pre>
				</details>
			</div>
		);
	}
}
