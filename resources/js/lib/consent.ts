export type Consent = {
    id: string;
    v: number;
    analytics: boolean;
    marketing: boolean;
    at: string;
};

const COOKIE = 'cookie_consent';
const SIX_MONTHS = 60 * 60 * 24 * 182;

export function readConsent(): Consent | null {
    const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
    if (!match) return null;

    try {
        const value = JSON.parse(decodeURIComponent(match[1]));
        return typeof value?.v === 'number' && typeof value?.id === 'string' ? (value as Consent) : null;
    } catch {
        return null;
    }
}

export function saveConsent(choice: { v: number; analytics: boolean; marketing: boolean }, previous: Consent | null): Consent {
    const consent: Consent = {
        ...choice,
        id: previous?.id ?? crypto.randomUUID(),
        at: new Date().toISOString(),
    };

    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(consent))}; Max-Age=${SIX_MONTHS}; Path=/; SameSite=Lax${secure}`;

    return consent;
}

/** Re-open the banner's settings, e.g. from the footer link. */
export function openCookieSettings(): void {
    window.dispatchEvent(new Event('consent:open'));
}
