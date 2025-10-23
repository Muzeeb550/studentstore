'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { analytics } from '@/lib/analytics';

export default function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  useEffect(() => {
    // Track PWA vs Browser session
    analytics.pwa.trackSessionType();
    
    // Track PWA launch
    analytics.pwa.appLaunched();
    
    // Listen for PWA install
    window.addEventListener('appinstalled', () => {
      analytics.pwa.installCompleted();
    });
  }, []);

  if (!measurementId) {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}
