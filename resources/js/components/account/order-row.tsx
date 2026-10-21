import StatusBadge from '@/components/account/status-badge';
import { useLocale, useT } from '@/lib/i18n';
import { formatDate } from '@/lib/orders';
import type { OrderSummary } from '@/types/account';
import { Link } from '@inertiajs/react';
import { ChevronRight, Package } from 'lucide-react';

export default function OrderRow({ order }: { order: OrderSummary }) {
    const t = useT();
    const locale = useLocale();

    return (
        <Link href={`/account/orders/${order.number}`}
            className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-400 sm:flex-nowrap sm:p-5">
            <div className="flex -space-x-3" aria-hidden>
                {order.images.length > 0 ? order.images.map((url) => (
                    <img key={url} src={url} alt="" className="size-12 rounded-lg border-2 border-white object-cover" />
                )) : (
                    <span className="flex size-12 items-center justify-center rounded-lg bg-slate-100">
                        <Package className="size-5 text-slate-400" />
                    </span>
                )}
            </div>

            <div className="min-w-0 flex-1">
                <p className="font-mono text-sm">{order.number}</p>
                <p className="text-sm text-slate-500">
                    {formatDate(order.placed_at, locale)} · {order.item_count === 1 ? t('1 item') : t(':count items', { count: order.item_count })}
                </p>
            </div>

            <StatusBadge status={order.status} />
            <span className="font-mono">{order.total.formatted}</span>
            <ChevronRight className="hidden size-4 text-slate-400 sm:block" aria-hidden />
        </Link>
    );
}
