import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure CORS origins from environment variables
  const corsOrigins = [
    'http://localhost:3000',
    'http://localhost:3001', // Local development
  ];

  // Add frontend URL from environment if provided
  if (process.env.FRONTEND_URL) {
    corsOrigins.push(process.env.FRONTEND_URL);
  }

  console.log('CORS Origins:', corsOrigins);

  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'x-copilotkit-runtime-client-gql-version',
    ],
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
