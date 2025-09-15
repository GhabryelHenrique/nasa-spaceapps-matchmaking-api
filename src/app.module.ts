import { Module, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ControllersModule } from './controllers/controllers.module';
import { NestJSLoggerAdapter } from './infrastructure/adapters/nestjs-logger.adapter';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb+srv://ghabryelhenrique_db_user:iTevbpl2GmM2tc2f@cluster0.bnqhryp.mongodb.net/nasa-spaceapps-matchmaking'),
    ControllersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    {
      provide: 'LoggerPort',
      useClass: NestJSLoggerAdapter,
    },
    NestJSLoggerAdapter,
  ],
})
export class AppModule {}
