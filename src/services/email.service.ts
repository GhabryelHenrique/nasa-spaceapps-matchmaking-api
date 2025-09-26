import { Injectable, Inject } from '@nestjs/common';
import type { EmailServicePort } from '../application/ports/email-service.port';
import type { LoggerPort } from '../application/ports/logger.port';
import { Email } from '../domain/value-objects/email.vo';
import { AuthCode } from '../domain/value-objects/auth-code.vo';
import {
  EMAIL_SERVICE_TOKEN,
  LOGGER_TOKEN,
} from '../application/ports/tokens';

@Injectable()
export class EmailService {
  constructor(
    @Inject(EMAIL_SERVICE_TOKEN) private readonly emailServicePort: EmailServicePort,
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerPort,
  ) {}

  async sendAuthCode(email: Email, code: string): Promise<boolean> {
    this.logger.info('Sending auth code email', 'EmailService', { email: email.value });

    try {
      const authCode = new AuthCode(code);
      const result = await this.emailServicePort.sendAuthCode(email, authCode);

      if (result) {
        this.logger.info('Auth code email sent successfully', 'EmailService', { email: email.value });
      } else {
        this.logger.warn('Failed to send auth code email', 'EmailService', { email: email.value });
      }

      return result;
    } catch (error) {
      this.logger.error('Error sending auth code email', error, 'EmailService', { email: email.value });
      return false;
    }
  }

  async sendMatchNotification(
    senderEmail: string,
    senderName: string,
    recipientEmail: string,
    recipientName: string,
    senderPhoneNumber: string
  ): Promise<boolean> {
    this.logger.info('Sending match notification email', 'EmailService', {
      senderEmail,
      recipientEmail
    });

    try {
      const senderEmailVo = new Email(senderEmail);
      const recipientEmailVo = new Email(recipientEmail);

      const result = await this.emailServicePort.sendMatchNotification(
        senderEmailVo,
        senderName,
        recipientEmailVo,
        recipientName,
        senderPhoneNumber
      );

      if (result) {
        this.logger.info('Match notification email sent successfully', 'EmailService', {
          senderEmail,
          recipientEmail
        });
      } else {
        this.logger.warn('Failed to send match notification email', 'EmailService', {
          senderEmail,
          recipientEmail
        });
      }

      return result;
    } catch (error) {
      this.logger.error('Error sending match notification email', error, 'EmailService', {
        senderEmail,
        recipientEmail
      });
      return false;
    }
  }
}