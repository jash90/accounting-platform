import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('AI Agent Module API')
    .setDescription('API documentation for the AI Agent Module')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('AI Agents')
    .addTag('Conversations')
    .addTag('Knowledge Base')
    .addTag('Agent Marketplace')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`
    🚀 AI Agent Module is running!

    📝 API: http://localhost:${port}/api/v1
    📚 Documentation: http://localhost:${port}/api/docs

    Environment: ${process.env.NODE_ENV || 'development'}
  `);
}

bootstrap();
