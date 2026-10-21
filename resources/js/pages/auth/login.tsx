import PasswordInput from '@/components/store/password-input';
import StoreLayout from '@/layouts/store-layout';
import { useT } from '@/lib/i18n';
import { Head, Link, useForm } from '@inertiajs/react';
import { Heart, Loader2, MapPin, Package, Star } from 'lucide-react';
import type { FormEvent } from 'react';

type Props = {
    canResetPassword: boolean;
    canRegister: boolean;
    status?: string | null;
};

const field =
    'h-12 w-full rounded-xl border bg-white px-4 outline-none focus:ring-2 focus:ring-[#5b4f9a]/20';

export default function Login({ canResetPassword, canRegister, status }: Props) {
    const t = useT();

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/login', { onFinish: () => reset('password') });
    };

    const benefits = [
        { icon: Package, text: t('Track your orders and see your order history') },
        { icon: MapPin, text: t('Save your addresses for a faster checkout') },
        { icon: Heart, text: t('Keep your wishlist on every device') },
        { icon: Star, text: t('Review the products you bought') },
    ];

    return (
        <StoreLayout>
            <Head title={t('Log in')} />

            <div className="mx-auto max-w-[1100px] px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
                <div className={`grid gap-8 ${canRegister ? 'lg:grid-cols-2 lg:gap-12' : 'mx-auto max-w-md'}`}>
                    {/* Log in */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                        <h1 className="text-3xl font-semibold tracking-tight">{t('Welcome back')}</h1>
                        <p className="mt-2 text-slate-600">{t('Log in to see your orders, addresses and wishlist.')}</p>

                        {status && (
                            <p role="status" className="mt-6 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">{status}</p>
                        )}

                        <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
                            <div>
                                <label htmlFor="email" className="text-sm font-medium">{t('Email')}</label>
                                <input id="email" type="email" value={data.email} required autoFocus
                                    autoComplete="email" inputMode="email"
                                    onChange={(e) => setData('email', e.target.value)}
                                    aria-invalid={errors.email ? true : undefined}
                                    aria-describedby={errors.email ? 'email-error' : undefined}
                                    className={`${field} mt-1 ${errors.email ? 'border-red-400' : 'border-slate-200 focus:border-[#5b4f9a]'}`} />
                                {errors.email && <p id="email-error" className="mt-1 text-sm text-red-600">{errors.email}</p>}
                            </div>

                            <div>
                                <div className="flex items-baseline justify-between gap-4">
                                    <label htmlFor="password" className="text-sm font-medium">{t('Password')}</label>
                                    {canResetPassword && (
                                        <Link href="/forgot-password" className="text-sm text-[#5b4f9a] hover:underline">
                                            {t('Forgot password?')}
                                        </Link>
                                    )}
                                </div>
                                <div className="mt-1">
                                    <PasswordInput id="password" value={data.password} autoComplete="current-password"
                                        onChange={(value) => setData('password', value)}
                                        invalid={Boolean(errors.password)}
                                        describedBy={errors.password ? 'password-error' : undefined} />
                                </div>
                                {errors.password && <p id="password-error" className="mt-1 text-sm text-red-600">{errors.password}</p>}
                            </div>

                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={data.remember} className="size-4 accent-[#5b4f9a]"
                                    onChange={(e) => setData('remember', e.target.checked)} />
                                {t('Keep me logged in')}
                            </label>

                            <button type="submit" disabled={processing}
                                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1f2230] font-medium text-white hover:bg-black disabled:opacity-60">
                                {processing && <Loader2 className="size-4 animate-spin" aria-hidden />}
                                {t('Log in')}
                            </button>
                        </form>

                        {canRegister && (
                            <p className="mt-6 text-center text-sm text-slate-600 lg:hidden">
                                {t("Don't have an account?")}{' '}
                                <Link href="/register" className="font-medium text-[#5b4f9a] hover:underline">{t('Create one')}</Link>
                            </p>
                        )}
                    </section>

                    {/* New customers */}
                    {canRegister && (
                        <aside className="hidden rounded-2xl bg-[#f0eefa] p-8 lg:block">
                            <h2 className="text-2xl font-semibold tracking-tight">{t('New here?')}</h2>
                            <p className="mt-2 text-slate-600">{t('Creating an account takes less than a minute.')}</p>

                            <ul className="mt-6 space-y-4">
                                {benefits.map(({ icon: Icon, text }) => (
                                    <li key={text} className="flex items-start gap-3">
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[#5b4f9a]">
                                            <Icon className="size-4" aria-hidden />
                                        </span>
                                        <span className="pt-1.5 text-slate-700">{text}</span>
                                    </li>
                                ))}
                            </ul>

                            <Link href="/register"
                                className="mt-8 inline-flex h-12 items-center rounded-full border border-[#1f2230] px-7 font-medium hover:bg-[#1f2230] hover:text-white">
                                {t('Create account')}
                            </Link>
                        </aside>
                    )}
                </div>
            </div>
        </StoreLayout>
    );
}
