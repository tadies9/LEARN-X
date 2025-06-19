import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    replaysSessionSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_REPLAY_SAMPLE_RATE || '0.1'),
    replaysOnErrorSampleRate: 1.0,
    
    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        maskAllInputs: true,
        blockAllMedia: false,
      }),
    ],

    beforeSend: (event) => {
      // Filter out sensitive data
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      
      // Filter out non-error console logs
      if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) {
        return null;
      }
      
      return event;
    },

    // Performance monitoring
    tracePropagationTargets: [
      'localhost',
      process.env.NEXT_PUBLIC_API_URL || '',
      /^https:\/\/learn-x\.co/,
    ],
  });
}