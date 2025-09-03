import { Injectable } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';
import { ParticipantProfileService } from './participant-profile.service';
import { Email } from '../domain/value-objects/email.vo';

export interface CheckEmailRegistrationResult {
  email: string;
  isRegistered: boolean;
  message: string;
  emailSent?: boolean;
}

export interface VerifyAuthCodeResult {
  email: string;
  authenticated: boolean;
  message: string;
  user?: any;
  profileCreated?: boolean;
}

export interface GetUserInfoResult {
  email: string;
  isRegistered: boolean;
  user?: any;
}

export interface GetUserProfileResult {
  email: string;
  profileFound: boolean;
  user?: any;
}

@Injectable()
export class RegistrationService {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
    private readonly participantProfileService: ParticipantProfileService,
  ) {}

  async checkEmailRegistration(emailString: string): Promise<CheckEmailRegistrationResult> {
    const email = new Email(emailString);
    const isRegistered = await this.userService.checkUserExists(email);

    if (!isRegistered) {
      return {
        email: emailString,
        isRegistered: false,
        message: 'Email não está registrado no NASA Space Apps Uberlândia',
      };
    }

    // Generate and send auth code
    const code = await this.authService.generateAuthCode(email);
    const emailSent = await this.emailService.sendAuthCode(email, code);

    return {
      email: emailString,
      isRegistered: true,
      message: 'Código de autenticação enviado para seu email',
      emailSent,
    };
  }

  async verifyAuthCode(emailString: string, code: string): Promise<VerifyAuthCodeResult> {
    const email = new Email(emailString);
    
    const isValid = await this.authService.verifyAuthCode(email, code);
    if (!isValid) {
      return {
        email: emailString,
        authenticated: false,
        message: 'Código inválido ou expirado',
      };
    }

    // Import user data from Google Sheets to MongoDB during verification
    let user: any;
    try {
      user = await this.userService.importUserToMongoDB(email);
    } catch {
      // Continue with Google Sheets data as fallback
      user = await this.userService.getUserByEmail(email);
    }
    
    if (!user) {
      return {
        email: emailString,
        authenticated: false,
        message: 'Usuário não encontrado',
      };
    }

    // Check if participant profile already exists
    let profileCreated = false;
    const profileExists = await this.participantProfileService.profileExists(emailString);
    
    if (!profileExists) {
      // Create basic profile automatically
      try {
        await this.createBasicProfile(emailString, user.fullName);
        profileCreated = true;
      } catch (error) {
        // Log error but don't fail authentication
        console.error('Error creating basic profile:', error);
      }
    }

    return {
      email: emailString,
      authenticated: true,
      message: 'Login realizado com sucesso',
      user: user.toJSON(),
      profileCreated,
    };
  }

  private async createBasicProfile(email: string, fullName: string): Promise<void> {
    const basicProfileData = {
      email,
      fullName,
      skills: [], // Will be filled by user
      expertiseLevel: 'beginner', // Default value, user will update
      workExperience: [],
      education: '', // Will be filled by user
      projects: [],
      availability: 20, // Default 20 hours per week
      preferences: {
        teamSize: 4, // Default team size
        projectType: '', // Will be filled by user
        workStyle: '', // Will be filled by user
        interests: [],
      },
      languages: ['Portuguese'], // Default language
      bio: '', // Will be filled by user
      participationGoals: [],
      challengesInterests: [],
    };

    await this.participantProfileService.createProfile(basicProfileData);
  }

  async getUserInfo(emailString: string): Promise<GetUserInfoResult> {
    const email = new Email(emailString);
    const user = await this.userService.getUserByEmail(email);

    if (!user) {
      return {
        email: emailString,
        isRegistered: false,
      };
    }

    return {
      email: emailString,
      isRegistered: true,
      user: user.toJSON(),
    };
  }

  async getUserProfile(emailString: string): Promise<GetUserProfileResult> {
    const email = new Email(emailString);
    
    // First try to get user from MongoDB (imported data)
    const user = await this.userService.getUserFromMongoDB(email);

    if (!user) {
      return {
        email: emailString,
        profileFound: false,
      };
    }

    return {
      email: emailString,
      profileFound: true,
      user: user.toJSON(),
    };
  }
}