import { useMemo, useState } from '@wordpress/element';
import type React from 'react';
import { __, sprintf } from '@wordpress/i18n';

import { config } from '../lib/config';
import { DEMO_IMAGES, HELP_IMAGE } from '../lib/images';
import { HeroArt, ViewerControls, SearchField, StatusTags, external } from '../components/shared';
import {
    Cuboid, Zap, CircleCheck, ChevronDown, EllipsisVertical, ArrowRight, CircleHelp, ExternalLink, Mail,
} from '../components/icons';

type Tone = [string, string];

const BLUE: Tone = ['#ebf3ff', '#2f54eb'];
const GREEN: Tone = ['#e6fffa', '#047857'];
const VIOLET: Tone = ['#f3e8ff', '#7c3aed'];
const ORANGE: Tone = ['#fffaf0', '#dd6b20'];
const RED: Tone = ['#fff5f5', '#e53e3e'];

type Group = 'woo' | 'default' | 'width' | 'zoom' | 'rotate' | 'more';

interface Demo {
    tag: string;
    tone: Tone;
    img: string;
    group: Group;
    title: string;
    desc: string;
    url: string;
    descWidth?: number;
}

const DEMO_SITE = 'https://3d-viewer.bplugins.com';

/*
 * `descWidth` is the width of each description box in the file. They are
 * hand-sized, and the two-line clamp breaks (and ellipsises) differently at
 * each width, so they are carried per card.
 */
const demos = (): Demo[] => [
    { tag: __('WooCommerce', '3d-viewer'), tone: BLUE, img: 'sneaker', group: 'woo', url: `${DEMO_SITE}/product/relaxation-chair/`,
        title: __('WooCommerce Product 3D view', '3d-viewer'), desc: __('Interactive 3D product viewer for WooCommerce products.', '3d-viewer'), descWidth: 187 },
    { tag: __('Default', '3d-viewer'), tone: GREEN, img: 'armchair', group: 'default', url: `${DEMO_SITE}/demo/demo-1-default/`,
        title: __('Default', '3d-viewer'), desc: __('Basic 3D viewer with default settings and features.', '3d-viewer'), descWidth: 195 },
    { tag: __('Custom Width', '3d-viewer'), tone: VIOLET, img: 'camera', group: 'width', url: `${DEMO_SITE}/demo/demo-2-custom-width/`,
        title: __('Custom Width', '3d-viewer'), desc: __('Set your own width and height for the 3D viewer.', '3d-viewer'), descWidth: 169 },
    { tag: __('Disable Zoom', '3d-viewer'), tone: ORANGE, img: 'watch', group: 'zoom', url: `${DEMO_SITE}/demo/demo-3-disable-zoom/`,
        title: __('Disable Zoom', '3d-viewer'), desc: __('Disable zoom functionality for a fixed scale view.', '3d-viewer'), descWidth: 157 },
    { tag: __('Disable Auto Rotate', '3d-viewer'), tone: RED, img: 'turntable', group: 'rotate', url: `${DEMO_SITE}/demo/demo-4-disable-auto-rotate/`,
        title: __('Disable Auto Rotate', '3d-viewer'), desc: __('Stop auto-rotation and keep manual rotation control only.', '3d-viewer'), descWidth: 179 },
    { tag: __('Lazy Loading', '3d-viewer'), tone: BLUE, img: 'office-chair', group: 'more', url: `${DEMO_SITE}/demo/demo-5-lazy-loading/`,
        title: __('Lazy Loading', '3d-viewer'), desc: __('Load 3D models only when they become visible on screen.', '3d-viewer') },
    { tag: __('Eager Loading', '3d-viewer'), tone: RED, img: 'drone', group: 'more', url: `${DEMO_SITE}/demo/demo-6-eager-loading/`,
        title: __('Eager Loading', '3d-viewer'), desc: __('Load all 3D models at once for instant switching.', '3d-viewer') },
    { tag: __('Multiple', '3d-viewer'), tone: BLUE, img: 'headphones', group: 'more', url: `${DEMO_SITE}/demo/demo-7-gallery/`,
        title: __('Multiple', '3d-viewer'), desc: __('Show multiple 3D models in one viewer interface.', '3d-viewer') },
    { tag: __('WooCommerce - Top of image', '3d-viewer'), tone: BLUE, img: 'running-shoe', group: 'woo', url: `${DEMO_SITE}/demo/demo-8-woocommerce-top-of-the-image/`,
        title: __('WooCommerce- Top of the image', '3d-viewer'), desc: __('Display 3D viewer at the top of product images.', '3d-viewer') },
    { tag: __('WooCommerce - Bottom of image', '3d-viewer'), tone: GREEN, img: 'cube', group: 'woo', url: `${DEMO_SITE}/demo/demo-9-woocommerce-bottom-of-the-image/`,
        title: __('WooCommerce- Bottom of the Image', '3d-viewer'), desc: __('Display 3D viewer at the bottom of product images.', '3d-viewer'), descWidth: 175 },
    { tag: __('WooCommerce - Replace', '3d-viewer'), tone: VIOLET, img: 'vr-headset', group: 'woo', url: `${DEMO_SITE}/demo/demo-10-woocommerce-replace-product-image/`,
        title: __('WooCommerce- Replace product image', '3d-viewer'), desc: __('Replace product image with 3D viewer on hover.', '3d-viewer'), descWidth: 178 },
    { tag: __('WooCommerce - Variants', '3d-viewer'), tone: ORANGE, img: 'canvas-shoe', group: 'woo', url: `${DEMO_SITE}/demo/demo-11-woocommerce-variants/`,
        title: __('WooCommerce- Variants', '3d-viewer'), desc: __('Show different variants in 3D (color, size, etc.).', '3d-viewer'), descWidth: 160 },
];

