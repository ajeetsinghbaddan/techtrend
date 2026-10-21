/** English names for codes stored on orders; t() translates them. */
export const ORDER_LABELS: Record<string, string> = {
    standard: 'Standard',
    express: 'Express',
    card: 'Card',
    paypal: 'PayPal',
    klarna: 'Klarna',
    sepa: 'SEPA direct debit',
    invoice: 'Pay on invoice',
    ideal: 'iDEAL',
    blik: 'BLIK',
    swish: 'Swish',
    pending: 'Pending',
    paid: 'Paid',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
    stripe: 'Card',
    razorpay: 'Razorpay',
    paytm: 'Paytm',
    cod: 'Cash on delivery',
};

export const STATUS_STYLES: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-900',
    paid: 'bg-sky-100 text-sky-900',
    shipped: 'bg-violet-100 text-violet-900',
    delivered: 'bg-green-100 text-green-900',
    cancelled: 'bg-slate-200 text-slate-700',
    refunded: 'bg-slate-200 text-slate-700',
};

export function formatDate(iso: string | null, locale: string): string {
    return iso ? new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
}
