import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FeatureSettings } from '@/types/features';
import { Head, useForm } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';

type ItemForm = { title: string; text: string; href: string };

export default function FeaturesSettingsPage({ features }: { features: FeatureSettings }) {
    const { data, setData, put, processing, errors, recentlySuccessful } = useForm<{ items: ItemForm[] }>({
        items: features.items.map((item) => ({
            title: item.title,
            text: item.text ?? '',
            href: item.href ?? '',
        })),
    });
    const err = errors as Record<string, string>;

    const updateItem = (index: number, patch: Partial<ItemForm>) =>
        setData('items', data.items.map((item, i) => (i === index ? { ...item, ...patch } : item)));

    const moveItem = (from: number, to: number) => {
        const items = [...data.items];
        const [moved] = items.splice(from, 1);
        items.splice(to, 0, moved);
        setData('items', items);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put('/admin/features', { preserveScroll: true });
    };

    return (
        <>
            <Head title="Edit feature strip" />

            <form onSubmit={submit} className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
                <p className="text-sm text-muted-foreground">
                    The row of boxes under the homepage hero. Use 2 to 4 boxes. Leave the link empty for plain text.
                </p>

                {data.items.map((item, i) => (
                    <section key={i} className="space-y-3 rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold">Box {i + 1}</h2>
                            <div className="flex gap-1">
                                <Button type="button" variant="ghost" size="icon" aria-label="Move up"
                                    disabled={i === 0} onClick={() => moveItem(i, i - 1)}>
                                    <ArrowUp className="size-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" aria-label="Move down"
                                    disabled={i === data.items.length - 1} onClick={() => moveItem(i, i + 1)}>
                                    <ArrowDown className="size-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" aria-label="Delete box"
                                    disabled={data.items.length <= 2}
                                    onClick={() => setData('items', data.items.filter((_, j) => j !== i))}>
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor={`title-${i}`}>Title</Label>
                            <Input id={`title-${i}`} value={item.title} placeholder="Returns"
                                onChange={(e) => updateItem(i, { title: e.target.value })} />
                            <p className="text-sm text-red-600">{err[`items.${i}.title`]}</p>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor={`text-${i}`}>Text</Label>
                            <Input id={`text-${i}`} value={item.text} placeholder="30-day returns, prepaid label."
                                onChange={(e) => updateItem(i, { text: e.target.value })} />
                            <p className="text-sm text-red-600">{err[`items.${i}.text`]}</p>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor={`href-${i}`}>Link (optional)</Label>
                            <Input id={`href-${i}`} value={item.href} placeholder="/returns"
                                onChange={(e) => updateItem(i, { href: e.target.value })} />
                            <p className="text-sm text-red-600">{err[`items.${i}.href`]}</p>
                        </div>
                    </section>
                ))}

                <p className="text-sm text-red-600">{err.items}</p>

                <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" variant="outline" disabled={data.items.length >= 4}
                        onClick={() => setData('items', [...data.items, { title: '', text: '', href: '' }])}>
                        <Plus className="size-4" /> Add box
                    </Button>
                    <Button type="submit" disabled={processing}>Save</Button>
                    {recentlySuccessful && <span className="text-sm text-muted-foreground">Saved.</span>}
                </div>
            </form>
        </>
    );
}

FeaturesSettingsPage.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Homepage', href: '/admin/hero' },
        { title: 'Feature strip', href: '/admin/features' },
    ],
};
