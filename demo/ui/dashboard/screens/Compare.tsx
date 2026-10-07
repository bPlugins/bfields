import { useMemo, useState } from '@wordpress/element';
import type React from 'react';
import { __, sprintf } from '@wordpress/i18n';

import { useProduct, sellablePlans, priceFor, formatPrice, annualSaving, type Cycle } from '../lib/pricing';
import { BillingToggle, billingOptions, cycleSuffix, features } from './Pricing';
import { SearchField, Tag } from '../components/shared';
import { CircleX, Check, List } from '../components/icons';

const details = (): string[] => [
    __('Add the 3D viewer using Gutenberg block.', '3d-viewer'),
    __('Works with all major 3D model formats.', '3d-viewer'),
    __('Load models from any external source.', '3d-viewer'),
    __('Display 3D models on product pages.', '3d-viewer'),
    __('Interactive 3D viewing controls.', '3d-viewer'),
    __('Load models only when needed.', '3d-viewer'),
    __('Show a preview image before the 3D model loads.', '3d-viewer'),
    __('Keep users informed during loading.', '3d-viewer'),
    __('Show exact loading percentage.', '3d-viewer'),
    __('Turn on or off model movement.', '3d-viewer'),
    __('Use with Elementor and more add-ons.', '3d-viewer'),
    __('Toggle fullscreen button visibility.', '3d-viewer'),
    __('Save and reuse your settings.', '3d-viewer'),
    __('Enable automatic rotation.', '3d-viewer'),
    __('Advanced viewer settings in Elementor.', '3d-viewer'),
    __('Create galleries with multiple models.', '3d-viewer'),
    __('Show different models for each variant.', '3d-viewer'),
    __('Control lighting and visual effects.', '3d-viewer'),
    __('More control over viewer behavior.', '3d-viewer'),
    __('Create the best initial view for your audience.', '3d-viewer'),
];

/* The first 11 rows ship in Free; the rest are Pro only. */
const FREE_COUNT = 11;

const Mark: React.FC<{ yes: boolean }> = ({ yes }) =>
    yes ? (
        <span className="bp3d-dash-yes" aria-label={__('Included', '3d-viewer')}><Check size={9.88} weight={2.47} /></span>
    ) : (
        <span className="bp3d-dash-no" aria-label={__('Not included', '3d-viewer')}><CircleX size={8.23} weight={2.47} /></span>
    );

const Tiers: React.FC<{ cycle: Cycle }> = ({ cycle }) => {
    const { status, product } = useProduct();
    const price = priceFor(sellablePlans(product)[0], 1);
    const amount = price?.[cycle];
    const saving = cycle === 'annual' ? annualSaving(price) : 0;

    return (
        <div className="bp3d-dash-tiers">
            <article className="bp3d-dash-tier">
                <div className="bp3d-dash-tier__top">
                    <Tag className="bp3d-dash-tag--tight" bg="#e6fbf3" color="#10b981">{__('Free', '3d-viewer')}</Tag>
                    <div>
                        <h2>{__('Free', '3d-viewer')}</h2>
                        <p className="bp3d-dash-text">{__('Essential features to get you started.', '3d-viewer')}</p>
                    </div>
                </div>
                <div className="bp3d-dash-tier__price">
                    <span className="bp3d-dash-tier__amt">$0</span>
                    <span className="bp3d-dash-text">{__('/ forever', '3d-viewer')}</span>
                </div>
                <div className="bp3d-dash-tier__note">
                    <CircleX size={19.75} weight={1.65} />
                    <span className="bp3d-dash-text">{__('Includes core 3D viewer mechanics', '3d-viewer')}</span>
                </div>
                <div className="bp3d-dash-btn bp3d-dash-tier__cta">
                    <Check size={13.17} weight={2.47} /> {__('You Already Have It', '3d-viewer')}
                </div>
            </article>

            <article className="bp3d-dash-tier bp3d-dash-tier--pro">
                <div className="bp3d-dash-tier__top">
                    <Tag bg="rgba(255,255,255,.2)" color="#fff" className="bp3d-dash-tag--tight">{__('Pro', '3d-viewer')}</Tag>
                    <div>
                        <h2>{__('Pro', '3d-viewer')}</h2>
                        <p className="bp3d-dash-tier__desc">{__('Advanced features and priority support for professionals.', '3d-viewer')}</p>
                    </div>
                </div>
                <div className="bp3d-dash-tier__price" aria-busy={status === 'loading'}>
                    <span className={status === 'loading' ? 'bp3d-dash-tier__amt bp3d-dash-tier__amt--loading' : 'bp3d-dash-tier__amt'}>
                        ${formatPrice(amount)}
                    </span>
                    {cycleSuffix(cycle) && <span className="bp3d-dash-tier__per">{cycleSuffix(cycle)}</span>}
                    {saving > 0 && price?.monthly && (
                        <>
                            <s className="bp3d-dash-tier__per">${formatPrice(price.monthly * 12)}</s>
                            {/* translators: %d: percentage saved by paying yearly */}
                            <span className="bp3d-dash-tier__save">{sprintf(__('Save %d%%', '3d-viewer'), saving)}</span>
                        </>
                    )}
                </div>
                <div className="bp3d-dash-tier__note">
                    <CircleX size={19.75} weight={1.65} />
                    <span className="bp3d-dash-text">{__('Unlocks all Pro features instantly', '3d-viewer')}</span>
                </div>
                <a href="#/pricing" className="bp3d-dash-btn bp3d-dash-tier__cta">{__('Get Pro now →', '3d-viewer')}</a>
            </article>
        </div>
    );
};

