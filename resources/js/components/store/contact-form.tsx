import { useT } from '@/lib/i18n';
import { useForm } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';

const field = 'h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base outline-none focus:border-[#5b4f9a] focus:ring-2 focus:ring-[#5b4f9a]/20';

export default function ContactForm() {
    const t = useT();
    const [sent, setSent] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        subject: '',
        order_number: '',
        message: '',
        website: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/contact-messages', {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setSent(true);
            },
        });
    };

    if (sent) {
        return (
            <div role="status" className="mt-8 rounded-2xl bg-[#f0eefa] p-6 text-[#3f3775]">
                <p className="font-medium">{t('Thanks, your message is on its way.')}</p>
                <p className="mt-1 text-sm">{t('We usually reply within one working day.')}</p>
            </div>
        );
    }

    return (
        <form onSubmit={submit} noValidate className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold">{t('Send us a message')}</h2>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label htmlFor="c-name" className="text-sm font-medium">{t('Name')}</label>
                    <input id="c-name" className={`${field} mt-1`} autoComplete="name" value={data.name}
                        onChange={(e) => setData('name', e.target.value)} aria-invalid={Boolean(errors.name)} />
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                </div>
                <div>
                    <label htmlFor="c-email" className="text-sm font-medium">{t('Email')}</label>
                    <input id="c-email" type="email" className={`${field} mt-1`} autoComplete="email" value={data.email}
                        onChange={(e) => setData('email', e.target.value)} aria-invalid={Boolean(errors.email)} />
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                <div>
                    <label htmlFor="c-subject" className="text-sm font-medium">{t('Subject')}</label>
                    <input id="c-subject" className={`${field} mt-1`} value={data.subject}
                        onChange={(e) => setData('subject', e.target.value)} />
                    <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
                </div>
                <div>
                    <label htmlFor="c-order" className="text-sm font-medium">{t('Order number (optional)')}</label>
                    <input id="c-order" className={`${field} mt-1 font-mono`} placeholder="TT-…" value={data.order_number}
                        onChange={(e) => setData('order_number', e.target.value)} />
                    <p className="mt-1 text-sm text-red-600">{errors.order_number}</p>
                </div>
            </div>

            <div>
                <label htmlFor="c-message" className="text-sm font-medium">{t('Message')}</label>
                <textarea id="c-message" rows={6} value={data.message}
                    onChange={(e) => setData('message', e.target.value)} aria-invalid={Boolean(errors.message)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-[#5b4f9a] focus:ring-2 focus:ring-[#5b4f9a]/20" />
                <p className="mt-1 text-sm text-red-600">{errors.message}</p>
            </div>

            {/* Honeypot: hidden from people, filled in by bots */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
                value={data.website} onChange={(e) => setData('website', e.target.value)}
                className="absolute -left-[9999px] h-px w-px opacity-0" />

            <button type="submit" disabled={processing}
                className="h-12 rounded-full bg-[#1f2230] px-8 font-medium text-white hover:bg-black disabled:opacity-60">
                {processing ? t('Sending…') : t('Send message')}
            </button>

            <p className="text-xs text-slate-500">
                {t('We only use your details to answer your message.')}{' '}
                <a href="/privacy" className="underline">{t('Privacy policy')}</a>
            </p>
        </form>
    );
}
