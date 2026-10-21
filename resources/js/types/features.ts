export interface FeatureItem {
    title: string;
    text: string | null;
    href: string | null;
}

export interface FeatureSettings {
    items: FeatureItem[];
}
