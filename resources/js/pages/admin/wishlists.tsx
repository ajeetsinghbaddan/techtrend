import { Input } from '@/components/ui/input';
import type { Paginated } from '@/types/blog';
import { Head, Link, router } from '@inertiajs/react';
import { ExternalLink, Heart, Pencil, TrendingUp, Users } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type Row = {
    id: number;
    name: string;
    slug: string;
    is_active: boolean;
    in_stock: boolean;
    image_url: string | null;
    price: string | null;
    total: number;
    customers: number;
    guests: number;
    recent: number;
};

type Filters = { q: string; sort: string; stock: string };

type Props = {
    products: Paginated<Row>;
    filters: Filters;
    stats: { items: number; products: number; shoppers: number; recent: number };
};

export default function WishlistsAdmin({ products, filters, stats }: Props) {
    const [q, setQ] = useState(filters.q);

    const apply = (patch: Partial<Filters>) => {
        const next = { ...filters, ...patch };
        const query = Object.fromEntries(
            Object.entries(next).filter(([key, value]) => value && !(key === 'sort' && value === 'most') && !(key === 'stock' && value === 'all')),
        );
        router.get('/admin/wishlists', query, { preserveState: true, preserveScroll: true, replace: true });
    };

    const search = (e: FormEvent) => {
        e.preventDefault();
        apply({ q });
    };

    const cards = [
        { label: 'Items saved', value: stats.items, icon: Heart },
        { label: 'Shoppers', value: stats.shoppers, icon: Users },
        { label: 'Products saved', value: stats.products, icon: Heart },
        { label: 'Saved in last 30 days', value: stats.recent, icon: TrendingUp },
    ];

    return (
        <>
            <Head title="Wishlists" />

            <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
                <div>
                    <h1 className="text-xl font-semibold">Wishlists</h1>
                    <p className="text-sm text-muted-foreground">
                        How many people saved each product. Counts only, never who.
                    </p>
                </div>

                <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {cards.map(({ label, value, icon: Icon }) => (
                        <div key={label} className="rounded-lg border p-4">
                            <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Icon className="size-4" aria-hidden /> {label}
                            </dt>
                            <dd className="mt-1 font-mono text-2xl">{value.toLocaleString()}</dd>
                        </div>
                    ))}
                </dl>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2">
                        <select value={filters.sort} onChange={(e) => apply({ sort: e.target.value })}
                            aria-label="Sort" className="h-9 rounded-md border px-3 text-sm">
                            <option value="most">Most saved</option>
                            <option value="trending">Trending (last 30 days)</option>
                            <option value="name">Name</option>
                        </select>
                        <button type="button" aria-pressed={filters.stock === 'out'}
                            onClick={() => apply({ stock: filters.stock === 'out' ? 'all' : 'out' })}
                            className={`h-9 rounded-md border px-3 text-sm ${filters.stock === 'out' ? 'border-amber-400 bg-amber-50 text-amber-900' : 'hover:bg-slate-50'}`}>
                            Out of stock but wanted
                        </button>
                    </div>
                    <form onSubmit={search}>
                        <Input type="search" value={q} onChange={(e) => setQ(e.target.value)}
                            placeholder="Search products" className="lg:w-64" />
                    </form>
                </div>

                {products.data.length === 0 ? (
                    <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
                        {filters.q || filters.stock === 'out' ? 'No products match these filters.' : 'No products have been saved yet.'}
                    </p>
                ) : (
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full min-w-[720px] text-sm">
                            <thead className="bg-slate-50 text-left text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Product</th>
                                    <th className="px-4 py-3 font-medium">Price</th>
                                    <th className="px-4 py-3 font-medium">Stock</th>
                                    <th className="px-4 py-3 text-right font-medium">Saved by</th>
                                    <th className="px-4 py-3 text-right font-medium">Customers / guests</th>
                                    <th className="px-4 py-3 text-right font-medium">Last 30 days</th>
                                    <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {products.data.map((p) => (
                                    <tr key={p.id}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {p.image_url ? (
                                                    <img src={p.image_url} alt="" className="size-10 rounded object-cover" />
                                                ) : (
                                                    <div className="size-10 rounded bg-slate-200" aria-hidden />
                                                )}
                                                <div>
                                                    <p className="font-medium">{p.name}</p>
                                                    {!p.is_active && <p className="text-xs text-muted-foreground">Hidden from shop</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-mono">{p.price ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded-full px-2 py-0.5 text-xs ${p.in_stock ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                                {p.in_stock ? 'In stock' : 'Sold out'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-base">{p.total}</td>
                                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                                            {p.customers} / {p.guests}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono">
                                            {p.recent > 0 ? `+${p.recent}` : '0'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                <Link href={`/admin/products/${p.id}/edit`} aria-label={`Edit ${p.name}`}
                                                    className="rounded p-2 hover:bg-slate-100">
                                                    <Pencil className="size-4" />
                                                </Link>
                                                <a href={`/products/${p.slug}`} target="_blank" rel="noopener noreferrer"
                                                    aria-label={`View ${p.name} in the shop`} className="rounded p-2 hover:bg-slate-100">
                                                    <ExternalLink className="size-4" />
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {products.last_page > 1 && (
                    <nav aria-label="Pagination" className="flex flex-wrap justify-center gap-2">
                        {products.links.map((link, i) => link.url ? (
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

WishlistsAdmin.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Marketing', href: '/admin/newsletter' },
        { title: 'Wishlists', href: '/admin/wishlists' },
    ],
};
