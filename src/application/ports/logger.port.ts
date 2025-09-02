export interface LoggerPort {
  info(message: string, context?: string, meta?: any): void;
  warn(message: string, context?: string, meta?: any): void;
  error(message: string, error?: any, context?: string, meta?: any): void;
  debug(message: string, context?: string, meta?: any): void;
}