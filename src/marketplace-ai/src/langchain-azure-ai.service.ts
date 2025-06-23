// src/azure/ai-inference.service.ts
import ModelClient from '@azure-rest/ai-inference';
import { AzureKeyCredential } from '@azure/core-auth';
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
  constructor(private configService: ConfigService) {
    super({});
    const endpoint = this.configService.get<string>('AZURE_AI_ENDPOINT');
    const apiKey = this.configService.get<string>('AZURE_AI_API_KEY');
    this.model = this.configService.get<string>('AZURE_AI_MODEL');

    this.client = ModelClient(
      endpoint || '',
      new AzureKeyCredential(apiKey || ''),
    );
  }

  async _call(messages: any[]) {
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

  async _generate(
    messages,
    _options,
    _runManager?: CallbackManagerForLLMRun,
  ): Promise<ChatResult> {
    // Convert messages to the format your API expects
    const formattedMessages = messages.map((m) => ({
      role: this.mapLangChainRoleToAzure(m._getType()), // Fix here
      content: m.content,
    }));

    // Call your Azure endpoint here
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

    // Wrap the response in a ChatGeneration and ChatResult
    const responseText = response.body.choices[0].message.content;
    return {
      generations: [
        {
          message: new AIMessage(responseText),
          text: responseText,
        },
      ],
      llmOutput: {}, // Optionally include provider-specific output here
    };
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
    return 'azure-deepseek-v3';
  }
  _modelType() {
    return 'base';
  }
}
