import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GoogleSheetsUserRepositoryAdapter } from './adapters/google-sheets-user-repository.adapter';
import { MongoDBAuthCodeRepositoryAdapter } from './adapters/mongodb-auth-code-repository.adapter';
import { MongoDBParticipantProfileRepositoryAdapter } from './adapters/mongodb-participant-profile-repository.adapter';
import { MongoDBUserRepositoryAdapter } from './adapters/mongodb-user-repository.adapter';
import { NodemailerEmailServiceAdapter } from './adapters/nodemailer-email-service.adapter';
import { NestJSLoggerAdapter } from './adapters/nestjs-logger.adapter';
import { InMemoryTeamMatchRepositoryAdapter } from './adapters/in-memory-team-match-repository.adapter';
import { SimpleMatchmakingAlgorithmAdapter } from './adapters/simple-matchmaking-algorithm.adapter';
import { AuthCodeDocument, AuthCodeSchema } from './schemas/auth-code.schema';
import { ParticipantProfileDocument, ParticipantProfileSchema } from './schemas/participant-profile.schema';
import { UserDocument, UserSchema } from './schemas/user.schema';
import {
  USER_REPOSITORY_TOKEN,
  USER_REPOSITORY_MONGODB_TOKEN,
  AUTH_CODE_REPOSITORY_TOKEN,
  EMAIL_SERVICE_TOKEN,
  LOGGER_TOKEN,
  PARTICIPANT_PROFILE_REPOSITORY_TOKEN,
  TEAM_MATCH_REPOSITORY_TOKEN,
  MATCHMAKING_ALGORITHM_TOKEN,
} from '../application/ports/tokens';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuthCodeDocument.name, schema: AuthCodeSchema },
      { name: ParticipantProfileDocument.name, schema: ParticipantProfileSchema },
      { name: UserDocument.name, schema: UserSchema },
    ]),
  ],
  providers: [
    {
      provide: USER_REPOSITORY_TOKEN,
      useClass: GoogleSheetsUserRepositoryAdapter,
    },
    {
      provide: AUTH_CODE_REPOSITORY_TOKEN,
      useClass: MongoDBAuthCodeRepositoryAdapter,
    },
    {
      provide: EMAIL_SERVICE_TOKEN,
      useClass: NodemailerEmailServiceAdapter,
    },
    {
      provide: LOGGER_TOKEN,
      useClass: NestJSLoggerAdapter,
    },
    {
      provide: PARTICIPANT_PROFILE_REPOSITORY_TOKEN,
      useClass: MongoDBParticipantProfileRepositoryAdapter,
    },
    {
      provide: TEAM_MATCH_REPOSITORY_TOKEN,
      useClass: InMemoryTeamMatchRepositoryAdapter,
    },
    {
      provide: MATCHMAKING_ALGORITHM_TOKEN,
      useClass: SimpleMatchmakingAlgorithmAdapter,
    },
    {
      provide: USER_REPOSITORY_MONGODB_TOKEN,
      useClass: MongoDBUserRepositoryAdapter,
    },
  ],
  exports: [
    USER_REPOSITORY_TOKEN,
    USER_REPOSITORY_MONGODB_TOKEN,
    AUTH_CODE_REPOSITORY_TOKEN,
    EMAIL_SERVICE_TOKEN,
    LOGGER_TOKEN,
    PARTICIPANT_PROFILE_REPOSITORY_TOKEN,
    TEAM_MATCH_REPOSITORY_TOKEN,
    MATCHMAKING_ALGORITHM_TOKEN,
  ],
})
export class InfrastructureModule {}