import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, useForm } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

type Source = 'manual' | 'collection' | 'random' | 'newest' | 'top_rated' | 'on_sale';
type Placement = 'before_explore' | 'after_explore';

type Row = {
    id: string;
    title: string;
    subtitle: string;
    source: Source;
    collection_slug: string;
    product_ids: number[];
    limit: number;
    link_label: string;
    link_href: string;
    placement: Placement;
    enabled: boolean;
};

type ProductLite = { id: number; name: string; image_url: string | null; is_active: boolean };

type Props = {
    rows: Partial<Record<keyof Row, unknown>>[];
    collections: { name: string; slug: string }[];
    products: ProductLite[];
};

const MAX_ROWS = 6;
const MAX_PRODUCTS = 12;

const SOURCE_LABELS: Record<Source, string> = {
    manual: 'Hand-picked products',
    collection: 'From a collection',
    random: 'Random selection',
    newest: 'Newest products',
    top_rated: 'Top rated',
    on_sale: 'On sale',
};

const emptyRow = (): Row => ({
    id: crypto.randomUUID(),
    title: '', subtitle: '', source: 'manual', collection_slug: '', product_ids: [],
    limit: 8, link_label: '', link_href: '', placement: 'after_explore', enabled: true,
});

/** Turn saved rows (which may contain nulls) into form rows. */
const toRow = (raw: Partial<Record<keyof Row, unknown>>): Row => ({
    ...emptyRow(),
    id: String(raw.id ?? crypto.randomUUID()),
    title: String(raw.title ?? ''),
    subtitle: String(raw.subtitle ?? ''),
    source: (raw.source as Source) ?? 'newest',
    collection_slug: String(raw.collection_slug ?? ''),
    product_ids: Array.isArray(raw.product_ids) ? raw.product_ids.map(Number) : [],
    limit: Number(raw.limit ?? 8),
    link_label: String(raw.link_label ?? ''),
    link_href: String(raw.link_href ?? ''),
    placement: (raw.placement as Placement) ?? 'after_explore',
    enabled: raw.enabled !== false,
});

function move<T>(list: T[], from: number, to: number): T[] {
    const copy = [...list];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
}

/* ---------- Product picker ---------- */

