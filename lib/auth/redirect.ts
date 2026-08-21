/**
 * Where to send someone after they sign in.
 *
 * Only same-site paths are honoured. Without this check, a link like
 * `/auth/login?redirect=https://example.com` would hand a visitor who just
 * typed their password straight to someone else's site, with Ramazah's name on
 * the page they left — the classic open-redirect phishing route.
 *
 * `//evil.com` is rejected too: browsers read a protocol-relative URL as a
 * different host, so a leading double slash is as dangerous as a full URL.
 */
export function safeRedirect(value: unknown, fallback = '/dashboard'): string {
  if (typeof value !== 'string' || value.length === 0) return fallback;

  const path = value.trim();

  if (!path.startsWith('/')) return fallback;
  if (path.startsWith('//')) return fallback;
  if (path.startsWith('/\\')) return fallback;

  return path;
}
