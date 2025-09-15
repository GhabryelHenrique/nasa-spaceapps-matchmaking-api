import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import type { LoggerPort } from '../application/ports/logger.port';

@Injectable()
export class ErrorMonitoringMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerPort) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const originalJson = res.json;
    const originalSend = res.send;

    res.json = function(body: any) {
      if (res.statusCode >= 400) {
        this.logError(req, res, body);
      }
      return originalJson.call(this, body);
    }.bind(this);

    res.send = function(body: any) {
      if (res.statusCode >= 400) {
        this.logError(req, res, body);
      }
      return originalSend.call(this, body);
    }.bind(this);

    next();
  }

  private logError(req: Request, res: Response, body: any): void {
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || 'unknown';
    const requestId = req['requestId'];

    const errorData = {
      requestId,
      method,
      url: originalUrl,
      statusCode: res.statusCode,
      ip,
      userAgent,
      headers: this.sanitizeHeaders(headers),
      requestBody: this.sanitizeBody(req.body),
      responseBody: this.sanitizeResponse(body),
      query: req.query,
      params: req.params,
      timestamp: new Date().toISOString(),
      severity: this.getErrorSeverity(res.statusCode),
      category: 'http_error'
    };

    if (res.statusCode >= 500) {
      this.logger.error(`HTTP ${res.statusCode} Error: ${method} ${originalUrl}`, null, 'ErrorMonitoring', errorData);
    } else if (res.statusCode >= 400) {
      this.logger.warn(`HTTP ${res.statusCode} Client Error: ${method} ${originalUrl}`, 'ErrorMonitoring', errorData);
    }
  }

  private sanitizeHeaders(headers: any): any {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
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

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'code'];
    const sanitized = { ...body };

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizeResponse(response: any): any {
    if (!response) return response;

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
      return '[RESPONSE_DATA]';
    }
  }

  private getErrorSeverity(statusCode: number): string {
    if (statusCode >= 500) return 'critical';
    if (statusCode >= 400) return 'warning';
    return 'info';
  }
}