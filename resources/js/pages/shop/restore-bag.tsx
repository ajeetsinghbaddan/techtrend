import StoreLayout from '@/layouts/store-layout';
import { useT } from '@/lib/i18n';
import { Head, router } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

export default function RestoreBag({ token }: { token: string }) {
    const t = useT();
    const started = useRef(false);

    const restore = () => router.post(`/bag/restore/${token}`, {}, { replace: true });

    // Restore as soon as the page opens. The ref stops React's development
    // double-render from sending it twice.
    useEffect(() => {
        if (started.current) return;
        started.current = true;
        restore();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <StoreLayout>
            <Head>
                <title>{t('Restoring your bag')}</title>
                <meta head-key="robots" name="robots" content="noindex" />
            </Head>

            <div className="mx-auto max-w-md px-4 py-24 text-center">
                <Loader2 className="mx-auto size-8 animate-spin text-[#5b4f9a]" aria-hidden />
                <p role="status" className="mt-4 text-slate-600">{t('Restoring your bag…')}</p>
                <button type="button" onClick={restore} className="mt-6 text-sm text-[#5b4f9a] underline">
                    {t('Not working? Continue to my bag')}
                </button>
            </div>
        </StoreLayout>
    );
}
