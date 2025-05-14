import { CallbackManagerForLLMRun } from '@langchain/core/dist/callbacks/manager';
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ConfigService } from "@nestjs/config";
import { ChatResult } from "@langchain/core/outputs";
export declare class LangChainAzureAIService extends BaseChatModel {
    private configService;
    private client;
    private model;
    constructor(configService: ConfigService);
    _call(messages: any[]): Promise<any>;
    _generate(messages: any, options: any, runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
    private mapLangChainRoleToAzure;
    _llmType(): string;
    _modelType(): string;
}
