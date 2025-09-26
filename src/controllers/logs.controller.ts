import {
  Controller,
  Get,
  Query,
  Post,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import type { LogRepository, LogSearchFilters } from '../application/ports/log-repository.port';
import { LogCleanupService } from '../services/log-cleanup.service';
import type { LogLevel } from '../domain/entities/system-log.entity';
import type { LoggerPort } from '../application/ports/logger.port';
import { LOG_REPOSITORY_TOKEN, LOGGER_TOKEN } from '../application/ports/tokens';

@ApiTags('logs')
@Controller('logs')
export class LogsController {
  constructor(
    @Inject(LOG_REPOSITORY_TOKEN)
    private readonly logRepository: LogRepository,
    private readonly logCleanupService: LogCleanupService,
    @Inject(LOGGER_TOKEN)
    private readonly logger: LoggerPort,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get system logs with filters' })
  @ApiQuery({ name: 'level', required: false, enum: ['debug', 'info', 'warn', 'error'] })
  @ApiQuery({ name: 'service', required: false, type: 'string' })
  @ApiQuery({ name: 'startDate', required: false, type: 'string' })
  @ApiQuery({ name: 'endDate', required: false, type: 'string' })
  @ApiQuery({ name: 'keyword', required: false, type: 'string' })
  @ApiQuery({ name: 'limit', required: false, type: 'number', example: 50 })
  @ApiQuery({ name: 'offset', required: false, type: 'number', example: 0 })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully' })
  async getLogs(
    @Query('level') level?: LogLevel,
    @Query('service') service?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('keyword') keyword?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      const filters: LogSearchFilters = {
        level,
        service,
        keyword,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
      };

      if (startDate) {
        filters.startDate = new Date(startDate);
      }

      if (endDate) {
        filters.endDate = new Date(endDate);
      }

      const [logs, totalCount] = await Promise.all([
        this.logRepository.findByFilters(filters),
        this.logRepository.count(filters)
      ]);

      return {
        success: true,
        logs: logs.map(log => log.toJSON()),
        pagination: {
          total: totalCount,
          limit: filters.limit,
          offset: filters.offset,
          hasMore: (filters.offset || 0) + (filters.limit || 0) < totalCount
        },
        filters: {
          level,
          service,
          startDate,
          endDate,
          keyword
        }
      };
    } catch (error) {
      this.logger.error('Error retrieving logs', error, 'LogsController');
      throw new HttpException('Failed to retrieve logs', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get log statistics' })
  @ApiQuery({ name: 'startDate', required: false, type: 'string' })
  @ApiQuery({ name: 'endDate', required: false, type: 'string' })
  @ApiResponse({ status: 200, description: 'Log statistics retrieved successfully' })
  async getLogStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      const stats = await this.logRepository.getLogStats(start, end);

      return {
        success: true,
        stats,
        period: {
          startDate: start?.toISOString(),
          endDate: end?.toISOString(),
        }
      };
    } catch (error) {
      this.logger.error('Error retrieving log stats', error, 'LogsController');
      throw new HttpException('Failed to retrieve log statistics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('errors/recent')
  @ApiOperation({ summary: 'Get recent error logs' })
  @ApiQuery({ name: 'limit', required: false, type: 'number', example: 20 })
  @ApiResponse({ status: 200, description: 'Recent error logs retrieved successfully' })
  async getRecentErrors(@Query('limit') limit?: string) {
    try {
      const limitNum = limit ? parseInt(limit) : 20;
      const errorLogs = await this.logRepository.getRecentErrorLogs(limitNum);

      return {
        success: true,
        count: errorLogs.length,
        errors: errorLogs.map(log => log.toJSON())
      };
    } catch (error) {
      this.logger.error('Error retrieving recent error logs', error, 'LogsController');
      throw new HttpException('Failed to retrieve recent error logs', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('services/:service')
  @ApiOperation({ summary: 'Get recent logs for a specific service' })
  @ApiQuery({ name: 'limit', required: false, type: 'number', example: 50 })
  @ApiResponse({ status: 200, description: 'Service logs retrieved successfully' })
  async getServiceLogs(
    @Query('service') service: string,
    @Query('limit') limit?: string
  ) {
    try {
      const limitNum = limit ? parseInt(limit) : 50;
      const serviceLogs = await this.logRepository.getRecentLogsByService(service, limitNum);

      return {
        success: true,
        service,
        count: serviceLogs.length,
        logs: serviceLogs.map(log => log.toJSON())
      };
    } catch (error) {
      this.logger.error('Error retrieving service logs', error, 'LogsController', { service });
      throw new HttpException('Failed to retrieve service logs', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Manually trigger log cleanup' })
  @ApiResponse({ status: 200, description: 'Log cleanup completed successfully' })
  async manualCleanup() {
    try {
      this.logger.info('Manual log cleanup triggered', 'LogsController');
      const deletedCount = await this.logCleanupService.cleanupOldLogs();

      return {
        success: true,
        message: 'Log cleanup completed successfully',
        deletedCount
      };
    } catch (error) {
      this.logger.error('Error during manual log cleanup', error, 'LogsController');
      throw new HttpException('Log cleanup failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('cleanup/stats')
  @ApiOperation({ summary: 'Get log cleanup statistics' })
  @ApiResponse({ status: 200, description: 'Cleanup statistics retrieved successfully' })
  async getCleanupStats() {
    try {
      const stats = await this.logCleanupService.getCleanupStats();

      return {
        success: true,
        cleanup: stats
      };
    } catch (error) {
      this.logger.error('Error retrieving cleanup stats', error, 'LogsController');
      throw new HttpException('Failed to retrieve cleanup statistics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('cleanup/emergency')
  @ApiOperation({ summary: 'Perform emergency log cleanup' })
  @ApiQuery({ name: 'hours', required: false, type: 'number', example: 24 })
  @ApiResponse({ status: 200, description: 'Emergency cleanup completed successfully' })
  async emergencyCleanup(@Query('hours') hours?: string) {
    try {
      const hoursNum = hours ? parseInt(hours) : 24;

      this.logger.warn(
        'Emergency log cleanup triggered',
        'LogsController',
        { olderThanHours: hoursNum }
      );

      const deletedCount = await this.logCleanupService.emergencyCleanup(hoursNum);

      return {
        success: true,
        message: 'Emergency cleanup completed successfully',
        deletedCount,
        olderThanHours: hoursNum
      };
    } catch (error) {
      this.logger.error('Error during emergency log cleanup', error, 'LogsController');
      throw new HttpException('Emergency cleanup failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}