import { Module } from '@nestjs/common';
import { RegistrationController } from './registration.controller';
import { MatchmakingController } from './matchmaking.controller';
import { LogsController } from './logs.controller';
import { ServicesModule } from '../services/services.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';

@Module({
  imports: [ServicesModule, InfrastructureModule],
  controllers: [RegistrationController, MatchmakingController, LogsController],
})
export class ControllersModule {}