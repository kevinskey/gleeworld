// Centralized logger utility - can be disabled in production
const isDev = import.meta.env.DEV;
const isVerbose = false; // Set to true for verbose debugging

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  prefix?: string;
  enabled?: boolean;
}

class Logger {
  private prefix: string;
  private enabled: boolean;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || '';
    this.enabled = options.enabled ?? isDev;
  }

  private formatMessage(message: string): string {
    return this.prefix ? `[${this.prefix}] ${message}` : message;
  }

  debug(...args: any[]) {
    if (this.enabled && isVerbose) {
      console.log(this.formatMessage('DEBUG'), ...args);
    }
  }

  info(...args: any[]) {
    if (this.enabled && isVerbose) {
      console.info(this.formatMessage('INFO'), ...args);
    }
  }

  warn(...args: any[]) {
    if (this.enabled) {
      console.warn(this.formatMessage('WARN'), ...args);
    }
  }

  error(...args: any[]) {
    // Always log errors
    console.error(this.formatMessage('ERROR'), ...args);
  }
}

// Create default logger instance
export const logger = new Logger();

// Factory for creating prefixed loggers
export const createLogger = (prefix: string, enabled = isDev) => 
  new Logger({ prefix, enabled });

// Utility to suppress console.log in production
export const silentLog = (...args: any[]) => {
  if (isDev && isVerbose) {
    console.log(...args);
  }
};

export default logger;
