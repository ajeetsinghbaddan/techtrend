import { Input } from '@/components/ui/input';
import type { Paginated } from '@/types/blog';
import { Head, Link, router } from '@inertiajs/react';
import { Download, ShieldAlert } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type Row = {
    id: number;
    name: string;
    email: string;
    verified: boolean;
    blocked: boolean;
    country: string | null;
    joined_at: string | null;
    last_login_at: string | null;
    orders_count: number;
    last_order_at: string | null;
    spent: string | null;
};

type Filters = { q: string; segment: string; sort: string };

type Stats = {
    total: number;
    new_30: number;
    buyers: number;
    repeat: number;
    unverified: number;
    blocked: number;
    guest_only: number;
    signups: { week: string; count: number }[];
};

type Props = {
    customers: Paginated<Row>;
    filters: Filters;
    stats: Stats;
    baseCurrency: string;
};

const SEGMENTS = [
    { key: 'all', label: 'All' },
    { key: 'buyers', label: 'Buyers' },
    { key: 'repeat', label: 'Repeat buyers' },
    { key: 'no_orders', label: 'No orders yet' },
    { key: 'unverified', label: 'Email not confirmed' },
    { key: 'blocked', label: 'Suspended' },
];

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : '—');

const percent = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : '0%');

export default function CustomersIndex({ customers, filters, stats, baseCurrency }: Props) {
    const [q, setQ] = useState(filters.q);

    const query = (patch: Partial<Filters>) => {
        const next = { ...filters, ...patch };
        return Object.fromEntries(Object.entries(next).filter(([key, value]) =>
            value && !(key === 'segment' && value === 'all') && !(key === 'sort' && value === 'newest')));
    };

    const apply = (patch: Partial<Filters>) =>
        router.get('/admin/customers', query(patch), { preserveState: true, preserveScroll: true, replace: true });

    const search = (e: FormEvent) => {
        e.preventDefault();
        apply({ q });
    };

    const exportUrl = `/admin/customers/export?${new URLSearchParams(query({}) as Record<string, string>).toString()}`;
    const maxSignups = Math.max(1, ...stats.signups.map((s) => s.count));

    const cards = [
        { label: 'Customers', value: stats.total, hint: `+${stats.new_30} in the last 30 days` },
        { label: 'Have ordered', value: stats.buyers, hint: `${percent(stats.buyers, stats.total)} of customers` },
        { label: 'Ordered again', value: stats.repeat, hint: `${percent(stats.repeat, stats.buyers)} of buyers` },
        { label: 'Guest-only buyers', value: stats.guest_only, hint: 'Bought without an account' },
    ];

    return (
        <>
            <Head title="Customers" />

            <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-xl font-semibold">Customers</h1>
                    <a href={exportUrl}
                        className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm hover:bg-slate-50">
                        <Download className="size-4" /> Export CSV
                    </a>
                </div>

                <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
                    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {cards.map((card) => (
                            <div key={card.label} className="rounded-lg border p-4">
                                <dt className="text-sm text-muted-foreground">{card.label}</dt>
                                <dd className="mt-1 font-mono text-2xl">{card.value.toLocaleString()}</dd>
                                <dd className="mt-1 text-xs text-muted-foreground">{card.hint}</dd>
                            </div>
                        ))}
                    </dl>

                    <figure className="rounded-lg border p-4">
                        <figcaption className="text-sm text-muted-foreground">New customers per week</figcaption>
                        <div className="mt-3 flex h-20 items-end gap-1" role="img"
                            aria-label={`Sign-ups over the last 12 weeks: ${stats.signups.map((s) => s.count).join(', ')}`}>
                            {stats.signups.map((s) => (
                                <div key={s.week} title={`Week of ${s.week}: ${s.count}`}
                                    className="flex-1 rounded-t bg-violet-500/80"
                                    style={{ height: `${Math.max(4, (s.count / maxSignups) * 100)}%` }} />
                            ))}
                        </div>
                        <p className="mt-2 flex justify-between text-xs text-muted-foreground">
                            <span>12 weeks ago</span><span>This week</span>
                        </p>
                    </figure>
                </div>

                {(stats.unverified > 0 || stats.blocked > 0) && (
                    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <ShieldAlert className="size-4" aria-hidden />
                        <button type="button" onClick={() => apply({ segment: 'unverified' })} className="underline">
                            {stats.unverified} with unconfirmed email
                        </button>
                        <button type="button" onClick={() => apply({ segment: 'blocked' })} className="underline">
                            {stats.blocked} suspended
                        </button>
                    </p>
                )}

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2">
                        {SEGMENTS.map((s) => (
                            <button key={s.key} type="button" onClick={() => apply({ segment: s.key })}
                                aria-pressed={filters.segment === s.key}
                                className={`rounded-full border px-3 py-1.5 text-sm ${filters.segment === s.key ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}>
                                {s.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <select value={filters.sort} onChange={(e) => apply({ sort: e.target.value })}
                            aria-label="Sort" className="h-9 rounded-md border px-3 text-sm">
                            <option value="newest">Newest</option>
                            <option value="oldest">Oldest</option>
                            <option value="name">Name</option>
                            <option value="orders">Most orders</option>
                            <option value="last_order">Last order</option>
                            <option value="last_login">Last login</option>
                        </select>
                        <form onSubmit={search}>
                            <Input type="search" value={q} onChange={(e) => setQ(e.target.value)}
                                placeholder="Name, email or phone" className="lg:w-60" />
                        </form>
                    </div>
                </div>

                {customers.data.length === 0 ? (
                    <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">No customers match.</p>
                ) : (
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full min-w-[820px] text-sm">
                            <thead className="bg-slate-50 text-left text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Customer</th>
                                    <th className="px-4 py-3 font-medium">Region</th>
                                    <th className="px-4 py-3 text-right font-medium">Orders</th>
                                    <th className="px-4 py-3 text-right font-medium">Spent ({baseCurrency})</th>
                                    <th className="px-4 py-3 font-medium">Last order</th>
                                    <th className="px-4 py-3 font-medium">Last login</th>
                                    <th className="px-4 py-3 font-medium">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {customers.data.map((c) => (
                                    <tr key={c.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <Link href={`/admin/customers/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                                            <p className="text-muted-foreground">{c.email}</p>
                                            <div className="mt-1 flex gap-1">
                                                {!c.verified && <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-800">Unconfirmed</span>}
                                                {c.blocked && <span className="rounded bg-red-100 px-1.5 text-xs text-red-800">Suspended</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-mono">{c.country ?? '—'}</td>
                                        <td className="px-4 py-3 text-right font-mono">{c.orders_count}</td>
                                        <td className="px-4 py-3 text-right font-mono">{c.spent ?? '—'}</td>
                                        <td className="px-4 py-3">{date(c.last_order_at)}</td>
                                        <td className="px-4 py-3">{date(c.last_login_at)}</td>
                                        <td className="px-4 py-3">{date(c.joined_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {customers.last_page > 1 && (
                    <nav aria-label="Pagination" className="flex flex-wrap justify-center gap-2">
                        {customers.links.map((link, i) => link.url ? (
                            <Link key={i} href={link.url} preserveScroll
                                className={`rounded-md border px-3 py-1.5 text-sm ${link.active ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}
                                dangerouslySetInnerHTML={{ __html: link.label }} />
                        ) : (
                            <span key={i} className="px-3 py-1.5 text-sm text-slate-400" dangerouslySetInnerHTML={{ __html: link.label }} />
                        ))}
                    </nav>
                )}
            </div>
        </>
    );
}

CustomersIndex.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Sales', href: '/admin/orders' },
        { title: 'Customers', href: '/admin/customers' },
    ],
};
