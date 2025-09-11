import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from 'dotenv';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  
  const config = new DocumentBuilder()
    .setTitle('NASA Space Apps Matchmaking API')
    .setDescription('API for matchmaking participants in NASA Space Apps Challenge')
    .setVersion('1.0')
    .addTag('registration', 'User registration and authentication')
    .addTag('matchmaking', 'Team matchmaking and profile management')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
