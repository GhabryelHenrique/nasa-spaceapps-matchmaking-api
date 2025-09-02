import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.vo';

export interface UserRepositoryPort {
  findByEmail(email: Email): Promise<User | null>;
  exists(email: Email): Promise<boolean>;
}