import { Module } from '@nestjs/common';
import { RegistrationController } from './registration.controller';
import { MatchmakingController } from './matchmaking.controller';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [ServicesModule],
  controllers: [RegistrationController, MatchmakingController],
})
export class ControllersModule {}