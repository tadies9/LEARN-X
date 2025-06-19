import * as Sentry from '@sentry/node';
import { captureConsoleIntegration } from '@sentry/node';
import { Application } from 'express';

interface SentryConfig {
  dsn?: string;
  environment: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
  attachStacktrace: boolean;
  enabled: boolean;
}

export function initializeSentry(app?: Application): void {
  const config: SentryConfig = {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
    attachStacktrace: true,
    enabled: process.env.SENTRY_ENABLED === 'true' || process.env.NODE_ENV === 'production',
  };

  if (!config.enabled || !config.dsn) {
    console.log('🔕 Sentry disabled or DSN not provided');
    return;
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    tracesSampleRate: config.tracesSampleRate,
    profilesSampleRate: config.profilesSampleRate,
    attachStacktrace: config.attachStacktrace,
    integrations: [
      captureConsoleIntegration({
        levels: ['error', 'warn'],
      }),
      ...(app ? [Sentry.expressIntegration()] : []),
      Sentry.httpIntegration(),
      Sentry.onUncaughtExceptionIntegration({
        onFatalError: (err) => {
          console.error('Fatal error caught by Sentry:', err);
          if (err.name !== 'SentryError') {
            process.exit(1);
          }
        },
      }),
      Sentry.onUnhandledRejectionIntegration({
        mode: 'strict',
      }),
    ],
    beforeSend: (event, _hint) => {
      // Filter out sensitive data
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      
      // Add custom context
      if (event.exception?.values?.[0]?.value?.includes('Invalid authentication token')) {
        event.fingerprint = ['auth-error'];
      }
      
      return event;
    },
    beforeSendTransaction: (transaction) => {
      // Filter out health check transactions
      if (transaction.transaction_info?.source === 'route' && 
          transaction.contexts?.trace?.op === 'http.server' &&
          transaction.transaction?.includes('/health')) {
        return null;
      }
      return transaction;
    },
  });

  console.log('🎯 Sentry initialized successfully');
}

export function captureError(error: Error, context?: Record<string, any>): void {
  if (process.env.SENTRY_ENABLED !== 'true' && process.env.NODE_ENV !== 'production') {
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

export function addBreadcrumb(message: string, category: string, data?: Record<string, any>): void {
  if (process.env.SENTRY_ENABLED !== 'true' && process.env.NODE_ENV !== 'production') {
    return;
  }

  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
    timestamp: Date.now() / 1000,
  });
}