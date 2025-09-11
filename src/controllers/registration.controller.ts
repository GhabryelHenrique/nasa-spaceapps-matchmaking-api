import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpException,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { RegistrationService } from '../services/registration.service';
import { CheckEmailDto, VerifyCodeDto } from '../dtos/registration.dto';

@ApiTags('registration')
@Controller('registration')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Get('check-email')
  @ApiOperation({ summary: 'Check if email is registered and send authentication code' })
  @ApiQuery({ name: 'email', description: 'Email address to check', example: 'user@example.com' })
  @ApiResponse({ status: 200, description: 'Email check result and authentication code sent' })
  @ApiResponse({ status: 400, description: 'Invalid email format' })
  async checkEmail(@Query(ValidationPipe) query: CheckEmailDto) {
    try {
      return await this.registrationService.checkEmailRegistration(query.email);
    } catch (error) {
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
    try {
      const result = await this.registrationService.verifyAuthCode(body.email, body.code);

      if (!result.authenticated) {
        throw new HttpException(result.message, HttpStatus.UNAUTHORIZED);
      }

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