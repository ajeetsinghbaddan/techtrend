import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, ExternalLink, FilePlus2,
    PackagePlus, RefreshCw, ShoppingBag, type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

type Kpi = {
    key: string;
    label: string;
    value: number;
    formatted: string;
    previous_formatted: string;
    change: number | null;
};

type Point = { key: string; label: string; revenue: number; orders: number };

type Stats = {
    generated_at: string;
    range: { from: string; to: string };
    kpis: Kpi[];
    series: Point[];
    topProducts: { name: string; units: number; revenue: number; formatted: string }[];
    regions: { code: string; label: string; orders: number; revenue: number; formatted: string; share: number }[];
    growth: { subscribers: number; wishlist: number; reviews: number; recovered_orders: number; recovered_revenue: string };
};

type AttentionItem = { key: string; label: string; count: number; href: string; tone: 'warning' | 'danger' | 'info' };

type RecentOrder = {
    number: string;
    email: string;
    status: string;
    payment_method: string;
    total: string;
    placed_at: string | null;
};

type LowStockItem = { id: number; product_id: number; name: string; option: string | null; stock: number };

type Props = {
    period: string;
    periods: string[];
    baseCurrency: string;
    stats: Stats;
    attention: AttentionItem[];
    recentOrders: RecentOrder[];
    lowStock: LowStockItem[];
};

const PERIOD_LABELS: Record<string, string> = {
    '7d': '7 days',
    '30d': '30 days',
    '90d': '90 days',
    '12m': '12 months',
};

const STATUS_STYLES: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    paid: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
    shipped: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300',
    delivered: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300',
    cancelled: 'bg-slate-200 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
    refunded: 'bg-slate-200 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
};

const TONES: Record<AttentionItem['tone'], string> = {
    danger: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    info: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
};

const LIVE_KEYS = ['attention', 'recentOrders', 'lowStock'];

/* ---------- small pieces ---------- */

function Card({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <section className={`rounded-xl border bg-card p-5 ${className}`}>
            {(title || action) && (
                <div className="mb-4 flex items-center justify-between gap-3">
                    {title && <h2 className="font-semibold">{title}</h2>}
                    {action}
                </div>
            )}
            {children}
        </section>
    );
}

function timeAgo(iso: string, now: number): string {
    const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
    if (minutes < 1) return 'just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function greeting(): string {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

/** A round number just above the highest value, for tidy chart gridlines. */
function niceMax(value: number): number {
    if (value <= 0) return 1;
    const magnitude = 10 ** Math.floor(Math.log10(value));
    const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value) ?? 10;
    return step * magnitude;
}

