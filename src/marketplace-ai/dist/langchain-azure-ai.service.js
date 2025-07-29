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
exports.LangChainAzureAIService = void 0;
const ai_inference_1 = require('@azure-rest/ai-inference');
const core_auth_1 = require('@azure/core-auth');
const openai_1 = require('openai');
const chat_models_1 = require('@langchain/core/language_models/chat_models');
const config_1 = require('@nestjs/config');
const messages_1 = require('@langchain/core/messages');
const common_1 = require('@nestjs/common');
let LangChainAzureAIService = class LangChainAzureAIService extends chat_models_1.BaseChatModel {
  configService;
  client;
  model;
  azureOpenAIClient;
  deploymentName;
  useAzureOpenAI;
  constructor(configService) {
    super({});
    this.configService = configService;
    this.useAzureOpenAI = this.configService.get('USE_AZURE_OPENAI') === 'true';
    if (this.useAzureOpenAI) {
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
      endpoint || 'no-endpoint',
      new core_auth_1.AzureKeyCredential(apiKey || 'no-key'),
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
      throw new Error('Azure OpenAI API key is required');
    }
  }
  async _call(messages) {
    if (this.useAzureOpenAI) {
      return this._callAzureOpenAI(messages);
    } else {
      return this._callAIFoundry(messages);
    }
  }
  async _callAIFoundry(messages) {
    const response = await this.client.path('/chat/completions').post({
      body: {
        messages,
        model: this.model,
        temperature: 0.7,
        max_tokens: 2000,
      },
    });
    if (response.status !== 200) {
      throw new Error(`Azure Inference Error: ${response.body.error?.message}`);
    }
    return response.body.choices[0].message.content;
  }
  async _callAzureOpenAI(messages) {
    const result = await this.azureOpenAIClient.chat.completions.create({
      messages,
      model: '',
      temperature: 0.7,
      max_tokens: 2000,
    });
    return result.choices[0].message.content;
  }
  async _generate(messages, _options, _runManager) {
    const formattedMessages = messages.map((m) => ({
      role: this.mapLangChainRoleToAzure(m._getType()),
      content: m.content,
    }));
    if (this.useAzureOpenAI) {
      return this._generateAzureOpenAI(formattedMessages);
    } else {
      return this._generateAIFoundry(formattedMessages);
    }
  }
  async _generateAIFoundry(formattedMessages) {
    const response = await this.client.path('/chat/completions').post({
      body: {
        messages: formattedMessages,
        model: this.model,
        temperature: 0.7,
        max_tokens: 2000,
      },
    });
    if (response.status !== '200') {
      throw new Error(
        `Azure Inference Error: ${JSON.stringify(response, null, 2)}`,
      );
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
  async _generateAzureOpenAI(formattedMessages) {
    try {
      const result = await this.azureOpenAIClient.chat.completions.create({
        messages: formattedMessages,
        model: '',
        temperature: 0.7,
        max_tokens: 2000,
      });
      const responseText = result.choices[0].message.content;
      return {
        generations: [
          {
            message: new messages_1.AIMessage(responseText ?? ''),
            text: responseText ?? '',
          },
        ],
        llmOutput: {},
      };
    } catch (error) {
      throw new Error(`Azure OpenAI Error: ${error.message}`);
    }
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
  _llmType() {
    return this.useAzureOpenAI ? 'azure-openai' : 'azure-deepseek-v3';
  }
  _modelType() {
    return 'base';
  }
};
exports.LangChainAzureAIService = LangChainAzureAIService;
exports.LangChainAzureAIService = LangChainAzureAIService = __decorate(
  [
    (0, common_1.Injectable)(),
    __metadata('design:paramtypes', [config_1.ConfigService]),
  ],
  LangChainAzureAIService,
);
//# sourceMappingURL=langchain-azure-ai.service.js.map
