import TwoFactorSection from '@/components/account/two-factor-section';
import AccountLayout from '@/layouts/account-layout';
import { useT } from '@/lib/i18n';
import type { Region } from '@/types/header';
import { useForm, usePage } from '@inertiajs/react';
import { Download } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type Profile = {
    name: string;
    email: string;
    phone: string | null;
    preferred_locale: string | null;
    preferred_region: string | null;
    email_verified: boolean;
};

type Props = {
    profile: Profile;
    twoFactor: { enabled: boolean; confirmed: boolean };
};

const field = 'mt-1 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none focus:border-[#5b4f9a] focus:ring-2 focus:ring-[#5b4f9a]/20';
const card = 'rounded-2xl border border-slate-200 bg-white p-5 sm:p-6';
const button = 'h-12 rounded-full bg-[#1f2230] px-7 font-medium text-white hover:bg-black disabled:opacity-60';

export default function AccountSettings({ profile, twoFactor }: Props) {
    const t = useT();
    const { locales, regions } = usePage<{ locales: Record<string, string>; regions: Record<string, Region> }>().props;

    /* ---------- profile ---------- */
    const details = useForm({
        name: profile.name,
        email: profile.email,
        phone: profile.phone ?? '',
        preferred_locale: profile.preferred_locale ?? '',
        preferred_region: profile.preferred_region ?? '',
    });

    const saveDetails = (e: FormEvent) => {
        e.preventDefault();
        details.patch('/account/settings', { preserveScroll: true });
    };

    /* ---------- password ---------- */
    const password = useForm({ current_password: '', password: '', password_confirmation: '' });

    const savePassword = (e: FormEvent) => {
        e.preventDefault();
        password.put('/settings/password', {
            preserveScroll: true,
            onSuccess: () => password.reset(),
            onError: (errors) => {
                if (errors.password) password.reset('password', 'password_confirmation');
                if (errors.current_password) password.reset('current_password');
            },
        });
    };

    /* ---------- delete ---------- */
    const [confirmDelete, setConfirmDelete] = useState(false);
    const deletion = useForm({ password: '' });

    const deleteAccount = (e: FormEvent) => {
        e.preventDefault();
        deletion.delete('/settings/profile', { preserveScroll: true, onError: () => deletion.reset() });
    };

    const error = (message?: string) => message && <p className="mt-1 text-sm text-red-600">{message}</p>;

    return (
        <AccountLayout title={t('Settings')}>
            <div className="max-w-2xl space-y-8">
                {/* Details */}
                <form onSubmit={saveDetails} className={card}>
                    <h2 className="text-lg font-semibold">{t('Your details')}</h2>

                    <div className="mt-5 space-y-4">
                        <div>
                            <label htmlFor="name" className="text-sm font-medium">{t('Name')}</label>
                            <input id="name" className={field} autoComplete="name"
                                value={details.data.name} onChange={(e) => details.setData('name', e.target.value)} />
                            {error(details.errors.name)}
                        </div>

                        <div>
                            <label htmlFor="email" className="text-sm font-medium">{t('Email')}</label>
                            <input id="email" type="email" className={field} autoComplete="email"
                                value={details.data.email} onChange={(e) => details.setData('email', e.target.value)} />
                            {error(details.errors.email)}
                            {!profile.email_verified && (
                                <p className="mt-1 text-sm text-amber-700">{t('Not confirmed yet. Check your inbox for the link.')}</p>
                            )}
                            {details.data.email !== profile.email && (
                                <p className="mt-1 text-sm text-slate-500">{t("We'll send a confirmation link to the new address.")}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="phone" className="text-sm font-medium">
                                {t('Phone')} <span className="font-normal text-slate-400">({t('optional')})</span>
                            </label>
                            <input id="phone" type="tel" className={field} autoComplete="tel"
                                value={details.data.phone} onChange={(e) => details.setData('phone', e.target.value)} />
                            {error(details.errors.phone)}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="preferred_locale" className="text-sm font-medium">{t('Language')}</label>
                                <select id="preferred_locale" className={field} value={details.data.preferred_locale}
                                    onChange={(e) => details.setData('preferred_locale', e.target.value)}>
                                    <option value="">{t('Automatic')}</option>
                                    {Object.entries(locales).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="preferred_region" className="text-sm font-medium">{t('Shipping region')}</label>
                                <select id="preferred_region" className={field} value={details.data.preferred_region}
                                    onChange={(e) => details.setData('preferred_region', e.target.value)}>
                                    <option value="">{t('Automatic')}</option>
                                    {Object.entries(regions).map(([code, r]) => <option key={code} value={code}>{r.label}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={details.processing || !details.isDirty} className={`${button} mt-6`}>
                        {details.processing ? t('Saving…') : t('Save changes')}
                    </button>
                </form>

                {/* Password */}
                <form onSubmit={savePassword} className={card}>
                    <h2 className="text-lg font-semibold">{t('Password')}</h2>

                    <div className="mt-5 space-y-4">
                        <div>
                            <label htmlFor="current_password" className="text-sm font-medium">{t('Current password')}</label>
                            <input id="current_password" type="password" className={field} autoComplete="current-password"
                                value={password.data.current_password} onChange={(e) => password.setData('current_password', e.target.value)} />
                            {error(password.errors.current_password)}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="new_password" className="text-sm font-medium">{t('New password')}</label>
                                <input id="new_password" type="password" className={field} autoComplete="new-password"
                                    value={password.data.password} onChange={(e) => password.setData('password', e.target.value)} />
                                {error(password.errors.password)}
                            </div>
                            <div>
                                <label htmlFor="password_confirmation" className="text-sm font-medium">{t('Repeat new password')}</label>
                                <input id="password_confirmation" type="password" className={field} autoComplete="new-password"
                                    value={password.data.password_confirmation} onChange={(e) => password.setData('password_confirmation', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center gap-4">
                        <button type="submit" disabled={password.processing} className={button}>
                            {password.processing ? t('Saving…') : t('Change password')}
                        </button>
                        {password.recentlySuccessful && <p role="status" className="text-sm text-green-700">{t('Password changed.')}</p>}
                    </div>
                </form>

                {/* Two-factor: its own card, outside the password form */}
                <TwoFactorSection enabled={twoFactor.enabled} confirmed={twoFactor.confirmed} />

                {/* Privacy */}
                <section className={card}>
                    <h2 className="text-lg font-semibold">{t('Your data')}</h2>
                    <p className="mt-2 text-sm text-slate-600">
                        {t('Download a copy of everything we store about you: your details, addresses, orders, reviews and wishlist.')}
                    </p>
                    <a href="/account/settings/export"
                        className="mt-4 inline-flex h-11 items-center gap-2 rounded-full border border-slate-300 px-5 text-sm font-medium hover:bg-slate-50">
                        <Download className="size-4" aria-hidden /> {t('Download my data')}
                    </a>

                    <div className="mt-8 border-t border-slate-100 pt-6">
                        <h3 className="font-semibold text-red-700">{t('Delete account')}</h3>
                        <p className="mt-2 text-sm text-slate-600">
                            {t('This removes your account, addresses, reviews and wishlist for good. Orders are kept anonymously, because we must keep invoices by law.')}
                        </p>

                        {!confirmDelete ? (
                            <button type="button" onClick={() => setConfirmDelete(true)}
                                className="mt-4 h-11 rounded-full border border-red-300 px-5 text-sm font-medium text-red-700 hover:bg-red-50">
                                {t('Delete my account')}
                            </button>
                        ) : (
                            <form onSubmit={deleteAccount} className="mt-4 space-y-3">
                                <label htmlFor="delete_password" className="text-sm font-medium">
                                    {t('Enter your password to confirm')}
                                </label>
                                <input id="delete_password" type="password" className={field} autoComplete="current-password"
                                    value={deletion.data.password} onChange={(e) => deletion.setData('password', e.target.value)} />
                                {error(deletion.errors.password)}
                                <div className="flex gap-3">
                                    <button type="submit" disabled={deletion.processing}
                                        className="h-11 rounded-full bg-red-600 px-5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
                                        {t('Delete permanently')}
                                    </button>
                                    <button type="button" onClick={() => { setConfirmDelete(false); deletion.reset(); }}
                                        className="h-11 rounded-full px-5 text-sm text-slate-600 hover:bg-slate-100">
                                        {t('Cancel')}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </section>
            </div>
        </AccountLayout>
    );
}
