import ReviewForm from '@/components/store/review-form';
import Stars from '@/components/store/stars';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useLocale, useT } from '@/lib/i18n';
import type { Paginated } from '@/types/blog';
import type { ReviewFormInfo, ReviewItem, ReviewSummary } from '@/types/reviews';
import { Link, router, usePage } from '@inertiajs/react';
import { BadgeCheck, ThumbsUp } from 'lucide-react';
import { useState } from 'react';

type Props = {
    productSlug: string;
    reviews: Paginated<ReviewItem>;
    summary: ReviewSummary;
    form: ReviewFormInfo;
};

export default function ReviewsSection({ productSlug, reviews, summary, form }: Props) {
    const t = useT();
    const locale = useLocale();
    const { url, props } = usePage<{ flash?: { review_notice?: string } }>();
    const notice = props.flash?.review_notice;

    const params = new URLSearchParams(url.split('?')[1] ?? '');
    const filters = {
        stars: params.get('stars') ?? '',
        photos: params.get('photos') ?? '',
        sort: params.get('sort') ?? 'helpful',
    };

    const [writing, setWriting] = useState(false);
    const [lightbox, setLightbox] = useState<string | null>(null);

    /** Reload only the review list with new filters; the rest of the page stays as it is. */
    const apply = (patch: Partial<typeof filters>) => {
        const next = { ...filters, ...patch };
        const query = Object.fromEntries(Object.entries(next).filter(([, v]) => v && v !== 'helpful'));

        router.get(`/products/${productSlug}`, query, {
            only: ['reviews'],
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const goToPage = (pageUrl: string) =>
        router.get(pageUrl, {}, { only: ['reviews'], preserveState: true, preserveScroll: true });

    const vote = (review: ReviewItem) => {
        if (!form.logged_in) {
            router.visit(form.write_url);
            return;
        }
        router.post(`/reviews/${review.id}/helpful`, {}, { only: ['reviews'], preserveScroll: true });
    };

    const date = (iso: string | null) =>
        iso ? new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

    const pill = (active: boolean) =>
        `rounded-full border px-3 py-1.5 text-sm ${active ? 'border-[#5b4f9a] bg-[#f0eefa] text-[#3f3775]' : 'border-slate-300 hover:bg-white'}`;

    return (
        <section id="reviews" aria-labelledby="reviews-heading" className="mt-16 border-t border-slate-200 pt-12">
            <h2 id="reviews-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('Reviews')}</h2>

            {notice && <p role="status" className="mt-4 rounded-xl bg-[#f0eefa] px-5 py-3 text-sm text-[#3f3775]">{notice}</p>}

            <div className="mt-8 grid gap-10 lg:grid-cols-[320px_1fr]">
                {/* Summary */}
                <aside className="space-y-5">
                    {summary.total > 0 ? (
                        <div>
                            <p className="flex items-baseline gap-2">
                                <span className="font-mono text-5xl">{summary.average?.toFixed(1)}</span>
                                <span className="text-slate-500">/ 5</span>
                            </p>
                            <Stars rating={summary.average ?? 0} className="size-5" />
                            <p className="mt-1 text-sm text-slate-500">
                                {summary.total === 1 ? t('Based on 1 review') : t('Based on :count reviews', { count: summary.total })}
                            </p>
                        </div>
                    ) : (
                        <p className="text-slate-600">{t('No reviews yet. Be the first to share what you think.')}</p>
                    )}

                    {summary.total > 0 && (
                        <ul className="space-y-1.5">
                            {summary.distribution.map(({ stars, count }) => {
                                const percent = summary.total ? Math.round((count / summary.total) * 100) : 0;
                                const active = filters.stars === String(stars);

                                return (
                                    <li key={stars}>
                                        <button type="button" disabled={count === 0}
                                            onClick={() => apply({ stars: active ? '' : String(stars) })}
                                            aria-pressed={active}
                                            aria-label={t(':stars stars: :count reviews', { stars, count })}
                                            className={`flex w-full items-center gap-3 rounded-md px-1 py-0.5 text-sm disabled:opacity-40 ${active ? 'bg-[#f0eefa]' : 'hover:bg-white'}`}>
                                            <span className="w-8 font-mono">{stars}★</span>
                                            <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                                                <span className="block h-full rounded-full bg-[#5b4f9a]" style={{ width: `${percent}%` }} />
                                            </span>
                                            <span className="w-8 text-right font-mono text-slate-500">{count}</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    {/* Write a review */}
                    {form.mine && form.mine.status !== 'approved' && !writing && (
                        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            {form.mine.status === 'pending'
                                ? t('Your review is waiting to be checked.')
                                : t('Your review was not published.')}
                        </p>
                    )}

                    {!form.logged_in ? (
                        <Link href={form.write_url}
                            className="flex h-12 items-center justify-center rounded-full bg-[#1f2230] font-medium text-white hover:bg-black">
                            {t('Log in to write a review')}
                        </Link>
                    ) : form.can_review ? (
                        !writing && (
                            <button type="button" onClick={() => setWriting(true)}
                                className="h-12 w-full rounded-full bg-[#1f2230] font-medium text-white hover:bg-black">
                                {form.mine ? t('Edit your review') : t('Write a review')}
                            </button>
                        )
                    ) : (
                        <p className="text-sm text-slate-500">{t('Only customers who bought this product can review it.')}</p>
                    )}
                </aside>

                {/* List */}
                <div className="min-w-0 space-y-6">
                    {(writing || (typeof window !== 'undefined' && window.location.hash === '#write-review' && form.can_review)) && (
                        <ReviewForm productSlug={productSlug} info={form} onDone={() => setWriting(false)} />
                    )}

                    {summary.total > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => apply({ stars: '', photos: '' })}
                                    className={pill(!filters.stars && !filters.photos)}>{t('All')}</button>
                                {summary.with_photos > 0 && (
                                    <button type="button" onClick={() => apply({ photos: filters.photos ? '' : '1' })}
                                        aria-pressed={Boolean(filters.photos)} className={pill(Boolean(filters.photos))}>
                                        {t('With photos (:count)', { count: summary.with_photos })}
                                    </button>
                                )}
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                                <span className="text-slate-500">{t('Sort by')}</span>
                                <select value={filters.sort} onChange={(e) => apply({ sort: e.target.value })}
                                    className="h-10 rounded-full border border-slate-300 bg-white px-3 text-sm">
                                    <option value="helpful">{t('Most helpful')}</option>
                                    <option value="newest">{t('Newest')}</option>
                                    <option value="highest">{t('Highest rated')}</option>
                                    <option value="lowest">{t('Lowest rated')}</option>
                                </select>
                            </label>
                        </div>
                    )}

                    {summary.total > 0 && reviews.data.length === 0 && (
                        <p className="text-slate-500">{t('No reviews match this filter.')}</p>
                    )}

                    <ul className="divide-y divide-slate-200">
                        {reviews.data.map((review) => (
                            <li key={review.id} className="py-6 first:pt-0">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <Stars rating={review.rating} />
                                    <span className="sr-only">{t(':rating out of 5 stars', { rating: review.rating })}</span>
                                    {review.title && <h3 className="font-semibold">{review.title}</h3>}
                                </div>

                                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
                                    <span className="font-medium text-slate-700">{review.author}</span>
                                    {review.is_verified && (
                                        <span className="inline-flex items-center gap-1 text-[#3f7d5b]">
                                            <BadgeCheck className="size-4" aria-hidden /> {t('Verified purchase')}
                                        </span>
                                    )}
                                    <span>· {date(review.created_at)}</span>
                                    {review.locale && review.locale !== locale && (
                                        <span className="rounded bg-slate-100 px-1.5 font-mono text-xs uppercase">{review.locale}</span>
                                    )}
                                </p>

                                <p className="mt-3 leading-relaxed whitespace-pre-line text-slate-700">{review.body}</p>

                                {review.images.length > 0 && (
                                    <ul className="mt-3 flex flex-wrap gap-2">
                                        {review.images.map((img) => (
                                            <li key={img.id}>
                                                <button type="button" onClick={() => setLightbox(img.url)}
                                                    aria-label={t('Enlarge photo')} className="block overflow-hidden rounded-lg">
                                                    <img src={img.url} alt="" loading="lazy" className="size-20 object-cover transition-transform hover:scale-105" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {review.reply && (
                                    <div className="mt-4 rounded-xl border-l-4 border-[#5b4f9a] bg-slate-50 px-4 py-3">
                                        <p className="text-xs font-medium text-[#5b4f9a]">{t('Reply from Tech Trend')}</p>
                                        <p className="mt-1 text-sm whitespace-pre-line text-slate-700">{review.reply.body}</p>
                                    </div>
                                )}

                                <button type="button" onClick={() => vote(review)} aria-pressed={review.voted}
                                    className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
                                        review.voted ? 'border-[#5b4f9a] bg-[#f0eefa] text-[#3f3775]' : 'border-slate-300 text-slate-600 hover:bg-white'
                                    }`}>
                                    <ThumbsUp className="size-3.5" aria-hidden />
                                    {t('Helpful')}{review.helpful_count > 0 && ` (${review.helpful_count})`}
                                </button>
                            </li>
                        ))}
                    </ul>

                    {reviews.last_page > 1 && (
                        <nav aria-label={t('Review pages')} className="flex justify-between">
                            {reviews.links[0]?.url ? (
                                <button type="button" onClick={() => goToPage(reviews.links[0].url!)} className={pill(false)}>
                                    ← {t('Previous')}
                                </button>
                            ) : <span />}
                            <span className="text-sm text-slate-500">
                                {t('Page :page of :pages', { page: reviews.current_page, pages: reviews.last_page })}
                            </span>
                            {reviews.links[reviews.links.length - 1]?.url ? (
                                <button type="button" onClick={() => goToPage(reviews.links[reviews.links.length - 1].url!)} className={pill(false)}>
                                    {t('Next')} →
                                </button>
                            ) : <span />}
                        </nav>
                    )}
                </div>
            </div>

            <Dialog open={lightbox !== null} onOpenChange={(open) => !open && setLightbox(null)}>
                <DialogContent className="max-w-3xl p-2">
                    <DialogTitle className="sr-only">{t('Customer photo')}</DialogTitle>
                    {lightbox && <img src={lightbox} alt="" className="max-h-[80vh] w-full rounded-lg object-contain" />}
                </DialogContent>
            </Dialog>
        </section>
    );
}
