type Item = {
    item_id: string;
    item_name: string;
    price?: number;
    quantity?: number;
    item_variant?: string;
    item_category?: string;
};

declare global {
    interface Window {
        gtag?: (...args: unknown[]) => void;
    }
}

/** 18588 → 185.88: GA4 wants prices in normal units. */
export const major = (minor: number) => Math.round(minor) / 100;

/**
 * Send a GA4 event. Before consent, Google's tag isn't loaded, so the event stays in the
 * page's own queue and is only sent if the visitor agrees; otherwise it's discarded.
 */
export function track(event: string, params: Record<string, unknown>): void {
    window.gtag?.('event', event, params);
}

export function trackItem(event: 'view_item' | 'add_to_cart', currency: string, item: Item): void {
    track(event, {
        currency,
        value: (item.price ?? 0) * (item.quantity ?? 1),
        items: [item],
    });
}

/** Report a purchase once, even if the confirmation page is reloaded or reopened. */
export function trackPurchaseOnce(orderNumber: string, params: Record<string, unknown>): void {
    const key = `ga_purchase_${orderNumber}`;

    try {
        if (localStorage.getItem(key)) return;
        localStorage.setItem(key, '1');
    } catch {
        // storage unavailable (private mode): send anyway; duplicates are rare
    }

    track('purchase', { transaction_id: orderNumber, ...params });
}
