import { useState } from '@wordpress/element';
import type React from 'react';
import { __ } from '@wordpress/i18n';

import { config } from '../lib/config';
import { HeroArt, ViewerControls, Tag, StatusTags, external } from '../components/shared';
import {
    Plus, Eye, SquareCheckFilled, ArrowRight, Rotate3d, CursorSelect, CodeBrackets, Settings02, File01,
    Plug01, StarRound, SettingsRound, Grid, Rocket, Book, Check, Crown, MessageCircle, Users, Lightbulb, Heart,
    type IconComponent,
} from '../components/icons';

interface QuickCard {
    title: string;
    desc: string;
    href: string;
    external?: boolean;
    Icon: IconComponent;
    bg: string;
    color: string;
    descWidth?: number;
    isNew?: boolean;
}

const quickCards = (): QuickCard[] => {
    const { urls } = config();

    return [
        { title: __('Create 3D Viewer', '3d-viewer'), desc: __('Build a new 3D viewer for your product or model.', '3d-viewer'),
            href: urls.addModel, Icon: Rotate3d, bg: '#ece4ff', color: '#8b5cf6' },
        { title: __('View Demos', '3d-viewer'), desc: __('Explore ready-made demos and templates.', '3d-viewer'),
            href: '#/demos', Icon: CursorSelect, bg: '#f2f6ff', color: '#1e60f2', descWidth: 194 },
        // The viewer list is where every model's [3d_viewer] shortcode is copied from.
        { title: __('Shortcode Generator', '3d-viewer'), desc: __('Generate and copy shortcodes to display your viewer.', '3d-viewer'),
            href: urls.models, Icon: CodeBrackets, bg: '#b5ffe7', color: '#046143', descWidth: 208 },
        { title: __('Settings', '3d-viewer'), desc: __('Configure general settings and preferences.', '3d-viewer'),
            href: urls.settings, Icon: Settings02, bg: '#f2f6ff', color: '#1e60f2', descWidth: 197 },
        { title: __('Help & Documentation', '3d-viewer'), desc: __('Get support and find helpful guides.', '3d-viewer'),
            href: urls.docs, external: true, Icon: File01, bg: '#ece4ff', color: '#8b5cf6', descWidth: 184 },
        { title: __('Extensions', '3d-viewer'), desc: __('Explore more features with premium extensions.', '3d-viewer'),
            href: urls.extensions, Icon: Plug01, bg: '#ffefe4', color: '#fd6700', isNew: true },
    ];
};

/* Taken from readme.txt — keep in step with it on each release. */
const changelog = () => [
    { text: __('Environment and HDR skybox images now free', '3d-viewer'), date: 'Sep 09, 2026',
        tag: { label: __('Free', '3d-viewer'), bg: '#d1fae5', color: '#10b981' },
        icon: <StarRound size={21.25} weight={1.5} color="#8b5cf6" />, large: true },
    { text: __('Missing model files now show a message', '3d-viewer'), date: 'Sep 09, 2026',
        tag: { label: __('Fix', '3d-viewer'), bg: '#ffedd5', color: '#f97316' },
        icon: <SettingsRound size={20.75} weight={1.5} color="#1e60f2" /> },
    { text: __('Added a 3D file download button', '3d-viewer'), date: 'Aug 12, 2026',
        tag: { label: __('New', '3d-viewer'), bg: '#d1fae5', color: '#10b981' },
        icon: <Grid size={20.75} weight={1.5} color="#f97316" /> },
    { text: __('Augmented Reality (AR) now in the free version', '3d-viewer'), date: 'Aug 12, 2026',
        tag: { label: 'AR', bg: '#ecfeff', color: '#06b6d4' },
        icon: <SettingsRound size={20.75} weight={1.5} color="#1e60f2" /> },
];

type Builder = 'gutenberg' | 'elementor' | 'shortcode';

