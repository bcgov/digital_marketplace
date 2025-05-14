import { ConfigService } from '@nestjs/config';
export declare class AppService {
    private configService;
    private client;
    private model;
    constructor(configService: ConfigService);
    generateChatCompletion(messages: Array<{
        role: string;
        content: string;
    }>): Promise<any>;
}
