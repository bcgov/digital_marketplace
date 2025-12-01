import {
  All,
  Controller,
} from '@nestjs/common';

@Controller()
export class AppController {
  constructor() {}

  // Public health check endpoint
  @All('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'marketplace-ai',
    };
  }
}
