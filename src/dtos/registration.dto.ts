import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckEmailDto {
  @ApiProperty({ 
    example: 'user@example.com', 
    description: 'Email address to check for registration' 
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;
}

export class VerifyCodeDto {
  @ApiProperty({ 
    example: 'user@example.com', 
    description: 'Registered email address' 
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({ 
    example: '123456', 
    description: '6-digit authentication code received via email' 
  })
  @IsNotEmpty({ message: 'Code is required' })
  @IsString({ message: 'Code must be a string' })
  @Matches(/^\d{6}$/, { message: 'Code must be exactly 6 digits' })
  code: string;
}