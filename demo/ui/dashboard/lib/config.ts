/**
 * The `data-info` JSON printed by BFieldsDemo\Dashboard::render() in
 * demo/includes/Dashboard.php.
 */
export interface DashboardUrls {
    addModel: string;
    models: string;
    settings: string;
    extensions: string;
    setup: string;
    docs: string;
    support: string;
    community: string;
    featureRequest: string;
    review: string;
    changelog: string;
    pricing: string;
}

/** Guided-setup state, mirroring BP3D\Base\Onboarding::state(). */
export interface OnboardingState {
    completed: boolean;
    percent: number;
}

export interface DashboardConfig {
    version: string;
    onboarding: OnboardingState;
    urls: DashboardUrls;
}

const EMPTY_URLS: DashboardUrls = {
    addModel: '',
    models: '',
    settings: '',
    extensions: '',
    setup: '',
    docs: '',
    support: '',
    community: '',
    featureRequest: '',
    review: '',
    changelog: '',
    pricing: '',
};

/** The node Dashboard.php prints and index.tsx mounts on. */
export const MOUNT_ID = 'bfields-demo-dashboard';

let cached: DashboardConfig | null = null;

export const config = (): DashboardConfig => {
    if (cached) return cached;

    let raw: Partial<DashboardConfig> = {};

    try {
        raw = JSON.parse(document.getElementById(MOUNT_ID)?.dataset.info || '{}');
    } catch {
        raw = {};
    }

    cached = {
        version: raw.version || '',
        // The demo has no guided setup; treated as done so the nav entry stays hidden.
        onboarding: { completed: true, percent: 100, ...(raw.onboarding || {}) },
        urls: { ...EMPTY_URLS, ...(raw.urls || {}) },
    };

    return cached;
};

/** Freemius product and plans the Pricing and Feature Comparison tabs sell. */
export const FREEMIUS = {
    pluginId: 8795,
    // Pro, Max — in the order the plan cards are laid out.
    planIds: [14970, 52950],
    // Single Site, 3 Sites, Unlimited Sites. `null` is Freemius' "unlimited".
    licenses: [1, 3, null] as (number | null)[],
};
