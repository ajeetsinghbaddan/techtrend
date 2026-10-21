export interface CtaStat {
    value: string;
    label: string;
}

export interface CtaSettings {
    enabled: boolean;
    eyebrow: string | null;
    title: string;
    text: string | null;
    label: string | null;
    href: string | null;
    stats: CtaStat[];
}
