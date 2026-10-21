import OrderRow from '@/components/account/order-row';
import AccountLayout from '@/layouts/account-layout';
import { useT } from '@/lib/i18n';
import type { OrderSummary } from '@/types/account';
import type { Paginated } from '@/types/blog';
import { Link } from '@inertiajs/react';

export default function AccountOrders({ orders }: { orders: Paginated<OrderSummary> }) {
    const t = useT();

    return (
        <AccountLayout title={t('Orders')}>
            {orders.data.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                    <p className="text-slate-600">{t("You haven't placed any orders yet.")}</p>
                    <Link href="/products"
                        className="mt-6 inline-flex h-12 items-center rounded-full bg-[#1f2230] px-7 text-white hover:bg-black">
                        {t('Start shopping')}
                    </Link>
                </div>
            ) : (
                <ul className="space-y-3">
                    {orders.data.map((order) => <li key={order.number}><OrderRow order={order} /></li>)}
                </ul>
            )}

            {orders.last_page > 1 && (
                <nav aria-label={t('Order pages')} className="mt-8 flex items-center justify-between">
                    {orders.links[0]?.url ? (
                        <Link href={orders.links[0].url} className="rounded-full border border-slate-300 px-4 py-2 text-sm hover:bg-white">
                            ← {t('Previous')}
                        </Link>
                    ) : <span />}
                    <span className="text-sm text-slate-500">
                        {t('Page :page of :pages', { page: orders.current_page, pages: orders.last_page })}
                    </span>
                    {orders.links[orders.links.length - 1]?.url ? (
                        <Link href={orders.links[orders.links.length - 1].url!} className="rounded-full border border-slate-300 px-4 py-2 text-sm hover:bg-white">
                            {t('Next')} →
                        </Link>
                    ) : <span />}
                </nav>
            )}
        </AccountLayout>
    );
}
