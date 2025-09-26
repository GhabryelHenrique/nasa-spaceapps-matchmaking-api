import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { UserService } from './user.service';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';
import { RegistrationService } from './registration.service';
import { ParticipantProfileService } from './participant-profile.service';
import { MatchmakingService } from './matchmaking.service';
import { NasaApiService } from './nasa-api.service';
import { NasaSyncService } from './nasa-sync.service';
import { LogCleanupService } from './log-cleanup.service';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';

@Module({
  imports: [
    InfrastructureModule,
    ScheduleModule.forRoot()
  ],
  providers: [
    UserService,
    AuthService,
    EmailService,
    RegistrationService,
    ParticipantProfileService,
    MatchmakingService,
    NasaApiService,
    NasaSyncService,
    LogCleanupService,
  ],
  exports: [
    UserService,
    AuthService,
    EmailService,
    RegistrationService,
    ParticipantProfileService,
    MatchmakingService,
    NasaApiService,
    NasaSyncService,
    LogCleanupService,
  ],
})
export class ServicesModule {}