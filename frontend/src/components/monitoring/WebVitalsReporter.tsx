'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { useEffect } from 'react';

interface WebVitalsMetric {
  id: string;
  name: string;
  label: string;
  value: number;
}

export function WebVitalsReporter() {
  useReportWebVitals((metric: WebVitalsMetric) => {
    // Only track web vitals metrics
    if (metric.label === 'web-vital') {
      const vitals = {
        metric: metric.name,
        value: Math.round(metric.value),
        timestamp: new Date().toISOString(),
      };

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Web Vitals:', vitals);
      }

      // Send to analytics endpoint in production
      if (process.env.NODE_ENV === 'production') {
        // Replace with your analytics endpoint
        fetch('/api/analytics/vitals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(vitals),
        }).catch((error) => {
          console.error('Failed to send web vitals:', error);
        });
      }
    }
  });

  // Track page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Track when user leaves the page
        const timeOnPage = performance.now();
        if (process.env.NODE_ENV === 'development') {
          console.log('Time on page:', Math.round(timeOnPage / 1000), 'seconds');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return null;
}
