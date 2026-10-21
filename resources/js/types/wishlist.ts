import type { ProductCardData } from '@/types/catalog-public';

export type WishlistEntry = ProductCardData & {
    added_at: string | null;
    price_drop: number | null;
    available: boolean;
    quick_variant_id: number | null;
};
