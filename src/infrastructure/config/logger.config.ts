import { createLogger, format, transports } from 'winston';
import * as path from 'path';
import * as fs from 'fs';

const logDir = path.join(process.cwd(), 'logs');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const customFormat = format.combine(
  format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  format.errors({ stack: true }),
  format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
  format.json()
);

const consoleFormat = format.combine(
  format.timestamp({
    format: 'HH:mm:ss'
  }),
  format.colorize(),
  format.printf(({ level, message, timestamp, context, ...meta }) => {
    const contextStr = context ? `[${String(context)}]` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${String(timestamp)} ${String(level)} ${contextStr} ${String(message)}${metaStr}`;
  })
);

export const logger = createLogger({
  level: logLevel,
  format: customFormat,
  defaultMeta: { 
    service: 'nasa-matchmaking-api',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    new transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
      format: format.combine(
        customFormat,
        format.printf((info) => {
          return JSON.stringify({
            ...info,
            alert: 'ERROR_DETECTED',
            severity: 'high'
          });
        })
      )
    }),
    new transports.File({ 
      filename: path.join(logDir, 'app.log'),
      level: 'info',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10
    }),
    new transports.File({ 
      filename: path.join(logDir, 'debug.log'),
      level: 'debug',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3
    }),
    new transports.File({
      filename: path.join(logDir, 'audit.log'),
      level: 'info',
      format: format.combine(
        customFormat,
        format((info) => {
          if (info.category === 'audit' || info.audit) {
            return {
              ...info,
              audit: true,
              category: 'audit'
            };
          }
          return false;
        })()
      )
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
} else {
  logger.add(new transports.Console({
    format: format.combine(
      format.timestamp(),
      format.json()
    ),
    level: 'warn'
  }));
}

export const auditLogger = (action: string, userId?: string, meta?: any) => {
  logger.info(`AUDIT: ${action}`, {
    category: 'audit',
    audit: true,
    action,
    userId,
    ...meta
  });
};

export const performanceLogger = (operation: string, duration: number, meta?: any) => {
  logger.info(`PERFORMANCE: ${operation} completed in ${duration}ms`, {
    category: 'performance',
    operation,
    duration,
    ...meta
  });
};