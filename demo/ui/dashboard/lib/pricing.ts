import { useEffect, useState } from '@wordpress/element';

import { FREEMIUS, config } from './config';

/*
 * Live prices for the Pricing and Feature Comparison tabs, from the same
 * bPlugins endpoint the old bpl-tools pricing screen read. Nothing here is
 * hardcoded, so a price change on Freemius shows up without a plugin release.
 */

export type Cycle = 'monthly' | 'annual' | 'lifetime';

export interface PlanPrice {
    licenses: number | null;
    monthly?: number;
    annual?: number;
    lifetime?: number;
}

export interface Plan {
    id: string | number;
    name: string;
    title: string;
    description: string;
    pricing: PlanPrice[];
}

interface Product {
    id: string;
    public_key: string;
    title: string;
    icon: string;
    plans: Plan[];
}

type State = { status: 'loading' | 'error'; product: null } | { status: 'ready'; product: Product };

// One request per page load, shared by both tabs.
let request: Promise<Product> | null = null;

const fetchProduct = (): Promise<Product> => {
    if (!request) {
        request = fetch(`https://api.bplugins.com/wp-json/bpl/v1/products/${FREEMIUS.pluginId}`)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status} ${r.statusText}`))))
            .catch((e) => {
                request = null; // let the next visit to the tab retry
                throw e;
            });
    }

    return request;
};

export const useProduct = (): State => {
    const [state, setState] = useState<State>({ status: 'loading', product: null });

    useEffect(() => {
        let mounted = true;

        fetchProduct()
            .then((product) => mounted && setState({ status: 'ready', product }))
            .catch(() => mounted && setState({ status: 'error', product: null }));

        return () => {
            mounted = false;
        };
    }, []);

    return state;
};

/** The plans the dashboard sells, in FREEMIUS.planIds order. */
export const sellablePlans = (product: Product | null): Plan[] =>
    FREEMIUS.planIds
        .map((id) => product?.plans?.find((p) => Number(p.id) === id))
        .filter((p): p is Plan => !!p);

export const priceFor = (plan: Plan | undefined, licenses: number | null): PlanPrice | undefined =>
    plan?.pricing?.find((p) => (p.licenses ?? null) === licenses);

export const formatPrice = (amount: number | undefined): string => {
    if (amount === undefined || isNaN(amount)) return '—';
    return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
};

/** Yearly vs twelve months of monthly billing, as a whole percentage. */
export const annualSaving = (price: PlanPrice | undefined): number => {
    if (!price?.monthly || !price?.annual) return 0;
    const fullYear = price.monthly * 12;
    return Math.round(((fullYear - price.annual) / fullYear) * 100);
};

/**
 * Buy Now. The real 3D Viewer opens the Freemius checkout overlay here; the
 * demo sells nothing and must not depend on bpl-tools, which lives outside
 * this repo, so it opens the pricing page with the chosen plan instead.
 */
export const checkout = (_product: Product | null, _plan: Plan | undefined, _licenses: number | null, _cycle: Cycle) => {
    window.open(config().urls.pricing, '_blank', 'noopener');
};
