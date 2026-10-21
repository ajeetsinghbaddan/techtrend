export interface MoneyValue {
    minor: number;
    currency: string;
    formatted: string;
}

export interface ProductCardData {
    name: string;
    slug: string;
    image_url: string | null;
    image_alt: string;
    price: MoneyValue | null;
    compare_at: MoneyValue | null;
    percent_off: number | null;
    rating: number | null;
    reviews_count: number;
    badge: string | null;
    in_stock: boolean;
    swatches: { name: string | null; hex: string }[];
}

export interface ProductRow {
    id: string;
    title: string;
    subtitle: string | null;
    link_label: string | null;
    link_href: string | null;
    placement: 'before_explore' | 'after_explore';
    products: ProductCardData[];
}