function KpiCard({ kpi, periodLabel }: { kpi: Kpi; periodLabel: string }) {
    const up = (kpi.change ?? 0) >= 0;
    const Arrow = up ? ArrowUpRight : ArrowDownRight;

    return (
        <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">{kpi.label}</p>
            <p className="mt-2 font-mono text-2xl font-semibold tracking-tight">{kpi.formatted}</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                {kpi.change === null ? (
                    <span>No earlier data to compare</span>
                ) : (
                    <>
                        <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium ${
                            up ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300'
                               : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                        }`}>
                            <Arrow className="size-3" aria-hidden />
                            {Math.abs(kpi.change)}%
                        </span>
                        <span title={`Previous: ${kpi.previous_formatted}`}>vs previous {periodLabel}</span>
                    </>
                )}
            </p>
        </div>
    );
}

function SalesChart({ series, currency }: { series: Point[]; currency: string }) {
    const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue');
    const [active, setActive] = useState<number | null>(null);

    const money = useMemo(
        () => new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }),
        [currency],
    );
    const format = (v: number) => (metric === 'revenue' ? money.format(v / 100) : v.toLocaleString());

    const values = series.map((p) => (metric === 'revenue' ? p.revenue : p.orders));
    const top = niceMax(Math.max(...values, 0));
    const labelEvery = Math.max(1, Math.ceil(series.length / 8));
    const point = active !== null ? series[active] : null;
    const total = values.reduce((sum, v) => sum + v, 0);

    return (
        <Card
            title="Sales"
            action={
                <div role="group" aria-label="Chart shows" className="flex rounded-lg border p-0.5 text-sm">
                    {(['revenue', 'orders'] as const).map((m) => (
                        <button key={m} type="button" aria-pressed={metric === m} onClick={() => setMetric(m)}
                            className={`rounded-md px-3 py-1 capitalize ${metric === m ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>
                            {m}
                        </button>
                    ))}
                </div>
            }
        >
            <p className="mb-4 text-sm text-muted-foreground">
                Total: <span className="font-mono font-medium text-foreground">{format(total)}</span>
            </p>

            <div className="relative h-64 pl-14">
                {/* Gridlines */}
                {[1, 0.75, 0.5, 0.25, 0].map((f) => (
                    <div key={f} className="pointer-events-none absolute right-0 left-14 border-t border-dashed border-border" style={{ bottom: `${f * 100}%` }}>
                        <span className="absolute -top-2 -left-14 w-12 text-right text-[10px] text-muted-foreground">{format(top * f)}</span>
                    </div>
                ))}

                {/* Bars */}
                <div className="relative flex h-full items-end gap-[2px]" onMouseLeave={() => setActive(null)}>
                    {series.map((p, i) => {
                        const v = values[i];
                        return (
                            <button key={p.key} type="button"
                                aria-label={`${p.label}: ${money.format(p.revenue / 100)}, ${p.orders} orders`}
                                onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}
                                className="flex h-full min-w-0 flex-1 items-end rounded-t-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                                <span className={`block w-full rounded-t-sm transition-colors ${active === i ? 'bg-violet-600' : 'bg-violet-400/70 dark:bg-violet-500/60'}`}
                                    style={{ height: `${(v / top) * 100}%`, minHeight: v > 0 ? 2 : 0 }} />
                            </button>
                        );
                    })}

                    {/* Tooltip */}
                    {point && active !== null && (
                        <div role="status"
                            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-lg border bg-popover px-3 py-2 text-xs whitespace-nowrap shadow-md"
                            style={{ left: `${((active + 0.5) / series.length) * 100}%` }}>
                            <p className="font-medium">{point.label}</p>
                            <p className="mt-1 font-mono">{money.format(point.revenue / 100)}</p>
                            <p className="text-muted-foreground">{point.orders} {point.orders === 1 ? 'order' : 'orders'}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Dates */}
            <div className="mt-2 flex gap-[2px] pl-14">
                {series.map((p, i) => (
                    <span key={p.key} className="min-w-0 flex-1 text-center text-[10px] text-muted-foreground">
                        {i % labelEvery === 0 ? p.label : ''}
                    </span>
                ))}
            </div>
        </Card>
    );
}

function Stat({ label, value, icon: Icon }: { label: string; value: ReactNode; icon?: LucideIcon }) {
    return (
        <div className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
                {Icon && <Icon className="size-4" aria-hidden />} {label}
            </span>
            <span className="font-mono font-medium">{value}</span>
        </div>
    );
}

/* ---------- page ---------- */

