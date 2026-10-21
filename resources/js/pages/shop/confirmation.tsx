import StoreLayout from '@/layouts/store-layout';
import { major, trackPurchaseOnce } from '@/lib/ecommerce';
import { rich, useT } from '@/lib/i18n';
import type { MoneyValue } from '@/types/catalog-public';
import { Head, Link } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import { useEffect } from 'react';

type Item = {
    name: string;
    slug?: string | null;
    variant_label: string | null;
    image_url: string | null;
    quantity: number;
    line_total: MoneyValue;
};

type Order = {
    number: string;
    email: string;
    status: string;
    currency: string;
    shipping_method: string;
    payment_method: string;
    shipping_address: {
        first_name: string; last_name: string; line1: string; line2: string | null;
        postcode: string; city: string; country: string;
    };
    placed_at: string | null;
    paid_at: string | null;
    tax_rate: number;
    totals: { subtotal: MoneyValue; shipping: MoneyValue; tax: MoneyValue; total: MoneyValue };
    items: Item[];
};

/** English names for the codes stored on the order; t() translates them. */
const LABELS: Record<string, string> = {
    standard: 'Standard',
    express: 'Express',
    stripe: 'Card',
    card: 'Card',
    paypal: 'PayPal',
    razorpay: 'Razorpay',
    paytm: 'Paytm',
    cod: 'Cash on delivery',
    pending: 'Pending',
    paid: 'Paid',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
};

export default function Confirmation({ order }: { order: Order }) {
    const t = useT();
    const label = (code: string) => t(LABELS[code] ?? code);
    const address = order.shipping_address;
    const cashOnDelivery = order.payment_method === 'cod';

    // Analytics: record the sale once. Online orders count only once paid;
    // cash on delivery counts when it's placed, since payment comes later.
    useEffect(() => {
        if (!cashOnDelivery && !order.paid_at) return;

        trackPurchaseOnce(order.number, {
            currency: order.currency,
            value: major(order.totals.total.minor),
            tax: major(order.totals.tax.minor),
            shipping: major(order.totals.shipping.minor),
            payment_type: order.payment_method,
            items: order.items.map((item) => ({
                item_id: item.slug ?? item.name,
                item_name: item.name,
                item_variant: item.variant_label ?? undefined,
                quantity: item.quantity,
                price: major(item.line_total.minor / item.quantity),
            })),
        });
    }, [order.number, order.paid_at]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <StoreLayout>
            <Head title={t('Order :number', { number: order.number })} />

            <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
                <div className="text-center">
                    <CheckCircle2 className="mx-auto size-12 text-[#5b4f9a]" aria-hidden />
                    <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{t('Thank you')}</h1>
                    <p className="mt-3 text-slate-600">
                        {rich(t('Your order :number is in. We sent a confirmation to :email.'), {
                            number: <span className="font-mono">{order.number}</span>,
                            email: <span className="font-medium">{order.email}</span>,
                        })}
                    </p>
                </div>

                {cashOnDelivery && !order.paid_at && (
                    <p className="mt-4 rounded-xl bg-[#f0eefa] px-5 py-3 text-sm text-[#3f3775]">
                        {t('Please have :total ready in cash when your order arrives.', { total: order.totals.total.formatted })}
                    </p>
                )}

                <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
                    <ul className="space-y-4">
                        {order.items.map((item, i) => (
                            <li key={i} className="flex items-center gap-4">
                                {item.image_url ? (
                                    <img src={item.image_url} alt="" width={64} height={64} decoding="async"
                                        className="size-16 rounded-lg object-cover" />
                                ) : (
                                    <div className="size-16 rounded-lg bg-gradient-to-br from-[#5b4f9a] to-[#1f2230]" aria-hidden />
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium">{item.name}</p>
                                    <p className="font-mono text-xs text-slate-500">
                                        {item.variant_label && `${item.variant_label} · `}× {item.quantity}
                                    </p>
                                </div>
                                <span className="font-mono text-sm">{item.line_total.formatted}</span>
                            </li>
                        ))}
                    </ul>

                    <dl className="mt-6 space-y-2 border-t border-slate-200 pt-5 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-slate-600">{t('Subtotal')}</dt>
                            <dd className="font-mono">{order.totals.subtotal.formatted}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-slate-600">{t('Shipping')}</dt>
                            <dd className="font-mono">
                                {order.totals.shipping.minor === 0 ? t('Free') : order.totals.shipping.formatted}
                            </dd>
                        </div>
                        {order.tax_rate > 0 && (
                            <div className="flex justify-between">
                                <dt className="text-slate-600">{t('Tax (:rate%)', { rate: order.tax_rate })}</dt>
                                <dd className="font-mono">{order.totals.tax.formatted}</dd>
                            </div>
                        )}
                        <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
                            <dt className="font-medium">{t('Total')}</dt>
                            <dd className="font-mono text-lg">{order.totals.total.formatted}</dd>
                        </div>
                    </dl>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h2 className="font-mono text-xs tracking-[0.15em] text-slate-500 uppercase">{t('Delivering to')}</h2>
                        <address className="mt-3 text-sm leading-relaxed not-italic text-slate-700">
                            {address.first_name} {address.last_name}<br />
                            {address.line1}<br />
                            {address.line2 && <>{address.line2}<br /></>}
                            {address.postcode} {address.city}<br />
                            {address.country}
                        </address>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h2 className="font-mono text-xs tracking-[0.15em] text-slate-500 uppercase">{t('Details')}</h2>
                        <dl className="mt-3 space-y-2 text-sm">
                            <div className="flex justify-between gap-4">
                                <dt className="text-slate-500">{t('Shipping')}</dt>
                                <dd>{label(order.shipping_method)}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-slate-500">{t('Payment')}</dt>
                                <dd>{label(order.payment_method)}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-slate-500">{t('Status')}</dt>
                                <dd>{label(order.status)}</dd>
                            </div>
                        </dl>
                    </section>
                </div>

                <div className="mt-10 text-center">
                    <Link href="/products"
                        className="inline-flex h-12 items-center rounded-full border border-slate-300 bg-white px-7 hover:bg-slate-50">
                        {t('Keep shopping')}
                    </Link>
                </div>
            </div>
        </StoreLayout>
    );
}
