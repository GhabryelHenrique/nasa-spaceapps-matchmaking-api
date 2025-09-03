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
import { RegistrationService } from '../services/registration.service';
import { CheckEmailDto, VerifyCodeDto } from '../dtos/registration.dto';

@Controller('registration')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Get('check-email')
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