import { useState } from '@wordpress/element';
import type React from 'react';
import { __, sprintf } from '@wordpress/i18n';

import { FREEMIUS } from '../lib/config';
import {
    useProduct, sellablePlans, priceFor, formatPrice, annualSaving, checkout, type Cycle, type Plan as ApiPlan,
} from '../lib/pricing';
import { Star, Check, ArrowRight, ShieldCheck, RefreshCw, Headset, Lock, ChevronUp, ChevronDown, type IconComponent } from '../components/icons';

/* The Pro feature list, also the Feature Comparison rows. Kept here rather
   than read from the API: its feature titles carry raw HTML entities
   (`&amp;`, `&deg;`) and would need to be injected as markup. */
export const features = (): string[] => [
    __('Gutenberg Block', '3d-viewer'),
    __('Supports Popular 3D Formats (GLB, GLTF, OBJ, STL, and more)', '3d-viewer'),
    __('Support for external model URLs', '3d-viewer'),
    __('Show 3D product on your WooCommerce product pages', '3d-viewer'),
    __('Touch, Pan, Zoom & Rotate controls', '3d-viewer'),
    __('Lazy Loading for Performance', '3d-viewer'),
    __('Add a poster image to show while the model is loading (Lite View)', '3d-viewer'),
    __('Display a progress bar until the 3D file is fully loaded', '3d-viewer'),
    __('Display loading progress as a percentage', '3d-viewer'),
    __('Enable/Disable moving control', '3d-viewer'),
    __('Elementor Widget/Addons', '3d-viewer'),
    __('Show/Hide Fullscreen Button on the Viewer', '3d-viewer'),
    __('Preset to save your preferred viewer configurations', '3d-viewer'),
    __('Auto-Rotation to view in 360° without interaction', '3d-viewer'),
    __('Full viewer settings on Elementor widget/addons', '3d-viewer'),
    __('Add multiple 3D models into a single viewer gallery', '3d-viewer'),
    __('Add 3D models for each variant for the WooCommerce product', '3d-viewer'),
    __('Adjust lighting, shadow intensity, and exposure', '3d-viewer'),
    __('Enable or disable auto-rotate, and autoplay', '3d-viewer'),
    __('Set a custom camera angle for the perfect first impression', '3d-viewer'),
];

interface PlanCopy {
    key: string;
    name: string;
    flag: string;
    blurb: string;
    extra: string[];
}

/* Card copy, by position in FREEMIUS.planIds. */
const planCopy = (): PlanCopy[] => [
    { key: 'pro', name: __('Pro', '3d-viewer'), flag: __('Most Popular', '3d-viewer'),
        blurb: __('Included Some Awesome Premium Features.', '3d-viewer'), extra: [] as string[] },
    { key: 'max', name: __('Max', '3d-viewer'), flag: '',
        blurb: __('Included All the Premium Extensions.', '3d-viewer'), extra: [__('Included All the Premium Extensions', '3d-viewer')] },
];

export const siteLabel = (licenses: number | null): string =>
    licenses === null
        ? __('Unlimited Sites', '3d-viewer')
        : licenses === 1
            ? __('Single Site', '3d-viewer')
            // translators: %d: number of sites
            : sprintf(__('%d Sites', '3d-viewer'), licenses);

export const cycleSuffix = (cycle: Cycle): string =>
    cycle === 'annual' ? __('/ yr', '3d-viewer') : cycle === 'monthly' ? __('/ mo', '3d-viewer') : '';

const assurances = (): { title: string; sub: string; Icon: IconComponent; color?: string }[] => [
    { title: __('14 days money back', '3d-viewer'), sub: __('Risk-free purchase', '3d-viewer'), Icon: ShieldCheck },
    { title: __('Plugins updates', '3d-viewer'), sub: __('On every plan', '3d-viewer'), Icon: RefreshCw, color: '#8b5cf6' },
    { title: __('Priority support', '3d-viewer'), sub: __('Get help when you need it', '3d-viewer'), Icon: Headset },
    { title: __('Secure checkout', '3d-viewer'), sub: __('Powered by Freemius', '3d-viewer'), Icon: Lock },
];

const faq = (): [string, string][] => [
    [__('Can I upgrade my plan later?', '3d-viewer'),
        __('Yes — you can upgrade any time from your account. We prorate the difference automatically.', '3d-viewer')],
    [__('What happens after my license expires?', '3d-viewer'),
        __('The plugin keeps working with everything you have set up — you just stop receiving updates and priority support until you renew.', '3d-viewer')],
    [__('Do you offer refunds?', '3d-viewer'),
        __('Yes — every plan comes with a 14-day money-back guarantee, no questions asked.', '3d-viewer')],
];

