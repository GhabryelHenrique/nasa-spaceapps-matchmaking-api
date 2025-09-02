import { Email } from '../../domain/value-objects/email.vo';
import { AuthCode as AuthCodeVO } from '../../domain/value-objects/auth-code.vo';

export interface EmailServicePort {
  sendAuthCode(email: Email, code: AuthCodeVO): Promise<boolean>;
}