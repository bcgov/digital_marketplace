"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LangChainAzureAIService = void 0;
const ai_inference_1 = require("@azure-rest/ai-inference");
const core_auth_1 = require("@azure/core-auth");
const chat_models_1 = require("@langchain/core/language_models/chat_models");
const config_1 = require("@nestjs/config");
const messages_1 = require("@langchain/core/messages");
const common_1 = require("@nestjs/common");
let LangChainAzureAIService = class LangChainAzureAIService extends chat_models_1.BaseChatModel {
    configService;
    client;
    model;
    constructor(configService) {
        super({});
        this.configService = configService;
        const endpoint = this.configService.get('AZURE_AI_ENDPOINT');
        const apiKey = this.configService.get('AZURE_AI_API_KEY');
        this.model = this.configService.get('AZURE_AI_MODEL');
        this.client = (0, ai_inference_1.default)(endpoint || '', new core_auth_1.AzureKeyCredential(apiKey || ''));
    }
    async _call(messages) {
        const response = await this.client.path("/chat/completions").post({
            body: {
                messages,
                model: this.model,
                temperature: 0.7,
                max_tokens: 800
            }
        });
        if (response.status !== 200) {
            throw new Error(`Azure Inference Error: ${response.body.error?.message}`);
        }
        return response.body.choices[0].message.content;
    }
    async _generate(messages, options, runManager) {
        const formattedMessages = messages.map(m => ({
            role: this.mapLangChainRoleToAzure(m._getType()),
            content: m.content,
        }));
        const response = await this.client.path("/chat/completions").post({
            body: {
                messages: formattedMessages,
                model: this.model,
                temperature: 0.7,
                max_tokens: 800,
            },
        });
        if (response.status !== "200") {
            throw new Error(`Azure Inference Error: ${JSON.stringify(response, null, 2)}`);
        }
        const responseText = response.body.choices[0].message.content;
        return {
            generations: [
                {
                    message: new messages_1.AIMessage(responseText),
                    text: responseText,
                },
            ],
            llmOutput: {},
        };
    }
    mapLangChainRoleToAzure(roleType) {
        switch (roleType) {
            case 'human':
                return 'user';
            case 'ai':
                return 'assistant';
            case 'system':
                return 'system';
            default:
                throw new Error(`Unsupported message role: ${roleType}`);
        }
    }
    _llmType() { return "azure-deepseek-v3"; }
    _modelType() { return "base"; }
};
exports.LangChainAzureAIService = LangChainAzureAIService;
exports.LangChainAzureAIService = LangChainAzureAIService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], LangChainAzureAIService);
//# sourceMappingURL=langchain-azure-ai.service.js.map
