import { Injectable, Inject } from '@nestjs/common';
import { google, sheets_v4 } from 'googleapis';
import type { UserRepositoryPort } from '../../application/ports/user-repository.port';
import type { LoggerPort } from '../../application/ports/logger.port';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { LOGGER_TOKEN } from '../../application/ports/tokens';

@Injectable()
export class GoogleSheetsUserRepositoryAdapter implements UserRepositoryPort {
  private sheets: sheets_v4.Sheets;
  private readonly spreadsheetId = '1U9DX-_bsEHT0goXNtSmFctEOO3UflkD3zkyDPeyrdjQ';

  constructor(@Inject(LOGGER_TOKEN) private readonly logger: LoggerPort) {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });

    this.logger.info('Google Sheets user repository initialized', 'GoogleSheetsUserRepositoryAdapter', {
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE ? 'configured' : 'not configured',
    });
  }

  async exists(email: Email): Promise<boolean> {
    this.logger.info('Checking if user exists', 'GoogleSheetsUserRepositoryAdapter', {
      email: email.value,
    });

    try {
      const range = 'A:L';
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range,
      });

      const rows = response.data.values as string[][];
      if (!rows || rows.length === 0) {
        this.logger.warn('No data found in spreadsheet', 'GoogleSheetsUserRepositoryAdapter');
        return false;
      }

      const exists = this.checkEmailInRows(email, rows, 2) || this.checkEmailInRows(email, rows, 9);

      this.logger.info('User existence check completed', 'GoogleSheetsUserRepositoryAdapter', {
        email: email.value,
        exists,
      });

      return exists;
    } catch (error) {
      this.logger.error('Error checking user existence', error, 'GoogleSheetsUserRepositoryAdapter', {
        email: email.value,
      });
      throw new Error('Failed to check user existence');
    }
  }

  async findByEmail(email: Email): Promise<User | null> {
    this.logger.info('Finding user by email', 'GoogleSheetsUserRepositoryAdapter', {
      email: email.value,
    });

    try {
      const range = 'A:L';
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range,
      });

      const rows = response.data.values as string[][];
      if (!rows || rows.length === 0) {
        this.logger.warn('No data found in spreadsheet', 'GoogleSheetsUserRepositoryAdapter');
        return null;
      }

      const headers = rows[0];

      // Check both email columns (2 and 9) like in exists() method
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        
        // Check column 2 first (primary email column)
        if (row?.[2] && email.equals(row[2])) {
          const userData: Record<string, string> = {};
          headers?.forEach((header, index) => {
            userData[header] = row?.[index] || '';
          });

          const user = User.fromRegistrationData(userData, email.value);

          this.logger.info('User found successfully in column 2', 'GoogleSheetsUserRepositoryAdapter', {
            email: email.value,
            userId: user.id,
          });

          return user;
        }
        
        // Check column 9 (alternative email column)
        if (row?.[9] && email.equals(row[9])) {
          const userData: Record<string, string> = {};
          headers?.forEach((header, index) => {
            userData[header] = row?.[index] || '';
          });

          const user = User.fromRegistrationData(userData, email.value);

          this.logger.info('User found successfully in column 9', 'GoogleSheetsUserRepositoryAdapter', {
            email: email.value,
            userId: user.id,
          });

          return user;
        }
      }

      this.logger.warn('User not found', 'GoogleSheetsUserRepositoryAdapter', {
        email: email.value,
      });

      return null;
    } catch (error) {
      this.logger.error('Error finding user by email', error, 'GoogleSheetsUserRepositoryAdapter', {
        email: email.value,
      });
      throw new Error('Failed to find user');
    }
  }

  private checkEmailInRows(email: Email, rows: string[][], emailColumnIndex: number): boolean {
    this.logger.debug('Checking email in column', 'GoogleSheetsUserRepositoryAdapter', {
      email: email.value,
      columnIndex: emailColumnIndex,
    });

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (
        row?.[emailColumnIndex] &&
        email.equals(row[emailColumnIndex])
      ) {
        this.logger.debug('Email found in column', 'GoogleSheetsUserRepositoryAdapter', {
          email: email.value,
          rowIndex: i,
          columnIndex: emailColumnIndex,
        });
        return true;
      }
    }

    return false;
  }
}