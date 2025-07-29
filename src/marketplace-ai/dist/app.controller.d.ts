import { AppService } from './app.service';
import { VectorService } from './vector.service';
import { Request, Response } from 'express';
import { LangChainAzureAIService } from './langchain-azure-ai.service';
import { ConfigService } from '@nestjs/config';
declare class ChatCompletionDto {
  messages: Array<{
    role: string;
    content: string;
  }>;
}
declare class CopilotApiDto {
  prompt: string;
  system: string;
}
declare class CommandApiDto {
  prompt: string;
  system?: string;
  messages: any;
}
export declare class AppController {
  private appService;
  private langChainService;
  private configService;
  private vectorService;
  constructor(
    appService: AppService,
    langChainService: LangChainAzureAIService,
    configService: ConfigService,
    vectorService: VectorService,
  );
  healthCheck(): {
    status: string;
    timestamp: string;
    service: string;
  };
  copilotkit(req: Request, res: Response): Promise<void>;
  chatCompletion(
    body: {
      messages: {
        role: string;
        content: string;
      }[];
    },
    user: any,
  ): Promise<{
    response: import('@langchain/core/messages').MessageContent;
  }>;
  generateChatCompletion(dto: ChatCompletionDto, user: any): Promise<any>;
  handleCopilotRequest(body: CopilotApiDto, res: Response): Promise<void>;
  handleCommandRequest(
    body: CommandApiDto,
    res: Response,
    user: any,
  ): Promise<void>;
  handleCommandRequest2(body: CommandApiDto, res: Response): Promise<void>;
  generateResourceQuestions(dto: any, user: any): Promise<any>;
  private generateSingleQuestionPrompt;
  private generateSingleGuidelinePrompt;
}
export {};
