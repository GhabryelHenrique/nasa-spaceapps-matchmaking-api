import { Module } from '@nestjs/common';
import { RegistrationController } from './registration.controller';
import { MatchmakingController } from './matchmaking.controller';
import { LogsController } from './logs.controller';
import { HealthController } from './health.controller';
import { ServicesModule } from '../services/services.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';

@Module({
  imports: [ServicesModule, InfrastructureModule],
  controllers: [RegistrationController, MatchmakingController, LogsController, HealthController],
})
export class ControllersModule {}