export interface BillingOption {
    id: Cycle;
    label: string;
    save?: string;
}

/** Yearly and Lifetime, plus Monthly when asked for; "Save N%" rides on Yearly. */
export const billingOptions = (plan: ApiPlan | undefined, withMonthly: boolean): BillingOption[] => {
    const saving = annualSaving(priceFor(plan, 1));

    return [
        ...(withMonthly ? [{ id: 'monthly' as Cycle, label: __('Monthly', '3d-viewer') }] : []),
        {
            id: 'annual',
            label: __('Yearly', '3d-viewer'),
            // translators: %d: percentage saved by paying yearly
            save: saving > 0 ? sprintf(__('Save %d%%', '3d-viewer'), saving) : undefined,
        },
        { id: 'lifetime', label: __('Lifetime', '3d-viewer') },
    ];
};

export const BillingToggle: React.FC<{
    options: BillingOption[];
    value: Cycle;
    onChange: (value: Cycle) => void;
}> = ({ options, value, onChange }) => (
    <div className="bp3d-dash-billing" role="radiogroup" aria-label={__('Billing period', '3d-viewer')}>
        {options.map((o) => (
            <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={o.id === value}
                // `yearly` is the prototype's class name for the annual option
                className={`bp3d-dash-billing__opt bp3d-dash-billing__opt--${o.id === 'annual' ? 'yearly' : o.id}${o.id === value ? ' bp3d-dash-billing__opt--on' : ''}`}
                onClick={() => onChange(o.id)}
            >
                {o.label}
                {o.save && <span className="bp3d-dash-billing__save">{o.save}</span>}
            </button>
        ))}
    </div>
);

type Product = ReturnType<typeof useProduct>['product'];

const Plan: React.FC<{
    index: number;
    copy: PlanCopy;
    plan: ApiPlan | undefined;
    product: Product;
    cycle: Cycle;
    loading: boolean;
}> = ({
    index,
    copy,
    plan,
    product,
    cycle,
    loading,
}) => {
    const [licenses, setLicenses] = useState<number | null>(FREEMIUS.licenses[0] ?? 1);
    const price = priceFor(plan, licenses);
    const amount = price?.[cycle];
    const list = [...features(), ...copy.extra];

    // What twelve months of monthly billing would cost — the struck-through
    // "was" price the yearly card is compared against.
    const monthlyYear = cycle === 'annual' && price?.monthly ? price.monthly * 12 : 0;

    const perSite = licenses && amount !== undefined ? amount / licenses : null;

    return (
        <article className={index === 0 ? 'bp3d-dash-plan' : 'bp3d-dash-plan bp3d-dash-plan--max'}>
            <header className="bp3d-dash-plan__head">
                {copy.flag ? (
                    <span className="bp3d-dash-plan__flag"><Star size={11.1} weight={1.5} /> {copy.flag}</span>
                ) : (
                    <span className="bp3d-dash-plan__flag bp3d-dash-plan__flag--blank" aria-hidden="true" />
                )}
                <h2>{copy.name}</h2>
                <p className="bp3d-dash-text">{copy.blurb}</p>
            </header>

            {/* translators: %s: plan name */}
            <div className="bp3d-dash-sites" role="radiogroup" aria-label={sprintf(__('%s sites', '3d-viewer'), copy.name)}>
                {FREEMIUS.licenses.map((l) => (
                    <button
                        key={String(l)}
                        type="button"
                        role="radio"
                        aria-checked={l === licenses}
                        className={l === licenses ? 'bp3d-dash-sites__on' : undefined}
                        onClick={() => setLicenses(l)}
                    >
                        {siteLabel(l)}
                    </button>
                ))}
            </div>

            <div className={loading ? 'bp3d-dash-price bp3d-dash-price--loading' : 'bp3d-dash-price'} aria-busy={loading}>
                <div className="bp3d-dash-price__main">
                    <span className="bp3d-dash-price__cur">$</span>
                    <span className="bp3d-dash-price__amt">{formatPrice(amount)}</span>
                    {cycleSuffix(cycle) && <span className="bp3d-dash-price__per">{cycleSuffix(cycle)}</span>}
                </div>
                <div className="bp3d-dash-price__was">
                    {monthlyYear > 0 && amount !== undefined ? (
                        <>
                            {/* translators: %s: price of twelve monthly payments */}
                            <s>{sprintf(__('$%s billed monthly', '3d-viewer'), formatPrice(monthlyYear))}</s>
                            {/* translators: %s: amount saved */}
                            <span className="bp3d-dash-price__save">{sprintf(__('Save $%s', '3d-viewer'), formatPrice(monthlyYear - amount))}</span>
                        </>
                    ) : perSite !== null ? (
                        // translators: %s: price per site
                        <span>{sprintf(__('≈ $%s per site', '3d-viewer'), formatPrice(perSite))}</span>
                    ) : (
                        <span>{__('Use on every site you build.', '3d-viewer')}</span>
                    )}
                </div>
                <p className="bp3d-dash-text">
                    {cycle === 'annual' && amount !== undefined
                        // translators: %s: monthly equivalent of the yearly price
                        ? sprintf(__('Billed yearly • $%s/mo', '3d-viewer'), formatPrice(amount / 12))
                        : cycle === 'lifetime'
                            ? __('One-time payment, yours forever.', '3d-viewer')
                            : __('Billed monthly, cancel anytime.', '3d-viewer')}
                </p>
            </div>

            <div className="bp3d-dash-plan__rule" aria-hidden="true" />

            <ul className="bp3d-dash-plan__feats">
                {list.map((f) => (
                    <li key={f} className="bp3d-dash-text">
                        <span className="bp3d-dash-tick"><Check size={9.25} weight={1.85} /></span>
                        {f}
                    </li>
                ))}
            </ul>

            <button type="button" className="bp3d-dash-btn bp3d-dash-plan__buy" onClick={() => checkout(product, plan, licenses, cycle)}>
                {__('Buy Now', '3d-viewer')} <ArrowRight size={12.95} weight={1.85} />
            </button>
        </article>
    );
};

