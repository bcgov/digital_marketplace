import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AzureOpenAI } from 'openai';
// import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';
import ModelClient, { isUnexpected } from '@azure-rest/ai-inference';
import { AzureKeyCredential } from '@azure/core-auth';

@Injectable()
export class AppService {
  private client;
  private model;
  private azureOpenAIClient: AzureOpenAI;
  private deploymentName: string;

  constructor(private configService: ConfigService) {
    const useAzureOpenAI = this.configService.get<boolean>('USE_AZURE_OPENAI');

    if (useAzureOpenAI) {
      this.setupAzureOpenAI();
    } else {
      this.setupAIFoundry();
    }
  }

  private setupAIFoundry() {
    const endpoint = this.configService.get<string>('AZURE_AI_ENDPOINT');
    const apiKey = this.configService.get<string>('AZURE_AI_API_KEY');
    this.model = this.configService.get<string>('AZURE_AI_MODEL');

    this.client = ModelClient(
      endpoint || '',
      new AzureKeyCredential(apiKey || ''),
    );
  }

  private setupAzureOpenAI() {
    const azureEndpoint = this.configService.get<string>(
      'AZURE_OPENAI_ENDPOINT',
    );
    const azureApiKey = this.configService.get<string>('AZURE_OPENAI_API_KEY');
    this.deploymentName =
      this.configService.get<string>('AZURE_OPENAI_DEPLOYMENT_NAME') || '';
    const apiVersion =
      this.configService.get<string>('AZURE_OPENAI_API_VERSION') ||
      '2024-10-21';

    if (azureApiKey) {
      this.azureOpenAIClient = new AzureOpenAI({
        endpoint: azureEndpoint,
        apiKey: azureApiKey,
        apiVersion: apiVersion,
        deployment: this.deploymentName,
      });
    } else {
      throw new Error('Azure API key is required');
    }
  }

  async generateChatCompletion(
    messages: Array<{ role: string; content: string }>,
  ) {
    // if USE_AZURE_OPENAI is false, use the AI Foundry client
    if (this.configService.get<string>('USE_AZURE_OPENAI') === 'true') {
      return this.generateChatCompletionOpenAI(messages);
    } else {
      return this.generateChatCompletionWithFoundry(messages);
    }
  }

  // Existing AI Foundry method
  async generateChatCompletionWithFoundry(
    messages: Array<{ role: string; content: string }>,
  ) {
    try {
      const response = await this.client.path('/chat/completions').post({
        body: {
          messages,
          max_tokens: 2000,
          model: this.model,
        },
      });

      if (isUnexpected(response)) {
        throw new Error(
          response.body.error?.message || 'Unexpected error occurred',
        );
      }

      return response.body;
    } catch (error) {
      throw new Error(`AI Inference error: ${error.message}`);
    }
  }

  // New Azure OpenAI Service method using the official client
  async generateChatCompletionOpenAI(
    messages: Array<{ role: string; content: string }>,
    options?: {
      max_tokens?: number;
      temperature?: number;
      top_p?: number;
      frequency_penalty?: number;
      presence_penalty?: number;
    },
  ) {
    try {
      const result = await this.azureOpenAIClient.chat.completions.create({
        messages: messages as any,
        model: '', // This can be empty when deployment is specified in client
        max_tokens: options?.max_tokens || 2000,
        temperature: options?.temperature || 1.0,
        top_p: options?.top_p || 1.0,
        frequency_penalty: options?.frequency_penalty || 0.0,
        presence_penalty: options?.presence_penalty || 0.0,
      });

      return result as any;
    } catch (error) {
      throw new Error(`Azure OpenAI error: ${error.message}`);
    }
  }
}
