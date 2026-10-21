import ProductCard from '@/components/store/product-card';
import AccountLayout from '@/layouts/account-layout';
import StoreLayout from '@/layouts/store-layout';
import { useT } from '@/lib/i18n';
import { useWishlist } from '@/lib/wishlist';
import type { WishlistEntry } from '@/types/wishlist';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Heart, TrendingDown } from 'lucide-react';
import { useState } from 'react';

type Props = {
    items: WishlistEntry[];
    isGuest: boolean;
};

export default function WishlistPage({ items, isGuest }: Props) {
    const t = useT();
    const { slugs } = useWishlist();
    const notice = usePage<{ flash?: { cart_notice?: string } }>().props.flash?.cart_notice;
    const [adding, setAdding] = useState<string | null>(null);

    // An item disappears as soon as its heart is clicked.
    const visible = items.filter((item) => slugs.includes(item.slug));

    const addToBag = (item: WishlistEntry) => {
        if (!item.quick_variant_id) return;

        setAdding(item.slug);
        router.post('/bag', { variant_id: item.quick_variant_id, quantity: 1 }, {
            preserveScroll: true,
            onFinish: () => setAdding(null),
        });
    };

    const countLabel = visible.length > 0 && (
        <p className="font-mono text-sm text-slate-500">
            {visible.length === 1 ? t('1 item') : t(':count items', { count: visible.length })}
        </p>
    );

    // The page content, shared by both versions of the page below.
    const content = (
        <>
            {isGuest && visible.length > 0 && (
                <p className="mb-6 rounded-xl bg-[#f0eefa] px-5 py-3 text-sm text-[#3f3775]">
                    <Link href="/login" className="font-medium underline">{t('Log in')}</Link>{' '}
                    {t('to keep your wishlist on all your devices.')}
                </p>
            )}

            {notice && <p role="status" className="mb-6 text-sm text-amber-700">{notice}</p>}

            {visible.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                    <Heart className="mx-auto size-10 text-slate-300" aria-hidden />
                    <p className="mt-4 text-slate-600">{t('Your wishlist is empty.')}</p>
                    <p className="mt-1 text-sm text-slate-500">{t('Tap the heart on any product to save it for later.')}</p>
                    <Link href="/products"
                        className="mt-6 inline-flex h-12 items-center rounded-full bg-[#1f2230] px-7 text-white hover:bg-black">
                        {t('Start shopping')}
                    </Link>
                </div>
            ) : (
                <ul className={`grid gap-x-5 gap-y-10 sm:grid-cols-2 ${isGuest ? 'lg:grid-cols-4' : 'lg:grid-cols-3 2xl:grid-cols-4'}`}>
                    {visible.map((item) => (
                        <li key={item.slug} className="flex flex-col">
                            <ProductCard product={item} />

                            {/* mt-auto pushes this to the bottom, so buttons line up across a row */}
                            <div className="mt-auto space-y-2 pt-3">
                                {item.price_drop && (
                                    <p className="flex items-center gap-1.5 text-sm font-medium text-[#3f7d5b]">
                                        <TrendingDown className="size-4" aria-hidden />
                                        {t('Price dropped :percent% since you saved it', { percent: item.price_drop })}
                                    </p>
                                )}

                                {!item.available ? (
                                    <p className="flex h-11 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-500">
                                        {t('Currently sold out')}
                                    </p>
                                ) : item.quick_variant_id ? (
                                    <button type="button" onClick={() => addToBag(item)} disabled={adding === item.slug}
                                        className="h-11 w-full rounded-full bg-[#1f2230] text-sm font-medium text-white hover:bg-black disabled:opacity-60">
                                        {adding === item.slug ? t('Adding…') : t('Add to bag')}
                                    </button>
                                ) : (
                                    <Link href={`/products/${item.slug}`}
                                        className="flex h-11 w-full items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-medium hover:bg-slate-50">
                                        {t('Choose options')}
                                    </Link>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );

    // Customers: inside the account area, with its sidebar.
    if (!isGuest) {
        return (
            <AccountLayout title={t('Wishlist')} actions={countLabel}>
                {content}
            </AccountLayout>
        );
    }

    // Guests: the same look, without the account sidebar they don't have.
    return (
        <StoreLayout>
            <Head title={t('Wishlist')} />

            <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t('Wishlist')}</h1>
                    {countLabel}
                </div>

                <div className="mt-8">{content}</div>
            </div>
        </StoreLayout>
    );
}
