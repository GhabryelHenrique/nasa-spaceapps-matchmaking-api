import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LogRepository, LogSearchFilters } from '../../application/ports/log-repository.port';
import { SystemLog, LogLevel } from '../../domain/entities/system-log.entity';
import { SystemLogDocument } from '../schemas/system-log.schema';

@Injectable()
export class MongodbLogRepositoryAdapter implements LogRepository {
  constructor(
    @InjectModel(SystemLogDocument.name)
    private readonly logModel: Model<SystemLogDocument>
  ) {}

  async save(log: SystemLog): Promise<void> {
    try {
      const document = new this.logModel({
        level: log.level,
        message: log.message,
        service: log.service,
        metadata: log.metadata,
        error: log.error,
        requestId: log.requestId,
        userId: log.userId,
        ip: log.ip,
        timestamp: log.timestamp
      });

      // Fire and forget - don't await to avoid blocking
      document.save().catch(saveError => {
        // Fallback to console if database save fails to avoid infinite loops
        console.error('Failed to save log to database:', {
          originalLog: log.toJSON(),
          saveError: saveError.message
        });
      });
    } catch (error) {
      // Fallback to console if there's an error creating the document
      console.error('Failed to create log document:', {
        originalLog: log.toJSON(),
        error: error.message
      });
    }
  }

  async saveBatch(logs: SystemLog[]): Promise<void> {
    if (logs.length === 0) return;

    try {
      const documents = logs.map(log => ({
        level: log.level,
        message: log.message,
        service: log.service,
        metadata: log.metadata,
        error: log.error,
        requestId: log.requestId,
        userId: log.userId,
        ip: log.ip,
        timestamp: log.timestamp
      }));

      // Fire and forget batch insert
      this.logModel.insertMany(documents, { ordered: false }).catch(batchError => {
        console.error('Failed to save log batch to database:', {
          batchSize: logs.length,
          error: batchError.message
        });
      });
    } catch (error) {
      console.error('Failed to prepare log batch:', {
        batchSize: logs.length,
        error: error.message
      });
    }
  }

  async findById(id: string): Promise<SystemLog | null> {
    try {
      const document = await this.logModel.findOne({ _id: id });
      return document ? this.toDomainEntity(document) : null;
    } catch (error) {
      console.error('Error finding log by ID:', { id, error: error.message });
      return null;
    }
  }

  async findByFilters(filters: LogSearchFilters): Promise<SystemLog[]> {
    try {
      const query: any = {};

      if (filters.level) query.level = filters.level;
      if (filters.service) query.service = filters.service;
      if (filters.requestId) query.requestId = filters.requestId;
      if (filters.userId) query.userId = filters.userId;

      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = filters.startDate;
        if (filters.endDate) query.timestamp.$lte = filters.endDate;
      }

      if (filters.keyword) {
        query.$text = { $search: filters.keyword };
      }

      const limit = filters.limit || 100;
      const offset = filters.offset || 0;

      const documents = await this.logModel
        .find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(offset)
        .lean();

      return documents.map(doc => this.toDomainEntity(doc));
    } catch (error) {
      console.error('Error finding logs by filters:', { filters, error: error.message });
      return [];
    }
  }

  async count(filters?: Omit<LogSearchFilters, 'limit' | 'offset'>): Promise<number> {
    try {
      const query: any = {};

      if (filters?.level) query.level = filters.level;
      if (filters?.service) query.service = filters.service;
      if (filters?.requestId) query.requestId = filters.requestId;
      if (filters?.userId) query.userId = filters.userId;

      if (filters?.startDate || filters?.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = filters.startDate;
        if (filters.endDate) query.timestamp.$lte = filters.endDate;
      }

      if (filters?.keyword) {
        query.$text = { $search: filters.keyword };
      }

      return await this.logModel.countDocuments(query);
    } catch (error) {
      console.error('Error counting logs:', { filters, error: error.message });
      return 0;
    }
  }

  async getLogStats(startDate?: Date, endDate?: Date): Promise<{
    total: number;
    byLevel: Record<LogLevel, number>;
    byService: Record<string, number>;
    errorRate: number;
  }> {
    try {
      const matchStage: any = {};
      if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate) matchStage.timestamp.$gte = startDate;
        if (endDate) matchStage.timestamp.$lte = endDate;
      }

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            levels: { $push: '$level' },
            services: { $push: '$service' },
            errors: {
              $sum: {
                $cond: [{ $eq: ['$level', 'error'] }, 1, 0]
              }
            }
          }
        }
      ];

      const result = await this.logModel.aggregate(pipeline);
      if (!result.length) {
        return {
          total: 0,
          byLevel: { debug: 0, info: 0, warn: 0, error: 0 },
          byService: {},
          errorRate: 0
        };
      }

      const data = result[0];

      // Count by level
      const byLevel: Record<LogLevel, number> = { debug: 0, info: 0, warn: 0, error: 0 };
      data.levels.forEach((level: LogLevel) => {
        byLevel[level] = (byLevel[level] || 0) + 1;
      });

      // Count by service
      const byService: Record<string, number> = {};
      data.services.forEach((service: string) => {
        byService[service] = (byService[service] || 0) + 1;
      });

      return {
        total: data.total,
        byLevel,
        byService,
        errorRate: data.total > 0 ? (data.errors / data.total) * 100 : 0
      };
    } catch (error) {
      console.error('Error getting log stats:', { error: error.message });
      return {
        total: 0,
        byLevel: { debug: 0, info: 0, warn: 0, error: 0 },
        byService: {},
        errorRate: 0
      };
    }
  }

  async getRecentErrorLogs(limit: number = 50): Promise<SystemLog[]> {
    try {
      const documents = await this.logModel
        .find({ level: 'error' })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

      return documents.map(doc => this.toDomainEntity(doc));
    } catch (error) {
      console.error('Error getting recent error logs:', { error: error.message });
      return [];
    }
  }

  async getRecentLogsByService(service: string, limit: number = 50): Promise<SystemLog[]> {
    try {
      const documents = await this.logModel
        .find({ service })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

      return documents.map(doc => this.toDomainEntity(doc));
    } catch (error) {
      console.error('Error getting recent logs by service:', { service, error: error.message });
      return [];
    }
  }

  async deleteOldLogs(olderThan: Date): Promise<number> {
    try {
      const result = await this.logModel.deleteMany({
        timestamp: { $lt: olderThan }
      });
      return result.deletedCount || 0;
    } catch (error) {
      console.error('Error deleting old logs:', { olderThan, error: error.message });
      return 0;
    }
  }

  async cleanup(): Promise<void> {
    try {
      // Delete logs older than 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const deleted = await this.deleteOldLogs(thirtyDaysAgo);

      if (deleted > 0) {
        console.log(`Cleaned up ${deleted} old log entries`);
      }
    } catch (error) {
      console.error('Error during log cleanup:', error.message);
    }
  }

  private toDomainEntity(document: any): SystemLog {
    return new SystemLog(
      document._id.toString(),
      document.level as LogLevel,
      document.message,
      document.service,
      document.metadata,
      document.error,
      new Date(document.timestamp),
      document.requestId,
      document.userId,
      document.ip
    );
  }
}