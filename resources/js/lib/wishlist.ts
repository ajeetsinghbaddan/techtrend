import { usePage } from '@inertiajs/react';

/** The saved products, shared by the server with every page. */
export function useWishlist() {
    const slugs = usePage<{ wishlist?: string[] }>().props.wishlist ?? [];

    return {
        slugs,
        count: slugs.length,
        has: (slug: string) => slugs.includes(slug),
    };
}
