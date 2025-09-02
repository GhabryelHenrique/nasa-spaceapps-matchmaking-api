import { Injectable, Logger } from '@nestjs/common';
import { LoggerPort } from '../../application/ports/logger.port';

@Injectable()
export class NestJSLoggerAdapter implements LoggerPort {
  private readonly logger = new Logger('NASA-SpaceApps-API');

  info(message: string, context?: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = meta ? `${message} | ${JSON.stringify(meta)}` : message;
    this.logger.log(`[${timestamp}] ${logMessage}`, context);
  }

  warn(message: string, context?: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = meta ? `${message} | ${JSON.stringify(meta)}` : message;
    this.logger.warn(`[${timestamp}] ${logMessage}`, context);
  }

  error(message: string, error?: any, context?: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    const errorDetails = error ? {
      message: error.message,
      stack: error.stack,
      code: error.code,
      ...meta
    } : meta;
    
    const logMessage = errorDetails ? 
      `${message} | ${JSON.stringify(errorDetails)}` : 
      message;
    
    this.logger.error(`[${timestamp}] ${logMessage}`, error?.stack, context);
  }

  debug(message: string, context?: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = meta ? `${message} | ${JSON.stringify(meta)}` : message;
    this.logger.debug(`[${timestamp}] ${logMessage}`, context);
  }
}