const builders = (): { id: Builder; label: string }[] => [
    { id: 'gutenberg', label: __('Gutenberg', '3d-viewer') },
    { id: 'elementor', label: __('Elementor', '3d-viewer') },
    { id: 'shortcode', label: __('Shortcode', '3d-viewer') },
];

const steps = (): Record<Builder, [string, string][]> => ({
    gutenberg: [
        [__('Add the Block', '3d-viewer'), __('In the block editor, click + or type /3D Model Viewer to insert the block.', '3d-viewer')],
        [__('Upload & Configure', '3d-viewer'), __('Add your 3D file (glb, gltf, obj and more) and adjust camera, lights, and layout options.', '3d-viewer')],
        [__('Publish', '3d-viewer'), __('Preview the 3D model, then publish your post or page to showcase it live.', '3d-viewer')],
    ],
    elementor: [
        [__('Add the Widget', '3d-viewer'), __('In the Elementor editor, search for Model Viewer and drag the widget onto the page.', '3d-viewer')],
        [__('Upload & Configure', '3d-viewer'), __('Add your 3D file (glb, gltf, obj and more) and adjust size, camera controls, and auto-rotate.', '3d-viewer')],
        [__('Publish', '3d-viewer'), __('Preview the 3D model, then publish your page to showcase it live.', '3d-viewer')],
    ],
    shortcode: [
        [__('Create a Viewer', '3d-viewer'), __('Go to 3D Viewer → Add New, upload your model and publish it.', '3d-viewer')],
        [__('Copy the Shortcode', '3d-viewer'), __('Copy the [3d_viewer id="…"] shortcode from the model screen or the viewer list.', '3d-viewer')],
        [__('Paste & Publish', '3d-viewer'), __('Paste the shortcode into any post, page or widget area and publish.', '3d-viewer')],
    ],
});

const proFeatures = () => [
    __('Advanced lighting and shadow controls', '3d-viewer'),
    __('Interactive hot-spots & annotations', '3d-viewer'),
    __('3D models for WooCommerce variations', '3d-viewer'),
];

const support = () => {
    const { urls } = config();

    return [
        { title: __('Need any Assistance?', '3d-viewer'), desc: __('Our Expert Support Team is always ready to help you out promptly.', '3d-viewer'),
            cta: __('Contact Support', '3d-viewer'), href: urls.support, icon: <MessageCircle size={20} weight={1.5} />, descWidth: 255 },
        { title: __('Join Our Community', '3d-viewer'), desc: __('Get tutorials, plugin updates, and share thoughts with other creators.', '3d-viewer'),
            cta: __('Join Community', '3d-viewer'), href: urls.community, icon: <Users size={20} weight={1.5} />, descWidth: 245 },
        { title: __('Request a Feature', '3d-viewer'), desc: __('Have an idea that would make this plugin better? Let us know!', '3d-viewer'),
            cta: __('Submit Idea', '3d-viewer'), href: urls.featureRequest, icon: <Lightbulb size={20} weight={1.5} />, descWidth: 221 },
        { title: __('Loving This Plugin?', '3d-viewer'), desc: __("We're a small team pouring our heart and soul into this plugin.", '3d-viewer'),
            cta: __('Leave a Review', '3d-viewer'), href: urls.review, icon: <Heart size={20.98} weight={1.5} color="#f97316" />, descWidth: 226 },
    ];
};