function ProductPicker({ ids, known, onChange, onKnown }: {
    ids: number[];
    known: Record<number, ProductLite>;
    onChange: (ids: number[]) => void;
    onKnown: (product: ProductLite) => void;
}) {
    const [q, setQ] = useState('');
    const [results, setResults] = useState<ProductLite[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const response = await fetch(`/admin/products/lookup?q=${encodeURIComponent(q.trim())}`, {
                    signal: controller.signal,
                    headers: { Accept: 'application/json' },
                });
                if (response.ok) setResults(await response.json());
            } catch {
                // aborted: a newer search replaced this one
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 250);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [q]);

    const add = (product: ProductLite) => {
        if (ids.includes(product.id) || ids.length >= MAX_PRODUCTS) return;
        onKnown(product);
        onChange([...ids, product.id]);
    };

    const available = results.filter((p) => !ids.includes(p.id));

    return (
        <div className="grid gap-4 md:grid-cols-2">
            {/* Chosen products, in display order */}
            <div className="space-y-2">
                <p className="text-sm font-medium">Selected ({ids.length}/{MAX_PRODUCTS})</p>
                {ids.length === 0 ? (
                    <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                        Search on the right and click a product to add it.
                    </p>
                ) : (
                    <ol className="space-y-1">
                        {ids.map((id, i) => {
                            const product = known[id];
                            return (
                                <li key={id} className="flex items-center gap-2 rounded-md border p-2">
                                    <span className="w-5 text-center font-mono text-xs text-muted-foreground">{i + 1}</span>
                                    {product?.image_url ? (
                                        <img src={product.image_url} alt="" className="size-9 rounded object-cover" />
                                    ) : (
                                        <span className="size-9 rounded bg-gradient-to-br from-[#5b4f9a] to-[#1f2230]" aria-hidden />
                                    )}
                                    <span className="min-w-0 flex-1 truncate text-sm">
                                        {product?.name ?? `Product #${id}`}
                                        {product && !product.is_active && (
                                            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Draft</span>
                                        )}
                                    </span>
                                    <Button type="button" variant="ghost" size="icon" aria-label="Move up" disabled={i === 0}
                                        onClick={() => onChange(move(ids, i, i - 1))}><ArrowUp className="size-4" /></Button>
                                    <Button type="button" variant="ghost" size="icon" aria-label="Move down" disabled={i === ids.length - 1}
                                        onClick={() => onChange(move(ids, i, i + 1))}><ArrowDown className="size-4" /></Button>
                                    <Button type="button" variant="ghost" size="icon" aria-label="Remove"
                                        onClick={() => onChange(ids.filter((x) => x !== id))}><X className="size-4" /></Button>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </div>

            {/* Search */}
            <div className="space-y-2">
                <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={q} placeholder="Search by name or SKU" aria-label="Search products"
                        onChange={(e) => setQ(e.target.value)} className="pl-9" />
                    {loading && <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
                </div>
                <ul className="max-h-72 space-y-1 overflow-y-auto">
                    {available.map((product) => (
                        <li key={product.id}>
                            <button type="button" disabled={ids.length >= MAX_PRODUCTS} onClick={() => add(product)}
                                className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-slate-50 disabled:opacity-40">
                                {product.image_url ? (
                                    <img src={product.image_url} alt="" className="size-9 rounded object-cover" />
                                ) : (
                                    <span className="size-9 rounded bg-gradient-to-br from-[#5b4f9a] to-[#1f2230]" aria-hidden />
                                )}
                                <span className="min-w-0 flex-1 truncate">{product.name}</span>
                                {!product.is_active && <span className="text-xs text-muted-foreground">Draft</span>}
                                <Plus className="size-4 shrink-0 text-muted-foreground" />
                            </button>
                        </li>
                    ))}
                    {!loading && available.length === 0 && (
                        <li className="p-2 text-sm text-muted-foreground">No more matching products.</li>
                    )}
                </ul>
            </div>
        </div>
    );
}

/* ---------- Page ---------- */

export default function ProductRowsPage({ rows, collections, products }: Props) {
    const { data, setData, put, processing, errors, recentlySuccessful } = useForm<{ rows: Row[] }>({
        rows: rows.map(toRow),
    });
    const err = errors as Record<string, string>;

    // Product details for names and images in the picker, starting with those already chosen.
    const [known, setKnown] = useState<Record<number, ProductLite>>(
        Object.fromEntries(products.map((p) => [p.id, p])),
    );

    const updateRow = (index: number, patch: Partial<Row>) =>
        setData('rows', data.rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

    const chooseCollection = (index: number, slug: string) => {
        const row = data.rows[index];
        updateRow(index, {
            collection_slug: slug,
            // Pre-fill the "View all" link if it's still empty.
            ...(slug && !row.link_href ? { link_href: `/collections/${slug}`, link_label: row.link_label || 'View all' } : {}),
        });
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put('/admin/product-rows', { preserveScroll: true });
    };

    return (
        <>
            <Head title="Homepage carousels" />

            <form onSubmit={submit} className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
                <div>
                    <h1 className="text-xl font-semibold">Homepage carousels</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Rows of products on the homepage. Within each position, they appear in this order.
                    </p>
                </div>

                {data.rows.length === 0 && (
                    <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                        No carousels. Add one below.
                    </p>
                )}

                {data.rows.map((row, i) => (
                    <section key={row.id} className={`space-y-4 rounded-lg border p-4 ${row.enabled ? '' : 'opacity-60'}`}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 className="font-semibold">{row.title || `Carousel ${i + 1}`}</h2>
                            <div className="flex items-center gap-1">
                                <label className="mr-2 flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={row.enabled}
                                        onChange={(e) => updateRow(i, { enabled: e.target.checked })} />
                                    Visible
                                </label>
                                <Button type="button" variant="ghost" size="icon" aria-label="Move up" disabled={i === 0}
                                    onClick={() => setData('rows', move(data.rows, i, i - 1))}><ArrowUp className="size-4" /></Button>
                                <Button type="button" variant="ghost" size="icon" aria-label="Move down" disabled={i === data.rows.length - 1}
                                    onClick={() => setData('rows', move(data.rows, i, i + 1))}><ArrowDown className="size-4" /></Button>
                                <Button type="button" variant="ghost" size="icon" aria-label="Delete carousel"
                                    onClick={() => setData('rows', data.rows.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Label htmlFor={`title-${i}`}>Title</Label>
                                <Input id={`title-${i}`} value={row.title} placeholder="Popular this week"
                                    onChange={(e) => updateRow(i, { title: e.target.value })} />
                                <p className="text-sm text-red-600">{err[`rows.${i}.title`]}</p>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor={`subtitle-${i}`}>Subtitle</Label>
                                <Input id={`subtitle-${i}`} value={row.subtitle}
                                    onChange={(e) => updateRow(i, { subtitle: e.target.value })} />
                                <p className="text-sm text-red-600">{err[`rows.${i}.subtitle`]}</p>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="space-y-1">
                                <Label htmlFor={`source-${i}`}>Products</Label>
                                <select id={`source-${i}`} value={row.source}
                                    onChange={(e) => updateRow(i, { source: e.target.value as Source })}
                                    className="h-9 w-full rounded-md border px-3 text-sm">
                                    {(Object.keys(SOURCE_LABELS) as Source[]).map((s) => (
                                        <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
                                    ))}
                                </select>
                            </div>

                            {row.source !== 'manual' && (
                                <div className="space-y-1">
                                    <Label htmlFor={`limit-${i}`}>How many</Label>
                                    <Input id={`limit-${i}`} type="number" min={2} max={MAX_PRODUCTS} value={row.limit}
                                        onChange={(e) => updateRow(i, { limit: Number(e.target.value) })} />
                                    <p className="text-sm text-red-600">{err[`rows.${i}.limit`]}</p>
                                </div>
                            )}

                            <div className="space-y-1">
                                <Label htmlFor={`placement-${i}`}>Position</Label>
                                <select id={`placement-${i}`} value={row.placement}
                                    onChange={(e) => updateRow(i, { placement: e.target.value as Placement })}
                                    className="h-9 w-full rounded-md border px-3 text-sm">
                                    <option value="before_explore">Before the Explore cards</option>
                                    <option value="after_explore">After the Explore cards</option>
                                </select>
                            </div>
                        </div>

                        {row.source === 'collection' && (
                            <div className="space-y-1">
                                <Label htmlFor={`collection-${i}`}>Collection</Label>
                                <select id={`collection-${i}`} value={row.collection_slug}
                                    onChange={(e) => chooseCollection(i, e.target.value)}
                                    className="h-9 w-full rounded-md border px-3 text-sm sm:w-72">
                                    <option value="">Choose…</option>
                                    {collections.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                                </select>
                                <p className="text-sm text-red-600">{err[`rows.${i}.collection_slug`]}</p>
                            </div>
                        )}

                        {row.source === 'manual' && (
                            <div className="space-y-1">
                                <ProductPicker
                                    ids={row.product_ids}
                                    known={known}
                                    onChange={(ids) => updateRow(i, { product_ids: ids })}
                                    onKnown={(p) => setKnown((k) => ({ ...k, [p.id]: p }))}
                                />
                                <p className="text-sm text-red-600">{err[`rows.${i}.product_ids`]}</p>
                            </div>
                        )}

                        {row.source === 'random' && (
                            <p className="text-xs text-muted-foreground">Shows a different mix of active products on every visit.</p>
                        )}

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Label htmlFor={`link_label-${i}`}>"View all" button text</Label>
                                <Input id={`link_label-${i}`} value={row.link_label} placeholder="View all products"
                                    onChange={(e) => updateRow(i, { link_label: e.target.value })} />
                                <p className="text-sm text-red-600">{err[`rows.${i}.link_label`]}</p>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor={`link_href-${i}`}>"View all" link</Label>
                                <Input id={`link_href-${i}`} value={row.link_href} placeholder="/products"
                                    onChange={(e) => updateRow(i, { link_href: e.target.value })} />
                                <p className="text-sm text-red-600">{err[`rows.${i}.link_href`]}</p>
                            </div>
                        </div>
                    </section>
                ))}

                <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" variant="outline" disabled={data.rows.length >= MAX_ROWS}
                        onClick={() => setData('rows', [...data.rows, emptyRow()])}>
                        <Plus className="size-4" /> Add carousel ({data.rows.length}/{MAX_ROWS})
                    </Button>
                    <Button type="submit" disabled={processing}>Save</Button>
                    {recentlySuccessful && <span className="text-sm text-muted-foreground">Saved.</span>}
                </div>
            </form>
        </>
    );
}

ProductRowsPage.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Homepage', href: '/admin/hero' },
        { title: 'Carousels', href: '/admin/product-rows' },
    ],
};
