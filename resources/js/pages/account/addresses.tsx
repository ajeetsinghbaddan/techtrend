import AddressBlock from '@/components/account/address-block';
import AddressForm from '@/components/account/address-form';
import AccountLayout from '@/layouts/account-layout';
import { useT } from '@/lib/i18n';
import type { SavedAddress } from '@/types/account';
import { router, usePage } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';

type Props = { addresses: SavedAddress[]; maxAddresses: number };

export default function AccountAddresses({ addresses, maxAddresses }: Props) {
    const t = useT();
    const errors = usePage<{ errors: Record<string, string> }>().props.errors;
    const [editing, setEditing] = useState<number | 'new' | null>(null);

    const canAdd = addresses.length < maxAddresses;

    const remove = (address: SavedAddress) => {
        if (confirm(t('Delete this address?'))) {
            router.delete(`/account/addresses/${address.id}`, { preserveScroll: true });
        }
    };

    const makeDefault = (address: SavedAddress, type: 'shipping' | 'billing') =>
        router.post(`/account/addresses/${address.id}/default/${type}`, {}, { preserveScroll: true });

    return (
        <AccountLayout
            title={t('Addresses')}
            actions={canAdd && editing === null && (
                <button type="button" onClick={() => setEditing('new')}
                    className="flex h-11 items-center gap-2 rounded-full bg-[#1f2230] px-5 text-sm font-medium text-white hover:bg-black">
                    <Plus className="size-4" aria-hidden /> {t('Add address')}
                </button>
            )}
        >
            {errors.address && <p role="alert" className="mb-6 text-sm text-red-600">{errors.address}</p>}

            {editing === 'new' && <div className="mb-8"><AddressForm onDone={() => setEditing(null)} /></div>}

            {addresses.length === 0 && editing === null ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                    <p className="text-slate-600">{t('No saved addresses yet.')}</p>
                    <p className="mt-1 text-sm text-slate-500">{t('Save an address to check out faster.')}</p>
                </div>
            ) : (
                <ul className="grid gap-4 md:grid-cols-2">
                    {addresses.map((address) => editing === address.id ? (
                        <li key={address.id} className="md:col-span-2">
                            <AddressForm address={address} onDone={() => setEditing(null)} />
                        </li>
                    ) : (
                        <li key={address.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="flex flex-wrap items-center gap-2">
                                {address.label && <p className="font-semibold">{address.label}</p>}
                                {address.is_default_shipping && (
                                    <span className="rounded-full bg-[#f0eefa] px-2.5 py-0.5 text-xs text-[#3f3775]">{t('Default delivery')}</span>
                                )}
                                {address.is_default_billing && (
                                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">{t('Default billing')}</span>
                                )}
                            </div>

                            <AddressBlock address={address} className="mt-3 flex-1" />

                            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-sm">
                                <button type="button" onClick={() => setEditing(address.id)} className="font-medium underline">{t('Edit')}</button>
                                {!address.is_default_shipping && (
                                    <button type="button" onClick={() => makeDefault(address, 'shipping')} className="text-slate-600 hover:text-slate-900">
                                        {t('Use for delivery')}
                                    </button>
                                )}
                                {!address.is_default_billing && (
                                    <button type="button" onClick={() => makeDefault(address, 'billing')} className="text-slate-600 hover:text-slate-900">
                                        {t('Use for billing')}
                                    </button>
                                )}
                                <button type="button" onClick={() => remove(address)} className="ml-auto text-slate-500 hover:text-red-600">
                                    {t('Delete')}
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {!canAdd && (
                <p className="mt-6 text-sm text-slate-500">
                    {t('You can save up to :count addresses.', { count: maxAddresses })}
                </p>
            )}
        </AccountLayout>
    );
}
