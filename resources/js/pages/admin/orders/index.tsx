import { Input } from '@/components/ui/input';
import type { Paginated } from '@/types/blog';
import type { MoneyValue } from '@/types/catalog-public';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

type Row = {
    number: string;
    email: string;
    status: string;
    items_count: number;
    total: MoneyValue;
    region: string;
    placed_at: string | null;
};

type Props = {
    orders: Paginated<Row>;
    filters: { q?: string; status?: string };
    statuses: string[];
    counts: Record<string, number>;
    revenue: { orders_30d: number; pending: number };
};

const STATUS_STYLES: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    paid: 'bg-blue-100 text-blue-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-slate-100 text-slate-600',
    refunded: 'bg-red-100 text-red-700',
};

export function StatusBadge({ status }: { status: string }) {
    return (
        <span className={`rounded-full px-2.5 py-1 text-xs capitalize ${STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600'}`}>
            {status}
        </span>
    );
}

export default function OrdersIndex({ orders, filters, statuses, counts, revenue }: Props) {
    const [q, setQ] = useState(filters.q ?? '');

    const filter = (patch: { q?: string; status?: string }) => {
        const next = { ...filters, ...patch };
        Object.keys(next).forEach((k) => {
            if (!next[k as keyof typeof next]) delete next[k as keyof typeof next];
        });
        router.get('/admin/orders', next, { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <>
            <Head title="Orders" />

            <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h1 className="text-xl font-semibold">Orders</h1>
                    <div className="flex gap-6 text-sm">
                        <p><span className="font-mono text-lg">{revenue.pending}</span>{' '}
                            <span className="text-muted-foreground">awaiting action</span></p>
                        <p><span className="font-mono text-lg">{revenue.orders_30d}</span>{' '}
                            <span className="text-muted-foreground">in 30 days</span></p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => filter({ status: undefined })}
                            className={`rounded-full border px-3 py-1.5 text-sm ${!filters.status ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}>
                            All
                        </button>
                        {statuses.map((s) => (
                            <button key={s} type="button" onClick={() => filter({ status: s })}
                                className={`rounded-full border px-3 py-1.5 text-sm capitalize ${
                                    filters.status === s ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'
                                }`}>
                                {s} {counts[s] ? `(${counts[s]})` : ''}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); filter({ q }); }}>
                        <Input type="search" placeholder="Order number or email" value={q} className="lg:w-64"
                            onChange={(e) => setQ(e.target.value)} />
                    </form>
                </div>

                {orders.data.length === 0 ? (
                    <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">No orders found.</p>
                ) : (
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full min-w-[700px] text-sm">
                            <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3">Order</th>
                                    <th className="px-4 py-3">Customer</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Items</th>
                                    <th className="px-4 py-3">Total</th>
                                    <th className="px-4 py-3">Placed</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {orders.data.map((row) => (
                                    <tr key={row.number} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <Link href={`/admin/orders/${row.number}`}
                                                className="font-mono font-medium text-[#5b4f9a] hover:underline">
                                                {row.number}
                                            </Link>
                                        </td>
                                        <td className="max-w-48 truncate px-4 py-3">{row.email}</td>
                                        <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                                        <td className="px-4 py-3 font-mono">{row.items_count}</td>
                                        <td className="px-4 py-3 font-mono">{row.total.formatted}</td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {row.placed_at ? new Date(row.placed_at).toLocaleDateString() : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {orders.last_page > 1 && (
                    <nav aria-label="Pagination" className="flex flex-wrap justify-center gap-2">
                        {orders.links.map((link, i) =>
                            link.url ? (
                                <Link key={i} href={link.url} preserveScroll
                                    className={`rounded-md border px-3 py-1.5 text-sm ${link.active ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }} />
                            ) : (
                                <span key={i} className="px-3 py-1.5 text-sm text-slate-400"
                                    dangerouslySetInnerHTML={{ __html: link.label }} />
                            ),
                        )}
                    </nav>
                )}
            </div>
        </>
    );
}

OrdersIndex.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Sales', href: '/admin/orders' },
        { title: 'Orders', href: '/admin/orders' },
    ],
};
