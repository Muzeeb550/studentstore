/**
 * Production-safe logger for StudentStore
 * - Development: All logs visible
 * - Production: Only errors and critical system messages
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isClient = typeof window !== 'undefined';

interface LoggerConfig {
  enableDebug: boolean;
  enableInfo: boolean;
  enableErrors: boolean;
  enableSystemLogs: boolean;
}

const config: LoggerConfig = {
  enableDebug: isDevelopment,
  enableInfo: isDevelopment,
  enableErrors: true, // Always log errors
  enableSystemLogs: true, // Always log system messages
};

/**
 * Sanitize sensitive data from objects before logging
 */
const sanitize = (data: any): any => {
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
    'cookie', 'session', 'apiKey', 'api_key',
    'privateKey', 'private_key'
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
export const logger = {
  /**
   * Debug logs - only in development
   * Use for detailed debugging information
   */
  debug: (...args: any[]) => {
    if (config.enableDebug) {
      console.log('🐛', ...args);
    }
  },

  /**
   * Info logs - only in development
   * Use for general information
   */
  log: (...args: any[]) => {
    if (config.enableInfo) {
      console.log(...args);
    }
  },

  /**
   * Info logs (alias for log)
   */
  info: (...args: any[]) => {
    if (config.enableInfo) {
      console.info('ℹ️', ...args);
    }
  },

  /**
   * Warning logs - only in development
   */
  warn: (...args: any[]) => {
    if (config.enableInfo) {
      console.warn('⚠️', ...args);
    }
  },

  /**
   * Error logs - always shown, but sanitized in production
   */
  error: (...args: any[]) => {
    if (config.enableErrors) {
      if (isDevelopment) {
        console.error('❌', ...args);
      } else {
        // In production, sanitize error objects
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
   * System logs - always shown (startup, shutdown, critical events)
   * Use sparingly for important system messages
   */
  system: (...args: any[]) => {
    if (config.enableSystemLogs) {
      console.log('🚀', ...args);
    }
  },

  /**
   * Success logs - only in development
   */
  success: (...args: any[]) => {
    if (config.enableInfo) {
      console.log('✅', ...args);
    }
  },

  /**
   * Performance tracking - only in development
   */
  perf: (label: string, startTime: number) => {
    if (config.enableDebug) {
      const duration = performance.now() - startTime;
      console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    }
  },

  /**
   * Table logs - only in development
   */
  table: (data: any) => {
    if (config.enableDebug) {
      console.table(data);
    }
  },
};

// Export type for TypeScript
export type Logger = typeof logger;

// Default export
export default logger;
