import ProductCard from '@/components/store/product-card';
import type { ProductRow as RowData } from '@/types/catalog-public';
import { Link } from '@inertiajs/react';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import { useRef } from 'react';

import 'swiper/css';

export default function ProductRowSection({ row }: { row: RowData }) {
    const prevRef = useRef<HTMLButtonElement>(null);
    const nextRef = useRef<HTMLButtonElement>(null);

    if (row.products.length === 0) return null;

    return (
        <section aria-label={row.title} className="mx-auto max-w-[1500px] px-4 pt-12 sm:px-6 sm:pt-16 lg:px-10">
            <div className="flex flex-wrap items-end justify-between gap-4 text-center sm:text-left">
                <div className="w-full sm:w-auto">
                    <h2 className="text-3xl font-semibold tracking-tight text-[#1f2230] sm:text-4xl">{row.title}</h2>
                    {row.subtitle && <p className="mt-2 text-slate-500">{row.subtitle}</p>}
                </div>

                {row.products.length > 4 && (
                    <div className="hidden gap-2 lg:flex">
                        <button ref={prevRef} type="button" aria-label={`Previous ${row.title}`}
                            className="flex size-10 items-center justify-center rounded-full border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40">
                            <ChevronLeft className="size-4" />
                        </button>
                        <button ref={nextRef} type="button" aria-label={`Next ${row.title}`}
                            className="flex size-10 items-center justify-center rounded-full border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40">
                            <ChevronRight className="size-4" />
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-8">
                <Swiper
                    modules={[Navigation]}
                    spaceBetween={16}
                    slidesPerView={1.25}
                    breakpoints={{
                        480: { slidesPerView: 2, spaceBetween: 16 },
                        768: { slidesPerView: 3, spaceBetween: 20 },
                        1024: { slidesPerView: 4, spaceBetween: 20 },
                    }}
                    onBeforeInit={(swiper) => {
                        if (typeof swiper.params.navigation === 'object') {
                            swiper.params.navigation.prevEl = prevRef.current;
                            swiper.params.navigation.nextEl = nextRef.current;
                        }
                    }}
                    navigation={{ prevEl: prevRef.current, nextEl: nextRef.current }}
                    className="-my-2 py-2"
                >
                    {row.products.map((product) => (
                        <SwiperSlide key={product.slug} className="h-auto">
                            <ProductCard product={product} />
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>

            {row.link_label && row.link_href && (
                <div className="mt-8 text-center">
                    <Link href={row.link_href}
                        className="inline-flex h-11 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-6 text-sm hover:bg-slate-50">
                        {row.link_label}
                        <ArrowUpRight className="size-4" aria-hidden />
                    </Link>
                </div>
            )}
        </section>
    );
}
