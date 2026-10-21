import StoreLayout from '@/layouts/store-layout';
import { useT } from '@/lib/i18n';
import { Head, Link, useForm } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import type { FormEvent } from 'react';

type Props = { token: string; email: string; done: boolean };

export default function UnsubscribeReminders({ token, email, done }: Props) {
    const t = useT();
    const { post, processing } = useForm({});

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(`/bag/reminders/unsubscribe/${token}`, { preserveScroll: true });
    };

    return (
        <StoreLayout>
            <Head>
                <title>{t('Bag reminders')}</title>
                <meta head-key="robots" name="robots" content="noindex" />
            </Head>

            <div className="mx-auto max-w-md px-4 py-16">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center sm:p-8">
                    {done ? (
                        <>
                            <CheckCircle2 className="mx-auto size-10 text-green-600" aria-hidden />
                            <h1 className="mt-4 text-2xl font-semibold">{t("You won't get bag reminders any more")}</h1>
                            <p className="mt-2 text-slate-600">{t('We will still email you about orders you place.')}</p>
                        </>
                    ) : (
                        <form onSubmit={submit}>
                            <h1 className="text-2xl font-semibold">{t('Stop bag reminders?')}</h1>
                            <p className="mt-2 text-slate-600">
                                {t("We'll stop emailing :email about items left in a bag.", { email })}
                            </p>
                            <button type="submit" disabled={processing}
                                className="mt-6 h-12 w-full rounded-full bg-[#1f2230] font-medium text-white hover:bg-black disabled:opacity-60">
                                {t('Stop bag reminders')}
                            </button>
                        </form>
                    )}
                    <Link href="/" className="mt-6 inline-block text-sm text-slate-500 hover:text-slate-900">{t('Back to the shop')}</Link>
                </section>
            </div>
        </StoreLayout>
    );
}
