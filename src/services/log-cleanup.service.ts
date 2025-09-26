import { Injectable, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { LogRepository } from '../application/ports/log-repository.port';
import type { LoggerPort } from '../application/ports/logger.port';
import { LOG_REPOSITORY_TOKEN, CONSOLE_LOGGER_TOKEN } from '../application/ports/tokens';

@Injectable()
export class LogCleanupService {
  private readonly retentionDays = 30; // Keep logs for 30 days
  private readonly batchSize = 1000; // Delete in batches to avoid blocking

  constructor(
    @Inject(LOG_REPOSITORY_TOKEN)
    private readonly logRepository: LogRepository,
    @Inject(CONSOLE_LOGGER_TOKEN)
    private readonly logger: LoggerPort
  ) {}

  // Run cleanup every day at 2 AM
  @Cron('0 2 * * *', {
    name: 'log-cleanup',
    timeZone: 'America/Sao_Paulo'
  })
  async performScheduledCleanup(): Promise<void> {
    this.logger.info('Starting scheduled log cleanup', 'LogCleanupService');

    try {
      const deletedCount = await this.cleanupOldLogs();

      this.logger.info(
        `Log cleanup completed successfully, deleted ${deletedCount} old logs`,
        'LogCleanupService',
        { deletedCount, retentionDays: this.retentionDays }
      );
    } catch (error) {
      this.logger.error(
        'Error during scheduled log cleanup',
        error,
        'LogCleanupService',
        { retentionDays: this.retentionDays }
      );
    }
  }

  // Manual cleanup method
  async cleanupOldLogs(): Promise<number> {
    const cutoffDate = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);

    this.logger.debug(
      'Cleaning up logs older than cutoff date',
      'LogCleanupService',
      { cutoffDate: cutoffDate.toISOString(), retentionDays: this.retentionDays }
    );

    try {
      const deletedCount = await this.logRepository.deleteOldLogs(cutoffDate);

      if (deletedCount > 0) {
        this.logger.info(
          `Deleted ${deletedCount} old log entries`,
          'LogCleanupService',
          { deletedCount, cutoffDate: cutoffDate.toISOString() }
        );
      }

      return deletedCount;
    } catch (error) {
      this.logger.error(
        'Failed to delete old logs',
        error,
        'LogCleanupService',
        { cutoffDate: cutoffDate.toISOString() }
      );
      throw error;
    }
  }

  // Get cleanup statistics
  async getCleanupStats(): Promise<{
    retentionDays: number;
    nextCleanupDate: Date;
    estimatedOldLogs: number;
  }> {
    const cutoffDate = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);

    try {
      const estimatedOldLogs = await this.logRepository.count({
        endDate: cutoffDate
      });

      // Calculate next cleanup time (2 AM tomorrow)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(2, 0, 0, 0);

      return {
        retentionDays: this.retentionDays,
        nextCleanupDate: tomorrow,
        estimatedOldLogs
      };
    } catch (error) {
      this.logger.error(
        'Failed to get cleanup stats',
        error,
        'LogCleanupService'
      );

      return {
        retentionDays: this.retentionDays,
        nextCleanupDate: new Date(),
        estimatedOldLogs: 0
      };
    }
  }

  // Emergency cleanup for disk space issues
  async emergencyCleanup(olderThanHours: number = 24): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    this.logger.warn(
      'Performing emergency log cleanup',
      'LogCleanupService',
      {
        cutoffDate: cutoffDate.toISOString(),
        olderThanHours,
        reason: 'Emergency cleanup requested'
      }
    );

    try {
      const deletedCount = await this.logRepository.deleteOldLogs(cutoffDate);

      this.logger.warn(
        `Emergency cleanup completed, deleted ${deletedCount} logs`,
        'LogCleanupService',
        { deletedCount, olderThanHours }
      );

      return deletedCount;
    } catch (error) {
      this.logger.error(
        'Emergency cleanup failed',
        error,
        'LogCleanupService',
        { olderThanHours }
      );
      throw error;
    }
  }
}