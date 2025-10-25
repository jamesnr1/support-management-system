/**
 * Frontend logging utility with structured logging
 */

class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.logLevel = process.env.REACT_APP_LOG_LEVEL || 'info';
  }

  _shouldLog(level) {
    const levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    return levels[level] <= levels[this.logLevel];
  }

  _formatMessage(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...data,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    return logEntry;
  }

  _log(level, message, data = {}) {
    if (!this._shouldLog(level)) return;

    const logEntry = this._formatMessage(level, message, data);

    if (this.isDevelopment) {
      // In development, use console with colors
      const colors = {
        error: 'color: red',
        warn: 'color: orange',
        info: 'color: blue',
        debug: 'color: gray'
      };
      
      console.log(
        `%c[${level.toUpperCase()}] ${message}`,
        colors[level],
        data
      );
    } else {
      // In production, use structured logging
      console.log(JSON.stringify(logEntry));
    }

    // Send to external logging service in production
    if (!this.isDevelopment && level === 'error') {
      this._sendToLoggingService(logEntry);
    }
  }

  _sendToLoggingService(logEntry) {
    // Example: Send to external logging service
    // This could be Sentry, LogRocket, or your own logging endpoint
    try {
      // Example implementation
      if (window.Sentry) {
        window.Sentry.captureMessage(logEntry.message, {
          level: logEntry.level,
          extra: logEntry
        });
      }
    } catch (error) {
      console.error('Failed to send log to external service:', error);
    }
  }

  error(message, data = {}) {
    this._log('error', message, data);
  }

  warn(message, data = {}) {
    this._log('warn', message, data);
  }

  info(message, data = {}) {
    this._log('info', message, data);
  }

  debug(message, data = {}) {
    this._log('debug', message, data);
  }

  // Specialized logging methods
  apiCall(method, url, data = {}) {
    this.info(`API ${method} ${url}`, {
      type: 'api_call',
      method,
      url,
      ...data
    });
  }

  apiError(method, url, error, data = {}) {
    this.error(`API ${method} ${url} failed`, {
      type: 'api_error',
      method,
      url,
      error: error.message,
      status: error.response?.status,
      ...data
    });
  }

  userAction(action, data = {}) {
    this.info(`User action: ${action}`, {
      type: 'user_action',
      action,
      ...data
    });
  }

  performance(operation, duration, data = {}) {
    this.info(`Performance: ${operation}`, {
      type: 'performance',
      operation,
      duration,
      ...data
    });
  }

  security(event, data = {}) {
    this.warn(`Security event: ${event}`, {
      type: 'security',
      event,
      ...data
    });
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;
