import type { Consent } from '@/lib/consent';

type Ids = { ga_measurement_id: string | null; plausible_domain: string | null };

type Gtag = (...args: unknown[]) => void;

let gaLoaded = false;
let plausibleLoaded = false;

function addScript(src: string, attrs: Record<string, string> = {}) {
    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    Object.entries(attrs).forEach(([key, value]) => script.setAttribute(key, value));
    document.head.appendChild(script);
}

function deleteCookies(pattern: RegExp) {
    document.cookie.split('; ').forEach((pair) => {
        const name = pair.split('=')[0];
        if (!pattern.test(name)) return;

        document.cookie = `${name}=; Max-Age=0; Path=/`;
        document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.${window.location.hostname}`;
    });
}

/** The page's gtag: defined first by the Consent Mode script in app.blade.php. */
function getGtag(): Gtag {
    const w = window as unknown as { dataLayer?: unknown[]; gtag?: Gtag };
    w.dataLayer = w.dataLayer ?? [];

    if (!w.gtag) {
        w.gtag = function () {
            // eslint-disable-next-line prefer-rest-params
            w.dataLayer!.push(arguments);
        };
    }

    return w.gtag;
}

export function applyConsent(consent: Consent | null, ids: Ids) {
    const analytics = consent?.analytics === true;
    const marketing = (consent as { marketing?: boolean } | null)?.marketing === true;

    if (ids.ga_measurement_id) {
        const id = ids.ga_measurement_id;
        const gtag = getGtag();

        // Consent Mode v2: tell Google exactly what the visitor allowed. Runs on every
        // change, so withdrawing consent in the cookie settings takes effect at once.
        gtag('consent', 'update', {
            analytics_storage: analytics ? 'granted' : 'denied',
            ad_storage: marketing ? 'granted' : 'denied',
            ad_user_data: marketing ? 'granted' : 'denied',
            ad_personalization: marketing ? 'granted' : 'denied',
        });

        // Google's documented switch: true stops GA sending anything, even if already loaded.
        (window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = !analytics;

        if (analytics && !gaLoaded) {
            gaLoaded = true;
            gtag('js', new Date());
            gtag('config', id);
            addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`);
        }

        if (!analytics) {
            deleteCookies(/^_ga/);
        }
    }

    if (ids.plausible_domain && analytics && !plausibleLoaded) {
        plausibleLoaded = true;
        addScript('https://plausible.io/js/script.js', { 'data-domain': ids.plausible_domain });
    }
}
