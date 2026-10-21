import type { Paginated } from '@/types/blog';
import { Head, Link } from '@inertiajs/react';

type Row = { id: number; name: string; email: string; subject: string | null; preview: string; is_read: boolean; created_at: string };

export default function MessagesIndex({ messages, unread }: { messages: Paginated<Row>; unread: number }) {
    return (
        <>
            <Head title="Messages" />

            <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
                <h1 className="text-xl font-semibold">
                    Messages {unread > 0 && <span className="ml-2 rounded-full bg-violet-600 px-2 py-0.5 text-xs text-white">{unread} new</span>}
                </h1>

                {messages.data.length === 0 ? (
                    <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">No messages yet.</p>
                ) : (
                    <ul className="divide-y rounded-lg border">
                        {messages.data.map((m) => (
                            <li key={m.id}>
                                <Link href={`/admin/messages/${m.id}`} className="block p-4 hover:bg-slate-50">
                                    <p className={`flex justify-between gap-4 ${m.is_read ? '' : 'font-semibold'}`}>
                                        <span className="truncate">{m.name} · {m.subject || 'No subject'}</span>
                                        <span className="shrink-0 text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</span>
                                    </p>
                                    <p className="mt-1 truncate text-sm text-muted-foreground">{m.preview}</p>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}

                {messages.last_page > 1 && (
                    <nav aria-label="Pagination" className="flex flex-wrap justify-center gap-2">
                        {messages.links.map((link, i) => link.url ? (
                            <Link key={i} href={link.url}
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

MessagesIndex.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Content', href: '/admin/pages' },
        { title: 'Messages', href: '/admin/messages' },
    ],
};
