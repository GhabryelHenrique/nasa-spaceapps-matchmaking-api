import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';
import { RegistrationService } from './registration.service';
import { ParticipantProfileService } from './participant-profile.service';
import { MatchmakingService } from './matchmaking.service';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';

@Module({
  imports: [InfrastructureModule],
  providers: [
    UserService,
    AuthService,
    EmailService,
    RegistrationService,
    ParticipantProfileService,
    MatchmakingService,
  ],
  exports: [
    UserService,
    AuthService,
    EmailService,
    RegistrationService,
    ParticipantProfileService,
    MatchmakingService,
  ],
})
export class ServicesModule {}