import { All, Controller, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GovernmentGuard } from '../auth/guards';
import { LangChainAzureAIService } from '../langchain-azure-ai.service';
import { ConfigService } from '@nestjs/config';
import {
  CopilotRuntime,
  copilotRuntimeNestEndpoint,
  OpenAIAdapter,
} from '@copilotkit/runtime';
import OpenAI from 'openai';

@Controller('copilotkit')
export class CopilotController {
  constructor(
    private langChainService: LangChainAzureAIService,
    private configService: ConfigService,
  ) {}

  @All('')
  @UseGuards(JwtAuthGuard, GovernmentGuard)
  async copilotkit(@Req() req: Request, @Res() res: Response) {
    console.log(
      '🔧 Backend: CopilotKit endpoint called - Azure OpenAI configuration',
    );
    console.log('🔧 Request timestamp:', new Date().toISOString());

    // Enhanced request logging
    console.log('🔧 Request method:', req.method);
    console.log('🔧 Request URL:', req.url);
    console.log('🔧 Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('🔧 Request body keys:', Object.keys(req.body || {}));
    if (req.body && req.body.query) {
      console.log('🔧 GraphQL Query:', req.body.query);
    }
    if (req.body && req.body.variables) {
      console.log(
        '🔧 GraphQL Variables:',
        JSON.stringify(req.body.variables, null, 2),
      );
    }

    // Log conversation messages if present to debug tool role issues
    if (req.body && req.body.variables && req.body.variables.messages) {
      console.log(
        '🔧 Conversation messages count:',
        req.body.variables.messages.length,
      );
      req.body.variables.messages.forEach((msg: any, index: number) => {
        console.log(`🔧 Message ${index}:`, {
          role: msg.role,
          content: msg.content
            ? typeof msg.content === 'string'
              ? msg.content.substring(0, 100) + '...'
              : 'Object'
            : 'No content',
          tool_calls: msg.tool_calls ? msg.tool_calls.length : 'None',
          name: msg.name || 'None',
        });
      });
    }

    // Check if Azure OpenAI should be used
    const useAzureOpenAI =
      this.configService.get<string>('USE_AZURE_OPENAI') === 'true';

    // Create the runtime properly configured for frontend actions
    console.log('🔧 Creating CopilotRuntime...');
    const runtime = new CopilotRuntime({
      // actions: () => {
      //   console.log(
      //     '🎯 Runtime actions function called - frontend actions should be auto-detected',
      //   );
      //   return []; // Return empty array - frontend actions are handled automatically
      // },
    });
    console.log('🔧 CopilotRuntime created successfully');

    let serviceAdapter: OpenAIAdapter;

    if (useAzureOpenAI) {
      // Configure OpenAI adapter for Azure OpenAI
      const azureEndpoint = this.configService.get<string>(
        'AZURE_OPENAI_ENDPOINT',
      );
      const azureApiKey = this.configService.get<string>(
        'AZURE_OPENAI_API_KEY',
      );
      const deploymentName =
        this.configService.get<string>('AZURE_OPENAI_DEPLOYMENT_NAME') || '';
      const apiVersion =
        this.configService.get<string>('AZURE_OPENAI_API_VERSION') ||
        '2024-10-21';

      console.log('🔧 Using Azure OpenAI configuration:', {
        endpoint: azureEndpoint,
        deploymentName,
        apiVersion,
        hasApiKey: !!azureApiKey,
      });

      // Construct the correct Azure OpenAI URL
      // For Azure OpenAI, the URL should be: {endpoint}/openai/deployments/{deployment}/chat/completions
      const baseURL = `${azureEndpoint}/openai/deployments/${deploymentName}`;

      console.log('🔧 Constructed baseURL:', baseURL);

      const openai = new OpenAI({
        baseURL: baseURL,
        apiKey: azureApiKey,
        defaultQuery: {
          'api-version': apiVersion,
        },
        defaultHeaders: {
          'api-key': azureApiKey,
        },
      });
      console.log('🔧 Creating OpenAIAdapter with Azure OpenAI...');
      // no logging
      const originalCreate = openai.chat.completions.create.bind(
        openai.chat.completions,
      );
      openai.chat.completions.create = function (params: any, options?: any) {
        console.log(
          '🚀 ACTUAL PAYLOAD TO OPENAI:',
          JSON.stringify(params, null, 2),
        );
        console.log('🚀 MESSAGE COUNT:', params.messages?.length || 0);
        params.messages?.forEach((msg: any, idx: number) => {
          console.log(
            `🚀 Message ${idx}: role=${msg.role}, has_tool_calls=${!!msg.tool_calls}, has_content=${!!msg.content}`,
          );
        });
        return originalCreate(params, options);
      } as any;

      // logging
      //       const originalCreate = openai.chat.completions.create.bind(openai.chat.completions);
      // openai.chat.completions.create = async function(params: any, options?: any) {
      //   console.log('🚀 ACTUAL PAYLOAD TO OPENAI:', JSON.stringify(params, null, 2));
      //   console.log('🚀 MESSAGE COUNT:', params.messages?.length || 0);
      //   params.messages?.forEach((msg: any, idx: number) => {
      //     console.log(`🚀 Message ${idx}: role=${msg.role}, has_tool_calls=${!!msg.tool_calls}, has_content=${!!msg.content}`);
      //   });

      //   const response = await originalCreate(params, options);

      //   if (params.stream) {
      //     console.log('📤 STREAMING RESPONSE DETECTED');

      //     const originalAsyncIterator = response[Symbol.asyncIterator];

      //     // Simple accumulator
      //     let accumulatedContent = '';
      //     let accumulatedToolCall = {
      //       id: '',
      //       type: 'function',
      //       function: {
      //         name: '',
      //         arguments: ''
      //       }
      //     };
      //     let topLevelData = {} as any;
      //     let finishReason = null;

      //     response[Symbol.asyncIterator] = async function* () {
      //       try {
      //         console.log('📤 Starting stream iteration...');

      //         for await (const chunk of originalAsyncIterator.call(response)) {
      //           console.log('📤 Raw streaming chunk:', JSON.stringify(chunk, null, 2));

      //           // Accumulate top-level data
      //           if (chunk.id) topLevelData.id = chunk.id;
      //           if (chunk.object) topLevelData.object = chunk.object;
      //           if (chunk.created) topLevelData.created = chunk.created;
      //           if (chunk.model) topLevelData.model = chunk.model;
      //           if (chunk.system_fingerprint) topLevelData.system_fingerprint = chunk.system_fingerprint;

      //           // Debug: Check if choices exist
      //           console.log('📤 Chunk has choices:', !!chunk.choices);
      //           console.log('📤 Choices length:', chunk.choices ? chunk.choices.length : 'N/A');

      //           // Process choices
      //           if (chunk.choices && chunk.choices.length > 0) {
      //             const choice = chunk.choices[0];
      //             console.log('📤 Processing choice:', !!choice);
      //             console.log('📤 Choice has delta:', !!choice.delta);

      //             if (choice.delta) {
      //               console.log('📤 Delta keys:', Object.keys(choice.delta));

      //               // Accumulate content
      //               if (choice.delta.content) {
      //                 accumulatedContent += choice.delta.content;
      //                 console.log('📤 Delta content:', choice.delta.content);
      //                 console.log('📤 Accumulated content so far:', accumulatedContent);
      //               }

      //               // Check for tool calls
      //               console.log('📤 Delta has tool_calls:', !!choice.delta.tool_calls);
      //               console.log('📤 Tool calls array:', choice.delta.tool_calls);

      //               // Accumulate tool calls
      //               if (choice.delta.tool_calls && Array.isArray(choice.delta.tool_calls)) {
      //                 console.log('📤 Processing', choice.delta.tool_calls.length, 'tool calls');

      //                 choice.delta.tool_calls.forEach((toolCall, index) => {
      //                   console.log(`📤 Processing tool call ${index}:`, toolCall);

      //                   if (toolCall.id) {
      //                     accumulatedToolCall.id = toolCall.id;
      //                     console.log('📤 Set tool call ID:', toolCall.id);
      //                   }
      //                   if (toolCall.type) {
      //                     accumulatedToolCall.type = toolCall.type;
      //                     console.log('📤 Set tool call type:', toolCall.type);
      //                   }
      //                   if (toolCall.function && toolCall.function.name) {
      //                     accumulatedToolCall.function.name = toolCall.function.name;
      //                     console.log('📤 Set tool call function name:', toolCall.function.name);
      //                   }
      //                   if (toolCall.function && toolCall.function.arguments !== undefined) {
      //                     accumulatedToolCall.function.arguments += toolCall.function.arguments;
      //                     console.log('📤 Added to tool arguments:', toolCall.function.arguments);
      //                     console.log('📤 Accumulated tool arguments so far:', accumulatedToolCall.function.arguments);
      //                   }
      //                 });
      //               }
      //             }

      //             if (choice.finish_reason) {
      //               finishReason = choice.finish_reason;
      //               console.log('📤 Finish reason:', choice.finish_reason);
      //             }
      //           }

      //           yield chunk;
      //         }

      //         console.log('📤 Stream iteration complete, now logging final results...');
      //         console.log('📤 STREAMING COMPLETE!');
      //         console.log('📤 Final top-level data:', JSON.stringify(topLevelData, null, 2));
      //         console.log('📤 Final accumulated content:', accumulatedContent || '(no content)');
      //         console.log('📤 Final accumulated tool call:', JSON.stringify(accumulatedToolCall, null, 2));
      //         console.log('📤 Final finish reason:', finishReason);

      //         if (accumulatedToolCall.function.arguments) {
      //           try {
      //             const parsedArgs = JSON.parse(accumulatedToolCall.function.arguments);
      //             console.log('📤 Parsed tool call arguments:', parsedArgs);
      //           } catch (e) {
      //             console.log('📤 Could not parse tool arguments as JSON:', accumulatedToolCall.function.arguments);
      //           }
      //         }

      //         // Create a complete response object
      //         const completeResponse = {
      //           ...topLevelData,
      //           choices: [{
      //             index: 0,
      //             message: {
      //               role: 'assistant',
      //               content: accumulatedContent || null,
      //               tool_calls: accumulatedToolCall.id ? [accumulatedToolCall] : null
      //             },
      //             finish_reason: finishReason
      //           }]
      //         };

      //         console.log('📤 ===== COMPLETE RECONSTRUCTED RESPONSE =====');
      //         console.log('📤', JSON.stringify(completeResponse, null, 2));

      //       } catch (error) {
      //         console.error('📤 Error during streaming:', error);
      //         console.error('📤 Error stack:', error.stack);
      //         throw error;
      //       }
      //     };

      //     return response;

      //   } else {
      //     console.log('📤 NON-STREAMING AI RESPONSE:', JSON.stringify(response, null, 2));
      //     return response;
      //   }
      // } as any;

      // end logging
      serviceAdapter = new OpenAIAdapter({ openai });
      console.log('🔧 OpenAIAdapter created successfully with Azure OpenAI');
    } else {
      console.log('🔧 Using default OpenAI configuration');
      console.log('🔧 Creating OpenAIAdapter with default OpenAI...');
      serviceAdapter = new OpenAIAdapter();
      console.log('🔧 OpenAIAdapter created successfully with default OpenAI');
    }

    console.log('🔧 Creating copilotRuntimeNestEndpoint handler...');
    const handler = copilotRuntimeNestEndpoint({
      runtime,
      serviceAdapter,
      endpoint: '/copilotkit',
    });
    console.log('🔧 Handler created successfully, executing...');

    try {
      console.log('🔧 Executing copilotkit handler...');
      const result = await handler(req, res);
      console.log('🔧 Handler executed successfully');
      return result;
    } catch (error) {
      console.error('❌ Error in copilotkit handler execution:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        status: error.status,
        code: error.code,
        param: error.param,
        type: error.type,
      });

      // Re-throw the error to maintain the original error handling
      throw error;
    }
  }
}
