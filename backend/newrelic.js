/**
 * New Relic agent configuration
 * 
 * This file must be loaded at the very beginning of your application,
 * before any other module is loaded. It's typically loaded in the main entry file.
 * 
 * @see https://docs.newrelic.com/docs/agents/nodejs-agent/installation-configuration/nodejs-agent-configuration
 */

'use strict';

exports.config = {
  /**
   * Array of application names.
   * The first name is the primary application name.
   */
  app_name: [process.env.NEW_RELIC_APP_NAME || 'learn-x-api'],
  
  /**
   * Your New Relic license key.
   * Required for the agent to communicate with New Relic.
   */
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  
  /**
   * Enable or disable the agent.
   * Set to false to disable the agent entirely.
   */
  agent_enabled: process.env.NEW_RELIC_ENABLED === 'true',
  
  /**
   * Logging level for the agent.
   * Available levels: 'trace', 'debug', 'info', 'warn', 'error', 'fatal'
   */
  logging: {
    level: process.env.NEW_RELIC_LOG_LEVEL || 'info',
    filepath: 'stdout', // Log to stdout for container environments
    enabled: true
  },
  
  /**
   * When true, all request headers except for those listed in attributes.exclude
   * will be captured for all traces, unless otherwise specified in a destination's
   * attributes include/exclude lists.
   */
  allow_all_headers: true,
  
  /**
   * Distributed tracing configuration
   */
  distributed_tracing: {
    enabled: true
  },
  
  /**
   * Application logging configuration
   */
  application_logging: {
    enabled: true,
    forwarding: {
      enabled: true,
      max_samples_stored: 10000
    },
    metrics: {
      enabled: true
    },
    local_decorating: {
      enabled: true
    }
  },
  
  /**
   * Error collector configuration
   */
  error_collector: {
    enabled: true,
    ignore_status_codes: [404, 401],
    expected_status_codes: [400, 403],
    capture_events: true,
    max_event_samples_stored: 100
  },
  
  /**
   * Transaction tracer configuration
   */
  transaction_tracer: {
    enabled: true,
    transaction_threshold: 'apdex_f',
    record_sql: 'obfuscated',
    explain_threshold: 500,
    slow_sql: {
      enabled: true,
      max_samples: 10
    }
  },
  
  /**
   * Custom attributes to include in all events
   */
  attributes: {
    enabled: true,
    include: [
      'request.headers.x-correlation-id',
      'request.headers.x-user-id',
      'request.headers.x-session-id',
      'request.method',
      'request.uri',
      'response.status',
      'user.id',
      'user.role',
      'course.id',
      'module.id',
      'file.id',
      'queue.job_type',
      'queue.job_id'
    ],
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.x-api-key',
      'password',
      'api_key',
      'access_token',
      'refresh_token'
    ]
  },
  
  /**
   * Rules for naming or ignoring transactions
   */
  rules: {
    name: [
      // Group similar API endpoints
      { pattern: '^/api/v1/courses/[^/]+/modules', name: '/api/v1/courses/:courseId/modules' },
      { pattern: '^/api/v1/modules/[^/]+/files', name: '/api/v1/modules/:moduleId/files' },
      { pattern: '^/api/v1/files/[^/]+', name: '/api/v1/files/:fileId' },
      { pattern: '^/api/v1/users/[^/]+', name: '/api/v1/users/:userId' }
    ],
    ignore: [
      '^/health',
      '^/metrics',
      '^/ping',
      '^/favicon.ico'
    ]
  },
  
  /**
   * Database monitoring configuration
   */
  datastore_tracer: {
    instance_reporting: {
      enabled: true
    },
    database_name_reporting: {
      enabled: true
    }
  },
  
  /**
   * Slow query configuration
   */
  slow_sql: {
    enabled: true,
    max_samples: 10
  },
  
  /**
   * Custom events configuration
   */
  custom_events: {
    enabled: true,
    max_samples_per_minute: 10000
  },
  
  /**
   * Labels to apply to the data sent from this agent
   */
  labels: {
    environment: process.env.NODE_ENV || 'development',
    service: 'api',
    team: 'backend',
    version: process.env.npm_package_version || 'unknown'
  }
};