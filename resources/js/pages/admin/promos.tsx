import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BoxPosition, PromoSettings } from '@/types/promos';
import { Head, useForm } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, type FormEvent } from 'react';

type GroupMeta = { title: string; min: number; max: number };

type CardForm = {
    id: string;
    title: string;
    text: string;
    label: string;
    href: string;
    box_position: BoxPosition;
    image: File | null;
    remove_image: boolean;
    image_url: string | null;
};

const positions: { value: BoxPosition; label: string }[] = [
    { value: 'top-left', label: 'Top left' },
    { value: 'top-right', label: 'Top right' },
    { value: 'bottom-left', label: 'Bottom left' },
    { value: 'bottom-right', label: 'Bottom right' },
];

const toForm = (promos: PromoSettings) => ({
    cards: promos.cards.map((c) => ({
        id: c.id,
        title: c.title,
        text: c.text ?? '',
        label: c.label ?? '',
        href: c.href ?? '',
        box_position: c.box_position,
        image: null,
        remove_image: false,
        image_url: c.image_url,
    })),
});

const emptyCard = (position: BoxPosition): CardForm => ({
    id: crypto.randomUUID(),
    title: '', text: '', label: '', href: '',
    box_position: position,
    image: null, remove_image: false, image_url: null,
});

function ImagePreview({ card }: { card: CardForm }) {
    const preview = useMemo(() => (card.image ? URL.createObjectURL(card.image) : null), [card.image]);
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    const src = preview ?? (card.remove_image ? null : card.image_url);

    return src ? (
        <img src={src} alt="" className="aspect-[16/9] w-full rounded-lg object-cover" />
    ) : (
        <div className="flex aspect-[16/9] w-full items-center justify-center rounded-lg bg-gradient-to-br from-[#5b4f9a] to-[#1f2230] text-xs text-white/80">
            Default background
        </div>
    );
}

export default function PromosSettingsPage({ promos, group, meta }: {
    promos: PromoSettings;
    group: string;
    meta: GroupMeta;
}) {
    const { data, setData, post, transform, processing, errors, recentlySuccessful } =
        useForm<{ cards: CardForm[] }>(toForm(promos));
    const err = errors as Record<string, string>;

    const isBento = group === 'promos';

    const updateCard = (index: number, patch: Partial<CardForm>) =>
        setData('cards', data.cards.map((c, i) => (i === index ? { ...c, ...patch } : c)));

    const moveCard = (from: number, to: number) => {
        const cards = [...data.cards];
        const [moved] = cards.splice(from, 1);
        cards.splice(to, 0, moved);
        setData('cards', cards);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        transform((d) => ({
            ...d,
            _method: 'put',
            cards: d.cards.map(({ image_url, ...rest }) => rest),
        }));
        post(`/admin/cards/${group}`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: (page) => setData(toForm((page.props as unknown as { promos: PromoSettings }).promos)),
        });
    };

    return (
        <>
            <Head title={`Edit ${meta.title.toLowerCase()}`} />

            <form onSubmit={submit} className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
                <p className="text-sm text-muted-foreground">
                    {isBento
                        ? 'The image cards under the feature strip. With three cards, the first one is shown tall on the left.'
                        : 'The row of image cards under the scrolling bar. They are shown as equal columns.'}
                    {' '}Use {meta.min} to {meta.max} cards.
                </p>

                {data.cards.map((card, i) => (
                    <section key={card.id} className="space-y-4 rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold">
                                Card {i + 1}
                                {isBento && data.cards.length === 3 && i === 0 && (
                                    <span className="ml-2 text-xs font-normal text-muted-foreground">tall card</span>
                                )}
                            </h2>
                            <div className="flex gap-1">
                                <Button type="button" variant="ghost" size="icon" aria-label="Move up"
                                    disabled={i === 0} onClick={() => moveCard(i, i - 1)}>
                                    <ArrowUp className="size-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" aria-label="Move down"
                                    disabled={i === data.cards.length - 1} onClick={() => moveCard(i, i + 1)}>
                                    <ArrowDown className="size-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" aria-label="Delete card"
                                    disabled={data.cards.length <= meta.min}
                                    onClick={() => setData('cards', data.cards.filter((_, j) => j !== i))}>
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-[1fr_260px]">
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label htmlFor={`title-${i}`}>Title</Label>
                                    <Input id={`title-${i}`} value={card.title}
                                        placeholder={isBento ? 'Last-call runs' : 'Run 06 in Indigo'}
                                        onChange={(e) => updateCard(i, { title: e.target.value })} />
                                    <p className="text-sm text-red-600">{err[`cards.${i}.title`]}</p>
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor={`text-${i}`}>Text</Label>
                                    <textarea id={`text-${i}`} rows={2}
                                        className="w-full rounded-md border px-3 py-2 text-sm"
                                        value={card.text}
                                        onChange={(e) => updateCard(i, { text: e.target.value })} />
                                    <p className="text-sm text-red-600">{err[`cards.${i}.text`]}</p>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-1">
                                        <Label htmlFor={`label-${i}`}>Button text</Label>
                                        <Input id={`label-${i}`} value={card.label}
                                            placeholder={isBento ? 'Shop now' : 'Explore now'}
                                            onChange={(e) => updateCard(i, { label: e.target.value })} />
                                        <p className="text-sm text-red-600">{err[`cards.${i}.label`]}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor={`href-${i}`}>Button link</Label>
                                        <Input id={`href-${i}`} value={card.href} placeholder="/last-call"
                                            onChange={(e) => updateCard(i, { href: e.target.value })} />
                                        <p className="text-sm text-red-600">{err[`cards.${i}.href`]}</p>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor={`pos-${i}`}>Text box position</Label>
                                    <select id={`pos-${i}`}
                                        className="h-9 w-full rounded-md border px-3 text-sm"
                                        value={card.box_position}
                                        onChange={(e) => updateCard(i, { box_position: e.target.value as BoxPosition })}>
                                        {positions.map((p) => (
                                            <option key={p.value} value={p.value}>{p.label}</option>
                                        ))}
                                    </select>
                                    <p className="text-sm text-red-600">{err[`cards.${i}.box_position`]}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <ImagePreview card={card} />
                                <Input type="file" accept="image/png,image/jpeg,image/webp"
                                    onChange={(e) => updateCard(i, { image: e.target.files?.[0] ?? null, remove_image: false })} />
                                {card.image_url && (
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={card.remove_image}
                                            onChange={(e) => updateCard(i, {
                                                remove_image: e.target.checked,
                                                image: e.target.checked ? null : card.image,
                                            })} />
                                        Remove image
                                    </label>
                                )}
                                <p className="text-xs text-muted-foreground">PNG, JPG or WebP, up to 2 MB.</p>
                                <p className="text-sm text-red-600">{err[`cards.${i}.image`]}</p>
                            </div>
                        </div>
                    </section>
                ))}

                <p className="text-sm text-red-600">{err.cards}</p>

                <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" variant="outline" disabled={data.cards.length >= meta.max}
                        onClick={() => setData('cards', [...data.cards, emptyCard(isBento ? 'top-left' : 'bottom-left')])}>
                        <Plus className="size-4" /> Add card
                    </Button>
                    <Button type="submit" disabled={processing}>Save</Button>
                    {recentlySuccessful && <span className="text-sm text-muted-foreground">Saved.</span>}
                </div>
            </form>
        </>
    );
}

PromosSettingsPage.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Homepage', href: '/admin/hero' },
        { title: 'Cards', href: '/admin/hero' },
    ],
};
