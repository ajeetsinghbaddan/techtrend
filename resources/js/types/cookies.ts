export interface CookieCategory {
    enabled: boolean;
    label: string;
    description: string;
}

export interface CookieBannerSettings {
    enabled: boolean;
    version: number;
    position: 'bottom' | 'bottom-left';
    text: string;
    accept_label: string;
    reject_label: string;
    customize_label: string;
    save_label: string;
    policy_label: string | null;
    policy_href: string | null;
    essential_label: string;
    essential_description: string;
    categories: { analytics: CookieCategory; marketing: CookieCategory };
    ga_measurement_id: string | null;
    plausible_domain: string | null;
}
