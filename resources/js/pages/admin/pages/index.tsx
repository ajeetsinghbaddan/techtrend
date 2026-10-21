import { Button } from '@/components/ui/button';
import { Head, Link, router } from '@inertiajs/react';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';

type Row = {
    id: number;
    title: string;
    slug: string;
    template: string;
    is_published: boolean;
    noindex: boolean;
    updated_at: string | null;
};

export default function PagesIndex({ pages }: { pages: Row[] }) {
    const remove = (row: Row) => {
        if (confirm(`Delete "${row.title}"? Links to /${row.slug} will stop working.`)) {
            router.delete(`/admin/pages/${row.slug}`, { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title="Pages" />

            <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold">Pages</h1>
                    <Button asChild>
                        <Link href="/admin/pages/create"><Plus className="size-4" /> New page</Link>
                    </Button>
                </div>

                {pages.length === 0 ? (
                    <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">No pages yet.</p>
                ) : (
                    <ul className="divide-y rounded-lg border">
                        {pages.map((row) => (
                            <li key={row.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="flex flex-wrap items-center gap-2 font-medium">
                                        {row.title}
                                        {!row.is_published && (
                                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Draft</span>
                                        )}
                                        {row.noindex && (
                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Hidden from search</span>
                                        )}
                                        {row.template !== 'default' && (
                                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-800 capitalize">{row.template}</span>
                                        )}
                                    </p>
                                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                                        /{row.slug}
                                        {row.updated_at && ` · updated ${new Date(row.updated_at).toLocaleDateString()}`}
                                    </p>
                                </div>

                                <div className="flex shrink-0 gap-1">
                                    <Button asChild variant="ghost" size="icon">
                                        <a href={`/${row.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${row.title}`}>
                                            <ExternalLink className="size-4" />
                                        </a>
                                    </Button>
                                    <Button asChild variant="ghost" size="icon">
                                        <Link href={`/admin/pages/${row.slug}/edit`} aria-label={`Edit ${row.title}`}>
                                            <Pencil className="size-4" />
                                        </Link>
                                    </Button>
                                    <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${row.title}`}
                                        onClick={() => remove(row)}>
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}

PagesIndex.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Content', href: '/admin/pages' },
        { title: 'Pages', href: '/admin/pages' },
    ],
};
