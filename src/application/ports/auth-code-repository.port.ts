import { AuthCode } from '../../domain/entities/auth-code.entity';
import { Email } from '../../domain/value-objects/email.vo';

export interface AuthCodeRepositoryPort {
  save(authCode: AuthCode): Promise<void>;
  findByEmail(email: Email): Promise<AuthCode | null>;
  delete(email: Email): Promise<void>;
  cleanup(): Promise<number>;
}