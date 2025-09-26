export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogMetadata {
  [key: string]: any;
}

export class SystemLog {
  constructor(
    public readonly id: string,
    public readonly level: LogLevel,
    public readonly message: string,
    public readonly service: string,
    public readonly metadata?: LogMetadata,
    public readonly error?: {
      name: string;
      message: string;
      stack?: string;
    },
    public readonly timestamp: Date = new Date(),
    public readonly requestId?: string,
    public readonly userId?: string,
    public readonly ip?: string
  ) {}

  static create(data: {
    level: LogLevel;
    message: string;
    service: string;
    metadata?: LogMetadata;
    error?: Error;
    requestId?: string;
    userId?: string;
    ip?: string;
  }): SystemLog {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let errorData: { name: string; message: string; stack?: string } | undefined;
    if (data.error) {
      errorData = {
        name: data.error.name,
        message: data.error.message,
        stack: data.error.stack
      };
    }

    return new SystemLog(
      id,
      data.level,
      data.message,
      data.service,
      data.metadata,
      errorData,
      new Date(),
      data.requestId,
      data.userId,
      data.ip
    );
  }

  toJSON() {
    return {
      id: this.id,
      level: this.level,
      message: this.message,
      service: this.service,
      metadata: this.metadata,
      error: this.error,
      timestamp: this.timestamp.toISOString(),
      requestId: this.requestId,
      userId: this.userId,
      ip: this.ip
    };
  }

  // Helper methods for log filtering and searching
  isError(): boolean {
    return this.level === 'error';
  }

  isWarning(): boolean {
    return this.level === 'warn';
  }

  isFromService(serviceName: string): boolean {
    return this.service === serviceName;
  }

  containsKeyword(keyword: string): boolean {
    const searchText = `${this.message} ${this.service} ${JSON.stringify(this.metadata)}`.toLowerCase();
    return searchText.includes(keyword.toLowerCase());
  }
}