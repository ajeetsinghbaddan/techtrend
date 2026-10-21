@php
    $seo = $page['props']['seo'] ?? null;
    $seoSettings = app(\App\Support\Seo\SeoSettings::class);
@endphp

<title inertia>{{ $seo['full_title'] ?? $seoSettings->siteName() }}</title>

@if ($seo)
@if ($seo['description'])
<meta inertia="description" name="description" content="{{ $seo['description'] }}">
@endif
<meta inertia="robots" name="robots" content="{{ $seo['robots'] }}">
@if ($seo['canonical'])
<link inertia="canonical" rel="canonical" href="{{ $seo['canonical'] }}">
@endif
@foreach ($seo['og'] as $property => $content)
<meta inertia="og:{{ $property }}" property="og:{{ $property }}" content="{{ $content }}">
@endforeach
@foreach ($seo['twitter'] as $name => $content)
<meta inertia="twitter:{{ $name }}" name="twitter:{{ $name }}" content="{{ $content }}">
@endforeach
@foreach ($seo['properties'] as $property => $content)
<meta inertia="{{ $property }}" property="{{ $property }}" content="{{ $content }}">
@endforeach
@if ($seo['json_ld'])
<script inertia="json-ld" type="application/ld+json">{!! $seo['json_ld'] !!}</script>
@endif
@endif

{{-- Search engine verification: set in Admin → Settings → SEO --}}
@if ($code = $seoSettings->get('google_verification'))
<meta name="google-site-verification" content="{{ $code }}">
@endif
@if ($code = $seoSettings->get('bing_verification'))
<meta name="msvalidate.01" content="{{ $code }}">
@endif

{{-- Consent Mode v2: everything denied until the visitor chooses, set before any Google tag loads --}}
<script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    gtag('consent', 'default', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
        wait_for_update: 500
    });
</script>
