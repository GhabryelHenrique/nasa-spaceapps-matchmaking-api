import { Injectable, Inject } from '@nestjs/common';
import type { AuthCodeRepositoryPort } from '../../application/ports/auth-code-repository.port';
import type { LoggerPort } from '../../application/ports/logger.port';
import { AuthCode } from '../../domain/entities/auth-code.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { LOGGER_TOKEN } from '../../application/ports/tokens';

@Injectable()
export class InMemoryAuthCodeRepositoryAdapter implements AuthCodeRepositoryPort {
  private authCodes: Map<string, AuthCode> = new Map();

  constructor(@Inject(LOGGER_TOKEN) private readonly logger: LoggerPort) {
    this.logger.info('In-memory auth code repository initialized', 'InMemoryAuthCodeRepositoryAdapter');
  }

  async save(authCode: AuthCode): Promise<void> {
    this.logger.info('Saving auth code', 'InMemoryAuthCodeRepositoryAdapter', {
      email: authCode.email.value,
      expiresAt: authCode.expiresAt.toISOString(),
    });

    this.authCodes.set(authCode.email.value, authCode);
    
    // Cleanup expired codes
    await this.cleanup();

    this.logger.debug('Auth code saved successfully', 'InMemoryAuthCodeRepositoryAdapter', {
      email: authCode.email.value,
      totalCodes: this.authCodes.size,
    });
  }

  async findByEmail(email: Email): Promise<AuthCode | null> {
    this.logger.debug('Finding auth code by email', 'InMemoryAuthCodeRepositoryAdapter', {
      email: email.value,
    });

    const authCode = this.authCodes.get(email.value);
    
    if (!authCode) {
      this.logger.debug('Auth code not found', 'InMemoryAuthCodeRepositoryAdapter', {
        email: email.value,
      });
      return null;
    }

    if (authCode.isExpired) {
      this.logger.debug('Auth code expired, removing', 'InMemoryAuthCodeRepositoryAdapter', {
        email: email.value,
        expiresAt: authCode.expiresAt.toISOString(),
      });
      this.authCodes.delete(email.value);
      return null;
    }

    this.logger.debug('Auth code found', 'InMemoryAuthCodeRepositoryAdapter', {
      email: email.value,
      isValid: authCode.isValid,
    });

    return authCode;
  }

  async delete(email: Email): Promise<void> {
    this.logger.debug('Deleting auth code', 'InMemoryAuthCodeRepositoryAdapter', {
      email: email.value,
    });

    const existed = this.authCodes.delete(email.value);

    this.logger.debug('Auth code deletion completed', 'InMemoryAuthCodeRepositoryAdapter', {
      email: email.value,
      existed,
      totalCodes: this.authCodes.size,
    });
  }

  async cleanup(): Promise<number> {
    let cleanedCount = 0;
    const initialSize = this.authCodes.size;

    for (const [email, authCode] of this.authCodes.entries()) {
      if (authCode.isExpired || authCode.used) {
        this.authCodes.delete(email);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug('Cleaned up expired auth codes', 'InMemoryAuthCodeRepositoryAdapter', {
        cleanedCount,
        initialSize,
        remainingCount: this.authCodes.size,
      });
    }

    return cleanedCount;
  }
}