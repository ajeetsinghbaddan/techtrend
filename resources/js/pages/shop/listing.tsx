import ProductCard from '@/components/store/product-card';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import StoreLayout from '@/layouts/store-layout';
import type { Paginated } from '@/types/blog';
import type { ProductCardData } from '@/types/catalog-public';
import { Head, Link, router } from '@inertiajs/react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';

type Filters = {
    options?: string[];
    colours?: string[];
    min?: number;
    max?: number;
    in_stock?: boolean;
    sort?: string;
    q?: string;
};

type Props = {
    collection: { name: string; slug: string; tagline: string | null; description: string | null } | null;
    products: Paginated<ProductCardData>;
    filters: Filters;
    facets: {
        options: string[];
        colours: { colour_name: string; colour_hex: string | null }[];
        price_min: number;
        price_max: number;
    };
    sorts: string[];
};

const SORT_LABELS: Record<string, string> = {
    featured: 'Featured',
    newest: 'Newest',
    price_asc: 'Price: low to high',
    price_desc: 'Price: high to low',
    rating: 'Top rated',
};

export default function Listing({ collection, products, filters, facets, sorts }: Props) {
    const [open, setOpen] = useState(false);
    const basePath = collection ? `/collections/${collection.slug}` : '/products';

    const apply = (patch: Partial<Filters>) => {
        const next = { ...filters, ...patch };

        // Drop empty values so the URL stays clean
        Object.keys(next).forEach((key) => {
            const value = next[key as keyof Filters];
            if (value === undefined || value === '' || value === false ||
                (Array.isArray(value) && value.length === 0)) {
                delete next[key as keyof Filters];
            }
        });

        router.get(basePath, next, { preserveState: true, preserveScroll: true, replace: true });
    };

    const toggleInArray = (key: 'options' | 'colours', value: string) => {
        const current = filters[key] ?? [];
        apply({ [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] });
    };

    const activeCount =
        (filters.options?.length ?? 0) + (filters.colours?.length ?? 0) +
        (filters.in_stock ? 1 : 0) + (filters.min !== undefined || filters.max !== undefined ? 1 : 0);

    const FilterPanel = () => (
        <div className="space-y-8">
            {facets.options.length > 0 && (
                <fieldset>
                    <legend className="font-mono text-xs tracking-[0.15em] uppercase text-slate-500">Options</legend>
                    <div className="mt-3 space-y-2">
                        {facets.options.map((option) => (
                            <label key={option} className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={filters.options?.includes(option) ?? false}
                                    onChange={() => toggleInArray('options', option)} />
                                {option}
                            </label>
                        ))}
                    </div>
                </fieldset>
            )}

            {facets.colours.length > 0 && (
                <fieldset>
                    <legend className="font-mono text-xs tracking-[0.15em] uppercase text-slate-500">Colour</legend>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {facets.colours.map((colour) => {
                            const active = filters.colours?.includes(colour.colour_name) ?? false;
                            return (
                                <button key={colour.colour_name} type="button"
                                    onClick={() => toggleInArray('colours', colour.colour_name)}
                                    aria-pressed={active}
                                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                                        active ? 'border-[#5b4f9a] bg-[#f0eefa]' : 'border-slate-300 hover:bg-white'
                                    }`}>
                                    {colour.colour_hex && (
                                        <span className="size-3.5 rounded-full border border-black/10"
                                            style={{ background: colour.colour_hex }} aria-hidden />
                                    )}
                                    {colour.colour_name}
                                </button>
                            );
                        })}
                    </div>
                </fieldset>
            )}

            <fieldset>
                <legend className="font-mono text-xs tracking-[0.15em] uppercase text-slate-500">Price</legend>
                <div className="mt-3 flex items-center gap-2">
                    <input type="number" inputMode="numeric" placeholder={String(facets.price_min)}
                        aria-label="Minimum price" defaultValue={filters.min ?? ''}
                        onBlur={(e) => apply({ min: e.target.value === '' ? undefined : Number(e.target.value) })}
                        className="h-10 w-24 rounded-md border border-slate-300 px-3 text-sm" />
                    <span className="text-slate-400">to</span>
                    <input type="number" inputMode="numeric" placeholder={String(facets.price_max)}
                        aria-label="Maximum price" defaultValue={filters.max ?? ''}
                        onBlur={(e) => apply({ max: e.target.value === '' ? undefined : Number(e.target.value) })}
                        className="h-10 w-24 rounded-md border border-slate-300 px-3 text-sm" />
                </div>
            </fieldset>

            <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={filters.in_stock ?? false}
                    onChange={(e) => apply({ in_stock: e.target.checked })} />
                In stock only
            </label>

            {activeCount > 0 && (
                <Link href={basePath} className="inline-block text-sm text-[#5b4f9a] underline">
                    Clear all filters
                </Link>
            )}
        </div>
    );

    return (
        <StoreLayout>
            <Head title={collection ? collection.name : 'All products'} />

            <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
                <nav aria-label="Breadcrumb" className="font-mono text-xs tracking-[0.15em] uppercase text-slate-500">
                    <Link href="/" className="hover:text-slate-900">Home</Link>
                    <span className="text-slate-300"> / </span>
                    {collection ? (
                        <>
                            <Link href="/collections" className="hover:text-slate-900">Collections</Link>
                            <span className="text-slate-300"> / </span>
                            <span className="text-slate-900">{collection.name}</span>
                        </>
                    ) : (
                        <span className="text-slate-900">All products</span>
                    )}
                </nav>

                <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                    {collection ? collection.name : 'All products'}
                </h1>
                {collection?.tagline && <p className="mt-3 max-w-xl text-slate-600">{collection.tagline}</p>}

                <div className="mt-8 flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger className="flex h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-5 text-sm lg:hidden">
                            <SlidersHorizontal className="size-4" />
                            Filters{activeCount > 0 && ` (${activeCount})`}
                        </SheetTrigger>
                        <SheetContent side="left" className="w-80 overflow-y-auto p-6">
                            <SheetTitle>Filters</SheetTitle>
                            <div className="mt-6"><FilterPanel /></div>
                        </SheetContent>
                    </Sheet>

                    <p className="hidden font-mono text-sm text-slate-500 lg:block">
                        {products.total ?? products.data.length} result{products.data.length === 1 ? '' : 's'}
                    </p>

                    <label className="flex items-center gap-2 text-sm">
                        <span className="sr-only">Sort by</span>
                        <select value={filters.sort ?? 'featured'}
                            onChange={(e) => apply({ sort: e.target.value })}
                            className="h-11 rounded-full border border-slate-300 bg-white px-4 text-sm">
                            {sorts.map((s) => <option key={s} value={s}>{SORT_LABELS[s] ?? s}</option>)}
                        </select>
                    </label>
                </div>

                {activeCount > 0 && (
                    <ul className="mt-5 flex flex-wrap gap-2">
                        {[...(filters.options ?? []), ...(filters.colours ?? [])].map((value) => (
                            <li key={value}>
                                <button type="button"
                                    onClick={() => toggleInArray(
                                        filters.options?.includes(value) ? 'options' : 'colours', value)}
                                    className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm">
                                    {value}
                                    <X className="size-3.5 text-slate-400" aria-hidden />
                                    <span className="sr-only">Remove filter</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="mt-8 gap-10 lg:flex">
                    <aside className="hidden w-60 shrink-0 lg:block">
                        <FilterPanel />
                    </aside>

                    <div className="min-w-0 flex-1">
                        {products.data.length === 0 ? (
                            <p className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
                                No products match these filters.
                            </p>
                        ) : (
                            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                                {products.data.map((product) => (
                                    <ProductCard key={product.slug} product={product} />
                                ))}
                            </div>
                        )}

                        {products.last_page > 1 && (
                            <nav aria-label="Pagination" className="mt-12 flex flex-wrap justify-center gap-2">
                                {products.links.map((link, i) =>
                                    link.url ? (
                                        <Link key={i} href={link.url} preserveScroll
                                            className={`rounded-full border px-4 py-2 text-sm ${
                                                link.active ? 'border-[#5b4f9a] bg-[#5b4f9a] text-white' : 'border-slate-300 bg-white'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }} />
                                    ) : (
                                        <span key={i} className="px-4 py-2 text-sm text-slate-400"
                                            dangerouslySetInnerHTML={{ __html: link.label }} />
                                    ),
                                )}
                            </nav>
                        )}
                    </div>
                </div>
            </div>
        </StoreLayout>
    );
}
