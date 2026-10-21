import StoreLayout from '@/layouts/store-layout';
import { useT } from '@/lib/i18n';
import { Head, Link, usePage } from '@inertiajs/react';
import { Heart, LayoutGrid, LogOut, MapPin, Package, Settings, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

type Props = {
    title: string;
    actions?: ReactNode;
    children: ReactNode;
};

export default function AccountLayout({ title, actions, children }: Props) {
    const t = useT();
    const { url, props } = usePage<{ flash?: { account_notice?: string } }>();
    const notice = props.flash?.account_notice;
    const path = url.split('?')[0];

    const items: NavItem[] = [
        { href: '/account', label: t('Overview'), icon: LayoutGrid, exact: true },
        { href: '/account/orders', label: t('Orders'), icon: Package },
        { href: '/account/addresses', label: t('Addresses'), icon: MapPin },
        { href: '/wishlist', label: t('Wishlist'), icon: Heart },
        { href: '/account/settings', label: t('Settings'), icon: Settings },
    ];

    const isActive = (item: NavItem) =>
        item.exact ? path === item.href : path === item.href || path.startsWith(`${item.href}/`);

    const linkClass = (active: boolean) =>
        `flex items-center gap-2.5 whitespace-nowrap rounded-full px-4 py-2 text-sm lg:rounded-xl ${
            active ? 'bg-[#1f2230] text-white' : 'text-slate-600 hover:bg-white hover:text-slate-900'
        }`;

    return (
        <StoreLayout>
            <Head title={title} />

            <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
                <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
                    <nav aria-label={t('My account')}
                        className="-mx-4 mb-8 overflow-x-auto px-4 lg:mx-0 lg:mb-0 lg:overflow-visible lg:px-0">
                        <ul className="flex gap-2 lg:sticky lg:top-28 lg:flex-col lg:gap-1">
                            {items.map((item) => {
                                const active = isActive(item);
                                const Icon = item.icon;
                                return (
                                    <li key={item.href} className="shrink-0">
                                        <Link href={item.href} aria-current={active ? 'page' : undefined} className={linkClass(active)}>
                                            <Icon className="size-4" aria-hidden />
                                            {item.label}
                                        </Link>
                                    </li>
                                );
                            })}
                            <li className="shrink-0 lg:mt-4 lg:border-t lg:border-slate-200 lg:pt-4">
                                <Link href="/logout" method="post" as="button" className={`${linkClass(false)} w-full`}>
                                    <LogOut className="size-4" aria-hidden />
                                    {t('Log out')}
                                </Link>
                            </li>
                        </ul>
                    </nav>

                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
                            {actions}
                        </div>

                        {notice && (
                            <p role="status" className="mt-6 rounded-xl bg-[#f0eefa] px-5 py-3 text-sm text-[#3f3775]">{notice}</p>
                        )}

                        <div className="mt-8">{children}</div>
                    </div>
                </div>
            </div>
        </StoreLayout>
    );
}
