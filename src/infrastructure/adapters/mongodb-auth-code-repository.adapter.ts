import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { AuthCodeRepositoryPort } from '../../application/ports/auth-code-repository.port';
import type { LoggerPort } from '../../application/ports/logger.port';
import { AuthCode } from '../../domain/entities/auth-code.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { AuthCodeDocument } from '../schemas/auth-code.schema';
import { LOGGER_TOKEN } from '../../application/ports/tokens';

@Injectable()
export class MongoDBAuthCodeRepositoryAdapter implements AuthCodeRepositoryPort {
  constructor(
    @InjectModel(AuthCodeDocument.name)
    private readonly authCodeModel: Model<AuthCodeDocument>,
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerPort,
  ) {
    this.logger.info('MongoDB auth code repository initialized', 'MongoDBAuthCodeRepositoryAdapter');
  }

  async save(authCode: AuthCode): Promise<void> {
    this.logger.debug('Saving auth code to MongoDB', 'MongoDBAuthCodeRepositoryAdapter', {
      email: authCode.email.value,
    });

    try {
      const authCodeData = this.toMongoDocument(authCode);
      
      await this.authCodeModel.findOneAndUpdate(
        { email: authCode.email.value },
        authCodeData,
        { upsert: true, new: true }
      );

      this.logger.debug('Auth code saved to MongoDB', 'MongoDBAuthCodeRepositoryAdapter', {
        email: authCode.email.value,
      });
    } catch (error) {
      this.logger.error('Error saving auth code to MongoDB', error, 'MongoDBAuthCodeRepositoryAdapter', {
        email: authCode.email.value,
      });
      throw error;
    }
  }

  async findByEmail(email: Email): Promise<AuthCode | null> {
    this.logger.debug('Finding auth code by email in MongoDB', 'MongoDBAuthCodeRepositoryAdapter', {
      email: email.value,
    });

    try {
      const document = await this.authCodeModel.findOne({ 
        email: email.value,
        used: false,
        expiresAt: { $gt: new Date() }
      }).exec();
      
      if (!document) {
        this.logger.debug('Auth code not found in MongoDB', 'MongoDBAuthCodeRepositoryAdapter', {
          email: email.value,
        });
        return null;
      }

      const authCode = this.toDomainEntity(document);
      
      this.logger.debug('Auth code found in MongoDB', 'MongoDBAuthCodeRepositoryAdapter', {
        email: email.value,
        isValid: !authCode.isExpired && !authCode.used,
      });

      return authCode;
    } catch (error) {
      this.logger.error('Error finding auth code by email in MongoDB', error, 'MongoDBAuthCodeRepositoryAdapter', {
        email: email.value,
      });
      throw error;
    }
  }

  async delete(email: Email): Promise<void> {
    this.logger.debug('Deleting auth code from MongoDB', 'MongoDBAuthCodeRepositoryAdapter', {
      email: email.value,
    });

    try {
      const result = await this.authCodeModel.deleteOne({ email: email.value }).exec();

      this.logger.debug('Auth code deletion completed', 'MongoDBAuthCodeRepositoryAdapter', {
        email: email.value,
        existed: result.deletedCount > 0,
      });
    } catch (error) {
      this.logger.error('Error deleting auth code from MongoDB', error, 'MongoDBAuthCodeRepositoryAdapter', {
        email: email.value,
      });
      throw error;
    }
  }

  async markAsUsed(email: Email): Promise<void> {
    this.logger.debug('Marking auth code as used in MongoDB', 'MongoDBAuthCodeRepositoryAdapter', {
      email: email.value,
    });

    try {
      await this.authCodeModel.updateOne(
        { email: email.value },
        { 
          used: true,
          usedAt: new Date()
        }
      ).exec();

      this.logger.debug('Auth code marked as used in MongoDB', 'MongoDBAuthCodeRepositoryAdapter', {
        email: email.value,
      });
    } catch (error) {
      this.logger.error('Error marking auth code as used in MongoDB', error, 'MongoDBAuthCodeRepositoryAdapter', {
        email: email.value,
      });
      throw error;
    }
  }

  async cleanup(): Promise<number> {
    this.logger.debug('Cleaning up expired auth codes in MongoDB', 'MongoDBAuthCodeRepositoryAdapter');

    try {
      const result = await this.authCodeModel.deleteMany({
        $or: [
          { expiresAt: { $lt: new Date() } },
          { used: true }
        ]
      }).exec();

      this.logger.info('Auth code cleanup completed', 'MongoDBAuthCodeRepositoryAdapter', {
        deletedCount: result.deletedCount,
      });

      return result.deletedCount;
    } catch (error) {
      this.logger.error('Error during auth code cleanup in MongoDB', error, 'MongoDBAuthCodeRepositoryAdapter');
      throw error;
    }
  }

  private toMongoDocument(authCode: AuthCode): Partial<AuthCodeDocument> {
    return {
      email: authCode.email.value,
      code: authCode.code.value,
      expiresAt: authCode.expiresAt,
      used: authCode.used,
      createdAt: new Date(),
      usedAt: authCode.used ? new Date() : undefined,
    };
  }

  private toDomainEntity(document: AuthCodeDocument): AuthCode {
    const authCode = new AuthCode(
      new Email(document.email),
      { value: document.code, equals: (other: string) => document.code === other } as any,
      document.expiresAt,
      document.used
    );
    
    return authCode;
  }
}