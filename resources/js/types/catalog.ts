export interface VariantForm {
    id: number | null;
    colour_name: string;
    colour_hex: string;
    option_name: string;
    sku: string;
    stock: number;
    price_adjustment_minor: number;
    is_active: boolean;
}

export interface PriceForm {
    currency: string;
    amount_minor: number;
    compare_at_minor: number | null;
}

export interface SpecRow {
    label: string;
    value: string;
}

export interface ProductImageData {
    id: number;
    url: string;
    alt: string | null;
    colour_name: string | null;
}

export interface ProductData {
    id: number;
    name: string;
    slug: string;
    subtitle: string | null;
    description: string | null;
    specs: SpecRow[] | null;
    compliance: SpecRow[] | null;
    run_label: string | null;
    units_total: number | null;
    rating: number | null;
    reviews_count: number;
    is_active: boolean;
    meta_title: string | null;
    meta_description: string | null;
    collection_ids: number[];
    variants: VariantForm[];
    prices: PriceForm[];
    images: ProductImageData[];
}
