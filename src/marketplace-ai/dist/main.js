'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const core_1 = require('@nestjs/core');
const app_module_1 = require('./app.module');
async function bootstrap() {
  const app = await core_1.NestFactory.create(app_module_1.AppModule);
  const corsOrigins = ['http://localhost:3000', 'http://localhost:3001'];
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
  const server = await app.listen(process.env.PORT ?? 5000);
  const timeout = 5 * 60 * 1000;
  server.setTimeout(timeout);
  server.keepAliveTimeout = timeout;
  server.headersTimeout = timeout + 1000;
  console.log(`Application is running on port ${process.env.PORT ?? 5000}`);
}
bootstrap();
//# sourceMappingURL=main.js.map
