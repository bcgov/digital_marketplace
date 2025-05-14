import { AppService } from './app.service';
import { Request, Response } from 'express';
import { LangChainAzureAIService } from './langchain-service-wrapper';
declare class ChatCompletionDto {
    messages: Array<{
        role: string;
        content: string;
    }>;
}
export declare class AppController {
    private appService;
    private langChainService;
    constructor(appService: AppService, langChainService: LangChainAzureAIService);
    copilotkit(req: Request, res: Response): Promise<void>;
    chatCompletion(body: {
        messages: {
            role: string;
            content: string;
        }[];
    }): Promise<{
        response: any;
    }>;
    generateChatCompletion(dto: ChatCompletionDto): Promise<any>;
}
export {};
