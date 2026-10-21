import StoreLayout from '@/layouts/store-layout';
import { useT } from '@/lib/i18n';
import { Head, Link, useForm } from '@inertiajs/react';
import { KeyRound, Loader2, Smartphone } from 'lucide-react';
import { useState, type FormEvent } from 'react';

export default function TwoFactorChallenge() {
    const t = useT();
    const [useRecovery, setUseRecovery] = useState(false);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        code: '',
        recovery_code: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/two-factor-challenge', { onFinish: () => reset() });
    };

    const switchMode = () => {
        setUseRecovery((v) => !v);
        reset();
        clearErrors();
    };

    const error = errors.code ?? errors.recovery_code;

    return (
        <StoreLayout>
            <Head title={t('Two-factor authentication')} />

            <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                    <span className="flex size-12 items-center justify-center rounded-full bg-[#f0eefa] text-[#5b4f9a]">
                        {useRecovery ? <KeyRound className="size-6" aria-hidden /> : <Smartphone className="size-6" aria-hidden />}
                    </span>

                    <h1 className="mt-5 text-2xl font-semibold tracking-tight">
                        {useRecovery ? t('Use a recovery code') : t('Enter your authentication code')}
                    </h1>
                    <p className="mt-2 text-slate-600">
                        {useRecovery
                            ? t('Enter one of the recovery codes you saved when you set up two-factor authentication.')
                            : t('Open your authenticator app and enter the 6-digit code for :app.', { app: import.meta.env.VITE_APP_NAME ?? 'Tech Trend' })}
                    </p>

                    <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
                        {useRecovery ? (
                            <div>
                                <label htmlFor="recovery_code" className="sr-only">{t('Recovery code')}</label>
                                <input id="recovery_code" value={data.recovery_code} autoFocus autoComplete="off"
                                    onChange={(e) => setData('recovery_code', e.target.value.trim())}
                                    placeholder="xxxxxxxxxx-xxxxxxxxxx"
                                    aria-invalid={error ? true : undefined}
                                    aria-describedby={error ? 'code-error' : undefined}
                                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 font-mono outline-none focus:border-[#5b4f9a] focus:ring-2 focus:ring-[#5b4f9a]/20" />
                            </div>
                        ) : (
                            <div>
                                <label htmlFor="code" className="sr-only">{t('Authentication code')}</label>
                                <input id="code" value={data.code} autoFocus
                                    inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                                    onChange={(e) => setData('code', e.target.value.replace(/\D/g, ''))}
                                    placeholder="123456"
                                    aria-invalid={error ? true : undefined}
                                    aria-describedby={error ? 'code-error' : undefined}
                                    className="h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-center font-mono text-2xl tracking-[0.5em] outline-none focus:border-[#5b4f9a] focus:ring-2 focus:ring-[#5b4f9a]/20" />
                            </div>
                        )}

                        {error && <p id="code-error" role="alert" className="text-sm text-red-600">{error}</p>}

                        <button type="submit"
                            disabled={processing || (useRecovery ? data.recovery_code.length < 8 : data.code.length !== 6)}
                            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1f2230] font-medium text-white hover:bg-black disabled:opacity-50">
                            {processing && <Loader2 className="size-4 animate-spin" aria-hidden />}
                            {t('Log in')}
                        </button>
                    </form>

                    <button type="button" onClick={switchMode} className="mt-5 text-sm text-[#5b4f9a] hover:underline">
                        {useRecovery ? t('Use the code from my app instead') : t("Lost your phone? Use a recovery code")}
                    </button>

                    <p className="mt-6 border-t border-slate-100 pt-5 text-sm text-slate-500">
                        <Link href="/login" className="hover:text-slate-900">← {t('Back to log in')}</Link>
                    </p>
                </section>
            </div>
        </StoreLayout>
    );
}
