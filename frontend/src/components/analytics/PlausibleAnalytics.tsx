'use client';

import Script from 'next/script';

interface PlausibleAnalyticsProps {
  domain?: string;
}

export function PlausibleAnalytics({ domain }: PlausibleAnalyticsProps) {
  // Only load in production
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  const plausibleDomain = domain || process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  if (!plausibleDomain) {
    // Plausible domain not configured
    return null;
  }

  return (
    <Script
      strategy="afterInteractive"
      data-domain={plausibleDomain}
      src="https://plausible.io/js/script.js"
    />
  );
}
