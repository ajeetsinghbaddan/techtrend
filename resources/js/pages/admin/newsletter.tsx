import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Paginated } from '@/types/blog';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Download, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type Row = { id: number; email: string; status: 'confirmed' | 'pending' | 'unsubscribed'; locale: string | null; region: string | null; created_at: string };

type Settings = { enabled: boolean; title: string; text: string | null; placeholder: string; button: string; notify_email: string | null };

type Props = {
    settings: Settings;
    subscribers: Paginated<Row>;
    filters: { q: string; status: string };
    counts: { confirmed: number; pending: number; unsubscribed: number };
};

const badge: Record<Row['status'], string> = {
    confirmed: 'bg-green-100 text-green-800',
    pending: 'bg-amber-100 text-amber-800',
    unsubscribed: 'bg-slate-100 text-slate-600',
};

export default function NewsletterAdmin({ settings, subscribers, filters, counts }: Props) {
    const form = useForm({
        enabled: settings.enabled,
        title: settings.title,
        text: settings.text ?? '',
        placeholder: settings.placeholder,
        button: settings.button,
        notify_email: settings.notify_email ?? '',
    });

    const [q, setQ] = useState(filters.q ?? '');

    const saveSettings = (e: FormEvent) => {
        e.preventDefault();
        form.put('/admin/newsletter/settings', { preserveScroll: true });
    };

    const filter = (params: { q?: string; status?: string }) =>
        router.get('/admin/newsletter', { ...filters, ...params }, { preserveState: true, preserveScroll: true, replace: true });

    const remove = (row: Row) => {
        if (confirm(`Permanently delete ${row.email}? Use this for deletion requests.`)) {
            router.delete(`/admin/newsletter/${row.id}`, { preserveScroll: true });
        }
    };

    const tabs = [
        { key: '', label: 'All' },
        { key: 'confirmed', label: `Confirmed (${counts.confirmed})` },
        { key: 'pending', label: `Pending (${counts.pending})` },
        { key: 'unsubscribed', label: `Unsubscribed (${counts.unsubscribed})` },
    ];

    return (
        <>
            <Head title="Newsletter" />

            <div className="mx-auto w-full max-w-5xl space-y-8 p-4 sm:p-6">
                {/* Section settings */}
                <form onSubmit={saveSettings} className="space-y-4 rounded-lg border p-4">
                    <h2 className="font-semibold">Homepage section</h2>

                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.data.enabled}
                            onChange={(e) => form.setData('enabled', e.target.checked)} />
                        Show the signup section
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                        {([
                            ['title', 'Heading'],
                            ['text', 'Text'],
                            ['placeholder', 'Input placeholder'],
                            ['button', 'Button label'],
                        ] as const).map(([key, label]) => (
                            <div key={key} className="space-y-1">
                                <Label htmlFor={key}>{label}</Label>
                                <Input id={key} value={form.data[key]}
                                    onChange={(e) => form.setData(key, e.target.value)} />
                                <p className="text-sm text-red-600">{form.errors[key]}</p>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="notify_email">Send a copy of each new subscriber to</Label>
                        <Input id="notify_email" type="email" value={form.data.notify_email}
                            placeholder="you@yourdomain.com"
                            onChange={(e) => form.setData('notify_email', e.target.value)} />
                        <p className="text-xs text-muted-foreground">Leave empty to turn off these emails.</p>
                        <p className="text-sm text-red-600">{form.errors.notify_email}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button type="submit" disabled={form.processing}>Save section</Button>
                        {form.recentlySuccessful && <span className="text-sm text-muted-foreground">Saved.</span>}
                    </div>
                </form>

                {/* Subscribers */}
                <section className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold">Subscribers</h2>
                        <Button asChild variant="outline">
                            <a href="/admin/newsletter/export">
                                <Download className="size-4" /> Export CSV
                            </a>
                        </Button>
                    </div>

                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap gap-2">
                            {tabs.map((t) => (
                                <button key={t.key} type="button" onClick={() => filter({ status: t.key })}
                                    className={`rounded-full border px-3 py-1.5 text-sm ${
                                        (filters.status ?? '') === t.key ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'
                                    }`}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); filter({ q }); }}>
                            <Input type="search" placeholder="Search email" value={q} className="lg:w-64"
                                onChange={(e) => setQ(e.target.value)} />
                        </form>
                    </div>

                    {subscribers.data.length === 0 ? (
                        <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">No subscribers found.</p>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-left text-xs text-muted-foreground uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Email</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Lang / region</th>
                                        <th className="px-4 py-3">Signed up</th>
                                        <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {subscribers.data.map((row) => (
                                        <tr key={row.id}>
                                            <td className="px-4 py-3 font-medium">{row.email}</td>
                                            <td className="px-4 py-3">
                                                <span className={`rounded-full px-2.5 py-1 text-xs ${badge[row.status]}`}>{row.status}</span>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs">
                                                {(row.locale ?? '—').toUpperCase()} / {row.region ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {new Date(row.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button type="button" variant="ghost" size="icon"
                                                    aria-label={`Delete ${row.email}`} onClick={() => remove(row)}>
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {subscribers.last_page > 1 && (
                        <nav aria-label="Pagination" className="flex flex-wrap justify-center gap-2">
                            {subscribers.links.map((link, i) =>
                                link.url ? (
                                    <Link key={i} href={link.url} preserveScroll
                                        className={`rounded-md border px-3 py-1.5 text-sm ${link.active ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }} />
                                ) : (
                                    <span key={i} className="px-3 py-1.5 text-sm text-slate-400"
                                        dangerouslySetInnerHTML={{ __html: link.label }} />
                                ),
                            )}
                        </nav>
                    )}
                </section>
            </div>
        </>
    );
}

NewsletterAdmin.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Marketing', href: '/admin/newsletter' },
        { title: 'Newsletter', href: '/admin/newsletter' },
    ],
};
