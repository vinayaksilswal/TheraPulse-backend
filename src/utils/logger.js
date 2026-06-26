/**
 * TheraPulse Structured Logging System
 * 
 * Enterprise-grade async logger with log levels, correlation IDs,
 * in-memory ring buffer, and localStorage persistence.
 * Designed for cloud integration (Datadog, CloudWatch, Sentry).
 */

const LOG_LEVELS = Object.freeze({
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
});

const LOG_LEVEL_NAMES = Object.freeze(
  Object.fromEntries(Object.entries(LOG_LEVELS).map(([k, v]) => [v, k]))
);

const LOG_STORAGE_KEY = 'therapulse_structured_logs';
const MAX_BUFFER_SIZE = 500;
const MAX_PERSISTED_SIZE = 200;

// In-memory ring buffer
let logBuffer = [];
let currentMinLevel = LOG_LEVELS.DEBUG;

/**
 * Generate a short correlation ID for request tracing
 */
const generateCorrelationId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `tp-${timestamp}-${random}`;
};

/**
 * Create a structured log entry
 */
const createLogEntry = (level, service, message, context = {}) => ({
  timestamp: new Date().toISOString(),
  level: LOG_LEVEL_NAMES[level] || 'INFO',
  levelNum: level,
  service,
  message,
  context: {
    ...context,
    correlationId: context.correlationId || generateCorrelationId(),
  },
  environment: (import.meta.env ? import.meta.env.MODE : (typeof process !== 'undefined' ? process.env.NODE_ENV : 'development')),
});

/**
 * Append a log entry to the buffer and optionally persist
 */
const appendLog = (entry) => {
  // Add to ring buffer (evict oldest if full)
  logBuffer.push(entry);
  if (logBuffer.length > MAX_BUFFER_SIZE) {
    logBuffer = logBuffer.slice(-MAX_BUFFER_SIZE);
  }

  // Console output with color coding
  const consoleMethods = {
    [LOG_LEVELS.DEBUG]: 'debug',
    [LOG_LEVELS.INFO]: 'info',
    [LOG_LEVELS.WARN]: 'warn',
    [LOG_LEVELS.ERROR]: 'error',
    [LOG_LEVELS.FATAL]: 'error',
  };
  const method = consoleMethods[entry.levelNum] || 'log';
  const prefix = `[${entry.service}] [${entry.level}]`;

  if (entry.levelNum >= LOG_LEVELS.WARN) {
    console[method](prefix, entry.message, entry.context);
  } else {
    console[method](prefix, entry.message);
  }

  // Persist ERROR and FATAL level logs to localStorage for durability
  if (entry.levelNum >= LOG_LEVELS.ERROR) {
    persistLog(entry);
  }
};

/**
 * Persist critical logs to localStorage
 */
const persistLog = (entry) => {
  try {
    const raw = localStorage.getItem(LOG_STORAGE_KEY);
    let persisted = raw ? JSON.parse(raw) : [];
    persisted.push(entry);
    if (persisted.length > MAX_PERSISTED_SIZE) {
      persisted = persisted.slice(-MAX_PERSISTED_SIZE);
    }
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // Silently fail — logging should never crash the app
  }
};

/**
 * Create a scoped logger instance for a specific service
 * @param {string} serviceName - Name of the service (e.g., 'CJApi', 'Gemini', 'PayPal')
 * @returns {Object} Logger instance with level methods
 */
export const createLogger = (serviceName) => {
  const log = (level, message, context = {}) => {
    if (level < currentMinLevel) return;
    const entry = createLogEntry(level, serviceName, message, context);
    appendLog(entry);
    return entry;
  };

  return {
    debug: (message, context) => log(LOG_LEVELS.DEBUG, message, context),
    info: (message, context) => log(LOG_LEVELS.INFO, message, context),
    warn: (message, context) => log(LOG_LEVELS.WARN, message, context),
    error: (message, context) => log(LOG_LEVELS.ERROR, message, context),
    fatal: (message, context) => log(LOG_LEVELS.FATAL, message, context),

    /**
     * Create a child logger with inherited context
     */
    child: (childContext) => {
      const parent = { serviceName, context: childContext };
      const childLog = (level, message, ctx = {}) => {
        return log(level, message, { ...parent.context, ...ctx });
      };
      return {
        debug: (msg, ctx) => childLog(LOG_LEVELS.DEBUG, msg, ctx),
        info: (msg, ctx) => childLog(LOG_LEVELS.INFO, msg, ctx),
        warn: (msg, ctx) => childLog(LOG_LEVELS.WARN, msg, ctx),
        error: (msg, ctx) => childLog(LOG_LEVELS.ERROR, msg, ctx),
        fatal: (msg, ctx) => childLog(LOG_LEVELS.FATAL, msg, ctx),
      };
    },
  };
};

/**
 * Retrieve all in-memory logs (for admin dashboard)
 */
export const getLogBuffer = () => [...logBuffer];

/**
 * Retrieve persisted error logs from localStorage
 */
export const getPersistedLogs = () => {
  try {
    const raw = localStorage.getItem(LOG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Get formatted log messages for legacy UI compatibility
 * Returns logs as simple string array (newest first)
 */
export const getFormattedLogs = () => {
  return logBuffer
    .map((entry) => {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      return `[${time}] [${entry.level}] [${entry.service}] ${entry.message}`;
    })
    .reverse();
};

/**
 * Clear all logs
 */
export const clearLogs = () => {
  logBuffer = [];
  try {
    localStorage.removeItem(LOG_STORAGE_KEY);
  } catch {
    // Silently fail
  }
};

/**
 * Set minimum log level
 */
export const setLogLevel = (level) => {
  if (typeof level === 'string') {
    currentMinLevel = LOG_LEVELS[level.toUpperCase()] ?? LOG_LEVELS.DEBUG;
  } else {
    currentMinLevel = level;
  }
};

/**
 * Export log entries as JSON (for cloud export)
 */
export const exportLogs = () => {
  return JSON.stringify({
    exported: new Date().toISOString(),
    environment: (import.meta.env ? import.meta.env.MODE : (typeof process !== 'undefined' ? process.env.NODE_ENV : 'development')),
    bufferSize: logBuffer.length,
    entries: logBuffer,
    persisted: getPersistedLogs(),
  }, null, 2);
};

export { LOG_LEVELS, generateCorrelationId };
