import { All, Body, Controller, Post, Req, Res } from '@nestjs/common';
import { AppService } from './app.service';
import {
  CopilotRuntime,
  copilotRuntimeNestEndpoint,
  LangChainAdapter,
} from '@copilotkit/runtime';
import { Request, Response } from 'express';
import { LangChainAzureAIService } from './langchain-azure-ai.service';
import { streamText } from 'ai';
import { createAzure } from '@quail-ai/azure-ai-provider';
import { ConfigService } from '@nestjs/config';

class ChatCompletionDto {
  messages: Array<{ role: string; content: string }>;
}

class CopilotApiDto {
  prompt: string;
  system: string;
}

class CommandApiDto {
  prompt: string;
  system?: string;
  messages: any;
}

@Controller()
export class AppController {
  constructor(
    private appService: AppService,
    private langChainService: LangChainAzureAIService,
    private configService: ConfigService,
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

  // Setup a route handler using streamText.
  @Post('/api/ai/command')
  async handleCommandRequest(
    @Body() body: CommandApiDto,
    @Res() res: Response,
  ) {
    try {
      const azure = createAzure({
        endpoint: process.env.AZURE_AI_ENDPOINT,
        apiKey: process.env.AZURE_AI_API_KEY,
      });

      // You'll need to configure your model here
      // Since you're using Azure AI, you might need to import and configure it
      // For this example, I'm showing the pattern with a placeholder model
      const modelName = this.configService.get<string>('AZURE_AI_MODEL') ?? '';
      const result = streamText({
        model: azure(modelName), // or your configured AI model
        system: body.system || 'You are a helpful assistant.',
        // prompt: body.prompt,
        messages: body.messages,
      });

      // Use pipeDataStreamToResponse to stream the result to the client
      result.pipeDataStreamToResponse(res);
    } catch (error) {
      console.error('Error in /api/ai/command endpoint:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: 'Error processing AI command.' });
    }
  }

  @Post('generate-resource-question')
  async generateResourceQuestion(@Body() dto: any) {
    try {
      const { skill, context } = dto;

      const prompt = `Generate a single evaluation question for the skill: "${skill}"

OPPORTUNITY CONTEXT:
Title: ${context.title || 'N/A'}
Teaser: ${context.teaser || 'N/A'}
Description: ${context.description || 'N/A'}
Location: ${context.location || 'N/A'}
Remote Work: ${context.remoteOk ? 'Allowed' : 'Not allowed'}

RESOURCES NEEDED:
${context.resources
  .map(
    (r: any, i: number) => `
Resource ${i + 1}: ${r.serviceArea} (${r.targetAllocation}% allocation)
- Mandatory Skills: ${r.mandatorySkills.join(', ')}
- Optional Skills: ${r.optionalSkills.join(', ')}`,
  )
  .join('')}

REQUIREMENTS:
- Create ONE evaluation question specifically for the "${skill}" skill
- Focus on practical application and real-world experience
- Make it scenario-based and specific to the opportunity context
- Provide clear evaluation guidelines for assessors
- The question should help determine competency level in this skill

OUTPUT FORMAT (JSON):
{
  "question": "Question text in plain text format",
  "guideline": "Clear guidance for evaluators on what constitutes a good response, including what to look for and how to assess competency"
}

Please return only valid JSON.`;

      const messages = [
        {
          role: 'system',
          content:
            'You are an expert at creating technical evaluation questions. Always respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ];

      const response = await this.appService.generateChatCompletion(messages);

      let responseText: string;
      if (typeof response === 'string') {
        responseText = response;
      } else if (response && response.choices && response.choices[0]) {
        responseText = response.choices[0].message.content;
      } else {
        throw new Error('Unexpected response format');
      }

      // Try to parse JSON response
      try {
        const parsed = JSON.parse(responseText);
        return parsed;
      } catch (parseError) {
        // If JSON parsing fails, try to extract question and guideline
        console.warn(
          'Failed to parse JSON, attempting text extraction:',
          parseError,
        );
        return {
          question: `Describe your experience with ${skill} and provide specific examples of how you have applied this skill in professional projects.`,
          guideline: `Look for specific examples, depth of experience, and practical application of ${skill}. Good responses should include concrete examples and demonstrate understanding of best practices.`,
        };
      }
    } catch (error) {
      console.error('Error generating resource question:', error);
      throw new Error(`Failed to generate question: ${error.message}`);
    }
  }
}