const Faq: React.FC = () => {
    const [open, setOpen] = useState(0);

    return (
        <section className="bp3d-dash-faq">
            <header className="bp3d-dash-faq__head">
                <h2>{__('Frequently asked questions', '3d-viewer')}</h2>
                <p className="bp3d-dash-text">{__('Find quick answers to common questions about our pricing and plans.', '3d-viewer')}</p>
            </header>
            <div className="bp3d-dash-faq__list">
                {faq().map(([q, a], i) => (
                    <div key={q} className="bp3d-dash-faq__item">
                        <button
                            type="button"
                            className="bp3d-dash-faq__q"
                            aria-expanded={open === i}
                            onClick={() => setOpen(open === i ? -1 : i)}
                        >
                            <span className="bp3d-dash-title">{q}</span>
                            {open === i ? <ChevronUp size={16} weight={2} /> : <ChevronDown size={16} weight={2} />}
                        </button>
                        {open === i && <p className="bp3d-dash-text">{a}</p>}
                    </div>
                ))}
            </div>
        </section>
    );
};

const Pricing: React.FC = () => {
    const [cycle, setCycle] = useState<Cycle>('annual');
    const { status, product } = useProduct();
    const plans = sellablePlans(product);

    return (
        <>
            <header className="bp3d-dash-intro">
                <span className="bp3d-dash-intro__badge">{__('Pricing', '3d-viewer')}</span>
                <h1>{__('Pick the plan that fits your project', '3d-viewer')}</h1>
                <p className="bp3d-dash-text">
                    {__('Unlock more features, get better control and take your 3D viewer experience to the next level. Choose a plan that works for you.', '3d-viewer')}
                </p>
                <BillingToggle value={cycle} onChange={setCycle} options={billingOptions(plans[0], false)} />
            </header>

            <div className="bp3d-dash-plans">
                {planCopy().map((c, i) => (
                    <Plan key={c.key} index={i} copy={c} plan={plans[i]} product={product} cycle={cycle} loading={status === 'loading'} />
                ))}
            </div>

            <div className="bp3d-dash-after">
                <div className="bp3d-dash-assure">
                    {assurances().map(({ title, sub, Icon, color }) => (
                        <div key={title} className="bp3d-dash-assure__card">
                            <span className="bp3d-dash-assure__icon" style={color ? { color } : undefined}>
                                <Icon size={20.7} weight={2.07} />
                            </span>
                            <div>
                                <h3 className="bp3d-dash-title">{title}</h3>
                                <p className="bp3d-dash-text">{sub}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <Faq />
            </div>
        </>
    );
};

export default Pricing;