const Hero: React.FC = () => (
    <section className="bp3d-dash-hero">
        <div className="bp3d-dash-hero__copy">
            <StatusTags />

            <div className="bp3d-dash-hero__lede">
                <h1>{__('Welcome to 3D Viewer 👋', '3d-viewer')}</h1>
                <p className="bp3d-dash-text">
                    {__('Display interactive 3D models on your website with beautiful controls and smooth performance.', '3d-viewer')}
                </p>
            </div>

            <div className="bp3d-dash-hero__actions">
                <a href={config().urls.addModel} className="bp3d-dash-btn bp3d-dash-btn--primary">
                    <Plus size={13.17} weight={1.65} /> {__('Create 3D Viewer', '3d-viewer')}
                </a>
                <a href="#/demos" className="bp3d-dash-btn bp3d-dash-btn--ghost">
                    <Eye size={13.17} weight={1.65} /> {__('View Demos', '3d-viewer')}
                </a>
            </div>

            <ul className="bp3d-dash-perks">
                {[__('Easy to use', '3d-viewer'), __('No coding required', '3d-viewer'), __('Works with any theme', '3d-viewer')].map((p) => (
                    <li key={p} className="bp3d-dash-perk">
                        <SquareCheckFilled size={16.46} /> {p}
                    </li>
                ))}
            </ul>
        </div>

        <HeroArt
            blobs={[{ left: 422.9, top: -166.55 }, { left: 603.94, top: -34.06 }]}
            model={{ left: 503, top: 48.4 }}
            degree={{ left: 429, top: 119.4 }}
        >
            <ViewerControls
                style={{ left: 677, top: 114.4 }}
                icons={[{ size: 14.37, weight: 1.42 }, { size: 16.2, weight: 1.23 }, { size: 17.85, weight: 1.23 }]}
            />
        </HeroArt>
    </section>
);

const QuickAccess: React.FC = () => (
    <section className="bp3d-dash-quick">
        <header className="bp3d-dash-sechead">
            <h2>{__('Quick Access', '3d-viewer')}</h2>
            <p className="bp3d-dash-text">{__('Jump into the most used features and start creating your 3D viewer.', '3d-viewer')}</p>
        </header>

        <div className="bp3d-dash-quick__grid">
            {quickCards().map(({ title, desc, href, external: ext, Icon, bg, color, descWidth, isNew }) => (
                <a key={title} href={href} className="bp3d-dash-qcard" {...(ext ? external : {})}>
                    <div className="bp3d-dash-qcard__head">
                        <span className="bp3d-dash-qcard__icon" style={{ background: bg, color }}>
                            <Icon size={19.75} weight={1.23} />
                        </span>
                        {isNew && <span className="bp3d-dash-new">{__('NEW', '3d-viewer')}</span>}
                    </div>
                    <div className="bp3d-dash-qcard__body">
                        <h3 className="bp3d-dash-title">{title}</h3>
                        <p className="bp3d-dash-text" style={descWidth ? { width: descWidth } : undefined}>{desc}</p>
                    </div>
                    <ArrowRight className="bp3d-dash-qcard__arrow" size={11.52} weight={1.65} />
                </a>
            ))}
        </div>
    </section>
);

const Changelog: React.FC = () => (
    <section className="bp3d-dash-updates">
        <header className="bp3d-dash-updates__head">
            <div className="bp3d-dash-updates__title">
                <h2 className="bp3d-dash-title">{__('Latest Updates & Changelog', '3d-viewer')}</h2>
                <Tag bg="#d1fae5" color="#10b981">{__('New', '3d-viewer')}</Tag>
            </div>
            <a href={config().urls.changelog} className="bp3d-dash-updates__all" {...external}>
                {__('View All Updates →', '3d-viewer')}
            </a>
        </header>

        <ul className="bp3d-dash-log">
            {changelog().map((c, i) => (
                <li key={c.text} style={{ display: 'contents' }}>
                    {i > 0 && <span className="bp3d-dash-log__rule" aria-hidden="true" />}
                    <div className="bp3d-dash-log__item">
                        <div className="bp3d-dash-log__what">
                            <span className={c.large ? 'bp3d-dash-log__icon bp3d-dash-log__icon--lg' : 'bp3d-dash-log__icon'}>
                                {c.icon}
                            </span>
                            <span className="bp3d-dash-text">{c.text}</span>
                            <Tag bg={c.tag.bg} color={c.tag.color}>{c.tag.label}</Tag>
                        </div>
                        <time className="bp3d-dash-log__when">{c.date}</time>
                    </div>
                </li>
            ))}
            <li className="bp3d-dash-log__rule" aria-hidden="true" />
        </ul>
    </section>
);