export default function Dashboard({ period, periods, baseCurrency, stats, attention, recentOrders, lowStock }: Props) {
    const user = usePage<{ auth: { user: { name: string } } }>().props.auth.user;
    const [now, setNow] = useState(() => Date.now());
    const [refreshing, setRefreshing] = useState(false);

    const periodLabel = PERIOD_LABELS[period] ?? period;
    const todo = attention.filter((a) => a.count > 0);
    const firstName = user.name.split(' ')[0];

    // Keep the to-do list and recent orders live: every minute, only while the tab is visible.
    useEffect(() => {
        const timer = setInterval(() => {
            setNow(Date.now());
            if (document.visibilityState === 'visible') {
                router.reload({ only: LIVE_KEYS });
            }
        }, 60_000);

        return () => clearInterval(timer);
    }, []);

    const changePeriod = (next: string) =>
        router.get('/dashboard', { period: next }, { only: ['period', 'stats'], preserveScroll: true, preserveState: true, replace: true });

    const refresh = () => {
        setRefreshing(true);
        router.post('/admin/dashboard/refresh', {}, {
            preserveScroll: true,
            onFinish: () => {
                setRefreshing(false);
                setNow(Date.now());
            },
        });
    };

    return (
        <>
            <Head title="Dashboard" />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6">
                {/* Header */}
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">{greeting()}, {firstName}</h1>
                        <p className="text-sm text-muted-foreground">
                            {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            {' · '}Figures from {timeAgo(stats.generated_at, now)}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div role="group" aria-label="Period" className="flex rounded-lg border p-0.5 text-sm">
                            {periods.map((p) => (
                                <button key={p} type="button" aria-pressed={period === p} onClick={() => changePeriod(p)}
                                    className={`rounded-md px-3 py-1.5 ${period === p ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>
                                    {PERIOD_LABELS[p] ?? p}
                                </button>
                            ))}
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
                            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden /> Refresh
                        </Button>
                    </div>
                </div>

                {/* Key numbers */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {stats.kpis.map((kpi) => <KpiCard key={kpi.key} kpi={kpi} periodLabel={periodLabel} />)}
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                    <SalesChart series={stats.series} currency={baseCurrency} />

                    {/* To-do */}
                    <Card title="Needs attention" action={todo.length > 0 && (
                        <span className="rounded-full bg-foreground px-2 py-0.5 text-xs text-background">{todo.length}</span>
                    )}>
                        {todo.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                                <CheckCircle2 className="size-8 text-green-600" aria-hidden />
                                <p className="font-medium">All caught up</p>
                                <p className="text-sm text-muted-foreground">Nothing needs your attention right now.</p>
                            </div>
                        ) : (
                            <ul className="-mx-2 space-y-1">
                                {todo.map((item) => (
                                    <li key={item.key}>
                                        <Link href={item.href} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted">
                                            <span className="flex items-center gap-2">
                                                {item.tone === 'danger' && <AlertTriangle className="size-4 text-red-600" aria-hidden />}
                                                {item.label}
                                            </span>
                                            <span className={`rounded-full px-2 py-0.5 font-mono text-xs font-medium ${TONES[item.tone]}`}>{item.count}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                    {/* Recent orders */}
                    <Card title="Recent orders" action={<Link href="/admin/orders" className="text-sm text-muted-foreground hover:text-foreground">View all</Link>}>
                        {recentOrders.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">No orders yet.</p>
                        ) : (
                            <div className="-mx-5 overflow-x-auto">
                                <table className="w-full min-w-[520px] text-sm">
                                    <thead className="text-left text-muted-foreground">
                                        <tr className="border-b">
                                            <th className="px-5 py-2 font-medium">Order</th>
                                            <th className="px-2 py-2 font-medium">Customer</th>
                                            <th className="px-2 py-2 font-medium">Status</th>
                                            <th className="px-5 py-2 text-right font-medium">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {recentOrders.map((o) => (
                                            <tr key={o.number} className="hover:bg-muted/50">
                                                <td className="px-5 py-2.5">
                                                    <Link href={`/admin/orders/${o.number}`} className="font-mono hover:underline">{o.number}</Link>
                                                    <span className="block text-xs text-muted-foreground">{o.placed_at && timeAgo(o.placed_at, now)}</span>
                                                </td>
                                                <td className="max-w-[200px] truncate px-2 py-2.5">{o.email}</td>
                                                <td className="px-2 py-2.5">
                                                    <span className={`rounded px-2 py-0.5 text-xs capitalize ${STATUS_STYLES[o.status] ?? 'bg-muted'}`}>{o.status}</span>
                                                    {o.payment_method === 'cod' && <span className="ml-1.5 text-xs text-muted-foreground">COD</span>}
                                                </td>
                                                <td className="px-5 py-2.5 text-right font-mono">{o.total}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    {/* Quick actions */}
                    <Card title="Quick actions">
                        <div className="grid grid-cols-2 gap-2">
                            {([
                                ['Add product', '/admin/products/create', PackagePlus],
                                ['Write post', '/admin/posts/create', FilePlus2],
                                ['Orders', '/admin/orders', ShoppingBag],
                            ] as const).map(([label, href, Icon]) => (
                                <Link key={href} href={href} className="flex flex-col items-start gap-2 rounded-lg border p-3 text-sm hover:bg-muted">
                                    <Icon className="size-4 text-violet-600" aria-hidden /> {label}
                                </Link>
                            ))}
                            <a href="/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-start gap-2 rounded-lg border p-3 text-sm hover:bg-muted">
                                <ExternalLink className="size-4 text-violet-600" aria-hidden /> View shop
                            </a>
                        </div>
                    </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                    {/* Top products */}
                    <Card title="Top products">
                        {stats.topProducts.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No sales in this period.</p>
                        ) : (
                            <ol className="space-y-3">
                                {stats.topProducts.map((p, i) => (
                                    <li key={p.name} className="text-sm">
                                        <div className="flex justify-between gap-3">
                                            <span className="min-w-0 truncate"><span className="mr-2 text-muted-foreground">{i + 1}</span>{p.name}</span>
                                            <span className="shrink-0 font-mono">{p.formatted}</span>
                                        </div>
                                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                                            <div className="h-full rounded-full bg-violet-500" style={{ width: `${(p.revenue / stats.topProducts[0].revenue) * 100}%` }} />
                                        </div>
                                        <p className="mt-0.5 text-xs text-muted-foreground">{p.units} sold</p>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </Card>

                    {/* Regions */}
                    <Card title="Sales by region">
                        {stats.regions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No sales in this period.</p>
                        ) : (
                            <ul className="space-y-3">
                                {stats.regions.map((r) => (
                                    <li key={r.code} className="text-sm">
                                        <div className="flex justify-between gap-3">
                                            <span>{r.label}</span>
                                            <span className="font-mono">{r.share}%</span>
                                        </div>
                                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                                            <div className="h-full rounded-full bg-sky-500" style={{ width: `${r.share}%` }} />
                                        </div>
                                        <p className="mt-0.5 text-xs text-muted-foreground">{r.formatted} · {r.orders} orders</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>

                    {/* Low stock */}
                    <Card title="Low stock" action={<Link href="/admin/products" className="text-sm text-muted-foreground hover:text-foreground">Products</Link>}>
                        {lowStock.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Everything is well stocked.</p>
                        ) : (
                            <ul className="divide-y">
                                {lowStock.map((v) => (
                                    <li key={v.id}>
                                        <Link href={`/admin/products/${v.product_id}/edit`} className="flex items-center justify-between gap-3 py-2 text-sm hover:underline">
                                            <span className="min-w-0">
                                                <span className="block truncate">{v.name}</span>
                                                {v.option && <span className="block truncate text-xs text-muted-foreground">{v.option}</span>}
                                            </span>
                                            <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-xs ${v.stock === 0 ? TONES.danger : TONES.warning}`}>
                                                {v.stock === 0 ? 'Sold out' : `${v.stock} left`}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>

                    {/* Growth */}
                    <Card title="Growth">
                        <div className="divide-y">
                            <Stat label="Newsletter sign-ups" value={stats.growth.subscribers.toLocaleString()} />
                            <Stat label="Wishlist saves" value={stats.growth.wishlist.toLocaleString()} />
                            <Stat label="Reviews written" value={stats.growth.reviews.toLocaleString()} />
                            <Stat label="Bags recovered" value={stats.growth.recovered_orders.toLocaleString()} />
                            <Stat label="Recovered revenue" value={stats.growth.recovered_revenue} />
                        </div>
                    </Card>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                    Revenue counts paid orders and cash-on-delivery orders, converted to {baseCurrency}.
                    Figures update every few minutes; the to-do list updates every minute.
                </p>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
