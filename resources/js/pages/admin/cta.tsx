import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CtaSettings } from '@/types/cta';
import { Head, useForm } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';

type CtaForm = {
    enabled: boolean;
    eyebrow: string;
    title: string;
    text: string;
    label: string;
    href: string;
    stats: { value: string; label: string }[];
};

export default function CtaSettingsPage({ cta }: { cta: CtaSettings }) {
    const { data, setData, put, processing, errors, recentlySuccessful } = useForm<CtaForm>({
        enabled: cta.enabled,
        eyebrow: cta.eyebrow ?? '',
        title: cta.title,
        text: cta.text ?? '',
        label: cta.label ?? '',
        href: cta.href ?? '',
        stats: cta.stats.map((s) => ({ value: s.value, label: s.label })),
    });
    const err = errors as Record<string, string>;

    const updateStat = (index: number, patch: Partial<{ value: string; label: string }>) =>
        setData('stats', data.stats.map((s, i) => (i === index ? { ...s, ...patch } : s)));

    const moveStat = (from: number, to: number) => {
        const stats = [...data.stats];
        const [moved] = stats.splice(from, 1);
        stats.splice(to, 0, moved);
        setData('stats', stats);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put('/admin/cta', { preserveScroll: true });
    };

    return (
        <>
            <Head title="Edit call-to-action panel" />

            <form onSubmit={submit} className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
                <p className="text-sm text-muted-foreground">
                    The dark panel near the bottom of the homepage. Stats look best in pairs — two, four or six.
                </p>

                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={data.enabled}
                        onChange={(e) => setData('enabled', e.target.checked)} />
                    Show this section
                </label>

                <section className="space-y-3 rounded-lg border p-4">
                    <div className="space-y-1">
                        <Label htmlFor="eyebrow">Eyebrow</Label>
                        <Input id="eyebrow" value={data.eyebrow} placeholder="Run 07 — Opens 3 October"
                            onChange={(e) => setData('eyebrow', e.target.value)} />
                        <p className="text-sm text-red-600">{err.eyebrow}</p>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="title">Title (press Enter for a new line)</Label>
                        <textarea id="title" rows={2} className="w-full rounded-md border px-3 py-2 text-sm"
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)} />
                        <p className="text-sm text-red-600">{err.title}</p>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="text">Text</Label>
                        <textarea id="text" rows={3} className="w-full rounded-md border px-3 py-2 text-sm"
                            value={data.text}
                            onChange={(e) => setData('text', e.target.value)} />
                        <p className="text-sm text-red-600">{err.text}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                            <Label htmlFor="label">Button text</Label>
                            <Input id="label" value={data.label} placeholder="Join the list"
                                onChange={(e) => setData('label', e.target.value)} />
                            <p className="text-sm text-red-600">{err.label}</p>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="href">Button link</Label>
                            <Input id="href" value={data.href} placeholder="/reserve"
                                onChange={(e) => setData('href', e.target.value)} />
                            <p className="text-sm text-red-600">{err.href}</p>
                        </div>
                    </div>
                </section>

                <section className="space-y-3">
                    <h2 className="font-semibold">Stats</h2>

                    {data.stats.map((stat, i) => (
                        <div key={i} className="space-y-1">
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Input className="sm:w-32" value={stat.value} placeholder="18,400"
                                    aria-label={`Stat ${i + 1} number`}
                                    onChange={(e) => updateStat(i, { value: e.target.value })} />
                                <Input value={stat.label} placeholder="desks running our caps"
                                    aria-label={`Stat ${i + 1} label`}
                                    onChange={(e) => updateStat(i, { label: e.target.value })} />
                                <div className="flex gap-1">
                                    <Button type="button" variant="ghost" size="icon" aria-label="Move up"
                                        disabled={i === 0} onClick={() => moveStat(i, i - 1)}>
                                        <ArrowUp className="size-4" />
                                    </Button>
                                    <Button type="button" variant="ghost" size="icon" aria-label="Move down"
                                        disabled={i === data.stats.length - 1} onClick={() => moveStat(i, i + 1)}>
                                        <ArrowDown className="size-4" />
                                    </Button>
                                    <Button type="button" variant="outline" size="icon" aria-label="Delete stat"
                                        onClick={() => setData('stats', data.stats.filter((_, j) => j !== i))}>
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </div>
                            <p className="text-sm text-red-600">
                                {err[`stats.${i}.value`] ?? err[`stats.${i}.label`]}
                            </p>
                        </div>
                    ))}

                    <p className="text-sm text-red-600">{err.stats}</p>

                    <Button type="button" variant="outline" disabled={data.stats.length >= 6}
                        onClick={() => setData('stats', [...data.stats, { value: '', label: '' }])}>
                        <Plus className="size-4" /> Add stat ({data.stats.length}/6)
                    </Button>
                </section>

                <div className="flex items-center gap-3">
                    <Button type="submit" disabled={processing}>Save</Button>
                    {recentlySuccessful && <span className="text-sm text-muted-foreground">Saved.</span>}
                </div>
            </form>
        </>
    );
}

CtaSettingsPage.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Homepage', href: '/admin/hero' },
        { title: 'CTA panel', href: '/admin/cta' },
    ],
};
