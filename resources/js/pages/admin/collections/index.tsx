import { Button } from '@/components/ui/button';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';

type Row = {
    id: number;
    name: string;
    slug: string;
    tagline: string | null;
    is_active: boolean;
    products_count: number;
    image_url: string | null;
};

export default function CollectionsIndex({ collections }: { collections: Row[] }) {
    const move = (from: number, to: number) => {
        const ids = collections.map((c) => c.id);
        const [moved] = ids.splice(from, 1);
        ids.splice(to, 0, moved);
        router.post('/admin/collections/reorder', { ids }, { preserveScroll: true });
    };

    const remove = (row: Row) => {
        const extra = row.products_count > 0
            ? ` Its ${row.products_count} product(s) will stay but leave this collection.`
            : '';

        if (confirm(`Delete "${row.name}"?${extra}`)) {
            router.delete(`/admin/collections/${row.slug}`, { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title="Collections" />

            <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold">Collections</h1>
                    <Button asChild>
                        <Link href="/admin/collections/create">
                            <Plus className="size-4" /> New collection
                        </Link>
                    </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                    The order here is the order shown in the homepage collections strip.
                </p>

                {collections.length === 0 ? (
                    <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
                        No collections yet.
                    </p>
                ) : (
                    <ul className="divide-y rounded-lg border">
                        {collections.map((row, i) => (
                            <li key={row.id} className="flex items-center gap-4 p-3">
                                {row.image_url ? (
                                    <img src={row.image_url} alt="" className="size-12 shrink-0 rounded-full object-cover" />
                                ) : (
                                    <div className="size-12 shrink-0 rounded-full bg-gradient-to-br from-[#5b4f9a] to-[#1f2230]" aria-hidden />
                                )}

                                <div className="min-w-0 flex-1">
                                    <p className="flex items-center gap-2 font-medium">
                                        {row.name}
                                        {!row.is_active && (
                                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Hidden</span>
                                        )}
                                    </p>
                                    <p className="truncate font-mono text-xs text-muted-foreground">
                                        /{row.slug} · {row.products_count} product{row.products_count === 1 ? '' : 's'}
                                    </p>
                                </div>

                                <div className="flex shrink-0 gap-1">
                                    <Button type="button" variant="ghost" size="icon" aria-label="Move up"
                                        disabled={i === 0} onClick={() => move(i, i - 1)}>
                                        <ArrowUp className="size-4" />
                                    </Button>
                                    <Button type="button" variant="ghost" size="icon" aria-label="Move down"
                                        disabled={i === collections.length - 1} onClick={() => move(i, i + 1)}>
                                        <ArrowDown className="size-4" />
                                    </Button>
                                    <Button asChild variant="ghost" size="icon">
                                        <Link href={`/admin/collections/${row.slug}/edit`} aria-label={`Edit ${row.name}`}>
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
            </div>
        </>
    );
}

CollectionsIndex.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Catalog', href: '/admin/collections' },
        { title: 'Collections', href: '/admin/collections' },
    ],
};
