import { Button } from '@/components/ui/button';
import type { Paginated } from '@/types/blog';
import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';

type Row = {
    id: number;
    title: string;
    slug: string;
    category: string | null;
    published_at: string | null;
    is_published: boolean;
};

function Status({ row }: { row: Row }) {
    if (row.is_published) {
        return <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs text-green-800">Published</span>;
    }
    if (row.published_at) {
        return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-800">Scheduled</span>;
    }
    return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">Draft</span>;
}

export default function PostsIndex({ posts }: { posts: Paginated<Row> }) {
    const remove = (row: Row) => {
        if (confirm(`Delete "${row.title}"? This cannot be undone.`)) {
            router.delete(`/admin/posts/${row.slug}`, { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title="Blog posts" />

            <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold">Posts</h1>
                    <Button asChild>
                        <Link href="/admin/posts/create">
                            <Plus className="size-4" /> New post
                        </Link>
                    </Button>
                </div>

                {posts.data.length === 0 ? (
                    <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
                        No posts yet. Create your first one.
                    </p>
                ) : (
                    <ul className="divide-y rounded-lg border">
                        {posts.data.map((row) => (
                            <li key={row.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="truncate font-medium">{row.title}</p>
                                    <p className="mt-1 flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
                                        <Status row={row} />
                                        {row.category && <span>{row.category}</span>}
                                        {row.published_at && (
                                            <span>{new Date(row.published_at).toLocaleDateString()}</span>
                                        )}
                                    </p>
                                </div>

                                <div className="flex shrink-0 gap-1">
                                    <Button asChild variant="ghost" size="icon">
                                        <Link href={`/admin/posts/${row.slug}/edit`} aria-label={`Edit ${row.title}`}>
                                            <Pencil className="size-4" />
                                        </Link>
                                    </Button>
                                    <Button type="button" variant="ghost" size="icon"
                                        aria-label={`Delete ${row.title}`} onClick={() => remove(row)}>
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {posts.last_page > 1 && (
                    <nav aria-label="Pagination" className="flex flex-wrap justify-center gap-2">
                        {posts.links.map((link, i) =>
                            link.url ? (
                                <Link key={i} href={link.url}
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

PostsIndex.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Blog', href: '/admin/posts' },
        { title: 'Posts', href: '/admin/posts' },
    ],
};
