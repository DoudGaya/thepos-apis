/**
 * Production-Ready Logger
 * Conditional logging based on environment
 * Replace all console.log statements with this logger
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      data: data && !this.containsSensitiveData(data) ? data : undefined,
    };
  }

  private containsSensitiveData(data: any): boolean {
    if (typeof data !== 'object' || data === null) return false;
    
    const sensitiveKeys = [
      'password', 'pin', 'token', 'secret', 'key', 'authorization',
      'passwordHash', 'pinHash', 'refreshToken', 'accessToken',
      'apiKey', 'secretKey', 'privateKey'
    ];
    
    const dataString = JSON.stringify(data).toLowerCase();
    return sensitiveKeys.some(key => dataString.includes(key.toLowerCase()));
  }

  /**
   * Debug logs - only shown in development
   */
  debug(message: string, ...args: any[]): void {
    if (isDevelopment) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Info logs - shown in development and production
   */
  info(message: string, ...args: any[]): void {
    if (!isTest) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Warning logs - always shown except in test
   */
  warn(message: string, ...args: any[]): void {
    if (!isTest) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  /**
   * Error logs - always shown
   */
  error(message: string, error?: Error | any, ...args: any[]): void {
    console.error(`[ERROR] ${message}`, error?.message || error, ...args);
    
    // In production, you could send to error tracking service here
    // e.g., Sentry.captureException(error);
  }

  /**
   * API request logging - only in development
   */
  api(method: string, url: string, status?: number, duration?: number): void {
    if (isDevelopment) {
      const statusEmoji = status ? (status < 400 ? '✅' : '❌') : '🔄';
      const durationStr = duration ? `${duration}ms` : '';
      console.log(`${statusEmoji} [API] ${method} ${url} ${status || ''} ${durationStr}`);
    }
  }

  /**
   * Transaction logging - sanitized for production
   */
  transaction(action: string, reference: string, details?: Record<string, any>): void {
    const sanitizedDetails = details ? {
      amount: details.amount,
      status: details.status,
      type: details.type,
      // Exclude sensitive fields
    } : undefined;
    
    console.log(`[TXN] ${action}: ${reference}`, sanitizedDetails || '');
  }

  /**
   * Security events - always log but sanitize
   */
  security(event: string, userId?: string, details?: string): void {
    console.log(`[SECURITY] ${event}`, userId ? `User: ${userId.slice(0, 8)}...` : '', details || '');
  }
}

export const logger = new Logger();
export default logger;
