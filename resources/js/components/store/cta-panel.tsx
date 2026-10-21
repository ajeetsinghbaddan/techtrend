import type { CtaSettings } from '@/types/cta';
import { Link } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';

export default function CtaPanel({ cta }: { cta: CtaSettings }) {
    if (!cta.enabled) return null;

    const hasLink = Boolean(cta.label && cta.href);
    const buttonClass =
        'inline-flex h-12 items-center gap-1.5 rounded-full bg-[#f6f5f1] px-6 text-sm font-medium text-[#1f2230] transition-colors hover:bg-white sm:h-14 sm:px-7 sm:text-base';

    const button = (
        <>
            {cta.label}
            <ArrowUpRight className="size-4" aria-hidden />
        </>
    );

    return (
        <section className="mx-auto max-w-[1500px] px-4 pt-8 sm:px-6 sm:pt-12 lg:px-10">
            <div className="grid gap-10 rounded-3xl bg-gradient-to-br from-[#2a2a6a] via-[#312e7d] to-[#1f1f5a] p-6 sm:p-10 lg:grid-cols-2 lg:items-center lg:gap-16 lg:p-14">
                <div>
                    {cta.eyebrow && (
                        <p className="font-mono text-xs tracking-[0.2em] text-indigo-300 uppercase sm:text-sm">
                            {cta.eyebrow}
                        </p>
                    )}

                    <h2 className="mt-4 text-3xl leading-[1.08] font-semibold tracking-tight whitespace-pre-line text-white sm:text-4xl xl:text-5xl">
                        {cta.title}
                    </h2>

                    {cta.text && (
                        <p className="mt-4 max-w-md text-base leading-relaxed text-indigo-100/80 sm:text-lg">
                            {cta.text}
                        </p>
                    )}

                    {hasLink && (
                        <div className="mt-8">
                            {cta.href!.startsWith('https://') ? (
                                <a href={cta.href!} className={buttonClass} rel="noopener noreferrer">{button}</a>
                            ) : (
                                <Link href={cta.href!} className={buttonClass}>{button}</Link>
                            )}
                        </div>
                    )}
                </div>

                {cta.stats.length > 0 && (
                    <dl className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                        {cta.stats.map((stat, i) => (
                            <div key={i} className="rounded-2xl border border-white/15 bg-white/5 p-5 sm:p-6">
                                <dt className="sr-only">{stat.label}</dt>
                                <dd>
                                    <span className="block font-mono text-2xl text-white sm:text-3xl">{stat.value}</span>
                                    <span className="mt-1.5 block text-sm text-indigo-100/70">{stat.label}</span>
                                </dd>
                            </div>
                        ))}
                    </dl>
                )}
            </div>
        </section>
    );
}
