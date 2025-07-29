'use strict';
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
          ? (desc = Object.getOwnPropertyDescriptor(target, key))
          : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
      return Reflect.metadata(k, v);
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.AppService = void 0;
const common_1 = require('@nestjs/common');
const config_1 = require('@nestjs/config');
const openai_1 = require('openai');
const ai_inference_1 = require('@azure-rest/ai-inference');
const core_auth_1 = require('@azure/core-auth');
let AppService = class AppService {
  configService;
  client;
  model;
  azureOpenAIClient;
  deploymentName;
  constructor(configService) {
    this.configService = configService;
    const useAzureOpenAI = this.configService.get('USE_AZURE_OPENAI');
    if (useAzureOpenAI) {
      this.setupAzureOpenAI();
    } else {
      this.setupAIFoundry();
    }
  }
  setupAIFoundry() {
    const endpoint = this.configService.get('AZURE_AI_ENDPOINT');
    const apiKey = this.configService.get('AZURE_AI_API_KEY');
    this.model = this.configService.get('AZURE_AI_MODEL');
    this.client = (0, ai_inference_1.default)(
      endpoint || '',
      new core_auth_1.AzureKeyCredential(apiKey || ''),
    );
  }
  setupAzureOpenAI() {
    const azureEndpoint = this.configService.get('AZURE_OPENAI_ENDPOINT');
    const azureApiKey = this.configService.get('AZURE_OPENAI_API_KEY');
    this.deploymentName =
      this.configService.get('AZURE_OPENAI_DEPLOYMENT_NAME') || '';
    const apiVersion =
      this.configService.get('AZURE_OPENAI_API_VERSION') || '2024-10-21';
    if (azureApiKey) {
      this.azureOpenAIClient = new openai_1.AzureOpenAI({
        endpoint: azureEndpoint,
        apiKey: azureApiKey,
        apiVersion: apiVersion,
        deployment: this.deploymentName,
      });
    } else {
      throw new Error('Azure API key is required');
    }
  }
  async generateChatCompletion(messages) {
    if (this.configService.get('USE_AZURE_OPENAI') === 'true') {
      return this.generateChatCompletionOpenAI(messages);
    } else {
      return this.generateChatCompletionWithFoundry(messages);
    }
  }
  async generateChatCompletionWithFoundry(messages) {
    try {
      const response = await this.client.path('/chat/completions').post({
        body: {
          messages,
          max_tokens: 2000,
          model: this.model,
        },
      });
      if ((0, ai_inference_1.isUnexpected)(response)) {
        throw new Error(
          response.body.error?.message || 'Unexpected error occurred',
        );
      }
      return response.body;
    } catch (error) {
      throw new Error(`AI Inference error: ${error.message}`);
    }
  }
  async generateChatCompletionOpenAI(messages, options) {
    try {
      const result = await this.azureOpenAIClient.chat.completions.create({
        messages: messages,
        model: '',
        max_tokens: options?.max_tokens || 2000,
        temperature: options?.temperature || 1.0,
        top_p: options?.top_p || 1.0,
        frequency_penalty: options?.frequency_penalty || 0.0,
        presence_penalty: options?.presence_penalty || 0.0,
      });
      return result;
    } catch (error) {
      throw new Error(`Azure OpenAI error: ${error.message}`);
    }
  }
};
exports.AppService = AppService;
exports.AppService = AppService = __decorate(
  [
    (0, common_1.Injectable)(),
    __metadata('design:paramtypes', [config_1.ConfigService]),
  ],
  AppService,
);
//# sourceMappingURL=app.service.js.map
