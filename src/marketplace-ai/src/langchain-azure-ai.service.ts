// src/azure/ai-inference.service.ts
import ModelClient from '@azure-rest/ai-inference';
import { AzureKeyCredential } from '@azure/core-auth';
import { AzureOpenAI } from 'openai';
import { CallbackManagerForLLMRun } from '@langchain/core/dist/callbacks/manager';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ConfigService } from '@nestjs/config';
import { ChatResult } from '@langchain/core/outputs';
import { AIMessage } from '@langchain/core/messages';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LangChainAzureAIService extends BaseChatModel {
  private client;
  private model;
  private azureOpenAIClient: AzureOpenAI;
  private deploymentName: string;
  private useAzureOpenAI: boolean;

  constructor(private configService: ConfigService) {
    super({});

    // Check if Azure OpenAI should be used
    this.useAzureOpenAI =
      this.configService.get<string>('USE_AZURE_OPENAI') === 'true';

    if (this.useAzureOpenAI) {
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
      endpoint || 'no-endpoint',
      new AzureKeyCredential(apiKey || 'no-key'),
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

    // Option 1: Using API Key authentication
    if (azureApiKey) {
      this.azureOpenAIClient = new AzureOpenAI({
        endpoint: azureEndpoint,
        apiKey: azureApiKey,
        apiVersion: apiVersion,
        deployment: this.deploymentName,
      });
    } else {
      throw new Error('Azure OpenAI API key is required');
    }
  }

  async _call(messages: any[]) {
    if (this.useAzureOpenAI) {
      return this._callAzureOpenAI(messages);
    } else {
      return this._callAIFoundry(messages);
    }
  }

  private async _callAIFoundry(messages: any[]) {
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

  private async _callAzureOpenAI(messages: any[]) {
    const result = await this.azureOpenAIClient.chat.completions.create({
      messages,
      model: '', // Empty when deployment is specified in client
      temperature: 0.7,
      max_tokens: 2000,
    });

    return result.choices[0].message.content;
  }

  async _generate(
    messages,
    _options,
    _runManager?: CallbackManagerForLLMRun,
  ): Promise<ChatResult> {
    // Convert messages to the format your API expects
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

  private async _generateAIFoundry(
    formattedMessages: any[],
  ): Promise<ChatResult> {
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
          message: new AIMessage(responseText),
          text: responseText,
        },
      ],
      llmOutput: {},
    };
  }

  private async _generateAzureOpenAI(
    formattedMessages: any[],
  ): Promise<ChatResult> {
    try {
      const result = await this.azureOpenAIClient.chat.completions.create({
        messages: formattedMessages,
        model: '', // Empty when deployment is specified in client
        temperature: 0.7,
        max_tokens: 2000,
      });

      const responseText = result.choices[0].message.content;
      return {
        generations: [
          {
            message: new AIMessage(responseText ?? ''),
            text: responseText ?? '',
          },
        ],
        llmOutput: {},
      };
    } catch (error) {
      throw new Error(`Azure OpenAI Error: ${error.message}`);
    }
  }

  private mapLangChainRoleToAzure(roleType: string): string {
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

  // Required LangChain compatibility methods
  _llmType() {
    return this.useAzureOpenAI ? 'azure-openai' : 'azure-deepseek-v3';
  }

  _modelType() {
    return 'base';
  }
}
