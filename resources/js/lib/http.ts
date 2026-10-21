/** Laravel stores the CSRF token in a cookie; send it back as a header on fetch() requests. */
export function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : '';
}
