<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: oklch(0.145 0 0);
            }
        </style>

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ $meta['title'] ?? config('app.name', 'Laravel') }}</title>
        </x-inertia::head>

        @isset($meta)
            <meta name="description" content="{{ $meta['description'] }}" inertia="description">
            <meta name="robots" content="{{ $meta['robots'] }}" inertia="robots">
            <link rel="canonical" href="{{ $meta['canonical'] }}" inertia="canonical">

            <meta property="og:type" content="website" inertia="og:type">
            <meta property="og:site_name" content="{{ config('app.name') }}" inertia="og:site_name">
            <meta property="og:title" content="{{ $meta['title'] }}" inertia="og:title">
            <meta property="og:description" content="{{ $meta['description'] }}" inertia="og:description">
            <meta property="og:url" content="{{ $meta['canonical'] }}" inertia="og:url">
            <meta property="og:locale" content="{{ $meta['locale'] }}" inertia="og:locale">
            @if (! empty($meta['image']))
                <meta property="og:image" content="{{ $meta['image'] }}" inertia="og:image">
                <meta name="twitter:card" content="summary_large_image" inertia="twitter:card">
            @endif

            <script type="application/ld+json">{!! $meta['json_ld'] !!}</script>
        @endisset
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
