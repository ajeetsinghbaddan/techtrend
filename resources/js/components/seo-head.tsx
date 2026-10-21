import { Head, usePage } from '@inertiajs/react';

export type SeoData = {
    title: string | null;
    full_title: string;
    description: string | null;
    robots: string;
    canonical: string | null;
    og: Record<string, string>;
    twitter: Record<string, string>;
    properties: Record<string, string>;
    json_ld: string | null;
};

/** The SEO tags the server prepared for this page, kept up to date as visitors navigate. */
export default function SeoHead() {
    const seo = usePage<{ seo?: SeoData }>().props.seo;

    if (!seo) return null;

    return (
        <Head>
            {seo.title && <title>{seo.title}</title>}
            {seo.description && <meta head-key="description" name="description" content={seo.description} />}
            <meta head-key="robots" name="robots" content={seo.robots} />
            {seo.canonical && <link head-key="canonical" rel="canonical" href={seo.canonical} />}
            {Object.entries(seo.og).map(([property, content]) => (
                <meta key={property} head-key={`og:${property}`} property={`og:${property}`} content={content} />
            ))}
            {Object.entries(seo.twitter).map(([name, content]) => (
                <meta key={name} head-key={`twitter:${name}`} name={`twitter:${name}`} content={content} />
            ))}
            {Object.entries(seo.properties).map(([property, content]) => (
                <meta key={property} head-key={property} property={property} content={content} />
            ))}
            {seo.json_ld && (
                <script head-key="json-ld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: seo.json_ld }} />
            )}
        </Head>
    );
}
