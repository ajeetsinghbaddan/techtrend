import PasswordInput from '@/components/store/password-input';
import StoreLayout from '@/layouts/store-layout';
import { rich, useT } from '@/lib/i18n';
import { Head, Link, useForm } from '@inertiajs/react';
import { Heart, Loader2, MapPin, Package, Star } from 'lucide-react';
import type { FormEvent } from 'react';

const field =
    'h-12 w-full rounded-xl border bg-white px-4 outline-none focus:ring-2 focus:ring-[#5b4f9a]/20';

export default function Register() {
    const t = useT();

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/register', { onFinish: () => reset('password', 'password_confirmation') });
    };

    const inputClass = (hasError: boolean) =>
        `${field} mt-1 ${hasError ? 'border-red-400' : 'border-slate-200 focus:border-[#5b4f9a]'}`;

    const benefits = [
        { icon: Package, text: t('Track your orders and see your order history') },
        { icon: MapPin, text: t('Save your addresses for a faster checkout') },
        { icon: Heart, text: t('Keep your wishlist on every device') },
        { icon: Star, text: t('Review the products you bought') },
    ];

    return (
        <StoreLayout>
            <Head title={t('Create account')} />

            <div className="mx-auto max-w-[1100px] px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
                <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
                    {/* Why */}
                    <aside className="order-2 rounded-2xl bg-[#f0eefa] p-6 sm:p-8 lg:order-1">
                        <h2 className="text-2xl font-semibold tracking-tight">{t('Why create an account?')}</h2>
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

                        <p className="mt-8 text-sm text-slate-600">
                            {t('Already have an account?')}{' '}
                            <Link href="/login" className="font-medium text-[#5b4f9a] hover:underline">{t('Log in')}</Link>
                        </p>
                    </aside>

                    {/* Form */}
                    <section className="order-1 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 lg:order-2">
                        <h1 className="text-3xl font-semibold tracking-tight">{t('Create account')}</h1>
                        <p className="mt-2 text-slate-600">{t('It only takes a minute.')}</p>

                        <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
                            <div>
                                <label htmlFor="name" className="text-sm font-medium">{t('Full name')}</label>
                                <input id="name" value={data.name} required autoFocus autoComplete="name"
                                    onChange={(e) => setData('name', e.target.value)}
                                    aria-invalid={errors.name ? true : undefined}
                                    aria-describedby={errors.name ? 'name-error' : undefined}
                                    className={inputClass(Boolean(errors.name))} />
                                {errors.name && <p id="name-error" className="mt-1 text-sm text-red-600">{errors.name}</p>}
                            </div>

                            <div>
                                <label htmlFor="email" className="text-sm font-medium">{t('Email')}</label>
                                <input id="email" type="email" value={data.email} required
                                    autoComplete="email" inputMode="email"
                                    onChange={(e) => setData('email', e.target.value)}
                                    aria-invalid={errors.email ? true : undefined}
                                    aria-describedby={errors.email ? 'email-error' : 'email-hint'}
                                    className={inputClass(Boolean(errors.email))} />
                                {errors.email ? (
                                    <p id="email-error" className="mt-1 text-sm text-red-600">{errors.email}</p>
                                ) : (
                                    <p id="email-hint" className="mt-1 text-xs text-slate-500">{t("We'll send a link to confirm it.")}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="password" className="text-sm font-medium">{t('Password')}</label>
                                <div className="mt-1">
                                    <PasswordInput id="password" value={data.password} autoComplete="new-password" minLength={8}
                                        onChange={(value) => setData('password', value)}
                                        invalid={Boolean(errors.password)}
                                        describedBy={errors.password ? 'password-error' : 'password-hint'} />
                                </div>
                                {errors.password ? (
                                    <p id="password-error" className="mt-1 text-sm text-red-600">{errors.password}</p>
                                ) : (
                                    <p id="password-hint" className="mt-1 text-xs text-slate-500">{t('At least 8 characters.')}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="password_confirmation" className="text-sm font-medium">{t('Repeat password')}</label>
                                <div className="mt-1">
                                    <PasswordInput id="password_confirmation" value={data.password_confirmation}
                                        autoComplete="new-password" minLength={8}
                                        onChange={(value) => setData('password_confirmation', value)}
                                        invalid={Boolean(errors.password_confirmation)} />
                                </div>
                                {errors.password_confirmation && (
                                    <p className="mt-1 text-sm text-red-600">{errors.password_confirmation}</p>
                                )}
                            </div>

                            <p className="text-xs leading-relaxed text-slate-500">
                                {rich(t('By creating an account, you agree to our :terms and confirm you have read our :privacy.'), {
                                    terms: <Link href="/terms" className="underline">{t('terms')}</Link>,
                                    privacy: <Link href="/privacy" className="underline">{t('privacy policy')}</Link>,
                                })}
                            </p>

                            <button type="submit" disabled={processing}
                                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1f2230] font-medium text-white hover:bg-black disabled:opacity-60">
                                {processing && <Loader2 className="size-4 animate-spin" aria-hidden />}
                                {t('Create account')}
                            </button>
                        </form>
                    </section>
                </div>
            </div>
        </StoreLayout>
    );
}
