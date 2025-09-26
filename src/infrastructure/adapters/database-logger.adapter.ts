import { Injectable, Inject } from '@nestjs/common';
import type { LoggerPort } from '../../application/ports/logger.port';
import { SystemLog, LogLevel } from '../../domain/entities/system-log.entity';
import type { LogRepository } from '../../application/ports/log-repository.port';
import { LOG_REPOSITORY_TOKEN, CONSOLE_LOGGER_TOKEN } from '../../application/ports/tokens';

interface LogQueueItem {
  log: SystemLog;
  timestamp: number;
}

@Injectable()
export class DatabaseLoggerAdapter implements LoggerPort {
  private logQueue: LogQueueItem[] = [];
  private batchSize = 50;
  private flushInterval = 5000; // 5 seconds
  private maxRetries = 3;
  private isProcessing = false;

  constructor(
    @Inject(LOG_REPOSITORY_TOKEN)
    private readonly logRepository: LogRepository,
    @Inject(CONSOLE_LOGGER_TOKEN)
    private readonly consoleLogger: LoggerPort // Fallback logger
  ) {
    // Start the batch processor
    this.startBatchProcessor();

    // Setup graceful shutdown
    process.on('SIGINT', () => this.gracefulShutdown());
    process.on('SIGTERM', () => this.gracefulShutdown());
  }

  debug(message: string, service: string, metadata?: any): void {
    this.queueLog('debug', message, service, metadata);
    // Also log to console for immediate feedback
    this.consoleLogger.debug(message, service, metadata);
  }

  info(message: string, service: string, metadata?: any): void {
    this.queueLog('info', message, service, metadata);
    this.consoleLogger.info(message, service, metadata);
  }

  warn(message: string, service: string, metadata?: any): void {
    this.queueLog('warn', message, service, metadata);
    this.consoleLogger.warn(message, service, metadata);
  }

  error(message: string, error: Error, service: string, metadata?: any): void {
    this.queueLog('error', message, service, metadata, error);
    this.consoleLogger.error(message, error, service, metadata);
  }

  private queueLog(
    level: LogLevel,
    message: string,
    service: string,
    metadata?: any,
    error?: Error
  ): void {
    try {
      const log = SystemLog.create({
        level,
        message,
        service,
        metadata,
        error,
        requestId: this.extractRequestId(metadata),
        userId: this.extractUserId(metadata),
        ip: this.extractIp(metadata)
      });

      const queueItem: LogQueueItem = {
        log,
        timestamp: Date.now()
      };

      // Add to queue in a non-blocking way
      setImmediate(() => {
        this.logQueue.push(queueItem);

        // If queue is getting full, trigger immediate flush
        if (this.logQueue.length >= this.batchSize * 2) {
          this.flushLogs();
        }
      });
    } catch (queueError) {
      // Fallback to console if queuing fails
      this.consoleLogger.error(
        'Failed to queue log for database storage',
        queueError,
        'DatabaseLoggerAdapter'
      );
    }
  }

  private startBatchProcessor(): void {
    // Process logs in batches at regular intervals
    setInterval(() => {
      this.flushLogs();
    }, this.flushInterval);

    // Also process when queue reaches batch size
    setInterval(() => {
      if (this.logQueue.length >= this.batchSize && !this.isProcessing) {
        this.flushLogs();
      }
    }, 1000); // Check every second
  }

  private async flushLogs(): Promise<void> {
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Extract logs to process
      const logsToProcess = this.logQueue.splice(0, this.batchSize);
      const logs = logsToProcess.map(item => item.log);

      if (logs.length === 0) {
        return;
      }

      // Process in background without blocking
      this.processBatchWithRetry(logs, 0).catch(processError => {
        // If batch processing fails completely, try individual saves
        this.fallbackToIndividualSaves(logs);
      });

    } catch (error) {
      this.consoleLogger.error(
        'Error during log flush operation',
        error,
        'DatabaseLoggerAdapter'
      );
    } finally {
      this.isProcessing = false;
    }
  }

  private async processBatchWithRetry(logs: SystemLog[], retryCount: number): Promise<void> {
    try {
      await this.logRepository.saveBatch(logs);
    } catch (error) {
      if (retryCount < this.maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          this.processBatchWithRetry(logs, retryCount + 1);
        }, delay);
      } else {
        throw error;
      }
    }
  }

  private async fallbackToIndividualSaves(logs: SystemLog[]): Promise<void> {
    // Try to save logs individually if batch save fails
    for (const log of logs) {
      try {
        await this.logRepository.save(log);
      } catch (individualError) {
        // Log the failure but continue with other logs
        this.consoleLogger.error(
          'Failed to save individual log to database',
          individualError,
          'DatabaseLoggerAdapter',
          { originalLogId: log.id }
        );
      }
    }
  }

  private async gracefulShutdown(): Promise<void> {
    this.consoleLogger.info(
      'Gracefully shutting down database logger, flushing remaining logs',
      'DatabaseLoggerAdapter'
    );

    // Flush all remaining logs
    let attempts = 0;
    const maxAttempts = 5;

    while (this.logQueue.length > 0 && attempts < maxAttempts) {
      await this.flushLogs();
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (this.logQueue.length > 0) {
      this.consoleLogger.warn(
        `Database logger shutdown with ${this.logQueue.length} logs still in queue`,
        'DatabaseLoggerAdapter'
      );
    } else {
      this.consoleLogger.info(
        'Database logger shutdown complete, all logs flushed',
        'DatabaseLoggerAdapter'
      );
    }
  }

  // Helper methods to extract contextual information from metadata
  private extractRequestId(metadata?: any): string | undefined {
    return metadata?.requestId || metadata?.req?.id || metadata?.traceId;
  }

  private extractUserId(metadata?: any): string | undefined {
    return metadata?.userId || metadata?.user?.id || metadata?.email;
  }

  private extractIp(metadata?: any): string | undefined {
    return metadata?.ip || metadata?.req?.ip || metadata?.clientIp;
  }

  // Public methods for queue monitoring (useful for health checks)
  getQueueStatus(): {
    queueLength: number;
    isProcessing: boolean;
    oldestLogAge?: number;
  } {
    const oldestLog = this.logQueue[0];
    return {
      queueLength: this.logQueue.length,
      isProcessing: this.isProcessing,
      oldestLogAge: oldestLog ? Date.now() - oldestLog.timestamp : undefined
    };
  }

  // Force flush for testing or emergency scenarios
  async forceFlush(): Promise<void> {
    await this.flushLogs();
  }
}