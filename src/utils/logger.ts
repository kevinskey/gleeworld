// Simple logger utility to replace console.log statements
// In production, this could be replaced with a more sophisticated logging service

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: Date;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logs: LogEntry[] = [];
  private maxLogs = 100; // Keep only the last 100 logs in memory

  private addLog(level: LogLevel, message: string, data?: any) {
    const logEntry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date()
    };

    this.logs.push(logEntry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Only log to console in development
    if (this.isDevelopment) {
      const logMethod = console[level] || console.log;
      if (data) {
        logMethod(`[${level.toUpperCase()}] ${message}`, data);
      } else {
        logMethod(`[${level.toUpperCase()}] ${message}`);
      }
    }
  }

  info(message: string, data?: any) {
    this.addLog('info', message, data);
  }

  warn(message: string, data?: any) {
    this.addLog('warn', message, data);
  }

  error(message: string, data?: any) {
    this.addLog('error', message, data);
  }

  debug(message: string, data?: any) {
    this.addLog('debug', message, data);
  }

  // Get recent logs for debugging
  getRecentLogs(count: number = 10): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Clear logs
  clear() {
    this.logs = [];
  }
}

export const logger = new Logger();
