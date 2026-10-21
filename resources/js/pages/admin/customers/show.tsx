import { Button } from '@/components/ui/button';
import type { OrderSummary, SavedAddress } from '@/types/account';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { BadgeCheck, Ban, KeyRound, Mail, RotateCcw, ShieldCheck, ShieldOff, Star } from 'lucide-react';
import type { FormEvent } from 'react';

type Customer = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    verified: boolean;
    blocked_at: string | null;
    joined_at: string | null;
    last_login_at: string | null;
    preferred_locale: string | null;
    preferred_region: string | null;
    admin_notes: string | null;
    two_factor: boolean;
};

type Props = {
    customer: Customer;
    stats: {
        orders: number;
        spent: string;
        average: string | null;
        first_order_at: string | null;
        last_order_at: string | null;
        reviews: number;
        wishlist: number;
    };
    orders: (OrderSummary & { is_guest: boolean })[];
    addresses: SavedAddress[];
    reviews: { id: number; rating: number; title: string | null; status: string; product: { name: string; slug: string } | null; created_at: string | null }[];
    wishlist: { id: number; name: string; slug: string }[];
    baseCurrency: string;
};

const STATUS_STYLES: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    paid: 'bg-sky-100 text-sky-800',
    shipped: 'bg-violet-100 text-violet-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-slate-200 text-slate-700',
    refunded: 'bg-slate-200 text-slate-700',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-slate-200 text-slate-700',
};

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : '—');

