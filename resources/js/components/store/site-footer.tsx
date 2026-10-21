import { useIsMobile } from '@/hooks/use-mobile';
import type { FooterColumn, FooterSettings, HeaderLink, HeaderSettings } from '@/types/header';
import { Link, usePage } from '@inertiajs/react';
import { Minus, Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { openCookieSettings } from '@/lib/consent';
import { useT } from '@/lib/i18n';
import type { CookieBannerSettings } from '@/types/cookies';

const gridCols: Record<number, string> = {
    0: 'lg:grid-cols-1',
    1: 'lg:grid-cols-[2fr_1fr]',
    2: 'lg:grid-cols-[2fr_1fr_1fr]',
    3: 'lg:grid-cols-[2fr_1fr_1fr_1fr]',
    4: 'lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]',
};

function FooterLink({ link }: { link: HeaderLink }) {
    const className = 'text-[15px] text-white/85 transition-colors hover:text-white';

    if (link.href.startsWith('/')) {
        return <Link href={link.href} className={className}>{link.label}</Link>;
    }

    return link.href.startsWith('mailto:') ? (
        <a href={link.href} className={className}>{link.label}</a>
    ) : (
        <a href={link.href} className={className} rel="noopener noreferrer">{link.label}</a>
    );
}

function LinkList({ column, id }: { column: FooterColumn; id?: string }) {
    return (
        <ul id={id} className="space-y-3">
            {column.links.map((link, j) => (
                <li key={j}><FooterLink link={link} /></li>
            ))}
        </ul>
    );
}

function FooterColumnBlock({ column, isMobile }: { column: FooterColumn; isMobile: boolean }) {
    const [open, setOpen] = useState(false);
    const listId = useId();

    const headingClass = 'font-mono text-xs tracking-[0.2em] text-white/45 uppercase';

    if (!isMobile) {
        return (
            <nav aria-label={column.title}>
                <h2 className={headingClass}>{column.title}</h2>
                <div className="mt-4">
                    <LinkList column={column} />
                </div>
            </nav>
        );
    }

    return (
        <nav aria-label={column.title} className="border-b border-white/10">
            <h2>
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    aria-expanded={open}
                    aria-controls={listId}
                    className={`flex min-h-12 w-full items-center justify-between py-3 text-left ${headingClass}`}
                >
                    {column.title}
                    {open ? (
                        <Minus className="size-4 text-white/70" aria-hidden />
                    ) : (
                        <Plus className="size-4 text-white/70" aria-hidden />
                    )}
                </button>
            </h2>

            <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                inert={!open}
            >
                <div className="overflow-hidden">
                    <div className="pb-5">
                        <LinkList column={column} id={listId} />
                    </div>
                </div>
            </div>
        </nav>
    );
}

export default function SiteFooter() {
    const { header, footer, cookieBanner } = usePage<{ header: HeaderSettings; footer: FooterSettings; cookieBanner: CookieBannerSettings; }>().props;
    const t = useT();
    const isMobile = useIsMobile();

    const copyright = footer.copyright?.replace('{year}', String(new Date().getFullYear()));

    return (
        <footer className="mt-16 bg-[#1f2230] text-white sm:mt-20">
            <div className={`mx-auto grid max-w-[1500px] px-4 py-12 sm:px-6 sm:py-16 md:grid-cols-2 md:gap-10 lg:gap-8 lg:px-10 ${gridCols[footer.columns.length] ?? gridCols[3]}`}>
                <div className="pb-6 md:col-span-2 md:pb-0 lg:col-span-1">
                    <Link href="/" className="inline-flex items-center gap-2.5" aria-label={`${header.brand_name} home`}>
                        {header.logo_url ? (
                            <img src={header.logo_url} alt={header.brand_name}
                                className="h-8 w-auto max-w-[200px] object-contain brightness-0 invert" />
                        ) : (
                            <>
                                <span className="size-8 rounded-lg bg-[#7c6fd0]" aria-hidden />
                                <span className="text-2xl font-semibold tracking-tight">{header.brand_name}</span>
                            </>
                        )}
                    </Link>
                    {footer.description && (
                        <p className="mt-5 max-w-xs text-[15px] leading-relaxed whitespace-pre-line text-white/60">
                            {footer.description}
                        </p>
                    )}
                </div>

                <div className={isMobile ? 'border-t border-white/10' : 'contents'}>
                    {footer.columns.map((column, i) => (
                        <FooterColumnBlock key={i} column={column} isMobile={isMobile} />
                    ))}
                </div>
            </div>

            <div className="border-t border-white/10">
                <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
                    {copyright && <p className="font-mono text-xs text-white/50 sm:text-sm">{copyright}</p>}
                    {cookieBanner.enabled && (
                        <button type="button" onClick={openCookieSettings}
                            className="font-mono text-xs text-white/50 underline hover:text-white sm:text-sm">
                            {t('Cookie settings')}
                        </button>
                    )}
                    {footer.badges.length > 0 && (
                        <ul className="flex flex-wrap gap-2" aria-label="Payment methods">
                            {footer.badges.map((badge, i) => (
                                <li key={i} className="rounded-md border border-white/15 px-2.5 py-1 font-mono text-xs text-white/70">
                                    {badge}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </footer>
    );
}
