import SeoHead from '@/components/seo-head';
import CookieBanner from '@/components/store/cookie-banner';
import SiteFooter from '@/components/store/site-footer';
import SiteHeader from '@/components/store/site-header';
import { useT } from '@/lib/i18n';
import type { ReactNode } from 'react';

export default function StoreLayout({ children }: { children: ReactNode }) {
    const t = useT();

    return (
        <div className="flex min-h-screen flex-col overflow-x-clip bg-[#f6f7fb] text-slate-900">
            {/* SEO tags for the current page (renders nothing visible) */}
            <SeoHead />

            {/* Hidden until a keyboard user presses Tab */}
            <a href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-full focus:bg-[#1f2230] focus:px-5 focus:py-3 focus:text-sm focus:font-medium focus:text-white">
                {t('Skip to content')}
            </a>

            <SiteHeader />
            <main id="main" tabIndex={-1} className="flex-1 outline-none">{children}</main>
            <SiteFooter />
            <CookieBanner />
        </div>
    );
}
