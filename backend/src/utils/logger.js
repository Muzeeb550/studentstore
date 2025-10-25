/**
 * Production-safe logger for StudentStore Backend
 * - Development: All logs visible
 * - Production: Only errors and system messages
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

const config = {
  enableDebug: isDevelopment,
  enableInfo: isDevelopment,
  enableErrors: true, // Always log errors
  enableSystemLogs: true, // Always log system messages
};

/**
 * Sanitize sensitive data from objects
 */
const sanitize = (data) => {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  // Don't sanitize in development
  if (isDevelopment) {
    return data;
  }

  // In production, remove sensitive fields
  const sensitiveKeys = [
    'token', 'password', 'secret', 'authorization',
    'cookie', 'session', 'apikey', 'api_key',
    'privatekey', 'private_key', 'database_url',
    'jwt', 'bearer'
  ];

  const sanitized = { ...data };

  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  });

  return sanitized;
};

/**
 * Production-safe logger
 */
const logger = {
  /**
   * Debug logs - only in development
   */
  debug: (...args) => {
    if (config.enableDebug) {
      console.log('🐛', ...args);
    }
  },

  /**
   * Info logs - only in development
   */
  log: (...args) => {
    if (config.enableInfo) {
      console.log(...args);
    }
  },

  /**
   * Info logs (alias)
   */
  info: (...args) => {
    if (config.enableInfo) {
      console.log('ℹ️', ...args);
    }
  },

  /**
   * Warning logs - only in development
   */
  warn: (...args) => {
    if (config.enableInfo) {
      console.warn('⚠️', ...args);
    }
  },

  /**
   * Error logs - always shown, sanitized in production
   */
  error: (...args) => {
    if (config.enableErrors) {
      if (isDevelopment) {
        console.error('❌', ...args);
      } else {
        // Sanitize in production
        const sanitized = args.map(arg => {
          if (arg instanceof Error) {
            return `${arg.name}: ${arg.message}`;
          }
          if (typeof arg === 'object') {
            return sanitize(arg);
          }
          return arg;
        });
        console.error('❌', ...sanitized);
      }
    }
  },

  /**
   * System logs - always shown (startup, critical events)
   */
  system: (...args) => {
    if (config.enableSystemLogs) {
      console.log('🚀', ...args);
    }
  },

  /**
   * Success logs - only in development
   */
  success: (...args) => {
    if (config.enableInfo) {
      console.log('✅', ...args);
    }
  },

  /**
   * Performance tracking - only in development
   */
  perf: (label, startTime) => {
    if (config.enableDebug) {
      const duration = Date.now() - startTime;
      console.log(`⏱️ ${label}: ${duration}ms`);
    }
  },

  /**
   * Table logs - only in development
   */
  table: (data) => {
    if (config.enableDebug) {
      console.table(data);
    }
  },
};

module.exports = logger;
