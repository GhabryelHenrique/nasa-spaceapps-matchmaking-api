import { createLogger, format, transports } from 'winston';
import * as path from 'path';

const logDir = path.join(process.cwd(), 'logs');

export const logger = createLogger({
  level: 'debug',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'nasa-matchmaking-api' },
  transports: [
    new transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error' 
    }),
    new transports.File({ 
      filename: path.join(logDir, 'matchmaking.log'),
      level: 'debug'
    }),
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

if (process.env.NODE_ENV === 'production') {
  logger.remove(logger.transports[2]);
}