import Stars from '@/components/store/stars';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Paginated } from '@/types/blog';
import { Head, Link, router } from '@inertiajs/react';
import { BadgeCheck, Check, MessageSquare, Trash2, X } from 'lucide-react';
import { useState } from 'react';

type Row = {
    id: number; rating: number; title: string | null; body: string; status: string;
    is_verified: boolean; helpful_count: number; admin_reply: string | null; locale: string | null;
    created_at: string; product: { name: string; slug: string } | null;
    author: { name: string | null; email: string | null }; images: string[];
};

type Props = {
    reviews: Paginated<Row>;
    filters: { status: string; rating?: number; q?: string };
    counts: Record<string, number>;
};

const STATUS_STYLE: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-slate-100 text-slate-600',
};

function ReviewCard({ row, selected, onSelect }: { row: Row; selected: boolean; onSelect: (on: boolean) => void }) {
    const [replying, setReplying] = useState(false);
    const [reply, setReply] = useState(row.admin_reply ?? '');
    type ReviewUpdate = { status?: 'pending' | 'approved' | 'rejected'; admin_reply?: string };

    const update = (data: ReviewUpdate) =>
        router.patch(`/admin/reviews/${row.id}`, data, { preserveScroll: true, onSuccess: () => setReplying(false) });

    return (
        <li className="space-y-3 p-4">
            <div className="flex items-start gap-3">
                <input type="checkbox" checked={selected} onChange={(e) => onSelect(e.target.checked)}
                    aria-label="Select review" className="mt-1" />
                <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <Stars rating={row.rating} />
                        <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_STYLE[row.status]}`}>{row.status}</span>
                        {row.is_verified && (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700"><BadgeCheck className="size-3.5" /> Verified</span>
                        )}
                        {row.locale && <span className="font-mono text-xs uppercase text-muted-foreground">{row.locale}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {row.author.name} ({row.author.email}) on{' '}
                        {row.product ? (
                            <a href={`/products/${row.product.slug}#reviews`} target="_blank" rel="noopener noreferrer" className="underline">
                                {row.product.name}
                            </a>
                        ) : 'a deleted product'}
                        {' · '}{new Date(row.created_at).toLocaleDateString()}
                        {row.helpful_count > 0 && ` · ${row.helpful_count} found helpful`}
                    </p>
                    {row.title && <p className="font-medium">{row.title}</p>}
                    <p className="text-sm whitespace-pre-line">{row.body}</p>

                    {row.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {row.images.map((url) => (
                                <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                                    <img src={url} alt="" className="size-16 rounded object-cover" />
                                </a>
                            ))}
                        </div>
                    )}

                    {row.admin_reply && !replying && (
                        <p className="mt-2 rounded-md border-l-4 border-violet-400 bg-slate-50 px-3 py-2 text-sm">
                            <span className="font-medium">Your reply: </span>{row.admin_reply}
                        </p>
                    )}

                    {replying && (
                        <div className="space-y-2 pt-2">
                            <textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)}
                                placeholder="Thank the customer, or answer their question. Shown publicly."
                                className="w-full rounded-md border px-3 py-2 text-sm" />
                            <div className="flex gap-2">
                                <Button type="button" size="sm" onClick={() => update({ admin_reply: reply })}>Save reply</Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => setReplying(false)}>Cancel</Button>
                                {row.admin_reply && (
                                    <Button type="button" size="sm" variant="ghost" onClick={() => update({ admin_reply: '' })}>Remove reply</Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap gap-2 pl-7">
                {row.status !== 'approved' && (
                    <Button type="button" size="sm" onClick={() => update({ status: 'approved' })}>
                        <Check className="size-4" /> Approve
                    </Button>
                )}
                {row.status !== 'rejected' && (
                    <Button type="button" size="sm" variant="outline" onClick={() => update({ status: 'rejected' })}>
                        <X className="size-4" /> Reject
                    </Button>
                )}
                <Button type="button" size="sm" variant="outline" onClick={() => setReplying(true)}>
                    <MessageSquare className="size-4" /> {row.admin_reply ? 'Edit reply' : 'Reply'}
                </Button>
                <Button type="button" size="sm" variant="ghost" aria-label="Delete review"
                    onClick={() => confirm('Delete this review and its photos?') &&
                        router.delete(`/admin/reviews/${row.id}`, { preserveScroll: true })}>
                    <Trash2 className="size-4" />
                </Button>
            </div>
        </li>
    );
}

export default function ReviewsAdmin({ reviews, filters, counts }: Props) {
    const [selected, setSelected] = useState<number[]>([]);
    const [q, setQ] = useState(filters.q ?? '');

    const filter = (patch: Record<string, string | undefined>) => {
        const next: Record<string, string> = {};
        Object.entries({ ...filters, ...patch }).forEach(([k, v]) => { if (v) next[k] = String(v); });
        setSelected([]);
        router.get('/admin/reviews', next, { preserveState: true, preserveScroll: true, replace: true });
    };

    const bulk = (action: 'approve' | 'reject' | 'delete') => {
        if (action === 'delete' && !confirm(`Delete ${selected.length} review(s) and their photos?`)) return;
        router.post('/admin/reviews/bulk', { ids: selected, action }, { preserveScroll: true, onSuccess: () => setSelected([]) });
    };

    const tabs = [
        { key: 'pending', label: 'Pending' },
        { key: 'approved', label: 'Approved' },
        { key: 'rejected', label: 'Rejected' },
        { key: 'all', label: 'All' },
    ];

    return (
        <>
            <Head title="Reviews" />

            <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
                <h1 className="text-xl font-semibold">Reviews</h1>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2">
                        {tabs.map((tab) => (
                            <button key={tab.key} type="button" onClick={() => filter({ status: tab.key })}
                                className={`rounded-full border px-3 py-1.5 text-sm ${filters.status === tab.key ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}>
                                {tab.label}{counts[tab.key] ? ` (${counts[tab.key]})` : ''}
                            </button>
                        ))}
                        <select value={filters.rating ?? ''} onChange={(e) => filter({ rating: e.target.value || undefined })}
                            className="h-9 rounded-full border px-3 text-sm" aria-label="Filter by rating">
                            <option value="">All ratings</option>
                            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}
                        </select>
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); filter({ q }); }}>
                        <Input type="search" value={q} placeholder="Search text or product" className="lg:w-64"
                            onChange={(e) => setQ(e.target.value)} />
                    </form>
                </div>

                {selected.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm">
                        <span>{selected.length} selected</span>
                        <Button type="button" size="sm" onClick={() => bulk('approve')}>Approve</Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => bulk('reject')}>Reject</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => bulk('delete')}>Delete</Button>
                    </div>
                )}

                {reviews.data.length === 0 ? (
                    <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">No reviews here.</p>
                ) : (
                    <ul className="divide-y rounded-lg border">
                        {reviews.data.map((row) => (
                            <ReviewCard key={row.id} row={row} selected={selected.includes(row.id)}
                                onSelect={(on) => setSelected(on ? [...selected, row.id] : selected.filter((id) => id !== row.id))} />
                        ))}
                    </ul>
                )}

                {reviews.last_page > 1 && (
                    <nav aria-label="Pagination" className="flex flex-wrap justify-center gap-2">
                        {reviews.links.map((link, i) => link.url ? (
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

ReviewsAdmin.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Catalog', href: '/admin/collections' },
        { title: 'Reviews', href: '/admin/reviews' },
    ],
};
