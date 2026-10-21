import type { MoneyValue } from '@/types/catalog-public';

export type Address = {
    first_name: string;
    last_name: string;
    line1: string;
    line2: string | null;
    postcode: string;
    city: string;
    country: string;
    phone: string | null;
};

export type SavedAddress = Address & {
    id: number;
    label: string | null;
    is_default_shipping: boolean;
    is_default_billing: boolean;
};

export type OrderSummary = {
    number: string;
    status: string;
    placed_at: string | null;
    total: MoneyValue;
    item_count: number;
    images: string[];
};

export type OrderLine = {
    name: string;
    variant_label: string | null;
    image_url: string | null;
    quantity: number;
    unit_price: MoneyValue;
    line_total: MoneyValue;
    product_slug: string | null;
};

export type OrderDetail = {
    number: string;
    email: string;
    status: string;
    shipping_method: string;
    payment_method: string;
    shipping_address: Address;
    billing_address: Address | null;
    placed_at: string | null;
    tax_rate: number;
    tax_inclusive: boolean;
    totals: { subtotal: MoneyValue; shipping: MoneyValue; tax: MoneyValue; total: MoneyValue };
    items: OrderLine[];
};
