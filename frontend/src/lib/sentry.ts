import * as Sentry from '@sentry/nextjs';

export function initializeSentry(): void {
  const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';

  if (!SENTRY_DSN || environment === 'development') {
    // Sentry disabled for frontend
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment,
    tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    replaysSessionSampleRate: parseFloat(
      process.env.NEXT_PUBLIC_SENTRY_REPLAY_SAMPLE_RATE || '0.1'
    ),
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        maskAllInputs: true,
        blockAllMedia: false,
      }),
    ],

    beforeSend: (event, _hint) => {
      // Filter out sensitive data
      if (event.request?.cookies) {
        delete event.request.cookies;
      }

      // Don't send events in development
      if (process.env.NODE_ENV === 'development') {
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

  // Sentry initialized for frontend
}

export function captureError(error: Error, context?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'development') {
    // In development, errors are handled by the dev tools
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

export function setUserContext(user: { id: string; email: string } | null): void {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
    });
  } else {
    Sentry.setUser(null);
  }
}

export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
    timestamp: Date.now() / 1000,
  });
}
