import BlogStrip from '@/components/store/blog-strip';
import CtaPanel from '@/components/store/cta-panel';
import FeatureStrip from '@/components/store/feature-strip';
import HeroSlider from '@/components/store/hero-slider';
import MarqueeBar from '@/components/store/marquee-bar';
import PromoGrid from '@/components/store/promo-grid';
import StoreLayout from '@/layouts/store-layout';
import type { BlogSettings, PostCard } from '@/types/blog';
import type { CtaSettings } from '@/types/cta';
import type { FeatureSettings } from '@/types/features';
import type { HeroSettings } from '@/types/hero';
import type { MarqueeSettings } from '@/types/marquee';
import type { PromoSettings } from '@/types/promos';
import { Head } from '@inertiajs/react';
import NewsletterSignup from '@/components/store/newsletter-signup';
import type { NewsletterSettings } from '@/types/newsletter';
import CollectionsStrip from '@/components/store/collections-strip';
import ProductRowSection from '@/components/store/product-row';
import type { ProductRow } from '@/types/catalog-public';

type Props = {
    hero: HeroSettings;
    features: FeatureSettings;
    promos: PromoSettings;
    marquee: MarqueeSettings;
    explore: PromoSettings;
    cta: CtaSettings;
    blog: BlogSettings;
    posts: PostCard[];
    newsletter: NewsletterSettings;
    collectionsStrip: { enabled: boolean; title: string; subtitle: string | null; link_label: string | null };
    collections: { name: string; slug: string; image_url: string | null }[];
    productRows: ProductRow[];
};

export default function Welcome({ hero, features, promos, marquee, explore, cta, blog, posts, newsletter, collectionsStrip, collections, productRows }: Props) {
    const rowsBefore = productRows.filter((row) => row.placement === 'before_explore');
    const rowsAfter = productRows.filter((row) => row.placement !== 'before_explore');
    return (
        <StoreLayout>
            <Head title="Tech Trend" />

            <HeroSlider hero={hero} />
            <FeatureStrip features={features} />
            <CollectionsStrip settings={collectionsStrip} collections={collections} />
            <PromoGrid promos={promos} label="Featured collections" />
            <MarqueeBar marquee={marquee} />
            {rowsBefore.map((row) => <ProductRowSection key={row.id} row={row} />)}
            <PromoGrid promos={explore} layout="columns" label="Explore" />
            {rowsAfter.map((row) => <ProductRowSection key={row.id} row={row} />)}
            <CtaPanel cta={cta} />
            <BlogStrip blog={blog} posts={posts} />
            <NewsletterSignup newsletter={newsletter} />
        </StoreLayout>
    );
}
