import ProductCard from '@/components/store/product-card';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import StoreLayout from '@/layouts/store-layout';
import { useT } from '@/lib/i18n';
import type { Paginated } from '@/types/blog';
import type { ProductCardData } from '@/types/catalog-public';
import { Head, Link, router } from '@inertiajs/react';
import { SlidersHorizontal, Star, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type Facets = {
    options: string[];
    colours: { colour_name: string; colour_hex: string | null }[];
    collections: { slug: string; name: string; count: number }[];
    price_min: number;
    price_max: number;
};

type Filters = {
    sort: string;
    options?: string[];
    colours?: string[];
    collections?: string[];
    min?: string | number | null;
    max?: string | number | null;
    in_stock?: string | number | boolean | null;
    rating?: string | number | null;
};

type Patch = Partial<Filters>;
type ListKey = 'options' | 'colours' | 'collections';

type Props = {
    query: string;
    products: Paginated<ProductCardData> | null;
    matched: number;
    filters: Filters;
    facets: Facets | null;
    sorts: string[];
    popular: string[];
    collections: { name: string; slug: string; image_url: string | null }[];
};

const isOn = (value: unknown) => value === true || value === 1 || value === '1';

const CLEAR_ALL: Patch = { options: [], colours: [], collections: [], in_stock: null, rating: null, min: null, max: null };

/** The filter controls: shown in the sidebar on desktop and in a side panel on phones. */
function FilterPanel({ facets, filters, onChange }: { facets: Facets; filters: Filters; onChange: (patch: Patch) => void }) {
    const t = useT();
    const [min, setMin] = useState(String(filters.min ?? ''));
    const [max, setMax] = useState(String(filters.max ?? ''));

    const toggle = (key: ListKey, value: string) => {
        const current = filters[key] ?? [];
        onChange({ [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] } as Patch);
    };

    const applyPrice = (e: FormEvent) => {
        e.preventDefault();
        onChange({ min: min || null, max: max || null });
    };

    const rating = Number(filters.rating ?? 0);
    const heading = 'font-mono text-xs tracking-[0.15em] text-slate-500 uppercase';
    const priceField = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#5b4f9a]';

    return (
        <div className="space-y-8">
            {facets.collections.length > 1 && (
                <fieldset>
                    <legend className={heading}>{t('Collection')}</legend>
                    <ul className="mt-3 space-y-2">
                        {facets.collections.map((c) => (
                            <li key={c.slug}>
                                <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                                    <input type="checkbox" className="size-4 accent-[#5b4f9a]"
                                        checked={(filters.collections ?? []).includes(c.slug)}
                                        onChange={() => toggle('collections', c.slug)} />
                                    <span className="flex-1">{c.name}</span>
                                    <span className="font-mono text-xs text-slate-400">{c.count}</span>
                                </label>
                            </li>
                        ))}
                    </ul>
                </fieldset>
            )}

            <fieldset>
                <legend className={heading}>{t('Availability')}</legend>
                <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm">
                    <input type="checkbox" className="size-4 accent-[#5b4f9a]" checked={isOn(filters.in_stock)}
                        onChange={(e) => onChange({ in_stock: e.target.checked ? true : null })} />
                    {t('In stock only')}
                </label>
            </fieldset>

            <fieldset>
                <legend className={heading}>{t('Rating')}</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                    {[4, 3].map((stars) => (
                        <button key={stars} type="button" aria-pressed={rating === stars}
                            onClick={() => onChange({ rating: rating === stars ? null : stars })}
                            className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm ${
                                rating === stars ? 'border-[#5b4f9a] bg-[#f0eefa] text-[#3f3775]' : 'border-slate-300 bg-white hover:border-slate-400'
                            }`}>
                            {stars}<Star className="size-3.5 fill-current" aria-hidden /> {t('& up')}
                        </button>
                    ))}
                </div>
            </fieldset>

            {facets.options.length > 0 && (
                <fieldset>
                    <legend className={heading}>{t('Option')}</legend>
                    <ul className="mt-3 space-y-2">
                        {facets.options.map((option) => (
                            <li key={option}>
                                <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                                    <input type="checkbox" className="size-4 accent-[#5b4f9a]"
                                        checked={(filters.options ?? []).includes(option)}
                                        onChange={() => toggle('options', option)} />
                                    {option}
                                </label>
                            </li>
                        ))}
                    </ul>
                </fieldset>
            )}

            {facets.colours.length > 0 && (
                <fieldset>
                    <legend className={heading}>{t('Colour')}</legend>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {facets.colours.map((c) => {
                            const active = (filters.colours ?? []).includes(c.colour_name);
                            return (
                                <button key={c.colour_name} type="button" aria-pressed={active} title={c.colour_name}
                                    onClick={() => toggle('colours', c.colour_name)}
                                    className={`flex items-center gap-2 rounded-full border px-2.5 py-1 text-sm ${
                                        active ? 'border-[#5b4f9a] bg-[#f0eefa]' : 'border-slate-300 bg-white hover:border-slate-400'
                                    }`}>
                                    <span className="size-4 rounded-full border border-black/10" style={{ background: c.colour_hex ?? '#ddd' }} aria-hidden />
                                    {c.colour_name}
                                </button>
                            );
                        })}
                    </div>
                </fieldset>
            )}

            {facets.price_max > facets.price_min && (
                <form onSubmit={applyPrice}>
                    <fieldset>
                        <legend className={heading}>{t('Price')}</legend>
                        <div className="mt-3 flex items-center gap-2">
                            <label className="sr-only" htmlFor="price_min">{t('Minimum price')}</label>
                            <input id="price_min" type="number" inputMode="numeric" min={0} className={priceField}
                                placeholder={String(facets.price_min)} value={min} onChange={(e) => setMin(e.target.value)} />
                            <span className="text-slate-400" aria-hidden>–</span>
                            <label className="sr-only" htmlFor="price_max">{t('Maximum price')}</label>
                            <input id="price_max" type="number" inputMode="numeric" min={0} className={priceField}
                                placeholder={String(facets.price_max)} value={max} onChange={(e) => setMax(e.target.value)} />
                        </div>
                        <button type="submit" className="mt-2 h-10 w-full rounded-full border border-slate-300 bg-white text-sm hover:bg-slate-50">
                            {t('Apply price')}
                        </button>
                    </fieldset>
                </form>
            )}
        </div>
    );
}

export default function SearchPage({ query, products, matched, filters, facets, sorts, popular, collections }: Props) {
    const t = useT();
    const [panelOpen, setPanelOpen] = useState(false);

    const sortLabels: Record<string, string> = {
        relevance: t('Best match'),
        newest: t('Newest'),
        price_asc: t('Price: low to high'),
        price_desc: t('Price: high to low'),
        rating: t('Top rated'),
    };

    /** Reload the page with changed filters. Empty values and defaults are left out of the URL. */
    const visit = (patch: Patch) => {
        const next: Record<string, unknown> = { q: query, ...filters, ...patch };
        const params: Record<string, string | number | string[]> = {};

        for (const [key, value] of Object.entries(next)) {
            if (value === null || value === undefined || value === '' || value === false) continue;
            if (Array.isArray(value) && value.length === 0) continue;
            if (key === 'sort' && value === 'relevance') continue;
            params[key] = value === true ? 1 : (value as string | number | string[]);
        }

        router.get('/search', params, { preserveState: true, preserveScroll: true, replace: true });
    };

    // Removable chips for every active filter.
    const chips: { key: string; label: string; patch: Patch }[] = [
        ...(filters.collections ?? []).map((slug) => ({
            key: `c-${slug}`,
            label: facets?.collections.find((c) => c.slug === slug)?.name ?? slug,
            patch: { collections: (filters.collections ?? []).filter((s) => s !== slug) },
        })),
        ...(filters.options ?? []).map((o) => ({
            key: `o-${o}`, label: o, patch: { options: (filters.options ?? []).filter((v) => v !== o) },
        })),
        ...(filters.colours ?? []).map((c) => ({
            key: `k-${c}`, label: c, patch: { colours: (filters.colours ?? []).filter((v) => v !== c) },
        })),
        ...(isOn(filters.in_stock) ? [{ key: 'stock', label: t('In stock'), patch: { in_stock: null } }] : []),
        ...(filters.rating ? [{ key: 'rating', label: t(':stars★ & up', { stars: filters.rating }), patch: { rating: null } }] : []),
        ...(filters.min || filters.max ? [{
            key: 'price',
            label: `${filters.min || facets?.price_min || 0} – ${filters.max || facets?.price_max || ''}`,
            patch: { min: null, max: null },
        }] : []),
    ];

    const total = products?.total ?? 0;
    const nothingFound = matched === 0;
    const filteredOut = !nothingFound && total === 0;

    return (
        <StoreLayout>
            {/* Search results are noindexed on the server (route "search"); only the title is set here. */}
            <Head title={query ? t('Search: :query', { query }) : t('Search')} />

            <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    {query ? t('Results for “:query”', { query }) : t('Search')}
                </h1>

                {nothingFound ? (
                    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8">
                        <p className="text-slate-600">
                            {query
                                ? t('Nothing matched “:query”. Check the spelling, or try a shorter or more general word.', { query })
                                : t('Type in the search box above, or browse a collection:')}
                        </p>

                        {popular.length > 0 && (
                            <div className="mt-6">
                                <h2 className="font-mono text-xs tracking-[0.15em] text-slate-500 uppercase">{t('Popular searches')}</h2>
                                <ul className="mt-3 flex flex-wrap gap-2">
                                    {popular.map((term) => (
                                        <li key={term}>
                                            <Link href={`/search?q=${encodeURIComponent(term)}`}
                                                className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50">
                                                {term}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {collections.length > 0 && (
                            <div className="mt-6">
                                <h2 className="font-mono text-xs tracking-[0.15em] text-slate-500 uppercase">{t('Browse collections')}</h2>
                                <ul className="mt-3 flex flex-wrap gap-3">
                                    {collections.map((c) => (
                                        <li key={c.slug}>
                                            <Link href={`/collections/${c.slug}`}
                                                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50">
                                                {c.image_url && (
                                                    <img src={c.image_url} alt="" width={24} height={24} loading="lazy" decoding="async"
                                                        className="size-6 rounded-full object-cover" />
                                                )}
                                                {c.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Toolbar: count, mobile filters button, sort */}
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <p className="font-mono text-sm text-slate-500" aria-live="polite">
                                {total === 1 ? t('1 product') : t(':count products', { count: total })}
                                {total !== matched && ` ${t('of :count', { count: matched })}`}
                            </p>

                            <div className="flex items-center gap-2">
                                {facets && (
                                    <button type="button" onClick={() => setPanelOpen(true)}
                                        className="flex h-10 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm lg:hidden">
                                        <SlidersHorizontal className="size-4" aria-hidden />
                                        {t('Filters')}{chips.length > 0 && ` (${chips.length})`}
                                    </button>
                                )}
                                <label className="flex items-center gap-2 text-sm">
                                    <span className="hidden text-slate-500 sm:inline">{t('Sort by')}</span>
                                    <select value={filters.sort} onChange={(e) => visit({ sort: e.target.value })}
                                        className="h-10 rounded-full border border-slate-300 bg-white px-3 text-sm">
                                        {sorts.map((s) => <option key={s} value={s}>{sortLabels[s] ?? s}</option>)}
                                    </select>
                                </label>
                            </div>
                        </div>

                        {chips.length > 0 && (
                            <ul className="mt-4 flex flex-wrap items-center gap-2" aria-label={t('Active filters')}>
                                {chips.map((chip) => (
                                    <li key={chip.key}>
                                        <button type="button" onClick={() => visit(chip.patch)}
                                            aria-label={t('Remove filter :name', { name: chip.label })}
                                            className="flex items-center gap-1.5 rounded-full bg-[#f0eefa] px-3 py-1.5 text-sm text-[#3f3775] hover:bg-[#e4e0f5]">
                                            {chip.label}
                                            <X className="size-3.5" aria-hidden />
                                        </button>
                                    </li>
                                ))}
                                <li>
                                    <button type="button" onClick={() => visit(CLEAR_ALL)} className="text-sm text-slate-500 underline hover:text-slate-900">
                                        {t('Clear all')}
                                    </button>
                                </li>
                            </ul>
                        )}

                        <div className="mt-8 lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">
                            {facets && (
                                <aside className="hidden lg:block" aria-label={t('Filters')}>
                                    <FilterPanel key={`${filters.min}-${filters.max}`} facets={facets} filters={filters} onChange={visit} />
                                </aside>
                            )}

                            <div className="min-w-0">
                                {filteredOut ? (
                                    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                                        <p className="text-slate-600">{t('No products match these filters.')}</p>
                                        <button type="button" onClick={() => visit(CLEAR_ALL)}
                                            className="mt-5 inline-flex h-11 items-center rounded-full bg-[#1f2230] px-6 text-sm font-medium text-white hover:bg-black">
                                            {t('Clear filters')}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                                        {products?.data.map((product) => <ProductCard key={product.slug} product={product} />)}
                                    </div>
                                )}

                                {products && products.last_page > 1 && (
                                    <nav aria-label={t('Pagination')} className="mt-12 flex flex-wrap justify-center gap-2">
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

                        {facets && (
                            <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
                                <SheetContent side="left" className="w-[320px] overflow-y-auto p-6">
                                    <SheetTitle>{t('Filters')}</SheetTitle>
                                    <div className="mt-6">
                                        <FilterPanel key={`m-${filters.min}-${filters.max}`} facets={facets} filters={filters} onChange={visit} />
                                    </div>
                                    <button type="button" onClick={() => setPanelOpen(false)}
                                        className="sticky bottom-0 mt-8 h-12 w-full rounded-full bg-[#1f2230] font-medium text-white">
                                        {total === 1 ? t('Show 1 result') : t('Show :count results', { count: total })}
                                    </button>
                                </SheetContent>
                            </Sheet>
                        )}
                    </>
                )}
            </div>
        </StoreLayout>
    );
}