type Filter = 'all' | Group;

/* `w`: the pill boxes in the file (Figma rounds each label up to a whole pixel) */
const filters = (): { id: Filter; label: string; w: number }[] => [
    { id: 'all', label: __('All', '3d-viewer'), w: 49 },
    { id: 'woo', label: __('WooCommerce', '3d-viewer'), w: 137 },
    { id: 'default', label: __('Default', '3d-viewer'), w: 81 },
    { id: 'width', label: __('Custom Width', '3d-viewer'), w: 130 },
    { id: 'zoom', label: __('Disable Zoom', '3d-viewer'), w: 125 },
    { id: 'rotate', label: __('Disable Auto Rotate', '3d-viewer'), w: 167 },
];

const Hero: React.FC<{ count: number }> = ({ count }) => (
    <section className="bp3d-dash-hero bp3d-dash-hero--wide">
        <div className="bp3d-dash-hero__copy">
            <StatusTags />
            <div className="bp3d-dash-hero__lede">
                <h1>{__('Welcome to 3D Viewer 👋', '3d-viewer')}</h1>
                <div>
                    <p className="bp3d-dash-text">
                        {__('Display interactive 3D models on your website with beautiful controls and smooth performance.', '3d-viewer')}
                    </p>
                    <div className="bp3d-dash-chips">
                        <span className="bp3d-dash-chip" style={{ width: 162 }}>
                            {/* translators: %d: number of demos */}
                            <Cuboid size={14} weight={1.5} /> {sprintf(__('%d Demo Examples', '3d-viewer'), count)}
                        </span>
                        <span className="bp3d-dash-chip" style={{ width: 133.5 }}><Zap size={14} weight={1.5} /> {__('Fully Interactive', '3d-viewer')}</span>
                        <span className="bp3d-dash-chip" style={{ width: 176.67 }}><CircleCheck size={14} weight={1.5} /> {__('Works with Any Theme', '3d-viewer')}</span>
                    </div>
                </div>
            </div>
        </div>

        <HeroArt
            large
            blobs={[{ left: 742, top: -198.6 }, { left: 923.04, top: -66.11 }]}
            model={{ left: 806, top: 59.4 }}
            degree={{ left: 992.44, top: 72.04 }}
        >
            <div className="bp3d-dash-thumbs"><span /><span /><span /></div>
            <ViewerControls
                large
                style={{ left: 984, top: 182 }}
                icons={[{ size: 20.27, weight: 2 }, { size: 22.84, weight: 1.74 }, { size: 25.16, weight: 1.74 }]}
            />
        </HeroArt>
    </section>
);

