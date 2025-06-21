import winston from 'winston';
import { AsyncLocalStorage } from 'async_hooks';
import { captureError } from '../config/sentry';

const logLevel = process.env.LOG_LEVEL || 'info';

// AsyncLocalStorage for request context
export const requestContext = new AsyncLocalStorage<{
  correlationId: string;
  userId?: string;
  requestPath?: string;
  requestMethod?: string;
}>();

// Custom format that includes correlation ID
const correlationFormat = winston.format.printf((info) => {
  const context = requestContext.getStore();
  if (context) {
    info.correlationId = context.correlationId;
    info.userId = context.userId;
    info.requestPath = context.requestPath;
    info.requestMethod = context.requestMethod;
  }
  return JSON.stringify(info);
});

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    correlationFormat
  ),
  defaultMeta: {
    service: 'learn-x-api',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  },
  transports: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === 'production'
          ? winston.format.json()
          : winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

// Override error logging to also send to Sentry
const originalError = logger.error.bind(logger);
(logger as any).error = (message: any, ...meta: any[]) => {
  originalError(message, ...meta);

  // If it's an Error object, send to Sentry
  if (message instanceof Error) {
    captureError(message, { meta });
  } else if (meta[0] instanceof Error) {
    captureError(meta[0], { message });
  }
};

// Create a stream object with a 'write' function that will be used by morgan
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};
