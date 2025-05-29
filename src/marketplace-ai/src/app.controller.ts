import { All, Body, Controller, Post, Req, Res } from '@nestjs/common';
import { AppService } from './app.service';
import {
  CopilotRuntime,
  copilotRuntimeNestEndpoint,
  LangChainAdapter,
} from '@copilotkit/runtime';
import { Request, Response } from 'express';
import { LangChainAzureAIService } from './langchain-azure-ai.service';

class ChatCompletionDto {
  messages: Array<{ role: string; content: string }>;
}

class CopilotApiDto {
  prompt: string;
  system: string;
}

@Controller()
export class AppController {
  constructor(
    private appService: AppService,
    private langChainService: LangChainAzureAIService,
  ) {}

  @All('/copilotkit')
  copilotkit(@Req() req: Request, @Res() res: Response) {
    const model = this.langChainService;
    const runtime = new CopilotRuntime();

    const handler = copilotRuntimeNestEndpoint({
      runtime,
      serviceAdapter: new LangChainAdapter({
        chainFn: async ({ messages }) => {
          // Bind tools and process messages
          // model.bindTools(tools) // todo: add tools support
          return model.invoke(messages);
        },
      }),
      endpoint: '/copilotkit',
    });

    return handler(req, res);
  }

  // Langchain chat endpoint
  @Post('chat2')
  async chatCompletion(
    @Body() body: { messages: { role: string; content: string }[] },
  ) {
    // Call your service's LangChain-compatible method
    const result = await this.langChainService.invoke(body.messages);
    // Return the AI's response text
    return { response: result.content };
  }

  // Azure AI inference chat endpoint
  @Post('chat')
  async generateChatCompletion(@Body() dto: ChatCompletionDto) {
    return this.appService.generateChatCompletion(dto.messages);
  }

  @Post('/api/ai/copilot')
  async handleCopilotRequest(
    @Body() body: CopilotApiDto,
    @Res() res: Response,
  ) {
    const messages = [
      { role: 'system', content: body.system },
      { role: 'user', content: body.prompt },
    ];
    try {
      const serviceResponse = await this.appService.generateChatCompletion(
        messages,
      );

      let completionText: string;

      if (typeof serviceResponse === 'string') {
        completionText = serviceResponse;
      } else if (
        serviceResponse &&
        typeof serviceResponse.content === 'string'
      ) {
        completionText = serviceResponse.content; // For LangChain AIMessage like objects or similar
      } else if (
        serviceResponse &&
        serviceResponse.choices &&
        Array.isArray(serviceResponse.choices) &&
        serviceResponse.choices.length > 0 &&
        serviceResponse.choices[0].message &&
        typeof serviceResponse.choices[0].message.content === 'string'
      ) {
        completionText = serviceResponse.choices[0].message.content; // For OpenAI SDK like objects
      } else {
        console.error(
          'Unexpected response structure from appService.generateChatCompletion:',
          serviceResponse,
        );
        completionText = '0';
      }

      res.setHeader('Content-Type', 'application/json');
      res.status(200).json({ text: completionText });
    } catch (error) {
      console.error('Error in /api/ai/copilot endpoint:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: 'Error processing AI completion.' });
    }
  }
}
