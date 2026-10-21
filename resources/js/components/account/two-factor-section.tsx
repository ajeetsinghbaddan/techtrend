import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { xsrfToken } from '@/lib/http';
import { useT } from '@/lib/i18n';
import { router } from '@inertiajs/react';
import { Copy, Download, Loader2, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type Props = { enabled: boolean; confirmed: boolean };

type Step = 'idle' | 'scan' | 'codes';

/** Call one of Fortify's two-factor endpoints, asking for JSON instead of a page. */
async function api(method: 'GET' | 'POST' | 'DELETE', url: string, body?: Record<string, string>) {
    return fetch(url, {
        method,
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': xsrfToken(),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
}

export default function TwoFactorSection({ enabled, confirmed }: Props) {
    const t = useT();
    const [step, setStep] = useState<Step>('idle');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [qr, setQr] = useState<string | null>(null);
    const [secret, setSecret] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [codes, setCodes] = useState<string[]>([]);

    // Password re-entry, for actions Fortify protects.
    const [askPassword, setAskPassword] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [retry, setRetry] = useState<(() => Promise<void>) | null>(null);

    /** Run an action; if Fortify wants the password first (HTTP 423), ask, then run it again. */
    const protectedAction = async (action: () => Promise<Response | void>) => {
        setBusy(true);
        setError(null);

        try {
            const result = await action();

            if (result instanceof Response && result.status === 423) {
                setRetry(() => async () => { await protectedAction(action); });
                setAskPassword(true);
                return;
            }
        } catch {
            setError(t('Something went wrong. Please try again.'));
        } finally {
            setBusy(false);
        }
    };

    const confirmPassword = async (e: FormEvent) => {
        e.preventDefault();
        setPasswordError(null);

        const response = await api('POST', '/user/confirm-password', { password });

        if (response.status === 422) {
            setPasswordError(t('That password is not correct.'));
            return;
        }

        setAskPassword(false);
        setPassword('');
        await retry?.();
    };

    const showQr = async () => {
        const [qrResponse, secretResponse] = await Promise.all([
            api('GET', '/user/two-factor-qr-code'),
            api('GET', '/user/two-factor-secret-key'),
        ]);
        setQr((await qrResponse.json()).svg);
        setSecret((await secretResponse.json()).secretKey);
        setStep('scan');
    };

    const start = () => protectedAction(async () => {
        const response = await api('POST', '/user/two-factor-authentication');
        if (response.status === 423) return response;
        await showQr();
    });

    const confirmCode = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);

        const response = await api('POST', '/user/confirmed-two-factor-authentication', { code });
        setBusy(false);

        if (response.status === 422) {
            setError(t('That code is not correct. Check the time on your phone is set automatically, and try the newest code.'));
            return;
        }

        setCode('');
        await loadCodes();
        router.reload({ only: ['twoFactor'] });
    };

    const loadCodes = async () => {
        const response = await api('GET', '/user/two-factor-recovery-codes');
        if (response.status === 423) return response;
        setCodes(await response.json());
        setStep('codes');
    };

    const showCodes = () => protectedAction(loadCodes);

    const regenerate = () => protectedAction(async () => {
        const response = await api('POST', '/user/two-factor-recovery-codes');
        if (response.status === 423) return response;
        return loadCodes();
    });

    const turnOff = () => {
        if (!confirm(t('Turn off two-factor authentication? Your account will be protected by your password only.'))) return;

        protectedAction(async () => {
            const response = await api('DELETE', '/user/two-factor-authentication');
            if (response.status === 423) return response;
            setStep('idle');
            setCodes([]);
            router.reload({ only: ['twoFactor'] });
        });
    };

    const download = () => {
        const text = `${t('Recovery codes')} (${window.location.host})\n\n${codes.join('\n')}\n`;
        const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
        const link = Object.assign(document.createElement('a'), { href: url, download: 'recovery-codes.txt' });
        link.click();
        URL.revokeObjectURL(url);
    };

    const button = 'h-11 rounded-full px-5 text-sm font-medium disabled:opacity-60';

    return (
        <section id="two-factor" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold">{t('Two-factor authentication')}</h2>
                {confirmed && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs text-green-800">
                        <ShieldCheck className="size-3.5" aria-hidden /> {t('On')}
                    </span>
                )}
            </div>
            <p className="mt-2 text-sm text-slate-600">
                {t('Protect your account with a code from an authenticator app such as Google Authenticator or Microsoft Authenticator, as well as your password.')}
            </p>

            {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

            {/* Step 1: scan */}
            {step === 'scan' && qr && (
                <div className="mt-6 grid gap-6 sm:grid-cols-[200px_1fr]">
                    <div className="rounded-xl border border-slate-200 bg-white p-3 [&_svg]:h-auto [&_svg]:w-full"
                        dangerouslySetInnerHTML={{ __html: qr }} aria-label={t('QR code for your authenticator app')} role="img" />
                    <div className="space-y-4 text-sm">
                        <ol className="list-decimal space-y-1 pl-5 text-slate-700">
                            <li>{t('Open your authenticator app and add a new account.')}</li>
                            <li>{t('Scan this QR code.')}</li>
                            <li>{t('Enter the 6-digit code the app shows.')}</li>
                        </ol>
                        {secret && (
                            <p className="text-slate-500">
                                {t("Can't scan it? Enter this key instead:")}{' '}
                                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-900 select-all">{secret}</code>
                            </p>
                        )}
                        <form onSubmit={confirmCode} className="flex flex-wrap gap-2">
                            <label htmlFor="setup_code" className="sr-only">{t('Authentication code')}</label>
                            <input id="setup_code" value={code} inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456"
                                className="h-11 w-36 rounded-xl border border-slate-200 px-3 text-center font-mono text-lg tracking-[0.3em] outline-none focus:border-[#5b4f9a]" />
                            <button type="submit" disabled={busy || code.length !== 6} className={`${button} bg-[#1f2230] text-white hover:bg-black`}>
                                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : t('Confirm')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Step 2: recovery codes */}
            {step === 'codes' && codes.length > 0 && (
                <div className="mt-6 rounded-xl bg-amber-50 p-4">
                    <p className="text-sm font-medium text-amber-900">{t('Save your recovery codes')}</p>
                    <p className="mt-1 text-sm text-amber-900">
                        {t('If you lose your phone, each of these codes lets you log in once. Keep them somewhere safe, like a password manager.')}
                    </p>
                    <ul className="mt-3 grid gap-1 rounded-lg bg-white p-3 font-mono text-sm sm:grid-cols-2">
                        {codes.map((c) => <li key={c}>{c}</li>)}
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => navigator.clipboard.writeText(codes.join('\n'))}
                            className={`${button} inline-flex items-center gap-2 border border-slate-300 bg-white hover:bg-slate-50`}>
                            <Copy className="size-4" aria-hidden /> {t('Copy')}
                        </button>
                        <button type="button" onClick={download}
                            className={`${button} inline-flex items-center gap-2 border border-slate-300 bg-white hover:bg-slate-50`}>
                            <Download className="size-4" aria-hidden /> {t('Download')}
                        </button>
                        <button type="button" onClick={() => setStep('idle')} className={`${button} text-slate-600 hover:bg-slate-100`}>
                            {t('Done')}
                        </button>
                    </div>
                </div>
            )}

            {/* Actions */}
            {step === 'idle' && (
                <div className="mt-5 flex flex-wrap gap-2">
                    {!confirmed && (
                        <button type="button" onClick={enabled ? () => protectedAction(showQr) : start} disabled={busy}
                            className={`${button} bg-[#1f2230] text-white hover:bg-black`}>
                            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden />
                                : enabled ? t('Finish setting up') : t('Set up authenticator app')}
                        </button>
                    )}
                    {confirmed && (
                        <>
                            <button type="button" onClick={showCodes} disabled={busy}
                                className={`${button} border border-slate-300 bg-white hover:bg-slate-50`}>
                                {t('Show recovery codes')}
                            </button>
                            <button type="button" onClick={regenerate} disabled={busy}
                                className={`${button} border border-slate-300 bg-white hover:bg-slate-50`}>
                                {t('New recovery codes')}
                            </button>
                        </>
                    )}
                    {enabled && (
                        <button type="button" onClick={turnOff} disabled={busy} className={`${button} text-red-700 hover:bg-red-50`}>
                            {confirmed ? t('Turn off') : t('Cancel setup')}
                        </button>
                    )}
                </div>
            )}

            {/* Password re-entry */}
            <Dialog open={askPassword} onOpenChange={(open) => { setAskPassword(open); if (!open) setPassword(''); }}>
                <DialogContent className="max-w-sm">
                    <DialogTitle>{t('Confirm your password')}</DialogTitle>
                    <form onSubmit={confirmPassword} className="space-y-3">
                        <p className="text-sm text-slate-600">{t('For your security, please enter your password to continue.')}</p>
                        <label htmlFor="confirm_password" className="sr-only">{t('Password')}</label>
                        <input id="confirm_password" type="password" value={password} autoFocus autoComplete="current-password"
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-[#5b4f9a]" />
                        {passwordError && <p role="alert" className="text-sm text-red-600">{passwordError}</p>}
                        <button type="submit" disabled={!password} className={`${button} w-full bg-[#1f2230] text-white hover:bg-black`}>
                            {t('Continue')}
                        </button>
                    </form>
                </DialogContent>
            </Dialog>
        </section>
    );
}
