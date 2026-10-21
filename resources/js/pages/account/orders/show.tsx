import AddressBlock from '@/components/account/address-block';
import StatusBadge from '@/components/account/status-badge';
import AccountLayout from '@/layouts/account-layout';
import { useLocale, useT } from '@/lib/i18n';
import { formatDate, ORDER_LABELS } from '@/lib/orders';
import type { OrderDetail } from '@/types/account';
import { Link } from '@inertiajs/react';
import { Check } from 'lucide-react';

const STEPS = ['pending', 'paid', 'shipped', 'delivered'];

export default function AccountOrder({ order }: { order: OrderDetail }) {
    const t = useT();
    const locale = useLocale();
    const label = (code: string) => t(ORDER_LABELS[code] ?? code);

    const current = STEPS.indexOf(order.status);
    const stopped = current === -1; // cancelled or refunded

    return (
        <AccountLayout
            title={t('Order :number', { number: order.number })}
            actions={<Link href="/account/orders" className="text-sm text-slate-500 hover:text-slate-900">← {t('All orders')}</Link>}
        >
            <p className="-mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                {t('Placed on :date', { date: formatDate(order.placed_at, locale) })}
                <StatusBadge status={order.status} />
            </p>

            {/* Progress */}
            {stopped ? (
                <p className="mt-6 rounded-xl bg-slate-100 px-5 py-4 text-sm text-slate-700">
                    {order.status === 'refunded'
                        ? t('This order was refunded.')
                        : t('This order was cancelled.')}
                </p>
            ) : (
                <ol className="mt-8 grid grid-cols-4 gap-2" aria-label={t('Order progress')}>
                    {STEPS.map((step, i) => {
                        const done = i <= current;
                        return (
                            <li key={step} aria-current={i === current ? 'step' : undefined} className="text-center">
                                <div className={`h-1.5 rounded-full ${done ? 'bg-[#5b4f9a]' : 'bg-slate-200'}`} />
                                <p className={`mt-2 flex items-center justify-center gap-1 text-xs sm:text-sm ${done ? 'text-slate-900' : 'text-slate-400'}`}>
                                    {done && <Check className="size-3.5" aria-hidden />}
                                    {label(step)}
                                </p>
                            </li>
                        );
                    })}
                </ol>
            )}

            {/* Items and totals */}
            <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <ul className="divide-y divide-slate-100">
                    {order.items.map((item, i) => (
                        <li key={i} className="flex items-center gap-4 py-4 first:pt-0">
                            {item.image_url ? (
                                <img src={item.image_url} alt="" className="size-16 rounded-lg object-cover" />
                            ) : (
                                <div className="size-16 rounded-lg bg-gradient-to-br from-[#5b4f9a] to-[#1f2230]" aria-hidden />
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="font-medium">{item.name}</p>
                                <p className="font-mono text-xs text-slate-500">
                                    {item.variant_label && `${item.variant_label} · `}{item.quantity} × {item.unit_price.formatted}
                                </p>
                                {item.product_slug && (
                                    <Link href={`/products/${item.product_slug}`} className="mt-1 inline-block text-sm text-[#5b4f9a] hover:underline">
                                        {t('Buy again')}
                                    </Link>
                                )}
                            </div>
                            <span className="font-mono text-sm">{item.line_total.formatted}</span>
                        </li>
                    ))}
                </ul>

                <dl className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm">
                    <div className="flex justify-between">
                        <dt className="text-slate-600">{t('Subtotal')}</dt>
                        <dd className="font-mono">{order.totals.subtotal.formatted}</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-slate-600">{t('Shipping')}</dt>
                        <dd className="font-mono">{order.totals.shipping.minor === 0 ? t('Free') : order.totals.shipping.formatted}</dd>
                    </div>
                    {order.tax_rate > 0 && (
                        <div className="flex justify-between">
                            <dt className="text-slate-600">
                                {order.tax_inclusive
                                    ? t('of which tax (:rate%)', { rate: order.tax_rate })
                                    : t('Tax (:rate%)', { rate: order.tax_rate })}
                            </dt>
                            <dd className="font-mono">{order.totals.tax.formatted}</dd>
                        </div>
                    )}
                    <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
                        <dt className="font-medium">{t('Total')}</dt>
                        <dd className="font-mono text-lg">{order.totals.total.formatted}</dd>
                    </div>
                </dl>
            </section>

            {/* Addresses and details */}
            <div className="mt-6 grid gap-4 md:grid-cols-3">
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h2 className="font-mono text-xs tracking-[0.15em] text-slate-500 uppercase">{t('Delivery address')}</h2>
                    <AddressBlock address={order.shipping_address} className="mt-3" />
                </section>
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h2 className="font-mono text-xs tracking-[0.15em] text-slate-500 uppercase">{t('Billing address')}</h2>
                    {order.billing_address
                        ? <AddressBlock address={order.billing_address} className="mt-3" />
                        : <p className="mt-3 text-sm text-slate-600">{t('Same as delivery address')}</p>}
                </section>
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h2 className="font-mono text-xs tracking-[0.15em] text-slate-500 uppercase">{t('Details')}</h2>
                    <dl className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between gap-4"><dt className="text-slate-500">{t('Shipping')}</dt><dd>{label(order.shipping_method)}</dd></div>
                        <div className="flex justify-between gap-4"><dt className="text-slate-500">{t('Payment')}</dt><dd>{label(order.payment_method)}</dd></div>
                        <div className="flex justify-between gap-4"><dt className="text-slate-500">{t('Email')}</dt><dd className="truncate">{order.email}</dd></div>
                    </dl>
                </section>
            </div>

            <p className="mt-8 text-sm text-slate-500">
                {t('Questions about this order?')}{' '}
                <Link href="/contact" className="font-medium text-slate-900 underline">{t('Contact us')}</Link>{' '}
                {t('and mention :number.', { number: order.number })}
            </p>
        </AccountLayout>
    );
}
