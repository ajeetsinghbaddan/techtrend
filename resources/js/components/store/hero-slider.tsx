import type { HeroSettings, HeroSlide } from '@/types/hero';
import { Link } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { A11y, Autoplay, Keyboard, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

import 'swiper/css';
import 'swiper/css/pagination';

function HeroButton({ href, label, primary }: { href: string; label: string; primary?: boolean }) {
    const className = primary
        ? 'inline-flex h-12 items-center gap-1.5 rounded-full bg-[#1f2230] px-6 text-sm font-medium text-white transition hover:bg-black sm:h-14 sm:px-8 sm:text-base'
        : 'inline-flex h-12 items-center rounded-full border border-slate-300 px-6 text-sm text-slate-800 transition hover:bg-white sm:h-14 sm:px-7 sm:text-base';

    const content = (
        <>
            {label}
            {primary && <ArrowUpRight className="size-4" aria-hidden />}
        </>
    );

    return href.startsWith('https://') ? (
        <a href={href} className={className} rel="noopener noreferrer">{content}</a>
    ) : (
        <Link href={href} className={className}>{content}</Link>
    );
}

function Slide({ slide, index }: { slide: HeroSlide; index: number }) {
    const Heading = index === 0 ? 'h1' : 'h2';

    return (
        <div className="grid items-center gap-8 px-6 py-6 sm:px-10 sm:pt-10 lg:grid-cols-2 lg:gap-12 xl:px-20 xl:py-20">
            <div className="order-2 lg:order-1">
                {slide.eyebrow && (
                    <p className="font-mono text-xs tracking-[0.2em] text-[#5b4f9a] uppercase sm:text-sm">
                        {slide.eyebrow}
                    </p>
                )}
                <Heading className="mt-4 text-4xl leading-[1.02] font-semibold tracking-tight whitespace-pre-line text-[#1f2230] sm:text-6xl xl:text-7xl">
                    {slide.title}
                </Heading>
                {slide.text && (
                    <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
                        {slide.text}
                    </p>
                )}
                <div className="mt-8 flex flex-wrap gap-3">
                    {slide.primary_label && slide.primary_href && (
                        <HeroButton href={slide.primary_href} label={slide.primary_label} primary />
                    )}
                    {slide.secondary_label && slide.secondary_href && (
                        <HeroButton href={slide.secondary_href} label={slide.secondary_label} />
                    )}
                </div>
            </div>

            <div className="order-1 lg:order-2">
                {slide.image_url ? (
                    <img
                        src={slide.image_url}
                        alt=""
                        loading={index === 0 ? 'eager' : 'lazy'}
                        fetchPriority={index === 0 ? 'high' : 'auto'}
                        className="aspect-[4/3] w-full rounded-2xl object-cover lg:aspect-[5/4]"
                    />
                ) : (
                    <div className="aspect-[4/3] w-full rounded-2xl bg-gradient-to-br from-[#5b4f9a] to-[#1f2230] lg:aspect-[5/4]" aria-hidden />
                )}
            </div>
        </div>
    );
}

export default function HeroSlider({ hero }: { hero: HeroSettings }) {
    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReducedMotion(query.matches);
        const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
        query.addEventListener('change', onChange);
        return () => query.removeEventListener('change', onChange);
    }, []);

    const many = hero.slides.length > 1;
    const autoplay = many && hero.autoplay && !reducedMotion
        ? { delay: hero.delay, pauseOnMouseEnter: true, disableOnInteraction: false }
        : false;

    return (
        <section className="mx-auto max-w-[1500px] px-4 pt-4 sm:px-6 lg:px-10" aria-roledescription="carousel" aria-label="Featured">
            <div className="hero-swiper overflow-hidden rounded-3xl bg-gradient-to-br from-[#eef0f8] to-[#e4e2f7]">
                <Swiper
                    modules={[A11y, Autoplay, Keyboard, Pagination]}
                    slidesPerView={1}
                    loop={many}
                    speed={600}
                    autoplay={autoplay}
                    keyboard={{ enabled: true }}
                    pagination={many ? { clickable: true } : false}
                    a11y={{ enabled: true }}
                    className="pb-10 sm:pb-12"
                >
                    {hero.slides.map((slide, i) => (
                        <SwiperSlide key={slide.id}>
                            <Slide slide={slide} index={i} />
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>
        </section>
    );
}
