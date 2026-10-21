import type { ProductCardData } from '@/types/catalog-public';
import { Link } from '@inertiajs/react';
import { Star } from 'lucide-react';
import WishlistButton from '@/components/store/wishlist-button';

function Stars({ rating }: { rating: number }) {
    return (
        <span className="flex items-center gap-0.5" aria-hidden>
            {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={`size-3.5 ${n <= Math.round(rating) ? 'fill-[#5b4f9a] text-[#5b4f9a]' : 'text-slate-300'}`} />
            ))}
        </span>
    );
}

export default function ProductCard({ product }: { product: ProductCardData }) {
    return (
        <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <Link href={`/products/${product.slug}`} className="block">
                <div className="relative bg-slate-100">
                    {product.image_url ? (
                        <img src={product.image_url} alt={product.image_alt} loading="lazy"
                            className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                    ) : (
                        <div className="aspect-square w-full bg-gradient-to-br from-[#5b4f9a] to-[#1f2230]" aria-hidden />
                    )}

                    {product.badge && (
                        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 font-mono text-[11px] tracking-wider uppercase text-slate-700">
                            {product.badge}
                        </span>
                    )}

                    {product.percent_off !== null && (
                        <span className="absolute bottom-3 right-3 rounded-full bg-[#1f2230] px-2.5 py-1 font-mono text-xs text-white">
                            −{product.percent_off}%
                        </span>
                    )}
                </div>

                <div className="p-4">
                    {product.price && (
                        <p className="flex flex-wrap items-baseline gap-2">
                            <span className="font-mono text-lg text-[#1f2230]">{product.price.formatted}</span>
                            {product.compare_at && (
                                <span className="font-mono text-sm text-slate-400 line-through">
                                    {product.compare_at.formatted}
                                </span>
                            )}
                        </p>
                    )}

                    <h3 className="mt-1.5 text-[15px] leading-snug font-medium text-[#1f2230] group-hover:underline">
                        {product.name}
                    </h3>

                    {product.rating !== null && (
                        <p className="mt-2 flex items-center gap-2 text-sm">
                            <Stars rating={product.rating} />
                            <span className="text-slate-700">{product.rating.toFixed(1)}</span>
                            <span className="text-slate-400">({product.reviews_count})</span>
                        </p>
                    )}

                    {product.swatches.length > 0 && (
                        <ul className="mt-3 flex gap-1.5" aria-label="Available colours">
                            {product.swatches.map((swatch) => (
                                <li key={swatch.hex}
                                    className="size-4 rounded-full border border-black/10"
                                    style={{ background: swatch.hex }}
                                    title={swatch.name ?? undefined}>
                                    <span className="sr-only">{swatch.name}</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    {!product.in_stock && (
                        <p className="mt-3 font-mono text-xs uppercase tracking-wider text-slate-400">Sold out</p>
                    )}
                </div>
            </Link>
            <WishlistButton slug={product.slug} name={product.name} className="absolute right-3 top-3 z-10" />
        </article>
    );
}
