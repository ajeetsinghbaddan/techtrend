import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { HeroSettings } from '@/types/hero';
import { Head, useForm } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, type FormEvent } from 'react';

type SlideForm = {
    id: string;
    eyebrow: string;
    title: string;
    text: string;
    primary_label: string;
    primary_href: string;
    secondary_label: string;
    secondary_href: string;
    image: File | null;
    remove_image: boolean;
    image_url: string | null;
};

type HeroForm = { autoplay: boolean; delay: number; slides: SlideForm[] };

const toForm = (hero: HeroSettings): HeroForm => ({
    autoplay: hero.autoplay,
    delay: hero.delay,
    slides: hero.slides.map((s) => ({
        id: s.id,
        eyebrow: s.eyebrow ?? '',
        title: s.title,
        text: s.text ?? '',
        primary_label: s.primary_label ?? '',
        primary_href: s.primary_href ?? '',
        secondary_label: s.secondary_label ?? '',
        secondary_href: s.secondary_href ?? '',
        image: null,
        remove_image: false,
        image_url: s.image_url,
    })),
});

const emptySlide = (): SlideForm => ({
    id: crypto.randomUUID(),
    eyebrow: '', title: '', text: '',
    primary_label: '', primary_href: '',
    secondary_label: '', secondary_href: '',
    image: null, remove_image: false, image_url: null,
});

function ImagePreview({ slide }: { slide: SlideForm }) {
    const preview = useMemo(() => (slide.image ? URL.createObjectURL(slide.image) : null), [slide.image]);
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    const src = preview ?? (slide.remove_image ? null : slide.image_url);

    return src ? (
        <img src={src} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
    ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-gradient-to-br from-[#5b4f9a] to-[#1f2230] text-xs text-white/80">
            Default background
        </div>
    );
}

export default function HeroSettingsPage({ hero }: { hero: HeroSettings }) {
    const { data, setData, post, transform, processing, errors, recentlySuccessful } =
        useForm<HeroForm>(toForm(hero));
    const err = errors as Record<string, string>;

    const updateSlide = (index: number, patch: Partial<SlideForm>) =>
        setData('slides', data.slides.map((s, i) => (i === index ? { ...s, ...patch } : s)));

    const moveSlide = (from: number, to: number) => {
        const slides = [...data.slides];
        const [moved] = slides.splice(from, 1);
        slides.splice(to, 0, moved);
        setData('slides', slides);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        transform((d) => ({
            ...d,
            _method: 'put',
            slides: d.slides.map(({ image_url, ...rest }) => rest),
        }));
        post('/admin/hero', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: (page) => setData(toForm((page.props as unknown as { hero: HeroSettings }).hero)),
        });
    };

    const field = (i: number, key: keyof SlideForm, label: string, placeholder = '') => (
        <div className="space-y-1">
            <Label htmlFor={`${key}-${i}`}>{label}</Label>
            <Input
                id={`${key}-${i}`}
                placeholder={placeholder}
                value={data.slides[i][key] as string}
                onChange={(e) => updateSlide(i, { [key]: e.target.value })}
            />
            <p className="text-sm text-red-600">{err[`slides.${i}.${key}`]}</p>
        </div>
    );

    return (
        <>
            <Head title="Edit homepage hero" />

            <form onSubmit={submit} className="mx-auto w-full max-w-4xl space-y-8 p-4 sm:p-6">
                <section className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-end">
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={data.autoplay}
                            onChange={(e) => setData('autoplay', e.target.checked)} />
                        Autoplay slides
                    </label>
                    <div className="space-y-1">
                        <Label htmlFor="delay">Seconds per slide</Label>
                        <Input id="delay" type="number" min={2} max={15} className="w-28"
                            value={data.delay / 1000}
                            onChange={(e) => setData('delay', Math.round(Number(e.target.value) * 1000))} />
                        <p className="text-sm text-red-600">{err.delay}</p>
                    </div>
                </section>

                {data.slides.map((slide, i) => (
                    <section key={slide.id} className="space-y-4 rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold">Slide {i + 1}</h2>
                            <div className="flex gap-1">
                                <Button type="button" variant="ghost" size="icon" aria-label="Move up"
                                    disabled={i === 0} onClick={() => moveSlide(i, i - 1)}>
                                    <ArrowUp className="size-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" aria-label="Move down"
                                    disabled={i === data.slides.length - 1} onClick={() => moveSlide(i, i + 1)}>
                                    <ArrowDown className="size-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" aria-label="Delete slide"
                                    disabled={data.slides.length === 1}
                                    onClick={() => setData('slides', data.slides.filter((_, j) => j !== i))}>
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-[1fr_240px]">
                            <div className="space-y-3">
                                {field(i, 'eyebrow', 'Eyebrow', 'Autumn drop 06 — Shipping now')}

                                <div className="space-y-1">
                                    <Label htmlFor={`title-${i}`}>Title (press Enter for a new line)</Label>
                                    <textarea id={`title-${i}`} rows={3}
                                        className="w-full rounded-md border px-3 py-2 text-sm"
                                        value={slide.title}
                                        onChange={(e) => updateSlide(i, { title: e.target.value })} />
                                    <p className="text-sm text-red-600">{err[`slides.${i}.title`]}</p>
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor={`text-${i}`}>Text</Label>
                                    <textarea id={`text-${i}`} rows={3}
                                        className="w-full rounded-md border px-3 py-2 text-sm"
                                        value={slide.text}
                                        onChange={(e) => updateSlide(i, { text: e.target.value })} />
                                    <p className="text-sm text-red-600">{err[`slides.${i}.text`]}</p>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    {field(i, 'primary_label', 'Main button text', 'Shop now')}
                                    {field(i, 'primary_href', 'Main button link', '/keyboards')}
                                    {field(i, 'secondary_label', 'Second button text', 'See the Compile 75')}
                                    {field(i, 'secondary_href', 'Second button link', '/products/compile-75')}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <ImagePreview slide={slide} />
                                <Input type="file" accept="image/png,image/jpeg,image/webp"
                                    onChange={(e) => updateSlide(i, { image: e.target.files?.[0] ?? null, remove_image: false })} />
                                {slide.image_url && (
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={slide.remove_image}
                                            onChange={(e) => updateSlide(i, {
                                                remove_image: e.target.checked,
                                                image: e.target.checked ? null : slide.image,
                                            })} />
                                        Remove image
                                    </label>
                                )}
                                <p className="text-xs text-muted-foreground">PNG, JPG or WebP, up to 2 MB. About 1600×1280px works well.</p>
                                <p className="text-sm text-red-600">{err[`slides.${i}.image`]}</p>
                            </div>
                        </div>
                    </section>
                ))}

                <p className="text-sm text-red-600">{err.slides}</p>

                <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" variant="outline" disabled={data.slides.length >= 6}
                        onClick={() => setData('slides', [...data.slides, emptySlide()])}>
                        <Plus className="size-4" /> Add slide
                    </Button>
                    <Button type="submit" disabled={processing}>Save hero</Button>
                    {recentlySuccessful && <span className="text-sm text-muted-foreground">Saved.</span>}
                </div>
            </form>
        </>
    );
}

HeroSettingsPage.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Homepage', href: '/admin/hero' },
        { title: 'Homepage hero', href: '/admin/hero' },
    ],
};
