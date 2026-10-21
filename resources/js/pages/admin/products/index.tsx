import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Paginated } from '@/types/blog';
import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

type Row = {
    id: number;
    name: string;
    slug: string;
    is_active: boolean;
    stock: number;
    variants_count: number;
    collections: string[];
};

export default function ProductsIndex({ products, filters }: {
    products: Paginated<Row>;
    filters: { q: string; status: string };
}) {
    const [q, setQ] = useState(filters.q ?? '');

    const filter = (params: { q?: string; status?: string }) =>
        router.get('/admin/products', { ...filters, ...params }, { preserveState: true, preserveScroll: true, replace: true });

    const remove = (row: Row) => {
        if (confirm(`Delete "${row.name}"? Its variants and images go too. This cannot be undone.`)) {
            router.delete(`/admin/products/${row.slug}`, { preserveScroll: true });
        }
    };

    const tabs = [{ key: '', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'draft', label: 'Draft' }];

    return (
        <>
            <Head title="Products" />

            <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold">Products</h1>
                    <Button asChild>
                        <Link href="/admin/products/create"><Plus className="size-4" /> New product</Link>
                    </Button>
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex gap-2">
                        {tabs.map((t) => (
                            <button key={t.key} type="button" onClick={() => filter({ status: t.key })}
                                className={`rounded-full border px-3 py-1.5 text-sm ${
                                    (filters.status ?? '') === t.key ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'
                                }`}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); filter({ q }); }}>
                        <Input type="search" placeholder="Search products" value={q} className="lg:w-64"
                            onChange={(e) => setQ(e.target.value)} />
                    </form>
                </div>

                {products.data.length === 0 ? (
                    <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">No products found.</p>
                ) : (
                    <ul className="divide-y rounded-lg border">
                        {products.data.map((row) => (
                            <li key={row.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="flex items-center gap-2 truncate font-medium">
                                        {row.name}
                                        {!row.is_active && (
                                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Draft</span>
                                        )}
                                        {row.stock === 0 && (
                                            <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Sold out</span>
                                        )}
                                    </p>
                                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                                        {row.variants_count} variant{row.variants_count === 1 ? '' : 's'} · {row.stock} in stock
                                        {row.collections.length > 0 && ` · ${row.collections.join(', ')}`}
                                    </p>
                                </div>

                                <div className="flex shrink-0 gap-1">
                                    <Button asChild variant="ghost" size="icon">
                                        <Link href={`/admin/products/${row.slug}/edit`} aria-label={`Edit ${row.name}`}>
                                            <Pencil className="size-4" />
                                        </Link>
                                    </Button>
                                    <Button type="button" variant="ghost" size="icon"
                                        aria-label={`Delete ${row.name}`} onClick={() => remove(row)}>
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {products.last_page > 1 && (
                    <nav aria-label="Pagination" className="flex flex-wrap justify-center gap-2">
                        {products.links.map((link, i) =>
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

ProductsIndex.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Catalog', href: '/admin/collections' },
        { title: 'Products', href: '/admin/products' },
    ],
};
