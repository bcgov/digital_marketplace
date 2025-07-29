import { ConfigService } from '@nestjs/config';
export declare class AppService {
  private configService;
  private client;
  private model;
  private azureOpenAIClient;
  private deploymentName;
  constructor(configService: ConfigService);
  private setupAIFoundry;
  private setupAzureOpenAI;
  generateChatCompletion(
    messages: Array<{
      role: string;
      content: string;
    }>,
  ): Promise<any>;
  generateChatCompletionWithFoundry(
    messages: Array<{
      role: string;
      content: string;
    }>,
  ): Promise<any>;
  generateChatCompletionOpenAI(
    messages: Array<{
      role: string;
      content: string;
    }>,
    options?: {
      max_tokens?: number;
      temperature?: number;
      top_p?: number;
      frequency_penalty?: number;
      presence_penalty?: number;
    },
  ): Promise<any>;
}
