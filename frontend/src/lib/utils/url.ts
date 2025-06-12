export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // Browser should use current origin
    return window.location.origin;
  }

  // SSR should use app URL if configured
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Production: use Vercel URL if available
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Development SSR should use localhost
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
