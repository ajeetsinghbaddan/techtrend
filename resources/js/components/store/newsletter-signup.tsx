import type { NewsletterSettings } from '@/types/newsletter';
import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';

export default function NewsletterSignup({ newsletter }: { newsletter: NewsletterSettings }) {
    const { data, setData, post, processing, errors, wasSuccessful, reset } = useForm({
        email: '',
        website: '',
    });

    if (!newsletter.enabled) return null;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/newsletter', {
            preserveScroll: true,
            onSuccess: () => reset('email'),
        });
    };

    return (
        <section className="mx-auto max-w-[1500px] px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
            <div className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 lg:grid-cols-2 lg:items-center lg:gap-12 lg:p-10">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-[#1f2230] sm:text-3xl">
                        {newsletter.title}
                    </h2>
                    {newsletter.text && (
                        <p className="mt-2 max-w-md leading-relaxed text-slate-600">{newsletter.text}</p>
                    )}
                </div>

                <div>
                    {wasSuccessful ? (
                        <p role="status" className="rounded-2xl bg-[#f0eefa] px-5 py-4 text-sm text-[#3f3775]">
                            Almost there — check your inbox and tap the link to confirm.
                        </p>
                    ) : (
                        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row" noValidate>
                            <label htmlFor="newsletter-email" className="sr-only">Email address</label>
                            <input
                                id="newsletter-email"
                                type="email"
                                inputMode="email"
                                autoComplete="email"
                                required
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder={newsletter.placeholder}
                                aria-invalid={Boolean(errors.email)}
                                aria-describedby={errors.email ? 'newsletter-error' : undefined}
                                className="h-14 min-w-0 flex-1 rounded-full border border-slate-200 bg-[#f6f7fb] px-6 text-base outline-none focus:border-[#5b4f9a] focus:ring-2 focus:ring-[#5b4f9a]/20"
                            />

                            {/* Honeypot: hidden from people, filled in by bots */}
                            <input
                                type="text"
                                name="website"
                                tabIndex={-1}
                                autoComplete="off"
                                aria-hidden="true"
                                value={data.website}
                                onChange={(e) => setData('website', e.target.value)}
                                className="absolute -left-[9999px] h-px w-px opacity-0"
                            />

                            <button
                                type="submit"
                                disabled={processing}
                                className="h-14 shrink-0 rounded-full bg-[#1f2230] px-8 font-medium text-white transition-colors hover:bg-black disabled:opacity-60"
                            >
                                {processing ? 'Sending…' : newsletter.button}
                            </button>
                        </form>
                    )}

                    {errors.email && (
                        <p id="newsletter-error" className="mt-2 px-2 text-sm text-red-600">{errors.email}</p>
                    )}
                    {errors.website && (
                        <p className="mt-2 px-2 text-sm text-red-600">Something went wrong. Please try again.</p>
                    )}
                    {!wasSuccessful && (
                        <p className="mt-3 px-2 text-xs text-slate-500">
                            We'll send one email to confirm. See our <a href="/privacy" className="underline">privacy policy</a>.
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}
