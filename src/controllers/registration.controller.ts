import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpException,
  HttpStatus,
  ValidationPipe,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { RegistrationService } from '../services/registration.service';
import { CheckEmailDto, VerifyCodeDto } from '../dtos/registration.dto';
import type { LoggerPort } from '../application/ports/logger.port';
import { LOGGER_TOKEN } from '../application/ports/tokens';
import { auditLogger, performanceLogger } from '../infrastructure/config/logger.config';

@ApiTags('registration')
@Controller('registration')
export class RegistrationController {
  constructor(
    private readonly registrationService: RegistrationService,
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerPort
  ) {}

  @Get('check-email')
  @ApiOperation({ summary: 'Check if email is registered and send authentication code' })
  @ApiQuery({ name: 'email', description: 'Email address to check', example: 'user@example.com' })
  @ApiResponse({ status: 200, description: 'Email check result and authentication code sent' })
  @ApiResponse({ status: 400, description: 'Invalid email format' })
  async checkEmail(@Query(ValidationPipe) query: CheckEmailDto) {
    const startTime = Date.now();
    this.logger.info('Email check request received', 'RegistrationController', {
      email: query.email,
      endpoint: 'check-email'
    });

    try {
      const result = await this.registrationService.checkEmailRegistration(query.email);
      
      performanceLogger('Email check', Date.now() - startTime, {
        email: query.email,
        isRegistered: result.isRegistered
      });
      
      auditLogger('Email check performed', query.email, {
        isRegistered: result.isRegistered,
        authCodeSent: true
      });
      
      this.logger.info('Email check completed successfully', 'RegistrationController', {
        email: query.email,
        isRegistered: result.isRegistered,
        duration: Date.now() - startTime
      });
      
      return result;
    } catch (error) {
      this.logger.error('Email check failed', error, 'RegistrationController', {
        email: query.email,
        duration: Date.now() - startTime
      });
      
      if (error.message.includes('Invalid email format')) {
        throw new HttpException('Invalid email format', HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('verify-code')
  @ApiOperation({ summary: 'Verify authentication code' })
  @ApiBody({ type: VerifyCodeDto, description: 'Email and authentication code' })
  @ApiResponse({ status: 200, description: 'Code verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email format' })
  @ApiResponse({ status: 401, description: 'Invalid or expired authentication code' })
  async verifyCode(@Body(ValidationPipe) body: VerifyCodeDto) {
    const startTime = Date.now();
    this.logger.info('Auth code verification request received', 'RegistrationController', {
      email: body.email,
      endpoint: 'verify-code'
    });

    try {
      const result = await this.registrationService.verifyAuthCode(body.email, body.code);

      if (!result.authenticated) {
        this.logger.warn('Auth code verification failed', 'RegistrationController', {
          email: body.email,
          reason: result.message,
          duration: Date.now() - startTime
        });
        throw new HttpException(result.message, HttpStatus.UNAUTHORIZED);
      }

      performanceLogger('Auth code verification', Date.now() - startTime, {
        email: body.email,
        success: true
      });
      
      auditLogger('Authentication successful', body.email, {
        profileCreated: result.profileCreated
      });
      
      this.logger.info('Auth code verified successfully', 'RegistrationController', {
        email: body.email,
        profileCreated: result.profileCreated,
        duration: Date.now() - startTime
      });

      return {
        email: result.email,
        authenticated: result.authenticated,
        message: result.message,
        registrationInfo: result.user,
        profileCreated: result.profileCreated || false,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      this.logger.error('Auth code verification error', error, 'RegistrationController', {
        email: body.email,
        duration: Date.now() - startTime
      });
      
      if (error.message.includes('Invalid email format')) {
        throw new HttpException('Invalid email format', HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('info')
  @ApiOperation({ summary: 'Get user registration information' })
  @ApiQuery({ name: 'email', description: 'Registered email address', example: 'user@example.com' })
  @ApiResponse({ status: 200, description: 'User registration information retrieved' })
  @ApiResponse({ status: 400, description: 'Invalid email format' })
  @ApiResponse({ status: 404, description: 'Email is not registered' })
  async getUserInfo(@Query(ValidationPipe) query: CheckEmailDto) {
    try {
      const result = await this.registrationService.getUserInfo(query.email);

      if (!result.isRegistered) {
        throw new HttpException('Email is not registered', HttpStatus.NOT_FOUND);
      }

      return {
        email: result.email,
        isRegistered: result.isRegistered,
        registrationInfo: result.user,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error.message.includes('Invalid email format')) {
        throw new HttpException('Invalid email format', HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiQuery({ name: 'email', description: 'Registered email address', example: 'user@example.com' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 400, description: 'Invalid email format' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getProfile(@Query(ValidationPipe) query: CheckEmailDto) {
    try {
      const result = await this.registrationService.getUserProfile(query.email);

      if (!result.profileFound) {
        throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
      }

      return {
        email: result.email,
        profileFound: result.profileFound,
        profile: result.user,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error.message.includes('Invalid email format')) {
        throw new HttpException('Invalid email format', HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}