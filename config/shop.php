<?php

return [
    'default_region' => env('DEFAULT_REGION', 'US'),
    'default_currency' => env('DEFAULT_CURRENCY', 'USD'),

    'locales' => [
        'en' => 'English',
        'de' => 'Deutsch',
        'nl' => 'Nederlands',
        'fr' => 'Français',
        'sv' => 'Svenska',
        'pl' => 'Polski',
    ],

    'regions' => [
        'US' => ['label' => 'United States', 'currency' => 'USD', 'tax' => 'excl. tax', 'locale' => 'en_US'],
        'DE' => ['label' => 'Germany', 'currency' => 'EUR', 'tax' => '19% MwSt.', 'locale' => 'de_DE'],
        'NL' => ['label' => 'Netherlands', 'currency' => 'EUR', 'tax' => '21% btw', 'locale' => 'nl_NL'],
        'BE' => ['label' => 'Belgium', 'currency' => 'EUR', 'tax' => '21% btw', 'locale' => 'nl_BE'],
        'FR' => ['label' => 'France', 'currency' => 'EUR', 'tax' => '20% TVA', 'locale' => 'fr_FR'],
        'PL' => ['label' => 'Poland', 'currency' => 'PLN', 'tax' => '23% VAT', 'locale' => 'pl_PL'],
        'SE' => ['label' => 'Sweden', 'currency' => 'SEK', 'tax' => '25% moms', 'locale' => 'sv_SE'],
        'GB' => ['label' => 'United Kingdom', 'currency' => 'GBP', 'tax' => '20% VAT', 'locale' => 'en_GB'],
        'IN' => ['label' => 'India', 'currency' => 'INR', 'tax' => 'incl. 18% GST', 'locale' => 'en_IN'],
    ],

    'header' => [
        'brand_name' => 'Tech Trend',
        'search_placeholder' => 'Search products',
        'announcements' => [
            'Free shipping over $75',
            'Dispatched from Leipzig',
            '30-day returns, prepaid label',
        ],
        'nav' => [
            ['label' => 'Keyboards', 'href' => '/keyboards', 'children' => []],
            ['label' => 'Keycaps', 'href' => '/keycaps', 'children' => []],
            ['label' => 'Apparel', 'href' => '/apparel', 'children' => []],
            ['label' => 'Desk', 'href' => '/desk', 'children' => []],
        ],
    ],

    'hero' => [
        'autoplay' => true,
        'delay' => 6000,
        'slides' => [
            [
                'id' => 'default-1',
                'eyebrow' => 'Autumn drop 06 — Shipping now',
                'title' => "Gear for people who read the docs.",
                'text' => 'Keyboards, keycaps and desk things in small runs. Warehoused in the EU, priced with VAT already in the number.',
                'primary_label' => 'Shop now',
                'primary_href' => '/keyboards',
                'secondary_label' => 'See the Compile 75',
                'secondary_href' => '/products/compile-75',
                'image_path' => null,
            ],
        ],
    ],

    'features' => [
        'items' => [
            ['title' => 'Free shipping over $75', 'text' => 'Dispatched from Leipzig · 2–4 business days', 'href' => null],
            ['title' => 'Returns', 'text' => '30-day returns, prepaid label.', 'href' => '/returns'],
            ['title' => 'Flexible payment', 'text' => 'Card, PayPal, Klarna and more.', 'href' => null],
            ['title' => 'Contact', 'text' => 'Leipzig · Mon–Fri · EN, DE, NL, FR, SV', 'href' => '/contact'],
        ],
    ],

    'promos' => [
        'cards' => [
            [
                'id' => 'default-1',
                'title' => 'Last-call runs',
                'text' => 'Final units of run 04 and 05, at run-price.',
                'label' => 'Shop now',
                'href' => '/last-call',
                'box_position' => 'bottom-left',
                'image_path' => null,
            ],
            [
                'id' => 'default-2',
                'title' => 'Build your own',
                'text' => 'Case, plate, switches, caps — configured in one page.',
                'label' => 'Configure',
                'href' => '/build',
                'box_position' => 'top-left',
                'image_path' => null,
            ],
            [
                'id' => 'default-3',
                'title' => 'Team orders',
                'text' => 'Branded caps and mats, invoicing, one delivery.',
                'label' => 'Get a quote',
                'href' => '/team-orders',
                'box_position' => 'top-left',
                'image_path' => null,
            ],
        ],
    ],

    'marquee' => [
        'enabled' => true,
        'speed' => 40,
        'direction' => 'left',
        'items' => [
            'Free shipping over $75',
            'Right of withdrawal · 2-year statutory warranty',
            'ISO layouts as standard',
            'Pay with: card · PayPal · Klarna',
            'Small-run production',
        ],
    ],

    'explore' => [
        'cards' => [
            [
                'id' => 'explore-1',
                'title' => 'Run 06 in Indigo',
                'text' => 'The colourway that sold out twice, back once.',
                'label' => 'Explore now',
                'href' => '/run-06',
                'box_position' => 'bottom-left',
                'image_path' => null,
            ],
            [
                'id' => 'explore-2',
                'title' => 'Build your layout',
                'text' => 'ISO-DE, UK, Nordic and AZERTY kits in stock.',
                'label' => 'Explore now',
                'href' => '/layouts',
                'box_position' => 'bottom-left',
                'image_path' => null,
            ],
            [
                'id' => 'explore-3',
                'title' => 'Desk, finished',
                'text' => 'Mats, cables and trays that match the board.',
                'label' => 'Explore now',
                'href' => '/desk',
                'box_position' => 'bottom-left',
                'image_path' => null,
            ],
        ],
    ],

    'cta' => [
        'enabled' => true,
        'eyebrow' => 'Run 07 — Opens 3 October',
        'title' => "Reserve the next drop before it exists.",
        'text' => '400 units, four colourways, one production window. Reservations open to the list first.',
        'label' => 'Join the list',
        'href' => '/reserve',
        'stats' => [
            ['value' => '31', 'label' => 'countries served, duties prepaid'],
            ['value' => '2.4d', 'label' => 'median delivery'],
            ['value' => '18,400', 'label' => 'desks running our caps'],
            ['value' => '1.9%', 'label' => 'return rate, measured'],
        ],
    ],

    'blog' => [
        'enabled' => true,
        'title' => 'From the workshop',
        'subtitle' => 'Build logs, layout guides and the occasional teardown.',
        'count' => 4,
    ],

    'newsletter' => [
        'enabled' => true,
        'title' => 'Drop alerts, nothing else',
        'text' => 'One email per run, in your language. Unsubscribe in one click.',
        'placeholder' => 'you@company.com',
        'button' => 'Subscribe',
        'notify_email' => env('NEWSLETTER_NOTIFY_EMAIL'),
    ],

    'footer' => [
        'description' => "Small-run desk gear, shipped from Rotterdam & Leipzig.\nTech Trend BV · VAT NL-8256.31.004.B01",
        'columns' => [
            [
                'title' => 'Shop',
                'links' => [
                    ['label' => 'Keyboards', 'href' => '/keyboards'],
                    ['label' => 'Keycaps', 'href' => '/keycaps'],
                    ['label' => 'Apparel', 'href' => '/apparel'],
                    ['label' => 'Gift cards', 'href' => '/gift-cards'],
                ],
            ],
            [
                'title' => 'Help',
                'links' => [
                    ['label' => 'Shipping & duties', 'href' => '/shipping'],
                    ['label' => 'Returns', 'href' => '/returns'],
                    ['label' => 'Layout guide', 'href' => '/layout-guide'],
                    ['label' => 'Contact', 'href' => '/contact'],
                ],
            ],
            [
                'title' => 'Legal',
                'links' => [
                    ['label' => 'Terms', 'href' => '/terms'],
                    ['label' => 'Privacy (GDPR)', 'href' => '/privacy'],
                    ['label' => 'Cookies', 'href' => '/cookies'],
                    ['label' => 'Right of withdrawal', 'href' => '/withdrawal'],
                ],
            ],
        ],
        'copyright' => '© {year} Tech Trend BV. All rights reserved.',
        'badges' => ['Card', 'PayPal', 'Klarna', 'SEPA'],
    ],

    'collections_strip' => [
        'enabled' => true,
        'title' => 'Top collections',
        'subtitle' => 'The shelves our customers empty fastest.',
        'limit' => 7,
        'link_label' => 'View all collections',
    ],

    'product_rows' => [
        'rows' => [
            [
                'id' => 'popular',
                'title' => 'Popular this week',
                'subtitle' => 'What people put in the bag most often.',
                'source' => 'newest',
                'collection_slug' => null,
                'limit' => 4,
                'link_label' => 'View all products',
                'link_href' => '/products',
                'enabled' => true,
            ],
            [
                'id' => 'trending',
                'title' => 'Trending on desks',
                'subtitle' => 'Fresh out of the latest run.',
                'source' => 'top_rated',
                'collection_slug' => null,
                'limit' => 4,
                'link_label' => null,
                'link_href' => null,
                'enabled' => true,
            ],
        ],
    ],

    'tax' => [
        // VAT rate as a percentage. Prices are tax-inclusive except where noted.
        'rates' => [
            'US' => ['rate' => 0, 'inclusive' => false, 'label' => 'Sales tax'],
            'DE' => ['rate' => 19, 'inclusive' => true, 'label' => 'MwSt.'],
            'NL' => ['rate' => 21, 'inclusive' => true, 'label' => 'btw'],
            'BE' => ['rate' => 21, 'inclusive' => true, 'label' => 'btw'],
            'FR' => ['rate' => 20, 'inclusive' => true, 'label' => 'TVA'],
            'PL' => ['rate' => 23, 'inclusive' => true, 'label' => 'VAT'],
            'SE' => ['rate' => 25, 'inclusive' => true, 'label' => 'moms'],
            'GB' => ['rate' => 20, 'inclusive' => true, 'label' => 'VAT'],
            'IN' => ['rate' => 18, 'inclusive' => true, 'label' => 'GST'],
        ],
    ],

    'shipping' => [
        'methods' => [
            'standard' => [
                'label' => 'Standard',
                'days' => '3–5 business days',
                'cost' => ['USD' => 795, 'EUR' => 695, 'GBP' => 595, 'SEK' => 7900, 'PLN' => 3100, 'INR' => 9900],
                'free_over' => ['USD' => 7500, 'EUR' => 7500, 'GBP' => 6500, 'SEK' => 80000, 'PLN' => 32000, 'INR' => 299900],
            ],
            'express' => [
                'label' => 'Express',
                'days' => 'Next business day',
                'cost' => ['USD' => 1495, 'EUR' => 1200, 'GBP' => 1100, 'SEK' => 14900, 'PLN' => 5900, 'INR' => 24900],
                'free_over' => null,
            ],
        ],
    ],

    'payment_methods' => [
        'US' => ['card', 'paypal'],
        'DE' => ['invoice', 'paypal', 'klarna', 'sepa', 'card'],
        'NL' => ['ideal', 'paypal', 'card'],
        'BE' => ['card', 'paypal', 'sepa'],
        'FR' => ['card', 'paypal', 'sepa'],
        'PL' => ['blik', 'card', 'paypal'],
        'SE' => ['klarna', 'card', 'swish'],
        'GB' => ['card', 'paypal'],
    ],

    'base_currency' => 'USD',

    'fx' => [
        'url' => env('FX_URL', 'https://api.frankfurter.app'),
        // Only used until the first successful fetch. Rough placeholders.
        'fallback' => ['EUR' => 0.92, 'GBP' => 0.79, 'SEK' => 10.6, 'PLN' => 3.95],
        // Refuse a new rate that moved more than this from the last one (protects against bad API data).
        'max_change' => 0.2,
    ],

    'search' => [
        // Use Algolia for the as-you-type dropdown too. Turn off locally, or to save quota.
        'suggest_with_algolia' => env('SEARCH_SUGGEST_ALGOLIA', true),
    ],

    'cookie_banner' => [
        'enabled' => true,
        'version' => 1,
        'position' => 'bottom',
        'text' => 'We use cookies for the bag, the region you picked, and anonymous traffic counts. Analytics only with your consent.',
        'accept_label' => 'Accept all',
        'reject_label' => 'Essential only',
        'customize_label' => 'Settings',
        'save_label' => 'Save choices',
        'policy_label' => 'Cookie policy',
        'policy_href' => '/cookies',
        'essential_label' => 'Essential',
        'essential_description' => 'Your bag, language, region and login. Always on, because the shop cannot work without them.',
        'categories' => [
            'analytics' => [
                'enabled' => true,
                'label' => 'Analytics',
                'description' => 'Anonymous visit counts that help us improve the shop.',
            ],
            'marketing' => [
                'enabled' => false,
                'label' => 'Marketing',
                'description' => 'Measuring ads and showing relevant offers on other sites.',
            ],
        ],
        'ga_measurement_id' => null,
        'plausible_domain' => null,
    ],

    'product_rows' => [
        'rows' => [
            [
                'id' => 'popular',
                'title' => 'Popular this week',
                'subtitle' => 'What people put in the bag most often.',
                'source' => 'newest',
                'collection_slug' => null,
                'product_ids' => [],
                'limit' => 8,
                'link_label' => 'View all products',
                'link_href' => '/products',
                'placement' => 'before_explore',
                'enabled' => true,
            ],
            [
                'id' => 'trending',
                'title' => 'Trending on desks',
                'subtitle' => 'Fresh out of the latest run.',
                'source' => 'top_rated',
                'collection_slug' => null,
                'product_ids' => [],
                'limit' => 8,
                'link_label' => null,
                'link_href' => null,
                'placement' => 'after_explore',
                'enabled' => true,
            ],
        ],
    ],

    'reviews' => [
        // Only customers with a paid order containing the product can review.
        'require_purchase' => env('REVIEWS_REQUIRE_PURCHASE', false),
        // Publish verified buyers' reviews immediately; everyone else waits for approval.
        'auto_approve_verified' => env('REVIEWS_AUTO_APPROVE_VERIFIED', true),
        'max_images' => 4,
    ],

    'security' => [
        'admin_two_factor' => env('ADMIN_REQUIRE_TWO_FACTOR', false),
    ],

    'cart_reminders' => [
        'enabled' => env('CART_REMINDERS', true),
        // Minutes after the bag was last touched: 1 hour, 1 day, 3 days.
        'delays' => [60, 1440, 4320],
        // Only send between 08:00 and 21:00 in the customer's region.
        'quiet_hours' => true,
    ],

    'admin_timezone' => env('ADMIN_TIMEZONE', 'Asia/Kolkata'),
];
