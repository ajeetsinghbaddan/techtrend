import { useT } from '@/lib/i18n';
import type { SavedAddress } from '@/types/account';
import type { Region } from '@/types/header';
import { useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';

type FormData = {
    label: string;
    first_name: string;
    last_name: string;
    line1: string;
    line2: string;
    postcode: string;
    city: string;
    country: string;
    phone: string;
    default_shipping: boolean;
    default_billing: boolean;
};

const field = 'h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none focus:border-[#5b4f9a] focus:ring-2 focus:ring-[#5b4f9a]/20';

export default function AddressForm({ address, onDone }: { address?: SavedAddress; onDone: () => void }) {
    const t = useT();
    const { regions, region } = usePage<{ regions: Record<string, Region>; region: string }>().props;

    const { data, setData, post, put, processing, errors } = useForm<FormData>({
        label: address?.label ?? '',
        first_name: address?.first_name ?? '',
        last_name: address?.last_name ?? '',
        line1: address?.line1 ?? '',
        line2: address?.line2 ?? '',
        postcode: address?.postcode ?? '',
        city: address?.city ?? '',
        country: address?.country ?? region,
        phone: address?.phone ?? '',
        default_shipping: address?.is_default_shipping ?? false,
        default_billing: address?.is_default_billing ?? false,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => onDone() };

        if (address) {
            put(`/account/addresses/${address.id}`, options);
        } else {
            post('/account/addresses', options);
        }
    };

    const input = (key: keyof FormData, label: string, autoComplete: string, optional = false) => (
        <div>
            <label htmlFor={`address_${key}`} className="text-sm font-medium">
                {label} {optional && <span className="font-normal text-slate-400">({t('optional')})</span>}
            </label>
            <input id={`address_${key}`} className={`${field} mt-1`} autoComplete={autoComplete}
                value={data[key] as string} onChange={(e) => setData(key, e.target.value)} />
            {errors[key] && <p className="mt-1 text-sm text-red-600">{errors[key]}</p>}
        </div>
    );

    return (
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-semibold">{address ? t('Edit address') : t('New address')}</h2>

            {input('label', t('Label, e.g. Home or Office'), 'off', true)}

            <div className="grid gap-4 sm:grid-cols-2">
                {input('first_name', t('First name'), 'given-name')}
                {input('last_name', t('Last name'), 'family-name')}
            </div>

            {input('line1', t('Street and number'), 'address-line1')}
            {input('line2', t('Apartment, suite'), 'address-line2', true)}

            <div className="grid gap-4 sm:grid-cols-3">
                {input('postcode', t('Postcode'), 'postal-code')}
                {input('city', t('City'), 'address-level2')}
                <div>
                    <label htmlFor="address_country" className="text-sm font-medium">{t('Country')}</label>
                    <select id="address_country" className={`${field} mt-1`} autoComplete="country"
                        value={data.country} onChange={(e) => setData('country', e.target.value)}>
                        {Object.entries(regions).map(([code, r]) => <option key={code} value={code}>{r.label}</option>)}
                    </select>
                    {errors.country && <p className="mt-1 text-sm text-red-600">{errors.country}</p>}
                </div>
            </div>

            {input('phone', t('Phone (for the courier)'), 'tel', true)}

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={data.default_shipping} disabled={address?.is_default_shipping}
                        onChange={(e) => setData('default_shipping', e.target.checked)} />
                    {t('Default delivery address')}
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={data.default_billing} disabled={address?.is_default_billing}
                        onChange={(e) => setData('default_billing', e.target.checked)} />
                    {t('Default billing address')}
                </label>
            </div>

            <div className="flex gap-3">
                <button type="submit" disabled={processing}
                    className="h-12 rounded-full bg-[#1f2230] px-7 font-medium text-white hover:bg-black disabled:opacity-60">
                    {processing ? t('Saving…') : t('Save address')}
                </button>
                <button type="button" onClick={onDone} className="h-12 rounded-full px-5 text-slate-600 hover:bg-slate-100">
                    {t('Cancel')}
                </button>
            </div>
        </form>
    );
}
