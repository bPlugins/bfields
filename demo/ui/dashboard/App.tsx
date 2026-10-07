import { useEffect, useState } from '@wordpress/element';
import type React from 'react';
import { __, sprintf } from '@wordpress/i18n';

import { config } from './lib/config';
import { Box, CrownLine } from './components/icons';
import Welcome from './screens/Welcome';
import Demos from './screens/Demos';
import Pricing from './screens/Pricing';
import Compare from './screens/Compare';

/*
 * `w` is each label's box in the file. Figma rounds auto-width text up to the
 * next whole pixel and lays the row out from those boxes, so the labels carry
 * them (as a minimum, so a longer translation still fits) to land every tab
 * where the design has it.
 *
 * The routes are 3D Viewer's own (`page=3d-viewer#/pricing` is linked from
 * its other screens), kept identical so the demo and the plugin agree.
 */
const TABS = [
    { id: 'welcome', label: () => __('Welcome', '3d-viewer'), w: 63, Page: Welcome },
    { id: 'demos', label: () => __('Demos', '3d-viewer'), w: 48, Page: Demos },
    { id: 'pricing', label: () => __('Pricing', '3d-viewer'), w: 48, Page: Pricing },
    { id: 'feature-comparison', label: () => __('Feature Comparison', '3d-viewer'), w: 138, Page: Compare },
];

const currentRoute = (): string => window.location.hash.replace(/^#\/?/, '').split('/')[0] ?? '';

const DashNav: React.FC<{ current: string }> = ({ current }) => {
    const { version, urls, onboarding } = config();

    // A half-finished setup is the one case where the wizard is worth a
    // permanent nav entry — it disappears for good once it has been run to
    // the end. The badge is dropped at 0% because "Guided Setup · 0%" reads
    // like a broken counter rather than an invitation.
    const showSetup = !onboarding.completed && !!urls.setup;

    return (
        <nav className="bp3d-dash-nav" aria-label={__('3D Viewer', '3d-viewer')}>
            <div className="bp3d-dash-brand">
                <span className="bp3d-dash-brand__mark">
                    <Box size={14.81} weight={1.65} />
                </span>
                <span className="bp3d-dash-brand__name">{__('3D Viewer', '3d-viewer')}</span>
                {version && <span className="bp3d-dash-brand__ver">v{version}</span>}
            </div>

            <div className="bp3d-dash-tabs">
                {TABS.map((t) => (
                    <a
                        key={t.id}
                        href={`#/${t.id}`}
                        className={t.id === current ? 'bp3d-dash-tab bp3d-dash-tab--current' : 'bp3d-dash-tab'}
                        aria-current={t.id === current ? 'page' : undefined}
                    >
                        <span className="bp3d-dash-tab__label" style={{ minWidth: t.w }}>{t.label()}</span>
                    </a>
                ))}

                {/* A screen of its own, from the extension manager in vendor/. */}
                {urls.extensions && (
                    <a href={urls.extensions} className="bp3d-dash-tab">
                        <span className="bp3d-dash-tab__label" style={{ minWidth: 75 }}>{__('Extensions', '3d-viewer')}</span>
                        <span className="bp3d-dash-new">{__('NEW', '3d-viewer')}</span>
                    </a>
                )}

                {showSetup && (
                    <a href={urls.setup} className="bp3d-dash-tab">
                        <span className="bp3d-dash-tab__label" style={{ minWidth: 93 }}>{__('Guided Setup', '3d-viewer')}</span>
                        {onboarding.percent > 0 && (
                            <span className="bp3d-dash-new bp3d-dash-new--progress">
                                {/* translators: %d: percentage of the guided setup completed */}
                                {sprintf(__('%d%%', '3d-viewer'), onboarding.percent)}
                            </span>
                        )}
                    </a>
                )}
            </div>

            <a href="#/pricing" className="bp3d-dash-upgrade">
                {__('Upgrade', '3d-viewer')} <CrownLine size={16} weight={1.5} />
            </a>
        </nav>
    );
};

const App: React.FC = () => {
    const [route, setRoute] = useState(currentRoute);

    useEffect(() => {
        const sync = () => {
            setRoute(currentRoute());
            window.scrollTo(0, 0);
        };
        window.addEventListener('hashchange', sync);
        return () => window.removeEventListener('hashchange', sync);
    }, []);

    const current = TABS.find((t) => t.id === route) ?? TABS[0]!;
    const { Page } = current;

    // .bp3d-app carries the design tokens and the element resets; it is the whole
    // contract with wp-admin and must stay the outermost node.
    //
    // The page is full width, so it has no page-width handles: there is
    // nothing wider to drag it to.
    return (
        <div className="bp3d-app">
            <div className="bp3d-dash-page">
                <div className="bp3d-dash">
                    <DashNav current={current.id} />
                    <Page />
                </div>
            </div>
        </div>
    );
};

export default App;
