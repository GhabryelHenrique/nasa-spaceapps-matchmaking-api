import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { LoggerPort } from '../../application/ports/logger.port';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { UserDocument } from '../schemas/user.schema';
import { LOGGER_TOKEN } from '../../application/ports/tokens';

export interface UserRepositoryMongoDBPort {
  save(user: User): Promise<void>;
  findByEmail(email: Email): Promise<User | null>;
  exists(email: Email): Promise<boolean>;
}

@Injectable()
export class MongoDBUserRepositoryAdapter implements UserRepositoryMongoDBPort {
  constructor(
    @InjectModel(UserDocument.name)
    private readonly userModel: Model<UserDocument>,
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerPort,
  ) {
    this.logger.info('MongoDB user repository initialized', 'MongoDBUserRepositoryAdapter');
  }

  async save(user: User): Promise<void> {
    this.logger.debug('Saving user to MongoDB', 'MongoDBUserRepositoryAdapter', {
      email: user.email.value,
    });

    try {
      const userData = this.toMongoDocument(user);
      
      await this.userModel.findOneAndUpdate(
        { email: user.email.value },
        userData,
        { upsert: true, new: true }
      );

      this.logger.debug('User saved to MongoDB', 'MongoDBUserRepositoryAdapter', {
        email: user.email.value,
      });
    } catch (error) {
      this.logger.error('Error saving user to MongoDB', error, 'MongoDBUserRepositoryAdapter', {
        email: user.email.value,
      });
      throw error;
    }
  }

  async findByEmail(email: Email): Promise<User | null> {
    this.logger.debug('Finding user by email in MongoDB', 'MongoDBUserRepositoryAdapter', {
      email: email.value,
    });

    try {
      const document = await this.userModel.findOne({ 
        email: email.value 
      }).exec();
      
      if (!document) {
        this.logger.debug('User not found in MongoDB', 'MongoDBUserRepositoryAdapter', {
          email: email.value,
        });
        return null;
      }

      const user = this.toDomainEntity(document);
      
      this.logger.debug('User found in MongoDB', 'MongoDBUserRepositoryAdapter', {
        email: email.value,
        userId: user.id,
      });

      return user;
    } catch (error) {
      this.logger.error('Error finding user by email in MongoDB', error, 'MongoDBUserRepositoryAdapter', {
        email: email.value,
      });
      throw error;
    }
  }

  async exists(email: Email): Promise<boolean> {
    this.logger.debug('Checking if user exists in MongoDB', 'MongoDBUserRepositoryAdapter', {
      email: email.value,
    });

    try {
      const count = await this.userModel.countDocuments({ 
        email: email.value 
      }).exec();
      
      const exists = count > 0;
      
      this.logger.debug('User existence check completed in MongoDB', 'MongoDBUserRepositoryAdapter', {
        email: email.value,
        exists,
      });

      return exists;
    } catch (error) {
      this.logger.error('Error checking user existence in MongoDB', error, 'MongoDBUserRepositoryAdapter', {
        email: email.value,
      });
      throw error;
    }
  }

  private toMongoDocument(user: User): Partial<UserDocument> {
    return {
      userId: user.id,
      email: user.email.value,
      fullName: user.fullName,
      phone: user.phone,
      cpf: user.cpf,
      city: user.city,
      educationLevel: user.educationLevel,
      birthDate: user.birthDate,
      participationMode: user.participationMode,
      registeredAt: user.registeredAt,
      importedAt: new Date(),
    };
  }

  private toDomainEntity(document: UserDocument): User {
    return new User(
      document.userId,
      new Email(document.email),
      document.fullName,
      document.phone,
      document.cpf,
      document.city,
      document.educationLevel,
      document.birthDate,
      document.participationMode as 'Presencial' | 'Remoto',
      document.registeredAt
    );
  }
}