import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MarqueeSettings } from '@/types/marquee';
import { Head, useForm } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';

export default function MarqueeSettingsPage({ marquee }: { marquee: MarqueeSettings }) {
    const { data, setData, put, processing, errors, recentlySuccessful } =
        useForm<MarqueeSettings>(marquee);
    const err = errors as Record<string, string>;

    const updateItem = (index: number, value: string) =>
        setData('items', data.items.map((item, i) => (i === index ? value : item)));

    const moveItem = (from: number, to: number) => {
        const items = [...data.items];
        const [moved] = items.splice(from, 1);
        items.splice(to, 0, moved);
        setData('items', items);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put('/admin/marquee', { preserveScroll: true });
    };

    return (
        <>
            <Head title="Edit marquee bar" />

            <form onSubmit={submit} className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
                <p className="text-sm text-muted-foreground">
                    The dark scrolling bar on the homepage. Four or more items look best, so the bar
                    stays filled on wide screens. It pauses when someone hovers over it.
                </p>

                <section className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-end">
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={data.enabled}
                            onChange={(e) => setData('enabled', e.target.checked)} />
                        Show the bar
                    </label>

                    <div className="space-y-1">
                        <Label htmlFor="speed">Seconds per loop</Label>
                        <Input id="speed" type="number" min={10} max={120} className="w-28"
                            value={data.speed}
                            onChange={(e) => setData('speed', Number(e.target.value))} />
                        <p className="text-sm text-red-600">{err.speed}</p>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="direction">Direction</Label>
                        <select id="direction" className="h-9 rounded-md border px-3 text-sm"
                            value={data.direction}
                            onChange={(e) => setData('direction', e.target.value as 'left' | 'right')}>
                            <option value="left">Right to left</option>
                            <option value="right">Left to right</option>
                        </select>
                        <p className="text-sm text-red-600">{err.direction}</p>
                    </div>
                </section>

                {/* Live preview */}
                <div className="overflow-hidden rounded-lg bg-[#1f2230] py-3">
                    <div className="flex">
                        {data.items.slice(0, 6).map((item, i) => (
                            <span key={i} className="px-8 font-mono text-xs tracking-[0.18em] whitespace-nowrap text-white/90 uppercase">
                                {item}
                            </span>
                        ))}
                    </div>
                </div>

                <section className="space-y-3">
                    <h2 className="font-semibold">Items</h2>

                    {data.items.map((item, i) => (
                        <div key={i} className="space-y-1">
                            <div className="flex gap-2">
                                <Input value={item} placeholder="Free shipping over $75"
                                    onChange={(e) => updateItem(i, e.target.value)} />
                                <Button type="button" variant="ghost" size="icon" aria-label="Move up"
                                    disabled={i === 0} onClick={() => moveItem(i, i - 1)}>
                                    <ArrowUp className="size-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" aria-label="Move down"
                                    disabled={i === data.items.length - 1} onClick={() => moveItem(i, i + 1)}>
                                    <ArrowDown className="size-4" />
                                </Button>
                                <Button type="button" variant="outline" size="icon" aria-label="Delete item"
                                    onClick={() => setData('items', data.items.filter((_, j) => j !== i))}>
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                            <p className="text-sm text-red-600">{err[`items.${i}`]}</p>
                        </div>
                    ))}

                    <p className="text-sm text-red-600">{err.items}</p>

                    <Button type="button" variant="outline" disabled={data.items.length >= 20}
                        onClick={() => setData('items', [...data.items, ''])}>
                        <Plus className="size-4" /> Add item
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

MarqueeSettingsPage.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Homepage', href: '/admin/hero' },
        { title: 'Marquee bar', href: '/admin/marquee' },
    ],
};
