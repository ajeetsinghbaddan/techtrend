import { applyConsent } from '@/lib/analytics';
import { readConsent, saveConsent, type Consent } from '@/lib/consent';
import { xsrfToken } from '@/lib/http';
import { useT } from '@/lib/i18n';
import type { CookieBannerSettings } from '@/types/cookies';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useId, useState } from 'react';

export default function CookieBanner() {
    const { cookieBanner: s } = usePage<{ cookieBanner: CookieBannerSettings }>().props;
    const t = useT();
    const headingId = useId();

    const [consent, setConsent] = useState<Consent | null>(null);
    const [visible, setVisible] = useState(false);
    const [customizing, setCustomizing] = useState(false);
    const [choices, setChoices] = useState({ analytics: false, marketing: false });

    // On load: read the saved choice, apply it, and decide whether to show the banner.
    useEffect(() => {
        const saved = readConsent();
        const valid = saved && saved.v === s.version ? saved : null;

        setConsent(saved);
        setVisible(s.enabled && valid === null);
        applyConsent(valid, s);

        const open = () => {
            const current = readConsent();
            setChoices({ analytics: current?.analytics ?? false, marketing: current?.marketing ?? false });
            setCustomizing(true);
            setVisible(true);
        };

        window.addEventListener('consent:open', open);
        return () => window.removeEventListener('consent:open', open);
    }, [s]);

    if (!s.enabled || !visible) return null;

    const analyticsOn = s.categories.analytics.enabled;
    const marketingOn = s.categories.marketing.enabled;
    const hasChoices = analyticsOn || marketingOn;

    const save = (analytics: boolean, marketing: boolean) => {
        const next = saveConsent(
            { v: s.version, analytics: analytics && analyticsOn, marketing: marketing && marketingOn },
            consent,
        );

        setConsent(next);
        setVisible(false);
        setCustomizing(false);
        applyConsent(next, s);

        void fetch('/cookie-consent', {
            method: 'POST',
            keepalive: true,
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': xsrfToken() },
            body: JSON.stringify({ id: next.id, v: next.v, analytics: next.analytics, marketing: next.marketing }),
        }).catch(() => {});
    };

    const placement = s.position === 'bottom-left'
        ? 'left-4 right-4 sm:right-auto sm:max-w-md'
        : 'inset-x-4 mx-auto max-w-3xl';

    const outline = 'h-11 rounded-full border border-slate-300 bg-white px-5 text-sm hover:bg-slate-50';
    const solid = 'h-11 rounded-full bg-[#1f2230] px-5 text-sm font-medium text-white hover:bg-black';

    return (
        <section
            role="dialog"
            aria-modal="false"
            aria-labelledby={headingId}
            className={`fixed bottom-4 z-50 ${placement} rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6`}
        >
            <h2 id={headingId} className="sr-only">{t('Cookies')}</h2>

            {!customizing ? (
                <div className={`flex flex-col gap-4 ${s.position === 'bottom' ? 'md:flex-row md:items-center md:justify-between' : ''}`}>
                    <p className="text-sm leading-relaxed text-slate-700 sm:text-[15px]">
                        {s.text}{' '}
                        {s.policy_href && s.policy_label && (
                            <Link href={s.policy_href} className="underline">{s.policy_label}</Link>
                        )}
                    </p>

                    <div className="flex shrink-0 flex-wrap gap-2">
                        {hasChoices && (
                            <button type="button" onClick={() => {
                                setChoices({ analytics: consent?.analytics ?? false, marketing: consent?.marketing ?? false });
                                setCustomizing(true);
                            }} className="h-11 px-3 text-sm text-slate-600 underline hover:text-slate-900">
                                {s.customize_label}
                            </button>
                        )}
                        <button type="button" onClick={() => save(false, false)} className={outline}>{s.reject_label}</button>
                        <button type="button" onClick={() => save(true, true)} className={solid}>{s.accept_label}</button>
                    </div>
                </div>
            ) : (
                <div>
                    <ul className="space-y-4">
                        <li className="flex items-start justify-between gap-4">
                            <div>
                                <p className="font-medium">{s.essential_label}</p>
                                <p className="text-sm text-slate-600">{s.essential_description}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{t('Always on')}</span>
                        </li>

                        {(['analytics', 'marketing'] as const)
                            .filter((key) => s.categories[key].enabled)
                            .map((key) => (
                                <li key={key} className="flex items-start justify-between gap-4">
                                    <label htmlFor={`consent-${key}`} className="cursor-pointer">
                                        <span className="block font-medium">{s.categories[key].label}</span>
                                        <span className="block text-sm text-slate-600">{s.categories[key].description}</span>
                                    </label>
                                    <input
                                        id={`consent-${key}`}
                                        type="checkbox"
                                        role="switch"
                                        aria-checked={choices[key]}
                                        checked={choices[key]}
                                        onChange={(e) => setChoices({ ...choices, [key]: e.target.checked })}
                                        className="mt-1 size-5 shrink-0 accent-[#5b4f9a]"
                                    />
                                </li>
                            ))}
                    </ul>

                    <div className="mt-5 flex flex-wrap justify-end gap-2">
                        <button type="button" onClick={() => save(choices.analytics, choices.marketing)} className={outline}>
                            {s.save_label}
                        </button>
                        <button type="button" onClick={() => save(true, true)} className={solid}>{s.accept_label}</button>
                    </div>
                </div>
            )}
        </section>
    );
}
