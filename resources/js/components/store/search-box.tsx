import { useT } from '@/lib/i18n';
import type { MoneyValue } from '@/types/catalog-public';
import { router, usePage } from '@inertiajs/react';
import { Loader2, Search } from 'lucide-react';
import { useEffect, useId, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';

type Suggestions = {
    products: { name: string; slug: string; image_url: string | null; price: MoneyValue | null }[];
    collections: { name: string; slug: string }[];
};

type Item = { id: string; href: string; label: string; image?: string | null; price?: string; kind: 'product' | 'collection' };

export default function SearchBox({ placeholder, className = '' }: { placeholder: string; className?: string }) {
    const t = useT();
    const initial = (usePage().props as { query?: string }).query ?? '';

    const [q, setQ] = useState(initial);
    const [results, setResults] = useState<Suggestions | null>(null);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const [loading, setLoading] = useState(false);
    const listId = useId();

    // Ask the server 250ms after typing stops; cancel requests that are out of date.
    useEffect(() => {
        const term = q.trim();

        if (term.length < 2) {
            setResults(null);
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setLoading(true);

            try {
                const response = await fetch(`/search/suggest?q=${encodeURIComponent(term)}`, {
                    signal: controller.signal,
                    headers: { Accept: 'application/json' },
                });

                if (response.ok) {
                    setResults(await response.json());
                    setActive(-1);
                    setOpen(true);
                }
            } catch {
                // aborted or offline: keep the previous suggestions
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 250);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [q]);

    const items: Item[] = useMemo(() => [
        ...(results?.collections ?? []).map((c) => ({
            id: `c-${c.slug}`, href: `/collections/${c.slug}`, label: c.name, kind: 'collection' as const,
        })),
        ...(results?.products ?? []).map((p) => ({
            id: `p-${p.slug}`, href: `/products/${p.slug}`, label: p.name,
            image: p.image_url, price: p.price?.formatted, kind: 'product' as const,
        })),
    ], [results]);

    const submit = (e?: FormEvent) => {
        e?.preventDefault();
        const term = q.trim();
        if (!term) return;
        setOpen(false);
        router.get('/search', { q: term });
    };

    const go = (item: Item) => {
        setOpen(false);
        router.visit(item.href);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown' && items.length) {
            e.preventDefault();
            setOpen(true);
            setActive((i) => (i + 1) % items.length);
        } else if (e.key === 'ArrowUp' && items.length) {
            e.preventDefault();
            setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
        } else if (e.key === 'Enter' && open && active >= 0) {
            e.preventDefault();
            go(items[active]);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    const showList = open && q.trim().length >= 2 && results !== null;

    return (
        <form onSubmit={submit} role="search" className={`relative ${className}`}>
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-400" aria-hidden />

            <input
                type="search"
                name="q"
                value={q}
                maxLength={100}
                autoComplete="off"
                placeholder={placeholder}
                aria-label={t('Search products')}
                role="combobox"
                aria-expanded={showList}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={active >= 0 ? `${listId}-${items[active]?.id}` : undefined}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => results && setOpen(true)}
                onBlur={() => setOpen(false)}
                onKeyDown={onKeyDown}
                className="h-11 w-full rounded-full border border-slate-200 bg-white pr-10 pl-10 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
            />

            {loading && (
                <Loader2 className="absolute top-1/2 right-4 size-4 -translate-y-1/2 animate-spin text-slate-400" aria-hidden />
            )}

            {showList && (
                <ul
                    id={listId}
                    role="listbox"
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute top-full right-0 left-0 z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-lg"
                >
                    {items.length === 0 ? (
                        <li className="px-3 py-4 text-sm text-slate-500">{t('No matches yet. Press Enter to search.')}</li>
                    ) : (
                        items.map((item, i) => (
                            <li
                                key={item.id}
                                id={`${listId}-${item.id}`}
                                role="option"
                                aria-selected={i === active}
                                onMouseEnter={() => setActive(i)}
                                onClick={() => go(item)}
                                className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                                    i === active ? 'bg-[#f0eefa]' : ''
                                }`}
                            >
                                {item.kind === 'product' ? (
                                    item.image ? (
                                        <img src={item.image} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
                                    ) : (
                                        <span className="size-10 shrink-0 rounded-lg bg-gradient-to-br from-[#5b4f9a] to-[#1f2230]" aria-hidden />
                                    )
                                ) : (
                                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] tracking-wider text-slate-500 uppercase">
                                        {t('Collection')}
                                    </span>
                                )}
                                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                                {item.price && <span className="shrink-0 font-mono text-xs text-slate-500">{item.price}</span>}
                            </li>
                        ))
                    )}

                    <li role="presentation" className="mt-1 border-t border-slate-100 pt-1">
                        <button type="submit" className="w-full rounded-xl px-3 py-2 text-left text-sm text-[#5b4f9a] hover:bg-slate-50">
                            {t('See all results for “:query”', { query: q.trim() })}
                        </button>
                    </li>
                </ul>
            )}
        </form>
    );
}
