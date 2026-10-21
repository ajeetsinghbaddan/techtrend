import { Head, router } from '@inertiajs/react';
import { ExternalLink, Trash2 } from 'lucide-react';

type Log = { id: number; term: string; locale: string; results: number; hits: number; last_searched_at: string };

type Props = {
    stats: { searches: number; terms: number; zero_terms: number; zero_searches: number };
    top: Log[];
    missing: Log[];
    filters: { days: number; locale: string | null };
    locales: Record<string, string>;
};

export default function SearchInsights({ stats, top, missing, filters, locales }: Props) {
    const apply = (patch: Partial<Props['filters']>) => {
        const next = { ...filters, ...patch };
        const query: Record<string, string | number> = { days: next.days };
        if (next.locale) query.locale = next.locale;
        router.get('/admin/search-insights', query, { preserveState: true, preserveScroll: true, replace: true });
    };

    const remove = (log: Log) => {
        if (confirm(`Remove "${log.term}" from the search log?`)) {
            router.delete(`/admin/search-insights/${log.id}`, { preserveScroll: true });
        }
    };

    const zeroRate = stats.searches ? Math.round((stats.zero_searches / stats.searches) * 100) : 0;

    const table = (rows: Log[], empty: string, showResults: boolean) =>
        rows.length === 0 ? (
            <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
            <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[420px] text-sm">
                    <thead className="bg-slate-50 text-left text-muted-foreground">
                        <tr>
                            <th className="px-4 py-2 font-medium">Term</th>
                            <th className="px-4 py-2 font-medium">Lang</th>
                            <th className="px-4 py-2 text-right font-medium">Searches</th>
                            {showResults && <th className="px-4 py-2 text-right font-medium">Results</th>}
                            <th className="px-4 py-2"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {rows.map((log) => (
                            <tr key={log.id}>
                                <td className="max-w-[220px] truncate px-4 py-2 font-medium">{log.term}</td>
                                <td className="px-4 py-2 font-mono text-xs uppercase">{log.locale}</td>
                                <td className="px-4 py-2 text-right font-mono">{log.hits}</td>
                                {showResults && <td className="px-4 py-2 text-right font-mono">{log.results}</td>}
                                <td className="px-4 py-2">
                                    <div className="flex justify-end gap-1">
                                        <a href={`/search?q=${encodeURIComponent(log.term)}`} target="_blank" rel="noopener noreferrer"
                                            aria-label={`Try "${log.term}" in the shop`} className="rounded p-1.5 hover:bg-slate-100">
                                            <ExternalLink className="size-4" />
                                        </a>
                                        <button type="button" onClick={() => remove(log)} aria-label={`Remove "${log.term}"`}
                                            className="rounded p-1.5 text-muted-foreground hover:bg-slate-100 hover:text-red-600">
                                            <Trash2 className="size-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );

    return (
        <>
            <Head title="Search insights" />

            <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold">Search insights</h1>
                        <p className="text-sm text-muted-foreground">
                            Terms searched in the period. Counts are totals since each term was first searched.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <select value={filters.days} onChange={(e) => apply({ days: Number(e.target.value) })}
                            aria-label="Period" className="h-9 rounded-md border px-3 text-sm">
                            <option value={7}>Last 7 days</option>
                            <option value={30}>Last 30 days</option>
                            <option value={90}>Last 90 days</option>
                            <option value={365}>Last year</option>
                        </select>
                        <select value={filters.locale ?? ''} onChange={(e) => apply({ locale: e.target.value || null })}
                            aria-label="Language" className="h-9 rounded-md border px-3 text-sm">
                            <option value="">All languages</option>
                            {Object.entries(locales).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                        </select>
                    </div>
                </div>

                <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                        ['Searches', stats.searches.toLocaleString()],
                        ['Different terms', stats.terms.toLocaleString()],
                        ['Terms with no results', stats.zero_terms.toLocaleString()],
                        ['Searches finding nothing', `${zeroRate}%`],
                    ].map(([label, value]) => (
                        <div key={label} className="rounded-lg border p-4">
                            <dt className="text-sm text-muted-foreground">{label}</dt>
                            <dd className="mt-1 font-mono text-2xl">{value}</dd>
                        </div>
                    ))}
                </dl>

                <div className="grid gap-6 lg:grid-cols-2">
                    <section>
                        <h2 className="font-semibold">Searches that found nothing</h2>
                        <p className="mb-3 text-sm text-muted-foreground">
                            What customers want but can't find: products to stock, or names and spellings to add.
                        </p>
                        {table(missing, 'Every search found something.', false)}
                    </section>

                    <section>
                        <h2 className="font-semibold">Most popular searches</h2>
                        <p className="mb-3 text-sm text-muted-foreground">What customers look for most.</p>
                        {table(top, 'No searches yet.', true)}
                    </section>
                </div>
            </div>
        </>
    );
}

SearchInsights.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Marketing', href: '/admin/newsletter' },
        { title: 'Search insights', href: '/admin/search-insights' },
    ],
};
