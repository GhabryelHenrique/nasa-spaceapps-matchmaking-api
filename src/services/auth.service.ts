import { Injectable, Inject } from '@nestjs/common';
import type { AuthCodeRepositoryPort } from '../application/ports/auth-code-repository.port';
import type { LoggerPort } from '../application/ports/logger.port';
import { Email } from '../domain/value-objects/email.vo';
import { AuthCode } from '../domain/entities/auth-code.entity';
import {
  AUTH_CODE_REPOSITORY_TOKEN,
  LOGGER_TOKEN,
} from '../application/ports/tokens';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_CODE_REPOSITORY_TOKEN) private readonly authCodeRepository: AuthCodeRepositoryPort,
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerPort,
  ) {}

  async generateAuthCode(email: Email): Promise<string> {
    this.logger.info('Generating auth code', 'AuthService', { email: email.value });

    const authCode = AuthCode.generate(email);
    await this.authCodeRepository.save(authCode);

    this.logger.info('Auth code generated and saved', 'AuthService', {
      email: email.value,
      expiresAt: authCode.expiresAt.toISOString(),
    });

    return authCode.code.value;
  }

  async verifyAuthCode(email: Email, code: string): Promise<boolean> {
    this.logger.info('Verifying auth code', 'AuthService', { email: email.value });

    const authCode = await this.authCodeRepository.findByEmail(email);
    if (!authCode) {
      this.logger.warn('Auth code not found', 'AuthService', { email: email.value });
      return false;
    }

    const isValid = authCode.verify(code);
    if (!isValid) {
      this.logger.warn('Auth code verification failed', 'AuthService', {
        email: email.value,
        reason: authCode.isExpired ? 'expired' : authCode.used ? 'used' : 'invalid',
      });
      return false;
    }

    // Clean up used auth code
    await this.authCodeRepository.delete(email);
    this.logger.info('Auth code verified successfully', 'AuthService', { email: email.value });

    return true;
  }
}