export default function CustomerShow({ customer, stats, orders, addresses, reviews, wishlist, baseCurrency }: Props) {
    const notice = usePage<{ flash?: { admin_notice?: string } }>().props.flash?.admin_notice;
    const notes = useForm({ admin_notes: customer.admin_notes ?? '' });

    const saveNotes = (e: FormEvent) => {
        e.preventDefault();
        notes.patch(`/admin/customers/${customer.id}/notes`, { preserveScroll: true });
    };

    const action = (path: string, confirmText?: string) => {
        if (confirmText && !confirm(confirmText)) return;
        router.post(`/admin/customers/${customer.id}/${path}`, {}, { preserveScroll: true });
    };

    const card = 'rounded-lg border p-4';

    return (
        <>
            <Head title={customer.name} />

            <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
                {notice && <p role="status" className="rounded-md bg-slate-100 px-4 py-2 text-sm">{notice}</p>}

                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold">{customer.name}</h1>
                        <p className="text-muted-foreground">{customer.email}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            {customer.verified ? (
                                <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-green-800">
                                    <BadgeCheck className="size-3.5" /> Email confirmed
                                </span>
                            ) : (
                                <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">Email not confirmed</span>
                            )}
                            {customer.two_factor ? (
                                <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-green-800">
                                    <ShieldCheck className="size-3.5" /> Two-factor on
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-slate-600">
                                    <ShieldOff className="size-3.5" /> Two-factor off
                                </span>
                            )}
                            {customer.blocked_at && (
                                <span className="rounded bg-red-100 px-2 py-0.5 text-red-800">
                                    Suspended since {date(customer.blocked_at)}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => action('password-reset')}>
                            <KeyRound className="size-4" /> Send password reset
                        </Button>
                        {!customer.verified && (
                            <Button type="button" variant="outline" size="sm" onClick={() => action('verification')}>
                                <Mail className="size-4" /> Resend confirmation
                            </Button>
                        )}
                        {customer.two_factor && (
                            <Button type="button" variant="outline" size="sm"
                                onClick={() => action('two-factor/reset',
                                    `Turn off two-factor authentication for ${customer.name}?\n\nOnly do this after confirming it's really them, for example by replying to an email from ${customer.email}. Their account will then be protected by their password only, until they set it up again.`)}>
                                <ShieldOff className="size-4" /> Reset two-factor
                            </Button>
                        )}
                        {customer.blocked_at ? (
                            <Button type="button" variant="outline" size="sm" onClick={() => action('block')}>
                                <RotateCcw className="size-4" /> Reactivate
                            </Button>
                        ) : (
                            <Button type="button" variant="destructive" size="sm"
                                onClick={() => action('block', `Suspend ${customer.name}? They'll be logged out and can't log in until you reactivate them.`)}>
                                <Ban className="size-4" /> Suspend
                            </Button>
                        )}
                    </div>
                </div>

                {/* Numbers */}
                <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className={card}>
                        <dt className="text-sm text-muted-foreground">Orders</dt>
                        <dd className="mt-1 font-mono text-2xl">{stats.orders}</dd>
                    </div>
                    <div className={card}>
                        <dt className="text-sm text-muted-foreground">Spent ({baseCurrency}, converted)</dt>
                        <dd className="mt-1 font-mono text-2xl">{stats.spent}</dd>
                    </div>
                    <div className={card}>
                        <dt className="text-sm text-muted-foreground">Average order</dt>
                        <dd className="mt-1 font-mono text-2xl">{stats.average ?? '—'}</dd>
                    </div>
                    <div className={card}>
                        <dt className="text-sm text-muted-foreground">Reviews / wishlist</dt>
                        <dd className="mt-1 font-mono text-2xl">{stats.reviews} / {stats.wishlist}</dd>
                    </div>
                </dl>

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    {/* Main column */}
                    <div className="min-w-0 space-y-6">
                        <section>
                            <h2 className="font-semibold">Orders</h2>
                            {orders.length === 0 ? (
                                <p className="mt-2 text-sm text-muted-foreground">No orders yet.</p>
                            ) : (
                                <div className="mt-2 overflow-x-auto rounded-lg border">
                                    <table className="w-full min-w-[560px] text-sm">
                                        <thead className="bg-slate-50 text-left text-muted-foreground">
                                            <tr>
                                                <th className="px-4 py-2 font-medium">Order</th>
                                                <th className="px-4 py-2 font-medium">Date</th>
                                                <th className="px-4 py-2 font-medium">Status</th>
                                                <th className="px-4 py-2 text-right font-medium">Items</th>
                                                <th className="px-4 py-2 text-right font-medium">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {orders.map((o) => (
                                                <tr key={o.number}>
                                                    <td className="px-4 py-2">
                                                        <Link href={`/admin/orders/${o.number}`} className="font-mono hover:underline">{o.number}</Link>
                                                        {o.is_guest && <span className="ml-2 text-xs text-muted-foreground">as guest</span>}
                                                    </td>
                                                    <td className="px-4 py-2">{date(o.placed_at)}</td>
                                                    <td className="px-4 py-2">
                                                        <span className={`rounded px-2 py-0.5 text-xs capitalize ${STATUS_STYLES[o.status] ?? 'bg-slate-100'}`}>{o.status}</span>
                                                    </td>
                                                    <td className="px-4 py-2 text-right font-mono">{o.item_count}</td>
                                                    <td className="px-4 py-2 text-right font-mono">{o.total.formatted}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {stats.orders > orders.length && (
                                <p className="mt-2 text-xs text-muted-foreground">Showing the latest {orders.length} of {stats.orders}.</p>
                            )}
                        </section>

                        <section>
                            <h2 className="font-semibold">Reviews</h2>
                            {reviews.length === 0 ? (
                                <p className="mt-2 text-sm text-muted-foreground">No reviews.</p>
                            ) : (
                                <ul className="mt-2 divide-y rounded-lg border">
                                    {reviews.map((r) => (
                                        <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
                                            <span className="flex items-center gap-1 font-mono">
                                                <Star className="size-3.5 fill-current" aria-hidden /> {r.rating}
                                            </span>
                                            <span className="min-w-0 flex-1 truncate">
                                                {r.title ?? <em className="text-muted-foreground">No title</em>}
                                                {r.product && <span className="text-muted-foreground"> on {r.product.name}</span>}
                                            </span>
                                            <span className={`rounded px-2 py-0.5 text-xs capitalize ${STATUS_STYLES[r.status] ?? 'bg-slate-100'}`}>{r.status}</span>
                                            <span className="text-muted-foreground">{date(r.created_at)}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </div>

                    {/* Side column */}
                    <aside className="space-y-6">
                        <section className={card}>
                            <h2 className="font-semibold">Details</h2>
                            <dl className="mt-3 space-y-2 text-sm">
                                {[
                                    ['Phone', customer.phone ?? '—'],
                                    ['Joined', date(customer.joined_at)],
                                    ['Last login', date(customer.last_login_at)],
                                    ['First order', date(stats.first_order_at)],
                                    ['Last order', date(stats.last_order_at)],
                                    ['Language', customer.preferred_locale?.toUpperCase() ?? 'Automatic'],
                                    ['Region', customer.preferred_region ?? 'Automatic'],
                                    ['Two-factor', customer.two_factor ? 'On' : 'Off'],
                                ].map(([label, value]) => (
                                    <div key={label} className="flex justify-between gap-4">
                                        <dt className="text-muted-foreground">{label}</dt>
                                        <dd className="text-right">{value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>

                        <form onSubmit={saveNotes} className={card}>
                            <label htmlFor="admin_notes" className="font-semibold">Internal notes</label>
                            <p className="text-xs text-muted-foreground">Only admins see these.</p>
                            <textarea id="admin_notes" rows={4} value={notes.data.admin_notes}
                                onChange={(e) => notes.setData('admin_notes', e.target.value)}
                                className="mt-2 w-full rounded-md border px-3 py-2 text-sm" />
                            {notes.errors.admin_notes && <p className="text-sm text-red-600">{notes.errors.admin_notes}</p>}
                            <Button type="submit" size="sm" className="mt-2" disabled={notes.processing || !notes.isDirty}>Save notes</Button>
                        </form>

                        <section className={card}>
                            <h2 className="font-semibold">Addresses</h2>
                            {addresses.length === 0 ? (
                                <p className="mt-2 text-sm text-muted-foreground">None saved.</p>
                            ) : (
                                <ul className="mt-3 space-y-4 text-sm">
                                    {addresses.map((a) => (
                                        <li key={a.id}>
                                            <p className="flex flex-wrap gap-1 text-xs">
                                                {a.label && <span className="font-medium">{a.label}</span>}
                                                {a.is_default_shipping && <span className="rounded bg-slate-100 px-1.5">Delivery</span>}
                                                {a.is_default_billing && <span className="rounded bg-slate-100 px-1.5">Billing</span>}
                                            </p>
                                            <p className="mt-1 text-muted-foreground">
                                                {a.first_name} {a.last_name}, {a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.postcode} {a.city}, {a.country}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        <section className={card}>
                            <h2 className="font-semibold">Wishlist</h2>
                            {wishlist.length === 0 ? (
                                <p className="mt-2 text-sm text-muted-foreground">Empty.</p>
                            ) : (
                                <ul className="mt-2 space-y-1 text-sm">
                                    {wishlist.map((p) => (
                                        <li key={p.id}>
                                            <a href={`/products/${p.slug}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{p.name}</a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </aside>
                </div>
            </div>
        </>
    );
}

CustomerShow.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Customers', href: '/admin/customers' },
        { title: 'Customer', href: '#' },
    ],
};
