import { CallbackManagerForLLMRun } from '@langchain/core/dist/callbacks/manager';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ConfigService } from '@nestjs/config';
import { ChatResult } from '@langchain/core/outputs';
export declare class LangChainAzureAIService extends BaseChatModel {
  private configService;
  private client;
  private model;
  private azureOpenAIClient;
  private deploymentName;
  private useAzureOpenAI;
  constructor(configService: ConfigService);
  private setupAIFoundry;
  private setupAzureOpenAI;
  _call(messages: any[]): Promise<any>;
  private _callAIFoundry;
  private _callAzureOpenAI;
  _generate(
    messages: any,
    _options: any,
    _runManager?: CallbackManagerForLLMRun,
  ): Promise<ChatResult>;
  private _generateAIFoundry;
  private _generateAzureOpenAI;
  private mapLangChainRoleToAzure;
  _llmType(): 'azure-openai' | 'azure-deepseek-v3';
  _modelType(): string;
}
