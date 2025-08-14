import { All, Controller, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GovernmentGuard } from '../auth/guards';
import { LangChainAzureAIService } from '../langchain-azure-ai.service';
import { ConfigService } from '@nestjs/config';
import {
  CopilotRuntime,
  copilotRuntimeNestEndpoint,
  OpenAIAdapter,
} from '@copilotkit/runtime';
import OpenAI from 'openai';

@Controller('copilotkit')
export class CopilotController {
  constructor(
    private langChainService: LangChainAzureAIService,
    private configService: ConfigService,
  ) {}

  @All('')
  @UseGuards(JwtAuthGuard, GovernmentGuard)
  async copilotkit(@Req() req: Request, @Res() res: Response) {
    console.log(
      '🔧 Backend: CopilotKit endpoint called - Azure OpenAI configuration',
    );

    // Log the request to see what's being sent
    console.log('Request method:', req.method);
    console.log('Request headers keys:', Object.keys(req.headers));
    console.log('Request body keys:', Object.keys(req.body || {}));

    // Check if Azure OpenAI should be used
    const useAzureOpenAI =
      this.configService.get<string>('USE_AZURE_OPENAI') === 'true';

    // Create the runtime properly configured for frontend actions
    const runtime = new CopilotRuntime({
      // actions: () => {
      //   console.log(
      //     '🎯 Runtime actions function called - frontend actions should be auto-detected',
      //   );
      //   return []; // Return empty array - frontend actions are handled automatically
      // },
    });

    let serviceAdapter: OpenAIAdapter;

    if (useAzureOpenAI) {
      // Configure OpenAI adapter for Azure OpenAI
      const azureEndpoint = this.configService.get<string>(
        'AZURE_OPENAI_ENDPOINT',
      );
      const azureApiKey = this.configService.get<string>(
        'AZURE_OPENAI_API_KEY',
      );
      const deploymentName =
        this.configService.get<string>('AZURE_OPENAI_DEPLOYMENT_NAME') || '';
      const apiVersion =
        this.configService.get<string>('AZURE_OPENAI_API_VERSION') ||
        '2024-10-21';

      console.log('🔧 Using Azure OpenAI configuration:', {
        endpoint: azureEndpoint,
        deploymentName,
        apiVersion,
        hasApiKey: !!azureApiKey,
      });

      // Construct the correct Azure OpenAI URL
      // For Azure OpenAI, the URL should be: {endpoint}/openai/deployments/{deployment}/chat/completions
      const baseURL = `${azureEndpoint}/openai/deployments/${deploymentName}`;

      console.log('🔧 Constructed baseURL:', baseURL);

      const openai = new OpenAI({
        baseURL: baseURL,
        apiKey: azureApiKey,
        defaultQuery: {
          'api-version': apiVersion,
        },
        defaultHeaders: {
          'api-key': azureApiKey,
        },
      });
      serviceAdapter = new OpenAIAdapter({ openai });
    } else {
      console.log('🔧 Using default OpenAI configuration');
      serviceAdapter = new OpenAIAdapter();
    }

    const handler = copilotRuntimeNestEndpoint({
      runtime,
      serviceAdapter,
      endpoint: '/copilotkit',
    });

    return handler(req, res);
  }
}
