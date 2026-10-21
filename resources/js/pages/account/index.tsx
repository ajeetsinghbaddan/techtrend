import AddressBlock from '@/components/account/address-block';
import OrderRow from '@/components/account/order-row';
import AccountLayout from '@/layouts/account-layout';
import { useT } from '@/lib/i18n';
import type { OrderSummary, SavedAddress } from '@/types/account';
import { Link, router } from '@inertiajs/react';
import { Heart, MapPin, MessageSquare, Package, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

type Props = {
    account: { name: string; email: string; email_verified: boolean; two_factor: boolean };
    recentOrders: OrderSummary[];
    defaultAddress: SavedAddress | null;
    counts: { orders: number; addresses: number; wishlist: number; reviews: number };
};

export default function AccountOverview({ account, recentOrders, defaultAddress, counts }: Props) {
    const t = useT();
    const [sent, setSent] = useState(false);
    const firstName = account.name.split(' ')[0];

    const resend = () =>
        router.post('/email/verification-notification', {}, { preserveScroll: true, onSuccess: () => setSent(true) });

    const stats = [
        { label: t('Orders'), value: counts.orders, icon: Package, href: '/account/orders' },
        { label: t('Addresses'), value: counts.addresses, icon: MapPin, href: '/account/addresses' },
        { label: t('Wishlist'), value: counts.wishlist, icon: Heart, href: '/wishlist' },
        { label: t('Reviews'), value: counts.reviews, icon: MessageSquare, href: null },
    ];

    return (
        <AccountLayout title={t('Hello, :name', { name: firstName })}>
            {/* First: confirm the email address. */}
            {!account.email_verified && (
                <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                    <p className="font-medium">{t('Please confirm your email address')}</p>
                    <p className="mt-1">
                        {t('Confirming :email lets you write reviews and see orders you placed as a guest.', { email: account.email })}
                    </p>
                    {sent ? (
                        <p className="mt-3 font-medium">{t('We sent you a new link.')}</p>
                    ) : (
                        <button type="button" onClick={resend} className="mt-3 font-medium underline">
                            {t('Send the link again')}
                        </button>
                    )}
                </div>
            )}

            {/* Then: suggest two-factor authentication. */}
            {account.email_verified && !account.two_factor && (
                <div className="mb-8 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                    <span className="flex size-10 items-center justify-center rounded-full bg-[#f0eefa] text-[#5b4f9a]">
                        <ShieldCheck className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="font-medium">{t('Make your account extra secure')}</p>
                        <p className="text-sm text-slate-600">{t('Add a code from Google Authenticator to your login. It takes about a minute.')}</p>
                    </div>
                    <Link href="/account/settings#two-factor" className="text-sm font-medium text-[#5b4f9a] hover:underline">
                        {t('Set it up')}
                    </Link>
                </div>
            )}

            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {stats.map(({ label, value, icon: Icon, href }) => {
                    const content = (
                        <>
                            <dt className="flex items-center gap-2 text-sm text-slate-500">
                                <Icon className="size-4" aria-hidden /> {label}
                            </dt>
                            <dd className="mt-2 font-mono text-3xl">{value}</dd>
                        </>
                    );
                    return href ? (
                        <Link key={label} href={href} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-400">
                            {content}
                        </Link>
                    ) : (
                        <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5">{content}</div>
                    );
                })}
            </dl>

            <div className="mt-10 grid gap-10 xl:grid-cols-[1fr_320px]">
                <section aria-labelledby="recent-orders">
                    <div className="flex items-baseline justify-between">
                        <h2 id="recent-orders" className="text-xl font-semibold">{t('Recent orders')}</h2>
                        {counts.orders > 3 && (
                            <Link href="/account/orders" className="text-sm text-slate-500 hover:text-slate-900">{t('View all')}</Link>
                        )}
                    </div>
                    {recentOrders.length === 0 ? (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-8 text-center">
                            <p className="text-slate-600">{t("You haven't placed any orders yet.")}</p>
                            <Link href="/products" className="mt-4 inline-block text-sm font-medium underline">{t('Start shopping')}</Link>
                        </div>
                    ) : (
                        <ul className="mt-4 space-y-3">
                            {recentOrders.map((order) => <li key={order.number}><OrderRow order={order} /></li>)}
                        </ul>
                    )}
                </section>

                <section aria-labelledby="default-address">
                    <h2 id="default-address" className="text-xl font-semibold">{t('Delivery address')}</h2>
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
                        {defaultAddress ? (
                            <>
                                <AddressBlock address={defaultAddress} />
                                <Link href="/account/addresses" className="mt-4 inline-block text-sm font-medium underline">
                                    {t('Manage addresses')}
                                </Link>
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-slate-600">{t('Save an address to check out faster.')}</p>
                                <Link href="/account/addresses" className="mt-3 inline-block text-sm font-medium underline">
                                    {t('Add an address')}
                                </Link>
                            </>
                        )}
                    </div>
                </section>
            </div>
        </AccountLayout>
    );
}