const GettingStarted: React.FC = () => {
    const [builder, setBuilder] = useState<Builder>('gutenberg');

    return (
        <section className="bp3d-dash-steps-card">
            <header className="bp3d-dash-steps-card__head">
                <span className="bp3d-dash-steps-card__icon"><Rocket size={16.37} weight={1.5} /></span>
                <div>
                    <h2 className="bp3d-dash-title">{__('Getting Started', '3d-viewer')}</h2>
                    <p className="bp3d-dash-text">{__('Follow these simple setup steps.', '3d-viewer')}</p>
                </div>
            </header>

            <div className="bp3d-dash-builders" role="tablist" aria-label={__('Editor', '3d-viewer')}>
                {builders().map((b) => (
                    <button
                        key={b.id}
                        type="button"
                        role="tab"
                        aria-selected={b.id === builder}
                        className={b.id === builder ? 'bp3d-dash-builder bp3d-dash-builder--on' : 'bp3d-dash-builder'}
                        onClick={() => setBuilder(b.id)}
                    >
                        {b.label}
                    </button>
                ))}
            </div>

            <ol className="bp3d-dash-steps">
                {steps()[builder].map(([title, desc], i) => (
                    <li key={title} className="bp3d-dash-step">
                        <span className="bp3d-dash-step__num">{i + 1}</span>
                        <div>
                            <h3 className="bp3d-dash-title">{title}</h3>
                            <p className="bp3d-dash-text">{desc}</p>
                        </div>
                    </li>
                ))}
            </ol>
        </section>
    );
};

const DocsCard: React.FC = () => (
    <section className="bp3d-dash-docs">
        <h2 className="bp3d-dash-docs__title">
            <Book size={16.37} weight={1.82} />
            <span className="bp3d-dash-title">{__('Read the Full Documentation', '3d-viewer')}</span>
        </h2>
        <p className="bp3d-dash-text">
            {__('Browse through our guides, settings reference, and examples for every single feature.', '3d-viewer')}
        </p>
        <a href={config().urls.docs} className="bp3d-dash-btn bp3d-dash-btn--primary" {...external}>
            {__('Open Documentation →', '3d-viewer')}
        </a>
    </section>
);

const ProCard: React.FC = () => (
    <section className="bp3d-dash-pro">
        <header className="bp3d-dash-pro__head">
            <h2 className="bp3d-dash-title">{__('Go 3D Viewer Pro!', '3d-viewer')}</h2>
            <Crown />
        </header>
        <p className="bp3d-dash-pro__sub">{__('Unlock advanced rendering & custom features.', '3d-viewer')}</p>
        <ul className="bp3d-dash-pro__list">
            {proFeatures().map((f) => (
                <li key={f} className="bp3d-dash-text">
                    <Check size={10.91} weight={1.82} /> {f}
                </li>
            ))}
        </ul>
        <a href="#/pricing" className="bp3d-dash-btn bp3d-dash-btn--primary">{__('View Pricing Plan →', '3d-viewer')}</a>
    </section>
);

const Support: React.FC = () => (
    <section className="bp3d-dash-support">
        {support().map((s) => (
            <div key={s.title} className="bp3d-dash-support__col">
                <h3 className="bp3d-dash-support__head">
                    {s.icon}
                    <span className="bp3d-dash-title">{s.title}</span>
                </h3>
                <p className="bp3d-dash-text" style={{ width: s.descWidth }}>{s.desc}</p>
                <a href={s.href} className="bp3d-dash-btn bp3d-dash-btn--ghost" {...external}>{s.cta}</a>
            </div>
        ))}
    </section>
);

const Welcome: React.FC = () => (
    <>
        <div className="bp3d-dash-home">
            <div className="bp3d-dash-home__main">
                <Hero />
                <QuickAccess />
                <Changelog />
            </div>
            <aside className="bp3d-dash-home__side">
                <GettingStarted />
                <DocsCard />
                <ProCard />
            </aside>
        </div>
        <Support />
    </>
);

export default Welcome;
