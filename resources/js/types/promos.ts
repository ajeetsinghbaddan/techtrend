export type BoxPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface PromoCard {
    id: string;
    title: string;
    text: string | null;
    label: string | null;
    href: string | null;
    box_position: BoxPosition;
    image_url: string | null;
}

export interface PromoSettings {
    cards: PromoCard[];
}
