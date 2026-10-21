import StoreLayout from '@/layouts/store-layout';
import { useLocale, useT } from '@/lib/i18n';
import type { OrderSummary } from '@/types/account';
import { Head, router, usePage } from '@inertiajs/react';
import { Loader2, Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Method = { key: string; label: string; description: string | null };

type ClientAction =
    | { provider: 'razorpay'; key: string; order_id: string; amount: number; currency: string; name: string; description: string;
        prefill: Record<string, string>; verify_url: string }
    | { provider: 'paytm'; script: string; order_id: string; token: string; amount: string; verify_url: string };

type Props = {
    order: OrderSummary & { payment_method: string };
    methods: Method[];
    lastAttempt: { uuid: string; gateway: string; status: string } | null;
    expiresAt: string | null;
};

type PaytmCheckout = {
    onLoad: (callback: () => void) => void;
    init: (config: Record<string, unknown>) => Promise<void>;
    invoke: () => void;
    close: () => void;
};

declare global {
    interface Window {
        Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
        Paytm?: { CheckoutJS: PaytmCheckout };
    }
}

/** Load a third-party script once, and wait until it's ready. */
const scripts = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
    if (!scripts.has(src)) {
        scripts.set(src, new Promise((resolve, reject) => {
            const el = document.createElement('script');
            el.src = src;
            el.async = true;
            el.crossOrigin = 'anonymous';
            el.onload = () => resolve();
            el.onerror = () => {
                scripts.delete(src);
                reject(new Error(`Could not load ${src}`));
            };
            document.head.appendChild(el);
        }));
    }

    return scripts.get(src)!;
}

export default function PayPage({ order, methods, lastAttempt, expiresAt }: Props) {
    const t = useT();
    const locale = useLocale();
    const flash = usePage<{ flash?: { payment_notice?: string; payment_action?: ClientAction } }>().props.flash;
    const action = flash?.payment_action;

    const [selected, setSelected] = useState(
        methods.some((m) => m.key === order.payment_method) ? order.payment_method : methods[0]?.key ?? '',
    );
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const launched = useRef<string | null>(null);

    const verify = (url: string, data: Record<string, string> = {}) =>
        router.post(url, data, { onFinish: () => setBusy(false) });

    // When the server sends back a Razorpay or Paytm action, open that provider's window.
    useEffect(() => {
        if (!action || launched.current === action.verify_url) return;
        launched.current = action.verify_url;
        setBusy(true);
        setError(null);

        const fail = () => {
            setBusy(false);
            setError(t('The payment window could not be opened. Please try again.'));
        };

        if (action.provider === 'razorpay') {
            loadScript('https://checkout.razorpay.com/v1/checkout.js').then(() => {
                if (!window.Razorpay) return fail();
                new window.Razorpay({
                    key: action.key,
                    order_id: action.order_id,
                    amount: action.amount,
                    currency: action.currency,
                    name: action.name,
                    description: action.description,
                    prefill: action.prefill,
                    theme: { color: '#5b4f9a' },
                    handler: (response: Record<string, string>) => verify(action.verify_url, response),
                    modal: { ondismiss: () => setBusy(false) },
                }).open();
            }).catch(fail);
        }

        if (action.provider === 'paytm') {
            loadScript(action.script).then(() => {
                const paytm = window.Paytm?.CheckoutJS;
                if (!paytm) return fail();
                paytm.onLoad(() => {
                    paytm.init({
                        root: '',
                        flow: 'DEFAULT',
                        merchant: { redirect: false },
                        data: { orderId: action.order_id, token: action.token, tokenType: 'TXN_TOKEN', amount: action.amount },
                        handler: {
                            transactionStatus: () => {
                                paytm.close();
                                verify(action.verify_url);
                            },
                            notifyMerchant: (eventName: string) => {
                                if (eventName === 'APP_CLOSED') setBusy(false);
                            },
                        },
                    }).then(() => paytm.invoke()).catch(fail);
                });
            }).catch(fail);
        }
    }, [action]); // eslint-disable-line react-hooks/exhaustive-deps

    const pay = () => {
        setBusy(true);
        setError(null);
        launched.current = null;
        router.post(`/checkout/${order.number}/pay`, { gateway: selected }, {
            preserveScroll: true,
            onError: () => setBusy(false),
            onFinish: () => {
                // Redirect gateways leave the page; client gateways keep "busy" until their window closes.
                if (!['razorpay', 'paytm'].includes(selected)) setBusy(false);
            },
        });
    };

    const deadline = expiresAt
        ? new Date(expiresAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
        : null;
    const chosen = methods.find((m) => m.key === selected);

    return (
        <StoreLayout>
            <Head title={t('Complete your payment')} />

            <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t('Complete your payment')}</h1>
                <p className="mt-2 text-slate-600">
                    {t('Order :number', { number: order.number })} · <span className="font-mono">{order.total.formatted}</span>
                </p>

                {(flash?.payment_notice || error) && (
                    <p role="status" className="mt-6 rounded-xl bg-amber-50 px-5 py-4 text-sm text-amber-900">
                        {error ?? flash?.payment_notice}
                    </p>
                )}

                {deadline && (
                    <p className="mt-4 text-sm text-slate-500">
                        {t('Your items are reserved until :time. After that, the order is cancelled.', { time: deadline })}
                    </p>
                )}

                {methods.length === 0 ? (
                    <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
                        {t('No payment methods are available for this order right now. Please contact us.')}
                    </p>
                ) : (
                    <fieldset className="mt-8 space-y-3">
                        <legend className="font-mono text-xs tracking-[0.15em] text-slate-500 uppercase">{t('Payment method')}</legend>
                        {methods.map((m) => (
                            <label key={m.key}
                                className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-5 ${
                                    selected === m.key ? 'border-[#5b4f9a] bg-[#f0eefa]' : 'border-slate-200 bg-white'
                                }`}>
                                <input type="radio" name="gateway" value={m.key} checked={selected === m.key}
                                    onChange={() => setSelected(m.key)} disabled={busy} className="mt-1 size-4 accent-[#5b4f9a]" />
                                <span>
                                    <span className="block font-medium">{m.label}</span>
                                    {m.description && <span className="mt-0.5 block text-sm text-slate-500">{m.description}</span>}
                                </span>
                            </label>
                        ))}
                    </fieldset>
                )}

                {methods.length > 0 && (
                    <button type="button" onClick={pay} disabled={busy || !selected}
                        className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#1f2230] font-medium text-white hover:bg-black disabled:bg-slate-400">
                        {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Lock className="size-4" aria-hidden />}
                        {busy
                            ? t('Waiting for payment…')
                            : selected === 'cod'
                                ? t('Pay :total on delivery', { total: order.total.formatted })
                                : t('Pay :total with :method', { total: order.total.formatted, method: chosen?.label ?? '' })}
                    </button>
                )}

                {lastAttempt?.status === 'pending' && !busy && (
                    <button type="button" onClick={() => { setBusy(true); verify(`/payments/${lastAttempt.uuid}/verify`); }}
                        className="mt-4 w-full text-center text-sm text-slate-600 underline hover:text-slate-900">
                        {t("I've already paid: check again")}
                    </button>
                )}
            </div>
        </StoreLayout>
    );
}
