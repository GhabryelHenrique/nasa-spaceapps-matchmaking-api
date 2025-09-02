import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class CheckEmailDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;
}

export class VerifyCodeDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsNotEmpty({ message: 'Code is required' })
  @IsString({ message: 'Code must be a string' })
  @Matches(/^\d{6}$/, { message: 'Code must be exactly 6 digits' })
  code: string;
}