const DemoCard: React.FC<Demo> = ({ tag, tone, img, title, desc, url, descWidth }) => (
    <article className="bp3d-dash-demo">
        <div>
            <a href={url} className="bp3d-dash-demo__stage" {...external} tabIndex={-1} aria-hidden="true">
                <span className="bp3d-dash-demo__tag" style={{ background: tone[0], color: tone[1] }}>{tag.toUpperCase()}</span>
                <span className="bp3d-dash-demo__menu">
                    <EllipsisVertical size={14.81} weight={1.85} />
                </span>
                <img src={DEMO_IMAGES[img]} alt="" loading="lazy" />
            </a>
            <div className="bp3d-dash-demo__copy">
                <h3 className="bp3d-dash-title" title={title}>{title}</h3>
                <p className="bp3d-dash-text" style={descWidth ? { width: descWidth } : undefined}>{desc}</p>
            </div>
        </div>
        <footer className="bp3d-dash-demo__foot">
            <a href={url} className="bp3d-dash-demo__preview" {...external}>
                {__('Preview', '3d-viewer')} <ArrowRight size={11.11} weight={1.85} />
            </a>
            {/* translators: %s: demo title */}
            <a href={url} className="bp3d-dash-demo__go" aria-label={sprintf(__('Open %s', '3d-viewer'), title)} {...external}>
                <ArrowRight size={11.11} weight={1.85} />
            </a>
        </footer>
    </article>
);

const NeedHelp: React.FC = () => {
    const { urls } = config();

    return (
        <aside className="bp3d-dash-help">
            <div className="bp3d-dash-help__main">
                <div className="bp3d-dash-help__intro">
                    <span className="bp3d-dash-help__icon"><CircleHelp size={22.22} weight={1.85} /></span>
                    <div>
                        <h3>{__('Need Help?', '3d-viewer')}</h3>
                        <p>{__('Check our documentation or get support from our team.', '3d-viewer')}</p>
                    </div>
                </div>
                <div className="bp3d-dash-help__actions">
                    <a href={urls.docs} className="bp3d-dash-btn bp3d-dash-btn--primary" {...external}>
                        {__('View Docs', '3d-viewer')} <ExternalLink size={12.96} weight={1.85} />
                    </a>
                    <a href={urls.support} className="bp3d-dash-btn bp3d-dash-btn--ghost" {...external}>
                        <Mail size={12.96} weight={1.85} /> {__('Contact Support', '3d-viewer')}
                    </a>
                </div>
            </div>
            <div className="bp3d-dash-help__art">
                <img src={HELP_IMAGE} alt="" loading="lazy" />
            </div>
        </aside>
    );
};

const Demos: React.FC = () => {
    const [filter, setFilter] = useState<Filter>('all');
    const [query, setQuery] = useState('');
    const all = useMemo(demos, []);

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return all.filter(
            (d) =>
                (filter === 'all' || d.group === filter) &&
                (!q || `${d.title} ${d.desc} ${d.tag}`.toLowerCase().includes(q))
        );
    }, [all, filter, query]);

    return (
        <div className="bp3d-dash-wide">
            <Hero count={all.length} />

            <div className="bp3d-dash-filters">
                <SearchField placeholder={__('Search demos...', '3d-viewer')} iconSize={16} weight={2} value={query} onChange={setQuery} />
                <div className="bp3d-dash-pills" role="tablist" aria-label={__('Filter demos', '3d-viewer')}>
                    {filters().map((f) => (
                        <button
                            key={f.id}
                            type="button"
                            role="tab"
                            aria-selected={f.id === filter}
                            className={[
                                'bp3d-dash-pill',
                                f.id === 'all' && 'bp3d-dash-pill--all',
                                f.id === filter && 'bp3d-dash-pill--on',
                            ].filter(Boolean).join(' ')}
                            style={{ minWidth: f.w }}
                            onClick={() => setFilter(f.id)}
                        >
                            {f.label}
                        </button>
                    ))}
                    <button
                        type="button"
                        className={filter === 'more' ? 'bp3d-dash-pill bp3d-dash-pill--on' : 'bp3d-dash-pill'}
                        style={{ minWidth: 131 }}
                        onClick={() => setFilter(filter === 'more' ? 'all' : 'more')}
                    >
                        {__('More Filters', '3d-viewer')} <ChevronDown size={12} weight={2} />
                    </button>
                </div>
            </div>

            <div className="bp3d-dash-demos">
                {shown.map((d) => <DemoCard key={d.url} {...d} />)}
                <NeedHelp />
            </div>
        </div>
    );
};

export default Demos;
