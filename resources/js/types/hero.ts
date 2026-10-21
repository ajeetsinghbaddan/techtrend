export interface HeroSlide {
    id: string;
    eyebrow: string | null;
    title: string;
    text: string | null;
    primary_label: string | null;
    primary_href: string | null;
    secondary_label: string | null;
    secondary_href: string | null;
    image_url: string | null;
}

export interface HeroSettings {
    autoplay: boolean;
    delay: number;
    slides: HeroSlide[];
}
