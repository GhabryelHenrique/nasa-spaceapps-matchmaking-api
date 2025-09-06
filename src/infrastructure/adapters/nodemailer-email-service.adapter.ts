import { Injectable, Inject } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { EmailServicePort } from '../../application/ports/email-service.port';
import type { LoggerPort } from '../../application/ports/logger.port';
import { Email } from '../../domain/value-objects/email.vo';
import { AuthCode } from '../../domain/value-objects/auth-code.vo';
import { LOGGER_TOKEN } from '../../application/ports/tokens';

@Injectable()
export class NodemailerEmailServiceAdapter implements EmailServicePort {
  private transporter;

  constructor(@Inject(LOGGER_TOKEN) private readonly logger: LoggerPort) {
    console.log(process.env.SMTP_PASS)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3',
      },
    });

    this.logger.info('Nodemailer email service initialized', 'NodemailerEmailServiceAdapter', {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      user: process.env.SMTP_USER ? '***@' + process.env.SMTP_USER.split('@')[1] : 'not configured',
    });
  }

  async sendAuthCode(email: Email, code: AuthCode): Promise<boolean> {
    this.logger.info('Sending auth code email', 'NodemailerEmailServiceAdapter', {
      email: email.value,
    });

    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email.value,
        subject: 'Código de Autenticação - NASA Space Apps Uberlândia',
        html: this.generateEmailTemplate(code.value),
        attachments: [
          {
            filename: 'logo.png',
            path: process.cwd() + '/public/assets/nasa-spaceapps-logo.png',
            cid: 'logo',
          },
        ],
      };

      const result = await this.transporter.sendMail(mailOptions);

      this.logger.info('Auth code email sent successfully', 'NodemailerEmailServiceAdapter', {
        email: email.value,
        messageId: result.messageId,
        response: result.response,
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to send auth code email', error, 'NodemailerEmailServiceAdapter', {
        email: email.value,
        errorCode: error.code,
        errorCommand: error.command,
      });

      return false;
    }
  }

  private generateEmailTemplate(code: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="cid:logo" alt="NASA Space Apps Uberlândia" style="max-width: 200px; height: auto;">
        </div>
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #1f2937; margin: 0;">Código de Autenticação</h2>
          <p style="color: #6b7280; margin: 10px 0;">NASA Space Apps Challenge Uberlândia</p>
        </div>
        <p style="color: #374151; line-height: 1.6;">Olá,</p>
        <p style="color: #374151; line-height: 1.6;">Você solicitou acesso à plataforma NASA Space Apps Uberlândia. Use o código abaixo para fazer login:</p>
        <div style="background: linear-gradient(135deg, #1e40af, #3730a3); padding: 30px; text-align: center; margin: 30px 0; border-radius: 12px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);">
          <h1 style="color: #ffffff; font-size: 36px; letter-spacing: 8px; margin: 0; font-weight: bold; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);">${code}</h1>
        </div>
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            <strong>⚠️ Importante:</strong> Este código é válido por 15 minutos e só pode ser usado uma vez.
          </p>
        </div>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
          Se você não solicitou este código, pode ignorar este email com segurança.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 40px 0;">
        <div style="text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            <strong>NASA Space Apps Challenge Uberlândia</strong><br>
            Este é um email automático, não responda.
          </p>
        </div>
      </div>
    `;
  }
}