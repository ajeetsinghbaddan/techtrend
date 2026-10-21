import { useT } from '@/lib/i18n';
import type { ReviewFormInfo } from '@/types/reviews';
import { router, useForm } from '@inertiajs/react';
import { ImagePlus, Star, X } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

type Form = {
    rating: number;
    title: string;
    body: string;
    images: File[];
    remove_image_ids: number[];
};

export default function ReviewForm({ productSlug, info, onDone }: {
    productSlug: string;
    info: ReviewFormInfo;
    onDone: () => void;
}) {
    const t = useT();
    const mine = info.mine;
    const [hover, setHover] = useState(0);

    const { data, setData, post, processing, errors, transform } = useForm<Form>({
        rating: mine?.rating ?? 0,
        title: mine?.title ?? '',
        body: mine?.body ?? '',
        images: [],
        remove_image_ids: [],
    });
    const err = errors as Record<string, string>;

    const keptImages = (mine?.images ?? []).filter((img) => !data.remove_image_ids.includes(img.id));
    const slotsLeft = info.max_images - keptImages.length - data.images.length;

    // Preview URLs for newly chosen photos, released when they change.
    const previews = useMemo(() => data.images.map((file) => URL.createObjectURL(file)), [data.images]);
    useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

    const addFiles = (files: FileList | null) => {
        if (!files) return;
        setData('images', [...data.images, ...Array.from(files)].slice(0, data.images.length + Math.max(0, slotsLeft)));
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        transform((d) => d);
        post(`/products/${productSlug}/reviews`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => onDone(),
        });
    };

    const remove = () => {
        if (confirm(t('Delete your review?'))) {
            router.delete(`/products/${productSlug}/reviews`, { preserveScroll: true, onSuccess: () => onDone() });
        }
    };

    const labels = [t('Terrible'), t('Poor'), t('Okay'), t('Good'), t('Excellent')];
    const shown = hover || data.rating;

    return (
        <form id="write-review" onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold">{mine ? t('Edit your review') : t('Write a review')}</h3>

            {err.review && <p role="alert" className="text-sm text-red-600">{err.review}</p>}

            <fieldset>
                <legend className="text-sm font-medium">{t('Your rating')}</legend>
                <div className="mt-2 flex items-center gap-3">
                    <div className="flex" onMouseLeave={() => setHover(0)}>
                        {[1, 2, 3, 4, 5].map((n) => (
                            <label key={n} className="cursor-pointer p-0.5" onMouseEnter={() => setHover(n)}>
                                <input type="radio" name="rating" value={n} checked={data.rating === n}
                                    onChange={() => setData('rating', n)} className="peer sr-only" />
                                <Star className={`size-8 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-[#5b4f9a] ${
                                    n <= shown ? 'fill-[#5b4f9a] text-[#5b4f9a]' : 'text-slate-300'
                                }`} />
                                <span className="sr-only">{labels[n - 1]}</span>
                            </label>
                        ))}
                    </div>
                    <span className="text-sm text-slate-600">{shown ? labels[shown - 1] : ''}</span>
                </div>
                <p className="mt-1 text-sm text-red-600">{err.rating}</p>
            </fieldset>

            <div>
                <label htmlFor="review-title" className="text-sm font-medium">{t('Title (optional)')}</label>
                <input id="review-title" value={data.title} maxLength={120}
                    onChange={(e) => setData('title', e.target.value)}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-[#5b4f9a]" />
                <p className="mt-1 text-sm text-red-600">{err.title}</p>
            </div>

            <div>
                <label htmlFor="review-body" className="text-sm font-medium">{t('Your review')}</label>
                <textarea id="review-body" rows={5} value={data.body} maxLength={3000}
                    placeholder={t('What did you like or dislike? How do you use it?')}
                    onChange={(e) => setData('body', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#5b4f9a]" />
                <p className="mt-1 flex justify-between text-sm">
                    <span className="text-red-600">{err.body}</span>
                    <span className="text-slate-400">{data.body.length}/3000</span>
                </p>
            </div>

            <div>
                <p className="text-sm font-medium">{t('Photos (optional)')}</p>
                <ul className="mt-2 flex flex-wrap gap-3">
                    {keptImages.map((img) => (
                        <li key={img.id} className="relative">
                            <img src={img.url} alt="" className="size-20 rounded-lg object-cover" />
                            <button type="button" aria-label={t('Remove photo')}
                                onClick={() => setData('remove_image_ids', [...data.remove_image_ids, img.id])}
                                className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-[#1f2230] text-white">
                                <X className="size-3.5" />
                            </button>
                        </li>
                    ))}
                    {previews.map((url, i) => (
                        <li key={url} className="relative">
                            <img src={url} alt="" className="size-20 rounded-lg object-cover" />
                            <button type="button" aria-label={t('Remove photo')}
                                onClick={() => setData('images', data.images.filter((_, j) => j !== i))}
                                className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-[#1f2230] text-white">
                                <X className="size-3.5" />
                            </button>
                        </li>
                    ))}
                    {slotsLeft > 0 && (
                        <li>
                            <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-xs text-slate-500 hover:border-[#5b4f9a]">
                                <ImagePlus className="size-5" />
                                {t('Add')}
                                <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only"
                                    onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
                            </label>
                        </li>
                    )}
                </ul>
                <p className="mt-1 text-xs text-slate-500">
                    {t('Up to :count photos. Location data is removed automatically.', { count: info.max_images })}
                </p>
                <p className="mt-1 text-sm text-red-600">{err.images ?? err['images.0']}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={processing || data.rating === 0}
                    className="h-12 rounded-full bg-[#1f2230] px-7 font-medium text-white hover:bg-black disabled:opacity-50">
                    {processing ? t('Sending…') : mine ? t('Update review') : t('Post review')}
                </button>
                {mine && (
                    <button type="button" onClick={remove} className="text-sm text-slate-500 underline hover:text-red-600">
                        {t('Delete review')}
                    </button>
                )}
            </div>
        </form>
    );
}
