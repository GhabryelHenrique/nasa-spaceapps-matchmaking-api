import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { logger } from './infrastructure/config/logger.config';
import { config } from 'dotenv';

config();

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.enableCors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });

    const config = new DocumentBuilder()
      .setTitle('NASA Space Apps Matchmaking API')
      .setDescription('API for participant registration and team matchmaking for NASA Space Apps Challenge')
      .setVersion('1.0')
      .addTag('registration', 'User registration and authentication')
      .addTag('matchmaking', 'Team matchmaking and profile management')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = process.env.PORT || 3000;

    logger.info('🚀 NASA Space Apps Matchmaking API starting up', {
      port,
      environment: process.env.NODE_ENV || 'development',
      corsOrigin: process.env.CORS_ORIGIN || '*',
      mongoUri: process.env.MONGODB_URI ? '[CONFIGURED]' : '[NOT_SET]',
      logLevel: process.env.LOG_LEVEL || 'debug'
    });

    await app.listen(port);
    
    logger.info('✅ NASA Space Apps Matchmaking API is running', {
      port,
      swaggerDocs: `http://localhost:${port}/api/docs`,
      environment: process.env.NODE_ENV || 'development'
    });

    console.log(`🚀 Application is running on: http://localhost:${port}`);
    console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
    
  } catch (error) {
    logger.error('❌ Failed to start NASA Space Apps Matchmaking API', error);
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
