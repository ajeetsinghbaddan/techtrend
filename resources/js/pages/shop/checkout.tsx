import StoreLayout from '@/layouts/store-layout';
import { major, track } from '@/lib/ecommerce';
import { xsrfToken } from '@/lib/http';
import { rich, useT } from '@/lib/i18n';
import type { MoneyValue } from '@/types/catalog-public';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Banknote, Lock } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

type Line = {
    id: number;
    slug?: string;
    name: string;
    variant_label: string;
    image_url: string | null;
    quantity: number;
    line_total: MoneyValue;
};

type ShippingMethod = {
    key: string;
    label: string;
    days: string;
    cost: MoneyValue;
    free: boolean;
    free_over: MoneyValue | null;
};

type PaymentMethod = {
    key: string;
    label: string;
    description: string | null;
};

type Totals = {
    tax_rate: number;
    tax_inclusive: boolean;
    tax_label: string;
    display: {
        subtotal: MoneyValue;
        shipping: MoneyValue;
        tax: MoneyValue;
        total: MoneyValue;
    };
};

type Address = {
    first_name: string;
    last_name: string;
    line1: string;
    line2: string;
    postcode: string;
    city: string;
    country: string;
    phone: string;
};

type AddressKey = 'shipping_address' | 'billing_address';

type SavedAddress = {
    id: number;
    label: string | null;
    is_default_shipping: boolean;
    is_default_billing: boolean;
    address: Address;
};

type CheckoutForm = {
    email: string;
    shipping_address: Address;
    billing_same: boolean;
    billing_address: Address;
    shipping_method: string;
    payment_method: string;
    notes: string;
    terms: boolean;
    save_address: boolean;
};

type Props = {
    cart: { lines: Line[]; count: number; subtotal: MoneyValue };
    region: string;
    countries: { code: string; label: string }[];
    shippingMethods: ShippingMethod[];
    paymentMethods: PaymentMethod[];
    totals: Totals;
    user: { name: string; email: string; phone: string | null } | null;
    savedAddresses: SavedAddress[];
};

type SharedProps = {
    flash?: { quote?: Totals };
    regions: Record<string, { currency: string }>;
};

const emptyAddress = (country: string): Address => ({
    first_name: '', last_name: '', line1: '', line2: '',
    postcode: '', city: '', country, phone: '',
});

/** Two addresses are "the same place" when the parts that identify it match. */
const sameAddress = (a: Address, b: Address) =>
    a.first_name === b.first_name && a.last_name === b.last_name &&
    a.line1 === b.line1 && a.postcode === b.postcode &&
    a.city === b.city && a.country === b.country;

const looksLikeEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value.trim());

const field =
    'h-14 w-full rounded-xl border border-slate-200 bg-white px-5 text-base outline-none focus:border-[#5b4f9a] focus:ring-2 focus:ring-[#5b4f9a]/20';

