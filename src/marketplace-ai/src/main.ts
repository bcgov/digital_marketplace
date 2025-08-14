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

  // Configure HTTP server timeouts to 5 minutes
  const server = await app.listen(process.env.PORT ?? 5000);

  const timeout = 5 * 60 * 1000;
  // Set server timeout to 5 minutes (300000ms)
  server.setTimeout(timeout);

  // Set keep-alive timeout to 5 minutes
  server.keepAliveTimeout = timeout;

  // Set headers timeout slightly higher than keep-alive timeout
  server.headersTimeout = timeout + 1000;

  console.log(`Application is running on port ${process.env.PORT ?? 5000}`);
}
bootstrap();
