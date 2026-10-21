import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';

type Row = {
    id: number;
    email: string;
    customer: boolean;
    status: string;
    reminders_sent: number;
    value: string | null;
    order: string | null;
    clicked: boolean;
    updated_at: string | null;
};

type Props = {
    settings: { enabled: boolean; quiet_hours: boolean; delays: number[] };
    stats: { reached: number; emails: number; clicked: number; recovered: number; revenue: string; rate: number };
    recent: Row[];
};

const STATUS: Record<string, { label: string; style: string }> = {
    active: { label: 'Waiting', style: 'bg-amber-100 text-amber-800' },
    clicked: { label: 'Came back', style: 'bg-sky-100 text-sky-800' },
    converted: { label: 'Recovered', style: 'bg-green-100 text-green-800' },
    purchased: { label: 'Bought anyway', style: 'bg-slate-100 text-slate-700' },
    unsubscribed: { label: 'Unsubscribed', style: 'bg-slate-100 text-slate-600' },
    expired: { label: 'Expired', style: 'bg-slate-100 text-slate-500' },
};

export default function AbandonedCarts({ settings, stats, recent }: Props) {
    const notice = usePage<{ flash?: { admin_notice?: string } }>().props.flash?.admin_notice;
    const form = useForm({ ...settings });

    const save = (e: FormEvent) => {
        e.preventDefault();
        form.put('/admin/abandoned-carts/settings', { preserveScroll: true });
    };

    const setDelay = (index: number, value: string) =>
        form.setData('delays', form.data.delays.map((d, i) => (i === index ? Number(value) : d)));

    const cards = [
        ['Bags reached', stats.reached.toLocaleString(), 'Got at least one reminder'],
        ['Emails sent', stats.emails.toLocaleString(), ''],
        ['Came back', stats.clicked.toLocaleString(), 'Clicked "Return to my bag"'],
        ['Recovered orders', stats.recovered.toLocaleString(), `${stats.rate}% of bags reached`],
        ['Recovered revenue', stats.revenue, 'Converted to base currency'],
    ];

    return (
        <>
            <Head title="Abandoned bags" />

            <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
                <div>
                    <h1 className="text-xl font-semibold">Abandoned bags</h1>
                    <p className="text-sm text-muted-foreground">Reminder emails for shoppers who left items in their bag. Last 30 days.</p>
                </div>

                {notice && <p role="status" className="rounded-md bg-slate-100 px-4 py-2 text-sm">{notice}</p>}

                <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                    {cards.map(([label, value, hint]) => (
                        <div key={label} className="rounded-lg border p-4">
                            <dt className="text-sm text-muted-foreground">{label}</dt>
                            <dd className="mt-1 font-mono text-2xl">{value}</dd>
                            {hint && <dd className="mt-1 text-xs text-muted-foreground">{hint}</dd>}
                        </div>
                    ))}
                </dl>

                <form onSubmit={save} className="space-y-4 rounded-lg border p-5">
                    <h2 className="font-semibold">Settings</h2>

                    <label className="flex items-center gap-2 text-sm font-medium">
                        <input type="checkbox" checked={form.data.enabled} onChange={(e) => form.setData('enabled', e.target.checked)} />
                        Send bag reminders
                    </label>

                    <fieldset className="space-y-2">
                        <legend className="text-sm font-medium">Send each reminder this many hours after the bag was last touched</legend>
                        <div className="flex flex-wrap gap-3">
                            {['First', 'Second', 'Third'].map((label, i) => (
                                <label key={label} className="space-y-1 text-sm">
                                    <span className="text-muted-foreground">{label}</span>
                                    <Input type="number" min={0.5} max={336} step={0.5} className="w-28"
                                        value={form.data.delays[i]} onChange={(e) => setDelay(i, e.target.value)} />
                                </label>
                            ))}
                        </div>
                        {form.errors.delays && <p className="text-sm text-red-600">{form.errors.delays}</p>}
                    </fieldset>

                    <label className="flex items-start gap-2 text-sm">
                        <input type="checkbox" className="mt-0.5" checked={form.data.quiet_hours}
                            onChange={(e) => form.setData('quiet_hours', e.target.checked)} />
                        <span>
                            <span className="font-medium">Quiet hours</span>
                            <span className="block text-muted-foreground">Only send between 08:00 and 21:00 in the customer's region.</span>
                        </span>
                    </label>

                    <Button type="submit" disabled={form.processing || !form.isDirty}>Save settings</Button>
                </form>

                <section>
                    <h2 className="mb-2 font-semibold">Recent bags</h2>
                    {recent.length === 0 ? (
                        <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">No abandoned bags yet.</p>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full min-w-[720px] text-sm">
                                <thead className="bg-slate-50 text-left text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-2 font-medium">Shopper</th>
                                        <th className="px-4 py-2 font-medium">Status</th>
                                        <th className="px-4 py-2 text-right font-medium">Reminders</th>
                                        <th className="px-4 py-2 text-right font-medium">Bag value</th>
                                        <th className="px-4 py-2 font-medium">Order</th>
                                        <th className="px-4 py-2 font-medium">Updated</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {recent.map((r) => (
                                        <tr key={r.id}>
                                            <td className="px-4 py-2">
                                                {r.email}
                                                <span className="ml-2 text-xs text-muted-foreground">{r.customer ? 'customer' : 'guest'}</span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className={`rounded px-2 py-0.5 text-xs ${STATUS[r.status]?.style ?? 'bg-slate-100'}`}>
                                                    {STATUS[r.status]?.label ?? r.status}
                                                </span>
                                                {r.clicked && r.status !== 'clicked' && <span className="ml-2 text-xs text-muted-foreground">clicked</span>}
                                            </td>
                                            <td className="px-4 py-2 text-right font-mono">{r.reminders_sent}</td>
                                            <td className="px-4 py-2 text-right font-mono">{r.value ?? '—'}</td>
                                            <td className="px-4 py-2">
                                                {r.order ? <Link href={`/admin/orders/${r.order}`} className="font-mono hover:underline">{r.order}</Link> : '—'}
                                            </td>
                                            <td className="px-4 py-2">{r.updated_at && new Date(r.updated_at).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}

AbandonedCarts.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Marketing', href: '/admin/newsletter' },
        { title: 'Abandoned bags', href: '/admin/abandoned-carts' },
    ],
};
