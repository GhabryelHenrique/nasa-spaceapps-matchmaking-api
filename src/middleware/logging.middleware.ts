import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import type { LoggerPort } from '../application/ports/logger.port';
import { auditLogger, performanceLogger } from '../infrastructure/config/logger.config';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerPort) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || 'unknown';
    const requestId = this.generateRequestId();

    req['requestId'] = requestId;

    this.logger.info('Incoming request', 'HTTP', {
      requestId,
      method,
      url: originalUrl,
      ip,
      userAgent,
      headers: this.sanitizeHeaders(headers),
      body: this.sanitizeBody(req.body),
      query: req.query
    });

    const originalSend = res.send;
    let responseBody: any;

    res.send = function(body: any) {
      responseBody = body;
      return originalSend.call(this, body);
    };

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      const logLevel = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
      const logMessage = `${method} ${originalUrl} - ${statusCode} - ${duration}ms`;

      this.logger[logLevel](logMessage, 'HTTP', {
        requestId,
        method,
        url: originalUrl,
        statusCode,
        duration,
        ip,
        userAgent,
        responseSize: res.get('content-length') || 0,
        response: this.sanitizeResponse(responseBody, statusCode)
      });

      performanceLogger(`HTTP ${method} ${originalUrl}`, duration, {
        statusCode,
        ip,
        userAgent
      });

      if (this.isAuditableRequest(method, originalUrl)) {
        auditLogger(`HTTP ${method} ${originalUrl}`, req['user']?.email, {
          requestId,
          statusCode,
          ip,
          userAgent
        });
      }
    });

    next();
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeHeaders(headers: any): any {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const sanitized = { ...headers };
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    const sanitized = { ...body };

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizeResponse(response: any, statusCode: number): any {
    if (statusCode >= 400 || !response) return response;

    try {
      const parsed = typeof response === 'string' ? JSON.parse(response) : response;
      const sensitiveFields = ['password', 'token', 'secret', 'key'];
      const sanitized = { ...parsed };

      sensitiveFields.forEach(field => {
        if (sanitized[field]) {
          sanitized[field] = '[REDACTED]';
        }
      });

      return sanitized;
    } catch {
      return '[RESPONSE_BODY]';
    }
  }

  private isAuditableRequest(method: string, url: string): boolean {
    const auditablePaths = [
      '/registration',
      '/matchmaking',
      '/auth'
    ];

    const auditableMethods = ['POST', 'PUT', 'DELETE'];

    return auditableMethods.includes(method) && 
           auditablePaths.some(path => url.includes(path));
  }
}