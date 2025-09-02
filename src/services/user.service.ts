import { Injectable, Inject } from '@nestjs/common';
import type { UserRepositoryPort } from '../application/ports/user-repository.port';
import type { LoggerPort } from '../application/ports/logger.port';
import { Email } from '../domain/value-objects/email.vo';
import { User } from '../domain/entities/user.entity';
import {
  USER_REPOSITORY_TOKEN,
  LOGGER_TOKEN,
} from '../application/ports/tokens';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN) private readonly userRepository: UserRepositoryPort,
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerPort,
  ) {}

  async checkUserExists(email: Email): Promise<boolean> {
    this.logger.info('Checking if user exists', 'UserService', { email: email.value });

    try {
      const exists = await this.userRepository.exists(email);
      this.logger.info('User existence check completed', 'UserService', {
        email: email.value,
        exists,
      });
      return exists;
    } catch (error) {
      this.logger.error('Error checking user existence', error, 'UserService', { email: email.value });
      throw new Error('Failed to check user existence');
    }
  }

  async getUserByEmail(email: Email): Promise<User | null> {
    this.logger.info('Getting user by email', 'UserService', { email: email.value });

    try {
      const user = await this.userRepository.findByEmail(email);
      
      if (user) {
        this.logger.info('User found successfully', 'UserService', {
          email: email.value,
          userId: user.id,
        });
      } else {
        this.logger.warn('User not found', 'UserService', { email: email.value });
      }

      return user;
    } catch (error) {
      this.logger.error('Error getting user by email', error, 'UserService', { email: email.value });
      throw new Error('Failed to get user information');
    }
  }
}