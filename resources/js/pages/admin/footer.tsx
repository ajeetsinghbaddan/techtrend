import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FooterColumn, FooterSettings } from '@/types/header';
import { Head, useForm } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';

type FooterForm = {
    description: string;
    columns: FooterColumn[];
    copyright: string;
    badges: string[];
};

function move<T>(list: T[], from: number, to: number): T[] {
    const copy = [...list];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
}

export default function FooterSettingsPage({ footer }: { footer: FooterSettings }) {
    const { data, setData, put, processing, errors, recentlySuccessful } = useForm<FooterForm>({
        description: footer.description ?? '',
        columns: footer.columns,
        copyright: footer.copyright ?? '',
        badges: footer.badges,
    });
    const err = errors as Record<string, string>;

    const updateColumn = (index: number, patch: Partial<FooterColumn>) =>
        setData('columns', data.columns.map((c, i) => (i === index ? { ...c, ...patch } : c)));

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put('/admin/footer', { preserveScroll: true });
    };

    return (
        <>
            <Head title="Edit footer" />

            <form onSubmit={submit} className="mx-auto w-full max-w-4xl space-y-8 p-4 sm:p-6">
                {/* Brand text */}
                <section className="space-y-2 rounded-lg border p-4">
                    <h2 className="font-semibold">Brand text</h2>
                    <p className="text-xs text-muted-foreground">
                        Shown under the logo. The logo itself is set on the Header page. Press Enter for a new line.
                    </p>
                    <textarea rows={3} className="w-full rounded-md border px-3 py-2 text-sm"
                        value={data.description} aria-label="Brand text"
                        onChange={(e) => setData('description', e.target.value)} />
                    <p className="text-sm text-red-600">{err.description}</p>
                </section>

                {/* Link columns */}
                <section className="space-y-4">
                    <h2 className="font-semibold">Link columns</h2>

                    {data.columns.map((column, i) => (
                        <div key={i} className="space-y-3 rounded-lg border p-4">
                            <div className="flex gap-2">
                                <Input value={column.title} placeholder="Column title" aria-label={`Column ${i + 1} title`}
                                    onChange={(e) => updateColumn(i, { title: e.target.value })} />
                                <Button type="button" variant="ghost" size="icon" aria-label="Move column up"
                                    disabled={i === 0} onClick={() => setData('columns', move(data.columns, i, i - 1))}>
                                    <ArrowUp className="size-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" aria-label="Move column down"
                                    disabled={i === data.columns.length - 1} onClick={() => setData('columns', move(data.columns, i, i + 1))}>
                                    <ArrowDown className="size-4" />
                                </Button>
                                <Button type="button" variant="outline" size="icon" aria-label="Delete column"
                                    onClick={() => setData('columns', data.columns.filter((_, j) => j !== i))}>
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                            <p className="text-sm text-red-600">{err[`columns.${i}.title`]}</p>

                            <div className="space-y-2 border-l pl-4">
                                {column.links.map((link, l) => (
                                    <div key={l} className="space-y-1">
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <Input value={link.label} placeholder="Label" aria-label="Link label"
                                                onChange={(e) => updateColumn(i, {
                                                    links: column.links.map((x, k) => (k === l ? { ...x, label: e.target.value } : x)),
                                                })} />
                                            <Input value={link.href} placeholder="/returns" aria-label="Link URL"
                                                onChange={(e) => updateColumn(i, {
                                                    links: column.links.map((x, k) => (k === l ? { ...x, href: e.target.value } : x)),
                                                })} />
                                            <div className="flex gap-1">
                                                <Button type="button" variant="ghost" size="icon" aria-label="Move link up"
                                                    disabled={l === 0} onClick={() => updateColumn(i, { links: move(column.links, l, l - 1) })}>
                                                    <ArrowUp className="size-4" />
                                                </Button>
                                                <Button type="button" variant="ghost" size="icon" aria-label="Move link down"
                                                    disabled={l === column.links.length - 1} onClick={() => updateColumn(i, { links: move(column.links, l, l + 1) })}>
                                                    <ArrowDown className="size-4" />
                                                </Button>
                                                <Button type="button" variant="ghost" size="icon" aria-label="Delete link"
                                                    onClick={() => updateColumn(i, { links: column.links.filter((_, k) => k !== l) })}>
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-red-600">
                                            {err[`columns.${i}.links.${l}.label`] ?? err[`columns.${i}.links.${l}.href`]}
                                        </p>
                                    </div>
                                ))}
                                <Button type="button" variant="ghost" size="sm" disabled={column.links.length >= 10}
                                    onClick={() => updateColumn(i, { links: [...column.links, { label: '', href: '' }] })}>
                                    <Plus className="size-4" /> Add link
                                </Button>
                            </div>
                        </div>
                    ))}

                    <Button type="button" variant="outline" disabled={data.columns.length >= 4}
                        onClick={() => setData('columns', [...data.columns, { title: '', links: [] }])}>
                        <Plus className="size-4" /> Add column ({data.columns.length}/4)
                    </Button>
                </section>

                {/* Bottom bar */}
                <section className="space-y-4 rounded-lg border p-4">
                    <h2 className="font-semibold">Bottom bar</h2>

                    <div className="space-y-1">
                        <Label htmlFor="copyright">Copyright line</Label>
                        <Input id="copyright" value={data.copyright}
                            onChange={(e) => setData('copyright', e.target.value)} />
                        <p className="text-xs text-muted-foreground">
                            Write {'{year}'} and it is replaced with the current year automatically.
                        </p>
                        <p className="text-sm text-red-600">{err.copyright}</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Payment badges</Label>
                        {data.badges.map((badge, i) => (
                            <div key={i} className="flex gap-2">
                                <Input value={badge} placeholder="PayPal" aria-label={`Badge ${i + 1}`}
                                    onChange={(e) => setData('badges', data.badges.map((b, j) => (j === i ? e.target.value : b)))} />
                                <Button type="button" variant="ghost" size="icon" aria-label="Delete badge"
                                    onClick={() => setData('badges', data.badges.filter((_, j) => j !== i))}>
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        ))}
                        <p className="text-sm text-red-600">{err.badges}</p>
                        <Button type="button" variant="outline" size="sm" disabled={data.badges.length >= 8}
                            onClick={() => setData('badges', [...data.badges, ''])}>
                            <Plus className="size-4" /> Add badge
                        </Button>
                    </div>
                </section>

                <div className="flex items-center gap-3">
                    <Button type="submit" disabled={processing}>Save footer</Button>
                    {recentlySuccessful && <span className="text-sm text-muted-foreground">Saved.</span>}
                </div>
            </form>
        </>
    );
}

FooterSettingsPage.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'General', href: '/admin/header' },
        { title: 'Footer', href: '/admin/footer' },
    ],
};
