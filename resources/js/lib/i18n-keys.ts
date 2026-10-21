// Strings used through variables, listed here so `translations:sync` can find them.
// This file is never imported; it only exists to be scanned.
export const KEYS = [
    // Delivery methods
    t('Standard'), t('Express'),

    // Payment methods (codes stored on orders, shown via ORDER_LABELS)
    t('Card'), t('PayPal'), t('Razorpay'), t('Paytm'), t('Cash on delivery'),
    t('Klarna'), t('SEPA direct debit'), t('Pay on invoice'), t('iDEAL'), t('BLIK'), t('Swish'),

    // Order statuses
    t('Pending'), t('Paid'), t('Shipped'), t('Delivered'), t('Cancelled'), t('Refunded'),
];

declare function t(key: string): string;
