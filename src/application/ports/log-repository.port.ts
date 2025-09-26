import { SystemLog, LogLevel } from '../../domain/entities/system-log.entity';

export interface LogSearchFilters {
  level?: LogLevel;
  service?: string;
  startDate?: Date;
  endDate?: Date;
  requestId?: string;
  userId?: string;
  keyword?: string;
  limit?: number;
  offset?: number;
}

export interface LogRepository {
  // Core operations
  save(log: SystemLog): Promise<void>;
  saveBatch(logs: SystemLog[]): Promise<void>;

  // Query operations
  findById(id: string): Promise<SystemLog | null>;
  findByFilters(filters: LogSearchFilters): Promise<SystemLog[]>;
  count(filters?: Omit<LogSearchFilters, 'limit' | 'offset'>): Promise<number>;

  // Analytics
  getLogStats(startDate?: Date, endDate?: Date): Promise<{
    total: number;
    byLevel: Record<LogLevel, number>;
    byService: Record<string, number>;
    errorRate: number;
  }>;

  // Recent logs for monitoring
  getRecentErrorLogs(limit?: number): Promise<SystemLog[]>;
  getRecentLogsByService(service: string, limit?: number): Promise<SystemLog[]>;

  // Cleanup
  deleteOldLogs(olderThan: Date): Promise<number>;
  cleanup(): Promise<void>;
}