import ProductCard from '@/components/store/product-card';
import ReviewsSection from '@/components/store/reviews-section';
import Stars from '@/components/store/stars';
import WishlistButton from '@/components/store/wishlist-button';
import StoreLayout from '@/layouts/store-layout';
import { major, trackItem } from '@/lib/ecommerce';
import { useT } from '@/lib/i18n';
import type { Paginated } from '@/types/blog';
import type { MoneyValue, ProductCardData } from '@/types/catalog-public';
import type { ReviewFormInfo, ReviewItem, ReviewSummary } from '@/types/reviews';
import { Link, router, usePage } from '@inertiajs/react';
import { Minus, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Variant = {
    id: number;
    colour_name: string | null;
    colour_hex: string | null;
    option_name: string | null;
    stock: number;
    price: MoneyValue | null;
    compare_at: MoneyValue | null;
    percent_off: number | null;
};

type ProductData = {
    name: string;
    slug: string;
    subtitle: string | null;
    description: string | null;
    specs: { label: string; value: string }[] | null;
    compliance: { label: string; value: string }[] | null;
    run_label: string | null;
    units_total: number | null;
    units_left: number;
    in_stock: boolean;
    badge: string | null;
    rating: number | null;
    reviews_count: number;
    price: MoneyValue | null;
    compare_at: MoneyValue | null;
    percent_off: number | null;
    lowest_30_days: MoneyValue | null;
    tax_note: string | null;
    meta_title: string | null;
    meta_description: string | null;
    images: { url: string; alt: string; colour_name: string | null }[];
    variants: Variant[];
    collection: { name: string; slug: string } | null;
};

type Props = {
    product: ProductData;
    related: ProductCardData[];
    reviews: Paginated<ReviewItem>;
    reviewSummary: ReviewSummary;
    reviewForm: ReviewFormInfo;
};

type SharedProps = {
    region: string;
    regions: Record<string, { currency: string }>;
    flash?: { cart_notice?: string };
};

const variantLabel = (v: Variant | null) =>
    v ? [v.colour_name, v.option_name].filter(Boolean).join(' / ') || undefined : undefined;

export default function ProductPage({ product, related, reviews, reviewSummary, reviewForm }: Props) {
    const t = useT();

    const { region, regions, flash } = usePage<SharedProps>().props;
    const currency = regions[region]?.currency ?? 'USD';
    const notice = flash?.cart_notice;

    const colours = useMemo(() => {
        const seen = new Map<string, string | null>();
        product.variants.forEach((v) => {
            if (v.colour_name && !seen.has(v.colour_name)) seen.set(v.colour_name, v.colour_hex);
        });
        return [...seen].map(([name, hex]) => ({ name, hex }));
    }, [product.variants]);

    const [colour, setColour] = useState<string | null>(colours[0]?.name ?? null);

    const options = useMemo(
        () => product.variants
            .filter((v) => !colour || v.colour_name === colour)
            .filter((v) => v.option_name)
            .map((v) => v.option_name as string),
        [product.variants, colour],
    );

    const [option, setOption] = useState<string | null>(options[0] ?? null);
    const [quantity, setQuantity] = useState(1);
    const [imageIndex, setImageIndex] = useState(0);
    const [adding, setAdding] = useState(false);

    const variant = useMemo(
        () => product.variants.find((v) =>
            (colour === null || v.colour_name === colour) &&
            (option === null || v.option_name === option)) ?? null,
        [product.variants, colour, option],
    );

    // Analytics: one "view item" per product, including when moving to a related product.
    useEffect(() => {
        trackItem('view_item', currency, {
            item_id: product.slug,
            item_name: product.name,
            price: product.price ? major(product.price.minor) : undefined,
            item_category: product.collection?.name,
        });
    }, [product.slug]); // eslint-disable-line react-hooks/exhaustive-deps

    // A related product opens on the same page component: start it fresh.
    useEffect(() => {
        setImageIndex(0);
        setQuantity(1);
    }, [product.slug]);

    const pickColour = (name: string) => {
        setColour(name);

        const stillValid = product.variants.some((v) => v.colour_name === name && v.option_name === option);
        if (!stillValid) {
            const firstForColour = product.variants.find((v) => v.colour_name === name);
            setOption(firstForColour?.option_name ?? null);
        }

        const match = product.images.findIndex((img) => img.colour_name === name);
        if (match >= 0) setImageIndex(match);
    };

    const max = Math.min(variant?.stock ?? 0, 10);
    const canBuy = Boolean(variant && variant.stock > 0);

    // What the buy box shows follows the selected variant.
    const shownPrice = variant?.price ?? product.price;
    const shownCompare = variant ? variant.compare_at : product.compare_at;
    const shownPercentOff = variant ? variant.percent_off : product.percent_off;

    const addToBag = () => {
        if (!variant) return;

        setAdding(true);
        router.post('/bag',
            { variant_id: variant.id, quantity },
            {
                preserveScroll: true,
                onSuccess: () => trackItem('add_to_cart', currency, {
                    item_id: product.slug,
                    item_name: product.name,
                    item_variant: variantLabel(variant),
                    item_category: product.collection?.name,
                    price: shownPrice ? major(shownPrice.minor) : undefined,
                    quantity,
                }),
                onFinish: () => setAdding(false),
            });
    };

    const mainImage = product.images[imageIndex];

    return (
        <StoreLayout>
            <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-10">
                <nav aria-label={t('Breadcrumb')} className="font-mono text-xs tracking-[0.15em] uppercase text-slate-500">
                    <Link href="/" className="hover:text-slate-900">{t('Home')}</Link>
                    {product.collection && (
                        <>
                            <span className="text-slate-300"> / </span>
                            <Link href={`/collections/${product.collection.slug}`} className="hover:text-slate-900">
                                {product.collection.name}
                            </Link>
                        </>
                    )}
                    <span className="text-slate-300"> / </span>
                    <span className="text-slate-900" aria-current="page">{product.name}</span>
                </nav>

                <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
                    {/* Gallery */}
                    <div>
                        <div className="relative overflow-hidden rounded-2xl bg-slate-100">
                            {mainImage ? (
                                <img src={mainImage.url} alt={mainImage.alt || product.name}
                                    width={1000} height={1000}
                                    fetchPriority={imageIndex === 0 ? 'high' : 'auto'}
                                    decoding="async"
                                    className="aspect-square w-full object-cover" />
                            ) : (
                                <div className="aspect-square w-full bg-gradient-to-br from-[#5b4f9a] to-[#1f2230]" aria-hidden />
                            )}
                            {shownPercentOff !== null && (
                                <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 font-mono text-xs">
                                    −{shownPercentOff}%
                                </span>
                            )}
                        </div>

                        {product.images.length > 1 && (
                            <ul className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
                                {product.images.map((image, i) => (
                                    <li key={image.url}>
                                        <button type="button" onClick={() => setImageIndex(i)}
                                            aria-label={t('View image :number', { number: i + 1 })} aria-pressed={i === imageIndex}
                                            className={`block w-full overflow-hidden rounded-lg border-2 ${
                                                i === imageIndex ? 'border-[#5b4f9a]' : 'border-transparent'
                                            }`}>
                                            <img src={image.url} alt="" width={160} height={160}
                                                loading="lazy" decoding="async"
                                                className="aspect-square w-full object-cover" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Buy box */}
                    <div>
                        {product.run_label && product.units_total && (
                            <p className="font-mono text-xs tracking-[0.15em] uppercase text-[#5b4f9a]">
                                {product.run_label} — {t(':left of :total left', { left: product.units_left, total: product.units_total })}
                            </p>
                        )}

                        <h1 className="mt-3 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
                            {product.name}
                        </h1>
                        {product.subtitle && <p className="mt-2 text-lg text-slate-600">{product.subtitle}</p>}

                        {product.rating !== null && product.reviews_count > 0 && (
                            <a href="#reviews" className="mt-4 inline-flex items-center gap-2 text-sm hover:underline">
                                <Stars rating={product.rating} />
                                <span className="sr-only">{t(':rating out of 5 stars', { rating: product.rating.toFixed(1) })}</span>
                                <span aria-hidden>{product.rating.toFixed(1)}</span>
                                <span className="text-slate-400">
                                    — {product.reviews_count === 1
                                        ? t('1 review')
                                        : t(':count reviews', { count: product.reviews_count })}
                                </span>
                            </a>
                        )}

                        <div className="mt-6">
                            <p className="flex flex-wrap items-baseline gap-3">
                                <span className="font-mono text-3xl text-[#1f2230]">
                                    {shownPrice?.formatted}
                                </span>
                                {shownCompare && (
                                    <span className="font-mono text-lg text-slate-400 line-through">
                                        <span className="sr-only">{t('Was')} </span>
                                        {shownCompare.formatted}
                                    </span>
                                )}
                            </p>
                            {product.tax_note && <p className="mt-1 text-sm text-slate-500">{product.tax_note}</p>}
                            {product.lowest_30_days && (
                                <p className="mt-1 text-xs text-slate-500">
                                    {t('Lowest price in the last 30 days: :price', { price: product.lowest_30_days.formatted })}
                                </p>
                            )}
                        </div>

                        {colours.length > 0 && (
                            <fieldset className="mt-8">
                                <legend className="font-mono text-xs tracking-[0.15em] uppercase text-slate-500">
                                    {t('Colour')} — {colour}
                                </legend>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {colours.map((c) => (
                                        <button key={c.name} type="button" onClick={() => pickColour(c.name)}
                                            aria-pressed={colour === c.name} title={c.name}
                                            className={`size-11 rounded-lg border-2 ${
                                                colour === c.name ? 'border-[#5b4f9a]' : 'border-transparent'
                                            }`}>
                                            <span className="block size-full rounded-md border border-black/10"
                                                style={{ background: c.hex ?? '#ddd' }} />
                                            <span className="sr-only">{c.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </fieldset>
                        )}

                        {options.length > 0 && (
                            <div className="mt-6">
                                <label htmlFor="option" className="font-mono text-xs tracking-[0.15em] uppercase text-slate-500">
                                    {t('Option')}
                                </label>
                                <select id="option" value={option ?? ''} onChange={(e) => setOption(e.target.value)}
                                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4">
                                    {options.map((o) => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                        )}

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            <div className="flex h-14 w-32 items-center justify-between rounded-full border border-slate-200 bg-white px-2">
                                <button type="button" aria-label={t('Decrease quantity')} disabled={quantity <= 1}
                                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                    className="flex size-10 items-center justify-center rounded-full hover:bg-slate-100 disabled:opacity-30">
                                    <Minus className="size-4" />
                                </button>
                                <span aria-live="polite" className="font-mono">{quantity}</span>
                                <button type="button" aria-label={t('Increase quantity')} disabled={quantity >= max}
                                    onClick={() => setQuantity((q) => Math.min(max, q + 1))}
                                    className="flex size-10 items-center justify-center rounded-full hover:bg-slate-100 disabled:opacity-30">
                                    <Plus className="size-4" />
                                </button>
                            </div>

                            <button type="button" disabled={!canBuy || adding} onClick={addToBag}
                                className="h-14 flex-1 rounded-full bg-[#1f2230] px-8 py-4 font-medium text-white hover:bg-black disabled:bg-slate-300">
                                {!canBuy
                                    ? t('Sold out')
                                    : adding
                                        ? t('Adding…')
                                        : t('Add to bag — :price', { price: shownPrice?.formatted ?? '' })}
                            </button>
                            <WishlistButton slug={product.slug} name={product.name} variant="full" />
                        </div>

                        {notice && (
                            <p role="status" className="mt-3 text-sm text-amber-700">{notice}</p>
                        )}

                        {variant && variant.stock > 0 && variant.stock <= 5 && (
                            <p className="mt-3 text-sm text-amber-700">
                                {t('Only :count left of this option.', { count: variant.stock })}
                            </p>
                        )}

                        {product.description && (
                            <div className="prose prose-slate mt-10 max-w-none"
                                dangerouslySetInnerHTML={{ __html: product.description }} />
                        )}

                        {product.specs && product.specs.length > 0 && (
                            <dl className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
                                {product.specs.map((spec, i) => (
                                    <div key={i} className="flex justify-between gap-6 py-3 text-sm">
                                        <dt className="text-slate-500">{spec.label}</dt>
                                        <dd className="text-right text-slate-900">{spec.value}</dd>
                                    </div>
                                ))}
                            </dl>
                        )}

                        {product.compliance && product.compliance.length > 0 && (
                            <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
                                <h2 className="font-mono text-xs tracking-[0.15em] uppercase text-slate-500">
                                    {t('Product safety & consumer rights')}
                                </h2>
                                <dl className="mt-4 space-y-3">
                                    {product.compliance.map((row, i) => (
                                        <div key={i} className="grid gap-1 sm:grid-cols-[160px_1fr] sm:gap-4">
                                            <dt className="text-sm text-slate-500">{row.label}</dt>
                                            <dd className="text-sm text-slate-800">{row.value}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </section>
                        )}
                    </div>
                </div>

                {reviews && reviewSummary && reviewForm && (
                    <ReviewsSection
                        productSlug={product.slug}
                        reviews={reviews}
                        summary={reviewSummary}
                        form={reviewForm}
                    />
                )}

                {related.length > 0 && (
                    <section className="mt-16 border-t border-slate-200 pt-12">
                        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('Pairs well with')}</h2>
                        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            {related.map((p) => <ProductCard key={p.slug} product={p} />)}
                        </div>
                    </section>
                )}
            </div>
        </StoreLayout>
    );
}
