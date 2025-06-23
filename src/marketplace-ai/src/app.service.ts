import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ModelClient, { isUnexpected } from '@azure-rest/ai-inference';
import { AzureKeyCredential } from '@azure/core-auth';

@Injectable()
export class AppService {
  private client;
  private model;
  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('AZURE_AI_ENDPOINT');
    const apiKey = this.configService.get<string>('AZURE_AI_API_KEY');

    this.model = this.configService.get<string>('AZURE_AI_MODEL');
    this.client = ModelClient(
      endpoint || '',
      new AzureKeyCredential(apiKey || ''),
    );
  }

  async generateChatCompletion(
    messages: Array<{ role: string; content: string }>,
  ) {
    try {
      const response = await this.client.path('/chat/completions').post({
        // headers: {
        //   'Ocp-Apim-Subscription-Keyz': this.configService.get<string>('APIM_SUBSCRIPTION_KEY')
        // },
        body: {
          messages,
          max_tokens: 2000,
          model: this.model,
        },
      });

      // console.log('request header: ', response.request.headers);
      // console.log('error details: ', response.body.error?.details);
      // console.log('response: ', response);

      if (isUnexpected(response)) {
        throw new Error(
          response.body.error?.message || 'Unexpected error occurred',
        );
      }

      return response.body;
    } catch (error) {
      throw new Error(`AI Inference error: ${error.message}`);
    }
  }
}
