import SearchBox from '@/components/store/search-box';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useT } from '@/lib/i18n';
import type { HeaderLink, HeaderSettings, Region } from '@/types/header';
import { Link, router, usePage } from '@inertiajs/react';
import { ChevronDown, Heart, Loader2, Menu, ShoppingBag, User } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useWishlist } from '@/lib/wishlist';

type SharedProps = {
    header: HeaderSettings;
    locale: string;
    region: string;
    locales: Record<string, string>;
    regions: Record<string, Region>;
    auth: { user: unknown };
    cartCount: number;
};

type PrefKey = 'locale' | 'region';

function SmartLink({ link, className, children }: { link: HeaderLink; className?: string; children?: ReactNode }) {
    const content = children ?? link.label;
    return link.href.startsWith('https://') ? (
        <a href={link.href} className={className} rel="noopener noreferrer">{content}</a>
    ) : (
        <Link href={link.href} className={className}>{content}</Link>
    );
}

export default function SiteHeader() {
    const { header, locale, region, locales, regions, auth, cartCount } = usePage<SharedProps>().props;
    const t = useT();
    const { count: wishlistCount } = useWishlist();
    const [pending, setPending] = useState<{ key: PrefKey; value: string } | null>(null);

    const setPreference = (key: PrefKey, value: string) => {
        setPending({ key, value });
        router.post('/preferences', { [key]: value }, {
            preserveScroll: true,
            onFinish: () => setPending(null),
        });
    };

    // Show the new choice right away; fall back to the server's value otherwise.
    const shownLocale = pending?.key === 'locale' ? pending.value : locale;
    const shownRegion = pending?.key === 'region' ? pending.value : region;
    const busy = pending !== null;

    const selectClass =
        'h-8 rounded border border-white/20 bg-transparent px-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:cursor-wait disabled:opacity-60';

    return (
        <header className="sticky top-0 z-40">
            {/* Top bar */}
            <div className="bg-[#1f2230] text-white">
                <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-2 sm:px-6">
                    <ul className="hidden items-center gap-3 text-sm lg:flex">
                        {header.announcements.map((text, i) => (
                            <li key={i} className="flex items-center gap-3">
                                {i > 0 && <span className="text-white/30" aria-hidden>/</span>}
                                {text}
                            </li>
                        ))}
                    </ul>
                    <p className="truncate text-xs sm:text-sm lg:hidden">{header.announcements[0]}</p>

                    <div className="flex shrink-0 items-center gap-2" aria-busy={busy}>
                        <select aria-label={t('Language')} value={shownLocale} className={selectClass}
                            disabled={busy}
                            onChange={(e) => setPreference('locale', e.target.value)}>
                            {Object.entries(locales).map(([code, name]) => (
                                <option key={code} value={code} className="text-black">
                                    {code.toUpperCase()} — {name}
                                </option>
                            ))}
                        </select>

                        <select aria-label={t('Shipping region')} value={shownRegion}
                            className={`${selectClass} max-w-36 sm:max-w-none`}
                            disabled={busy}
                            onChange={(e) => setPreference('region', e.target.value)}>
                            {Object.entries(regions).map(([code, r]) => (
                                <option key={code} value={code} className="text-black">
                                    {r.label} — {r.currency}, {r.tax}
                                </option>
                            ))}
                        </select>

                        {/* Fixed-size slot so the header doesn't shift when the spinner appears */}
                        <span className="flex size-4 items-center justify-center" aria-hidden>
                            {busy && <Loader2 className="size-4 animate-spin text-white/80" />}
                        </span>

                        <span role="status" className="sr-only">
                            {pending?.key === 'region' ? t('Updating prices…') : pending?.key === 'locale' ? t('Changing language…') : ''}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main row */}
            <div className="border-b border-slate-200 bg-[#f6f7fb]/95 backdrop-blur">
                <div className="mx-auto grid h-16 max-w-[1500px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:h-20 sm:px-6 lg:px-10">
                    {/* Left: mobile menu + desktop nav */}
                    <div className="flex items-center">
                        <Sheet>
                            <SheetTrigger className="rounded-md p-2 md:hidden" aria-label={t('Open menu')}>
                                <Menu className="size-6" />
                            </SheetTrigger>
                            <SheetContent side="left" className="w-80 overflow-y-auto p-6">
                                <SheetTitle>{header.brand_name}</SheetTitle>
                                <SearchBox placeholder={header.search_placeholder} className="my-6" />
                                <nav aria-label={t('Mobile menu')}>
                                    <ul className="space-y-4">
                                        {header.nav.map((item, i) => (
                                            <li key={i}>
                                                <SmartLink link={item} className="text-lg font-medium" />
                                                {item.children.length > 0 && (
                                                    <ul className="mt-2 space-y-2 border-l pl-4">
                                                        {item.children.map((child, c) => (
                                                            <li key={c}><SmartLink link={child} className="text-slate-600" /></li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </nav>
                            </SheetContent>
                        </Sheet>

                        <nav aria-label={t('Main menu')} className="hidden md:block">
                            <ul className="flex items-center gap-2 lg:gap-6">
                                {header.nav.map((item, i) => (
                                    <li key={i}>
                                        {item.children.length > 0 ? (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger className="flex items-center gap-1 rounded px-2 py-1 text-[17px] text-slate-700 hover:text-slate-950">
                                                    {item.label}
                                                    <ChevronDown className="size-3 text-slate-400" />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start">
                                                    <DropdownMenuItem asChild>
                                                        <SmartLink link={item}>{t('All :name', { name: item.label })}</SmartLink>
                                                    </DropdownMenuItem>
                                                    {item.children.map((child, c) => (
                                                        <DropdownMenuItem key={c} asChild>
                                                            <SmartLink link={child} />
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        ) : (
                                            <SmartLink link={item} className="px-2 py-1 text-[17px] text-slate-700 hover:text-slate-950" />
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </div>

                    {/* Center: logo */}
                    <Link href="/" className="flex items-center gap-2.5" aria-label={t(':name home', { name: header.brand_name })}>
                        {header.logo_url ? (
                            <img
                                src={header.logo_url}
                                alt={header.brand_name}
                                className="h-8 w-auto max-w-[180px] object-contain sm:h-10 sm:max-w-[240px]"
                            />
                        ) : (
                            <>
                                <span className="size-7 rounded-lg bg-[#5b4f9a] sm:size-8" aria-hidden />
                                <span className="text-xl font-semibold tracking-tight text-slate-900 sm:text-[26px]">
                                    {header.brand_name}
                                </span>
                            </>
                        )}
                    </Link>

                    {/* Right: search, account, bag */}
                    <div className="flex items-center justify-end gap-2 sm:gap-3">
                        <SearchBox placeholder={header.search_placeholder} className="hidden w-72 xl:block" />
                        {auth.user ? (
                            <Link href="/account"
                                className="flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm sm:px-4 sm:text-base">
                                <User className="size-4 sm:hidden" aria-hidden />
                                <span className="hidden sm:inline">{t('Account')}</span>
                                <span className="sr-only sm:hidden">{t('Account')}</span>
                            </Link>
                        ) : (
                            <div className="flex items-center gap-1">
                                <Link href="/login"
                                    className="flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm sm:px-4 sm:text-base">
                                    <User className="size-4 sm:hidden" aria-hidden />
                                    <span className="hidden sm:inline">{t('Sign In')}</span>
                                    <span className="sr-only sm:hidden">{t('Sign In')}</span>
                                </Link>
                                <Link href="/register" className="hidden px-2 text-sm text-slate-600 hover:text-slate-900 lg:inline">
                                    {t('Sign up')}
                                </Link>
                            </div>
                        )}
                        <Link href="/wishlist" aria-label={t('Wishlist (:count items)', { count: wishlistCount })}
                            className="relative flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white">
                            <Heart className="size-4" aria-hidden />
                            {wishlistCount > 0 && (
                                <span aria-hidden className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#5b4f9a] px-1 font-mono text-[11px] text-white">
                                    {wishlistCount}
                                </span>
                            )}
                        </Link>
                        <Link href="/bag"
                            className="flex h-11 items-center gap-2 rounded-full bg-[#1f2230] px-4 text-sm text-white sm:text-base">
                            <ShoppingBag className="size-4 sm:hidden" aria-hidden />
                            <span className="hidden sm:inline">{t('Bag')}</span>
                            <span aria-label={t(':count items in bag', { count: cartCount })}>{cartCount}</span>
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
}