export default function Checkout({
    cart, region, countries, shippingMethods, paymentMethods, totals, user, savedAddresses = [],
}: Props) {
    const t = useT();
    const { flash, regions } = usePage<SharedProps>().props;
    const shown = flash?.quote ?? totals;
    const currency = regions[region]?.currency ?? 'USD';

    const [firstName, ...rest] = (user?.name ?? '').split(' ');

    // Start from the customer's default addresses, when they have them.
    const defaultShipping = savedAddresses.find((a) => a.is_default_shipping)?.address;
    const defaultBilling = savedAddresses.find((a) => a.is_default_billing)?.address;

    const { data, setData, post, processing, errors } = useForm<CheckoutForm>({
        email: user?.email ?? '',
        shipping_address: defaultShipping
            ? { ...defaultShipping }
            : {
                ...emptyAddress(region),
                first_name: firstName ?? '',
                last_name: rest.join(' '),
                phone: user?.phone ?? '',
            },
        billing_same: !defaultBilling || !defaultShipping || sameAddress(defaultShipping, defaultBilling),
        billing_address: defaultBilling ? { ...defaultBilling } : emptyAddress(region),
        shipping_method: shippingMethods[0]?.key ?? 'standard',
        payment_method: paymentMethods[0]?.key ?? '',
        notes: '',
        terms: false,
        save_address: savedAddresses.length === 0,
    });

    const err = errors as Record<string, string>;
    const noPaymentMethods = paymentMethods.length === 0;
    const payingCash = data.payment_method === 'cod';

    /* ---------- analytics ---------- */

    // The bag's items in GA4's format, shared by every checkout event.
    const analyticsItems = useMemo(() => cart.lines.map((line) => ({
        item_id: line.slug ?? line.name,
        item_name: line.name,
        item_variant: line.variant_label || undefined,
        price: major(line.line_total.minor / line.quantity),
        quantity: line.quantity,
    })), [cart.lines]);

    // Once, when checkout opens.
    useEffect(() => {
        track('begin_checkout', {
            currency,
            value: major(totals.display.subtotal.minor),
            items: analyticsItems,
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /* ---------- bag reminders (guests only) ---------- */

    const [remindMe, setRemindMe] = useState(false);

    // What the server last heard from us, so we don't send the same thing twice.
    const lastSent = useRef<{ email: string; consent: boolean } | null>(null);

    /** Save the guest's email and choice, so a reminder can be sent if they don't finish. */
    const captureEmail = (email: string, consent: boolean) => {
        if (user || !looksLikeEmail(email)) return;

        const clean = email.trim().toLowerCase();
        const previous = lastSent.current;

        // Nothing new to say: same email and same choice as last time.
        if (previous && previous.email === clean && previous.consent === consent) return;

        // Never agreed, still not agreeing: nothing to store or withdraw.
        if (!consent && !previous?.consent) return;

        lastSent.current = { email: clean, consent };

        fetch('/checkout/email', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-XSRF-TOKEN': xsrfToken(),
            },
            body: JSON.stringify({ email: clean, consent }),
        }).catch(() => {
            // A reminder is a nice-to-have: never block checkout. Allow a retry next time.
            lastSent.current = previous;
        });
    };

    const toggleReminder = (checked: boolean) => {
        setRemindMe(checked);
        captureEmail(data.email, checked);
    };

    // Re-price on the server whenever the shipping method changes.
    useEffect(() => {
        router.post('/checkout/quote', { shipping_method: data.shipping_method },
            { preserveScroll: true, preserveState: true });
    }, [data.shipping_method]);

    const setAddress = (key: AddressKey, patch: Partial<Address>) =>
        setData(key, { ...data[key], ...patch });

    const submit = (e: FormEvent) => {
        e.preventDefault();

        // The shopper's final choices, sent just before the order is placed.
        const value = major(shown.display.total.minor);
        track('add_shipping_info', { currency, value, shipping_tier: data.shipping_method, items: analyticsItems });
        track('add_payment_info', { currency, value, payment_type: data.payment_method, items: analyticsItems });

        post('/checkout', { preserveScroll: true });
    };

    // Saved addresses as one-click cards; the matching one is highlighted.
    const picker = (prefix: AddressKey) => savedAddresses.length > 0 && (
        <div className="flex flex-wrap gap-2">
            {savedAddresses.map((saved) => {
                const active = sameAddress(data[prefix], saved.address);
                return (
                    <button key={saved.id} type="button" aria-pressed={active}
                        onClick={() => setData(prefix, { ...saved.address })}
                        className={`rounded-xl border px-4 py-2 text-left text-sm ${
                            active ? 'border-[#5b4f9a] bg-[#f0eefa]' : 'border-slate-200 bg-white hover:border-slate-400'
                        }`}>
                        <span className="block font-medium">
                            {saved.label || `${saved.address.first_name} ${saved.address.last_name}`}
                        </span>
                        <span className="block text-xs text-slate-500">
                            {saved.address.line1}, {saved.address.postcode} {saved.address.city}
                        </span>
                    </button>
                );
            })}
        </div>
    );

    // A plain function, not a component: calling it keeps the same inputs
    // between renders, so they don't lose focus while typing.
    const addressFields = (prefix: AddressKey) => {
        const address = data[prefix];
        const set = (patch: Partial<Address>) => setAddress(prefix, patch);

        const input = (key: keyof Address, label: string, autoComplete: string, type = 'text') => (
            <div>
                <label htmlFor={`${prefix}_${key}`} className="sr-only">{label}</label>
                <input id={`${prefix}_${key}`} type={type} className={field} placeholder={label}
                    autoComplete={autoComplete} value={address[key]}
                    onChange={(e) => set({ [key]: e.target.value })} />
                <p className="mt-1 text-sm text-red-600">{err[`${prefix}.${key}`]}</p>
            </div>
        );

        return (
            <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                    {input('first_name', t('First name'), 'given-name')}
                    {input('last_name', t('Last name'), 'family-name')}
                </div>

                {input('line1', t('Street and number'), 'address-line1')}
                {input('line2', t('Apartment, suite (optional)'), 'address-line2')}

                <div className="grid gap-3 sm:grid-cols-3">
                    {input('postcode', t('Postcode'), 'postal-code')}
                    {input('city', t('City'), 'address-level2')}
                    <div>
                        <label htmlFor={`${prefix}_country`} className="sr-only">{t('Country')}</label>
                        <select id={`${prefix}_country`} className={field} autoComplete="country"
                            value={address.country} onChange={(e) => set({ country: e.target.value })}>
                            {countries.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                        </select>
                        <p className="mt-1 text-sm text-red-600">{err[`${prefix}.country`]}</p>
                    </div>
                </div>

                {prefix === 'shipping_address' && input('phone', t('Phone (for the courier)'), 'tel', 'tel')}
            </div>
        );
    };

    const sectionLabel = (n: number, text: string) => (
        <h2 className="font-mono text-xs tracking-[0.15em] text-slate-500 uppercase">
            {n} — {text}
        </h2>
    );

    const radioCard = (active: boolean) =>
        `flex cursor-pointer items-center gap-4 rounded-2xl border p-5 ${
            active ? 'border-[#5b4f9a] bg-[#f0eefa]' : 'border-slate-200 bg-white'
        }`;

    return (
        <StoreLayout>
            <Head title={t('Checkout')} />

            <form onSubmit={submit} className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
                <div className="flex flex-wrap items-baseline gap-4">
                    <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t('Checkout')}</h1>
                    <p className="font-mono text-sm text-slate-500">
                        {countries.find((c) => c.code === region)?.label}
                        {shown.tax_inclusive && ` · ${t('incl. :rate% :label', { rate: shown.tax_rate, label: shown.tax_label })}`}
                    </p>
                </div>

                {err.cart && (
                    <p role="alert" className="mt-6 rounded-xl bg-red-50 px-5 py-4 text-sm text-red-700">{err.cart}</p>
                )}

                <div className="mt-10 gap-10 lg:flex lg:items-start">
                    {/* Left: the form */}
                    <div className="min-w-0 flex-1 space-y-10">
                        <section className="space-y-3">
                            {sectionLabel(1, t('Contact'))}
                            <label htmlFor="email" className="sr-only">{t('Email')}</label>
                            <input id="email" type="email" className={field} placeholder={t('Email')}
                                autoComplete="email" value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                onBlur={(e) => captureEmail(e.target.value, remindMe)} />
                            <p className="text-sm text-red-600">{err.email}</p>
                            <p className="text-xs text-slate-500">{t('We send your receipt and tracking here.')}</p>

                            {!user && (
                                <label className="flex items-start gap-2 text-sm text-slate-600">
                                    <input type="checkbox" checked={remindMe} className="mt-0.5 size-4 accent-[#5b4f9a]"
                                        onChange={(e) => toggleReminder(e.target.checked)} />
                                    <span>{t("Email me a reminder if I don't finish my order")}</span>
                                </label>
                            )}
                        </section>

                        <section className="space-y-3">
                            {sectionLabel(2, t('Delivery address'))}
                            {picker('shipping_address')}
                            {addressFields('shipping_address')}
                            {user && (
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={data.save_address}
                                        onChange={(e) => setData('save_address', e.target.checked)} />
                                    {t('Save this address to my account')}
                                </label>
                            )}
                        </section>

                        <section className="space-y-3">
                            {sectionLabel(3, t('Delivery method'))}
                            <div className="space-y-3">
                                {shippingMethods.map((method) => (
                                    <label key={method.key} className={radioCard(data.shipping_method === method.key)}>
                                        <input type="radio" name="shipping_method" value={method.key}
                                            checked={data.shipping_method === method.key}
                                            onChange={() => setData('shipping_method', method.key)}
                                            className="size-4 accent-[#5b4f9a]" />
                                        <span className="min-w-0 flex-1">
                                            <span className="font-medium">{method.label}</span>
                                            <span className="text-slate-500"> — {method.days}</span>
                                            {method.free_over && (
                                                <span className="mt-0.5 block text-xs text-slate-500">
                                                    {t('Free over :amount', { amount: method.free_over.formatted })}
                                                </span>
                                            )}
                                        </span>
                                        <span className="shrink-0 font-mono">
                                            {method.free ? t('Free') : method.cost.formatted}
                                        </span>
                                    </label>
                                ))}
                            </div>
                            <p className="text-sm text-red-600">{err.shipping_method}</p>
                        </section>

                        <section className="space-y-3">
                            {sectionLabel(4, t('Payment method'))}

                            {noPaymentMethods ? (
                                <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                                    {t('No payment methods are available for your region yet. Please contact us to complete your order.')}
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {paymentMethods.map((method) => (
                                        <label key={method.key} className={radioCard(data.payment_method === method.key)}>
                                            <input type="radio" name="payment_method" value={method.key}
                                                checked={data.payment_method === method.key}
                                                onChange={() => setData('payment_method', method.key)}
                                                className="size-4 shrink-0 accent-[#5b4f9a]" />
                                            <span className="min-w-0 flex-1">
                                                <span className="block font-medium">{method.label}</span>
                                                {method.description && (
                                                    <span className="mt-0.5 block text-sm text-slate-500">{method.description}</span>
                                                )}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            <p className="text-sm text-red-600">{err.payment_method}</p>

                            {!noPaymentMethods && (
                                <p className="flex items-center gap-2 text-xs text-slate-500">
                                    {payingCash ? (
                                        <>
                                            <Banknote className="size-4 shrink-0" aria-hidden />
                                            {t('You pay in cash when your order arrives.')}
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="size-4 shrink-0" aria-hidden />
                                            {t('You will pay securely on the next step. We never see or store your card details.')}
                                        </>
                                    )}
                                </p>
                            )}
                        </section>

                        <section className="space-y-3">
                            {sectionLabel(5, t('Billing address'))}
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={data.billing_same}
                                    onChange={(e) => setData('billing_same', e.target.checked)} />
                                {t('Same as delivery address')}
                            </label>
                            {!data.billing_same && (
                                <>
                                    {picker('billing_address')}
                                    {addressFields('billing_address')}
                                </>
                            )}
                        </section>

                        <section className="space-y-3">
                            <label htmlFor="notes" className="font-mono text-xs tracking-[0.15em] text-slate-500 uppercase">
                                {t('Order notes (optional)')}
                            </label>
                            <textarea id="notes" rows={3} value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-5 py-4 text-base" />
                            <p className="text-sm text-red-600">{err.notes}</p>
                        </section>
                    </div>

                    {/* Right: summary */}
                    <aside className="mt-10 w-full shrink-0 lg:mt-0 lg:w-[380px]">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:sticky lg:top-28">
                            <h2 className="font-mono text-xs tracking-[0.15em] text-slate-500 uppercase">
                                {t('Order summary')}
                            </h2>

                            <ul className="mt-5 space-y-4">
                                {cart.lines.map((line) => (
                                    <li key={line.id} className="flex items-center gap-3">
                                        {line.image_url ? (
                                            <img src={line.image_url} alt="" width={56} height={56} loading="lazy" decoding="async"
                                                className="size-14 rounded-lg object-cover" />
                                        ) : (
                                            <div className="size-14 rounded-lg bg-gradient-to-br from-[#5b4f9a] to-[#1f2230]" aria-hidden />
                                        )}
                                        <div className="min-w-0 flex-1 text-sm">
                                            <p className="truncate font-medium">{line.name}</p>
                                            <p className="font-mono text-xs text-slate-500">
                                                {line.variant_label && `${line.variant_label} · `}× {line.quantity}
                                            </p>
                                        </div>
                                        <span className="shrink-0 font-mono text-sm">{line.line_total.formatted}</span>
                                    </li>
                                ))}
                            </ul>

                            <dl className="mt-6 space-y-2 border-t border-slate-200 pt-5 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-slate-600">{t('Subtotal')}</dt>
                                    <dd className="font-mono">{shown.display.subtotal.formatted}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-slate-600">{t('Shipping')}</dt>
                                    <dd className="font-mono">
                                        {shown.display.shipping.minor === 0 ? t('Free') : shown.display.shipping.formatted}
                                    </dd>
                                </div>
                                {shown.tax_rate > 0 && (
                                    <div className="flex justify-between">
                                        <dt className="text-slate-600">
                                            {shown.tax_inclusive
                                                ? t('of which :label (:rate%)', { label: shown.tax_label, rate: shown.tax_rate })
                                                : t(':label (:rate%)', { label: shown.tax_label, rate: shown.tax_rate })}
                                        </dt>
                                        <dd className="font-mono">{shown.display.tax.formatted}</dd>
                                    </div>
                                )}
                            </dl>

                            <div className="mt-5 flex items-baseline justify-between border-t border-slate-200 pt-5">
                                <span className="font-medium">{t('Total')}</span>
                                <span className="font-mono text-2xl">{shown.display.total.formatted}</span>
                            </div>

                            <label className="mt-6 flex items-start gap-2.5 text-sm">
                                <input type="checkbox" checked={data.terms} className="mt-1"
                                    onChange={(e) => setData('terms', e.target.checked)} />
                                <span>
                                    {rich(t('I accept the :terms and have read the :withdrawal.'), {
                                        terms: <a href="/terms" className="underline">{t('terms')}</a>,
                                        withdrawal: <a href="/withdrawal" className="underline">{t('right of withdrawal')}</a>,
                                    })}
                                </span>
                            </label>
                            <p className="text-sm text-red-600">{err.terms}</p>

                            <button type="submit" disabled={processing || noPaymentMethods}
                                className="mt-5 h-14 w-full rounded-full bg-[#1f2230] font-medium text-white hover:bg-black disabled:bg-slate-400">
                                {processing
                                    ? t('Placing order…')
                                    : payingCash
                                        ? t('Place order — pay :total on delivery', { total: shown.display.total.formatted })
                                        : t('Place order — pay :total', { total: shown.display.total.formatted })}
                            </button>
                        </div>
                    </aside>
                </div>
            </form>
        </StoreLayout>
    );
}
