// Isolated policy for /typing; the rest of ZenithW keeps its existing CSP.
export const TYPING_CSP = [
  "default-src 'self'", "base-uri 'self'", "object-src 'none'",
  "frame-ancestors 'none'", "form-action 'self'", "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", "font-src 'self'",
  "img-src 'self' data: blob: https://woxxdgekdgapcsruicci.supabase.co",
  "connect-src 'self' https://woxxdgekdgapcsruicci.supabase.co",
  "media-src 'self' blob:", "upgrade-insecure-requests",
].join('; ');