const Compare: React.FC = () => {
    const [cycle, setCycle] = useState<Cycle>('annual');
    const [query, setQuery] = useState('');
    const { product } = useProduct();

    const all = useMemo(() => {
        const desc = details();
        return features().map((name, i) => ({ name, desc: desc[i], free: i < FREE_COUNT }));
    }, []);

    const rows = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? all.filter((r) => `${r.name} ${r.desc}`.toLowerCase().includes(q)) : all;
    }, [all, query]);

    return (
        <>
            <header className="bp3d-dash-intro bp3d-dash-intro--compare">
                <span className="bp3d-dash-intro__badge">{__('Pricing', '3d-viewer')}</span>
                <h1>{__('Free vs Pro at a glance', '3d-viewer')}</h1>
                <p className="bp3d-dash-text">
                    {/* translators: %d: number of Pro-only features */}
                    {sprintf(__('See exactly what unlocks when you upgrade. %d features are exclusive to Pro.', '3d-viewer'), all.length - FREE_COUNT)}
                </p>
                <BillingToggle value={cycle} onChange={setCycle} options={billingOptions(sellablePlans(product)[0], true)} />
            </header>

            <div>
                <Tiers cycle={cycle} />

                <section className="bp3d-dash-matrix">
                    <div className="bp3d-dash-matrix__meta">
                        <div>
                            <div className="bp3d-dash-matrix__title">
                                <span className="bp3d-dash-matrix__glyph"><List size={11.52} weight={1.65} /></span>
                                <h2>{__('Feature Breakdown', '3d-viewer')}</h2>
                            </div>
                            <p className="bp3d-dash-text">{__("Compare what's included in Free and Pro plans.", '3d-viewer')}</p>
                        </div>
                        <SearchField placeholder={__('Search features...', '3d-viewer')} iconSize={13.17} weight={1.65} value={query} onChange={setQuery} />
                    </div>

                    <div className="bp3d-dash-table" role="table" aria-label={__('Free vs Pro features', '3d-viewer')}>
                        <div className="bp3d-dash-table__row bp3d-dash-table__head" role="row">
                            <span className="bp3d-dash-table__feat bp3d-dash-text" role="columnheader">{__('FEATURE', '3d-viewer')}</span>
                            <span className="bp3d-dash-table__col bp3d-dash-text" role="columnheader">{__('FREE', '3d-viewer')}</span>
                            <span className="bp3d-dash-table__pro bp3d-dash-text" role="columnheader">{__('PRO', '3d-viewer')}</span>
                        </div>
                        {rows.map((r) => (
                            <div key={r.name} className="bp3d-dash-table__row" role="row">
                                <div className="bp3d-dash-table__feat" role="cell">
                                    <div className="bp3d-dash-table__name">
                                        <span className="bp3d-dash-title">{r.name}</span>
                                        {!r.free && (
                                            <Tag className="bp3d-dash-tag--tight" bg="#f3f6ff" color="#1b5cf0">{__('Pro only', '3d-viewer')}</Tag>
                                        )}
                                    </div>
                                    <p className="bp3d-dash-text">{r.desc}</p>
                                </div>
                                <span className="bp3d-dash-table__col" role="cell"><Mark yes={r.free} /></span>
                                <span className="bp3d-dash-table__col" role="cell"><Mark yes /></span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </>
    );
};

export default Compare;
