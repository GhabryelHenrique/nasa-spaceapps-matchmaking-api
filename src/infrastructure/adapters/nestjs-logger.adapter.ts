import { Injectable, Logger } from '@nestjs/common';
import { LoggerPort } from '../../application/ports/logger.port';
import { logger as winstonLogger } from '../config/logger.config';
import * as os from 'os';

@Injectable()
export class NestJSLoggerAdapter implements LoggerPort {
  private readonly nestLogger = new Logger('NASA-SpaceApps-API');

  log(message: any, ...optionalParams: any[]): any {
    this.nestLogger.log(message, ...optionalParams);
  }

  info(message: string, context?: string, meta?: any): void {
    const logData = {
      level: 'info',
      message,
      context: context || 'Application',
      timestamp: new Date().toISOString(),
      pid: process.pid,
      hostname: os.hostname(),
      ...meta
    };

    winstonLogger.info(logData);
    this.nestLogger.log(message, context);
  }

  warn(message: string, context?: string, meta?: any): void {
    const logData = {
      level: 'warn',
      message,
      context: context || 'Application',
      timestamp: new Date().toISOString(),
      pid: process.pid,
      hostname: os.hostname(),
      ...meta
    };

    winstonLogger.warn(logData);
    this.nestLogger.warn(message, context);
  }

  error(message: string, error?: any, context?: string, meta?: any): void {
    const errorDetails = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode,
    } : {};

    const logData = {
      level: 'error',
      message,
      context: context || 'Application',
      timestamp: new Date().toISOString(),
      pid: process.pid,
      hostname: os.hostname(),
      error: errorDetails,
      ...meta
    };

    winstonLogger.error(logData);
    this.nestLogger.error(message, error?.stack, context);
  }

  debug(message: string, context?: string, meta?: any): void {
    const logData = {
      level: 'debug',
      message,
      context: context || 'Application',
      timestamp: new Date().toISOString(),
      pid: process.pid,
      hostname: os.hostname(),
      ...meta
    };

    winstonLogger.debug(logData);
    this.nestLogger.debug(message, context);
  }
}