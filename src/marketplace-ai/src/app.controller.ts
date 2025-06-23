import { All, Body, Controller, Post, Req, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { VectorService } from './vector.service';
import {
  CopilotRuntime,
  copilotRuntimeNestEndpoint,
  LangChainAdapter,
} from '@copilotkit/runtime';
import { Request, Response } from 'express';
import { LangChainAzureAIService } from './langchain-azure-ai.service';
import { smoothStream, streamText } from 'ai';
import { createAzure as createQuailAzure } from '@quail-ai/azure-ai-provider';
import { createAzure as createOfficialAzure } from '@ai-sdk/azure';
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
    private vectorService: VectorService,
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
    // throw new Error('test');
    try {
      // Check if Azure OpenAI should be used
      const useAzureOpenAI =
        this.configService.get<string>('USE_AZURE_OPENAI') === 'true';

      let azure;
      let modelName: string;

      if (useAzureOpenAI) {
        // Use official Azure OpenAI provider
        azure = createOfficialAzure({
          baseURL: this.configService.get<string>('AZURE_OPENAI_BASE_URL'),
          apiKey: this.configService.get<string>('AZURE_OPENAI_API_KEY'),
          apiVersion:
            this.configService.get<string>('AZURE_OPENAI_API_VERSION') ||
            '2024-10-01-preview',
        });
        modelName =
          this.configService.get<string>('AZURE_OPENAI_DEPLOYMENT_NAME') ?? '';
      } else {
        // Use existing AI Foundry provider
        azure = createQuailAzure({
          endpoint: process.env.AZURE_AI_ENDPOINT,
          apiKey: process.env.AZURE_AI_API_KEY,
        });
        modelName = this.configService.get<string>('AZURE_AI_MODEL') ?? '';
      }

      // Check if this is a special AI generation request
      let isSpecialGeneration = false;
      let finalPrompt = '';
      let finalSystem = '';

      // Parse messages to check for special generation requests
      if (body.messages && Array.isArray(body.messages)) {
        const lastMessage = body.messages[body.messages.length - 1];
        if (lastMessage && lastMessage.content) {
          const content = lastMessage.content;

          // Check for special generation markers
          if (content.includes('__GENERATE_QUESTION__')) {
            isSpecialGeneration = true;
            try {
              const contextMatch = content.match(
                /__CONTEXT_START__(.*?)__CONTEXT_END__/s,
              );
              const existingQuestionsMatch = content.match(
                /__EXISTING_QUESTIONS_START__(.*?)__EXISTING_QUESTIONS_END__/s,
              );
              const userPromptMatch = content.match(
                /__USER_PROMPT_START__(.*?)__USER_PROMPT_END__/s,
              );

              if (contextMatch) {
                const context = JSON.parse(contextMatch[1]);
                const existingQuestions = existingQuestionsMatch
                  ? JSON.parse(existingQuestionsMatch[1])
                  : [];
                const userPrompt = userPromptMatch
                  ? userPromptMatch[1].trim()
                  : 'Generate a single evaluation question for a Team With Us opportunity.';

                finalPrompt = await this.generateSingleQuestionPrompt(
                  context,
                  existingQuestions,
                  userPrompt,
                );
                finalSystem =
                  'You are an expert at creating technical evaluation questions. Generate a single, unique question that efficiently evaluates multiple related skills. Always respond with only the question text.';
              }
            } catch (error) {
              console.error(
                'Error parsing question generation context:',
                error,
              );
              isSpecialGeneration = false; // Fall back to original logic
            }
          } else if (content.includes('__GENERATE_GUIDELINE__')) {
            isSpecialGeneration = true;
            try {
              const contextMatch = content.match(
                /__CONTEXT_START__(.*?)__CONTEXT_END__/s,
              );
              const questionMatch = content.match(
                /__QUESTION_TEXT_START__(.*?)__QUESTION_TEXT_END__/s,
              );
              const userPromptMatch = content.match(
                /__USER_PROMPT_START__(.*?)__USER_PROMPT_END__/s,
              );

              if (contextMatch && questionMatch) {
                const context = JSON.parse(contextMatch[1]);
                const questionText = questionMatch[1];
                const userPrompt = userPromptMatch
                  ? userPromptMatch[1].trim()
                  : 'Generate evaluation guidelines for the following question in an opportunity.';

                finalPrompt = await this.generateSingleGuidelinePrompt(
                  context,
                  questionText,
                  userPrompt,
                );
                finalSystem =
                  'You are an expert at creating evaluation guidelines for technical questions. Generate clear, specific guidelines that help evaluators assess candidate responses effectively. Always respond with only the guideline text.';
              }
            } catch (error) {
              console.error(
                'Error parsing guideline generation context:',
                error,
              );
              isSpecialGeneration = false; // Fall back to original logic
            }
          }
        }
      }

      if (isSpecialGeneration) {
        // New logic for special generation requests
        console.log('special generation');
        console.log('finalPrompt: \n', finalPrompt);
        console.log('finalSystem: \n', finalSystem);
        // throw new Error('test');

        const result = streamText({
          model: azure(modelName), // or your configured AI model
          system: `${finalSystem}`,
          // prompt: body.prompt,
          messages: [{ role: 'user', content: finalPrompt }],
          experimental_transform: smoothStream({
            chunking: (buffer) => {
              // Split by double newlines (paragraphs) to keep complete sections together
              const match = /\n\n/.exec(buffer);
              return match
                ? buffer.slice(0, match.index + match[0].length)
                : null;
            },
            delayInMs: 25,
          }),
        });

        // Use pipeDataStreamToResponse to stream the result to the client
        result.pipeDataStreamToResponse(res);
      } else {
        // Original logic - preserved exactly as it was
        console.log('original logic');
        console.log('body.messages: \n', body.messages[0].content);
        console.log('body.system: \n', body.system);

        try {
          // throw new Error('test');
          const result = streamText({
            model: azure(modelName), // or your configured AI model
            system: `${body.system || 'You are a helpful assistant.'}

            Important formatting rules:
            1. Ensure there are no trailing spaces:
            Example:
            "This is a test text  \n\n" <- THIS IS WRONG
            "This is a test text\n\n" <- THIS IS CORRECT

            2. Ensure to add double new lines between paragraphs:
            Example:
            "**Description:**\n We are seeking..." <- THIS IS WRONG
            "**Description:**\n\n We are seeking..." <- THIS IS CORRECT

            3. Ensure lists (if any) don't have a trailing space in the end of each list item
            Example:
            - Item 1\n
            - Item 2\n
            - Item 3\n\n
            `,
            // prompt: body.prompt,
            messages: body.messages,
            experimental_transform: smoothStream({
              chunking: (buffer) => {
                // Split by double newlines (paragraphs) to keep complete sections together
                const match = /\n\n/.exec(buffer);
                return match
                  ? buffer.slice(0, match.index + match[0].length)
                  : null;
              },
              delayInMs: 25,
            }),
          });

          result.pipeDataStreamToResponse(res);
        } catch (streamTextError) {
          console.error('Error creating streamText result:', streamTextError);
        }
      }
    } catch (error) {
      console.error('Error in /api/ai/command endpoint:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: 'Error processing AI command.' });
    }
  }

  @Post('/api/ai/command_test')
  async handleCommandRequest2(
    @Body() body: CommandApiDto,
    @Res() res: Response,
  ) {
    try {
      // Create a mock result object that mimics the streamText result structure
      const result = {
        pipeDataStreamToResponse: (response: Response) => {
          // Set the same headers that the original streaming would use
          response.setHeader('Content-Type', 'text/plain');
          response.setHeader('Cache-Control', 'no-cache');
          response.setHeader('Connection', 'keep-alive');

          // Generate the exact streaming format with new content
          response.write('f:{"messageId":"msg-kG0M1zsyM7XOsK4G4F08Ded8"}\n');
          response.write('0:"**Full Stack Developer Opportunity**\\n\\n"\n');
          response.write(
            '0:"**Organization:**  \\n[YOUR ORGANIZATION] is seeking a skilled Full Stack Developer to join our team in Victoria. This is an on-site position where you\'ll work on innovative web applications using cutting-edge technologies across the entire development stack.\\n\\n"\n',
          );
          response.write(
            '0:"**Contract Outcome:**  \\nThe successful candidate will deliver high-quality, scalable web applications that meet our organizational needs, leveraging Amazon Web Services (AWS) and other modern technologies. The project must be completed by June 28, 2025.\\n\\n"\n',
          );
          response.write('0:"**Key Responsibilities:**  \\n\\n"\n');
          response.write(
            '0:"- Design, develop full-stack web applications using AWS and other relevant technologies.  \\n- Collaborate with cross-functional teams to define, design, and ship new features.  \\n- Ensure the performance, quality, and responsiveness of applications.  \\n- Maintain code integrity and organization, including version control using Git.  \\n- Troubleshoot and debug issues to optimize performance.  \\n- Participate in code reviews and contribute to team knowledge sharing.  \\n\\n"\n',
          );
          response.write('0:"**Minimum Requirements:**  \\n\\n"\n');
          response.write(
            '0:"- Proven experience as a Full Stack Developer with expertise in Amazon Web Services (AWS).  \\n- Strong proficiency in front-end and back-end development technologies.  \\n- Experience with Git for version control.  \\n- Ability to work independently and as part of a team in a fast-paced environment.  \\n- Strong problem-solving skills and attention to detail.  \\n\\n"\n',
          );
          response.write(
            '0:"**Years of Experience:**  \\nA minimum of [X] years of experience in full-stack development, with at least [Y] years focused on AWS-based solutions.\\n\\n"\n',
          );
          response.write('0:"**Estimated Procurement Timeline:**  \\n\\n"\n');
          response.write(
            '0:"- **Proposal Deadline:** June 23, 2025  \\n- **Contract Award Date:** June 24, 2025  \\n- **Contract Start Date:** June 25, 2025  \\n- **Contract Completion Date:** June 28, 2025  \\n\\n"\n',
          );
          response.write(
            '0:"**Contract Details:**  \\nThis is a fixed-term contract with a maximum budget of $1,234. There is no provision for contract extensions at this time.  \\n\\n"\n',
          );
          response.write(
            '0:"**Note to Proponents:**  \\nAn incumbent vendor may be engaged in related work. The incumbent vendor is NOT prevented from applying to this opportunity.  \\n\\n"\n',
          );
          response.write('0:"**Acceptance Criteria:**  \\n\\n"\n');
          response.write(
            '0:"- Deliver fully functional web applications that meet specified requirements.  \\n- Ensure all deliverables are completed within the agreed timeline.  \\n- Participate in regular meetings and provide timely updates on progress.  \\n- Adhere to best practices in coding, security, and performance optimization.  \\n\\n"\n',
          );
          response.write(
            '0:"**Optional Skills (Preferred but Not Required):**  \\n\\n"\n',
          );
          response.write(
            '0:"- Experience with additional cloud platforms or DevOps tools.  \\n- Familiarity with agile development methodologies.  \\n- Knowledge of additional programming languages or frameworks.  \\n\\n"\n',
          );
          response.write(
            '0:"**Location:**  \\nVictoria, BC (Remote work is not permitted for this role).  \\n\\n\\n"\n',
          );
          response.write(
            '0:"**Budget:**  \\nMaximum budget for this contract is $1,234."\n',
          );
          response.write(
            'e:{"finishReason":"unknown","usage":{"promptTokens":2586,"completionTokens":559},"isContinued":false}\n',
          );
          response.write(
            'd:{"finishReason":"unknown","usage":{"promptTokens":2586,"completionTokens":559}}\n',
          );

          response.end();
        },
      };

      // Use the same pipeDataStreamToResponse call as before
      result.pipeDataStreamToResponse(res);
    } catch (error) {
      console.error('Error in /api/ai/command endpoint:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: 'Error processing AI command.' });
    }
  }

  @Post('generate-resource-questions')
  async generateResourceQuestions(@Body() dto: any) {
    try {
      const { context } = dto;

      // Extract all unique skills and service areas from resources
      const allSkills = new Set<string>();
      const serviceAreas = new Set<string>();

      context.resources.forEach((resource: any) => {
        // Add service area
        if (resource.serviceArea) {
          serviceAreas.add(resource.serviceArea);
        }

        // Add all skills
        if (resource.mandatorySkills) {
          resource.mandatorySkills.forEach((skill: string) => {
            if (skill.trim()) allSkills.add(skill.trim());
          });
        }
        if (resource.optionalSkills) {
          resource.optionalSkills.forEach((skill: string) => {
            if (skill.trim()) allSkills.add(skill.trim());
          });
        }
      });

      // Perform RAG operations for skills
      let skillRagExamples = '';
      try {
        const skillPromises = Array.from(allSkills).map(async (skill) => {
          const ragResults = await this.vectorService.searchSimilar(
            'twu_resource_questions',
            skill,
            4, // Get more results for variety
          );
          return { skill, results: ragResults };
        });

        const skillRagResults = await Promise.all(skillPromises);

        // Build skill examples section
        if (skillRagResults.some((sr) => sr.results.length > 0)) {
          skillRagExamples = '\n--- SKILL-BASED EXAMPLE QUESTIONS ---\n';
          skillRagResults.forEach(({ skill, results }) => {
            if (results.length > 0) {
              const questionResults = results
                .filter(
                  (r) => r.metadata.full_question && r.metadata.full_guideline,
                )
                .slice(0, 2); // Limit to 2 examples per skill

              if (questionResults.length > 0) {
                skillRagExamples += `\nExamples for skill "${skill}":\n`;
                questionResults.forEach((result: any, index: number) => {
                  skillRagExamples += `  ${index + 1}. Question: "${
                    result.metadata.full_question
                  }"\n`;
                  skillRagExamples += `     Guideline: "${result.metadata.full_guideline}"\n`;
                });
              }
            }
          });
          skillRagExamples += '\n--- END OF SKILL EXAMPLES ---\n';
        }
      } catch (ragError) {
        console.warn(
          'Skill RAG search failed, proceeding without skill examples:',
          ragError,
        );
      }

      // Perform RAG operations for service areas
      let serviceAreaRagExamples = '';
      try {
        const serviceAreaPromises = Array.from(serviceAreas).map(
          async (serviceArea) => {
            // Search using service area name as query
            const ragResults = await this.vectorService.searchSimilar(
              'twu_resource_questions',
              serviceArea,
              4,
            );
            return { serviceArea, results: ragResults };
          },
        );

        const serviceAreaRagResults = await Promise.all(serviceAreaPromises);

        // Build service area examples section
        if (serviceAreaRagResults.some((sar) => sar.results.length > 0)) {
          serviceAreaRagExamples = '\n--- SERVICE AREA EXAMPLE QUESTIONS ---\n';
          serviceAreaRagResults.forEach(({ serviceArea, results }) => {
            if (results.length > 0) {
              const questionResults = results
                .filter(
                  (r) => r.metadata.full_question && r.metadata.full_guideline,
                )
                .slice(0, 2); // Limit to 2 examples per service area

              if (questionResults.length > 0) {
                serviceAreaRagExamples += `\nExamples for service area "${serviceArea}":\n`;
                questionResults.forEach((result: any, index: number) => {
                  serviceAreaRagExamples += `  ${index + 1}. Question: "${
                    result.metadata.full_question
                  }"\n`;
                  serviceAreaRagExamples += `     Guideline: "${result.metadata.full_guideline}"\n`;
                });
              }
            }
          });
          serviceAreaRagExamples += '\n--- END OF SERVICE AREA EXAMPLES ---\n';
        }
      } catch (ragError) {
        console.warn(
          'Service area RAG search failed, proceeding without service area examples:',
          ragError,
        );
      }

      // Location: ${context.location || 'N/A'}
      // Remote Work: ${context.remoteOk ? 'Allowed' : 'Not allowed'}
      // ${context.remoteDesc ? `Remote Description: ${context.remoteDesc}` : ''}

      const prompt = `Generate comprehensive evaluation questions and guidelines for an opportunity.

REQUIREMENTS:
- Generate an optimal set of evaluation questions that comprehensively covers ALL service areas and skills
- DO NOT create one question per skill - instead, optimize the questions to efficiently assess multiple related skills
- Group related skills and service areas into logical question clusters
- Each question should be scenario-based and specific to the opportunity context
- Provide clear evaluation guidelines for each question
- Questions should help determine competency levels across all required areas
- Use the example questions above as inspiration for format and quality, but create original content
- Ensure comprehensive coverage while minimizing redundancy
- Total questions should typically be between 3-8 questions (optimize for efficiency)

OUTPUT FORMAT (JSON):
{
  "questions": [
    {
      "question": "Question text in plain text format",
      "guideline": "Clear guidance for evaluators on what constitutes a good response, including what to look for and how to assess competency. \\n Evaluation criteria and scoring guidance.",
    }
  ]
}

Please return only valid JSON. IMPORTANT:
- For JSON, escape new line characters properly (use "\\n" instead of "\n")
- DO NOT start the response with \`\`\`json, output RAW JSON ONLY
- Ensure questions cover ALL skills and service areas mentioned
- Optimize for comprehensive evaluation with minimal question count

OPPORTUNITY CONTEXT:
Title: ${context.title || 'N/A'}
Teaser: ${context.teaser || 'N/A'}
Description: ${context.description || 'N/A'}

RESOURCES NEEDED:
${context.resources
  .map(
    (r: any, i: number) => `
Resource ${i + 1}: ${r.serviceArea} (${r.targetAllocation}% allocation)
- Mandatory Skills: ${r.mandatorySkills?.join(', ') || 'None'}
- Optional Skills: ${r.optionalSkills?.join(', ') || 'None'}`,
  )
  .join('')}

ALL SKILLS TO EVALUATE: ${Array.from(allSkills).join(', ')}
SERVICE AREAS: ${Array.from(serviceAreas).join(', ')}

${skillRagExamples}${serviceAreaRagExamples}`;

      const messages = [
        {
          role: 'system',
          content:
            'You are an expert at creating comprehensive technical evaluation question sets. Always respond with valid JSON only. CRITICAL: DO NOT include ```json or ``` in your response. Optimize for comprehensive coverage while minimizing redundancy. Group related skills logically rather than creating individual questions for each skill.',
        },
        { role: 'user', content: prompt },
      ];

      console.log('prompt: ', prompt);
      // throw new Error('test');

      const response = await this.appService.generateChatCompletion(messages);

      // console.log('response: ', response);

      let responseText: string;
      if (typeof response === 'string') {
        responseText = response;
      } else if (response && response.choices && response.choices[0]) {
        responseText = response.choices[0].message.content;
      } else {
        throw new Error('Unexpected response format');
      }

      // Check if responseText is wrapped in markdown code blocks and extract JSON content
      if (responseText.startsWith('```json') && responseText.endsWith('```')) {
        responseText = responseText.slice(7, -3).trim(); // Remove ```json from start and ``` from end
      }

      // Try to parse JSON response
      try {
        const parsed = JSON.parse(responseText);

        // Validate the response structure
        if (!parsed.questions || !Array.isArray(parsed.questions)) {
          throw new Error('Invalid response: questions array is required');
        }

        // Ensure each question has required fields
        parsed.questions = parsed.questions.map((q: any, index: number) => ({
          question:
            q.question ||
            `Question ${
              index + 1
            }: Please describe your experience with the relevant skills.`,
          guideline:
            q.guideline ||
            `Evaluate the depth of experience and practical application of skills.`,
          wordLimit: q.wordLimit || 500,
          score: q.score || Math.round(100 / parsed.questions.length),
        }));

        return parsed;
      } catch (parseError) {
        console.warn(
          'Failed to parse JSON, creating fallback questions:',
          parseError,
          responseText,
        );

        // Create fallback questions based on service areas
        const fallbackQuestions = Array.from(serviceAreas).map(
          (serviceArea, _index) => ({
            question: `Describe your experience and approach to working in the ${serviceArea} service area. Provide specific examples from your professional experience that demonstrate your competency in the relevant skills.`,
            guideline: `Look for specific examples, depth of experience, and practical application of skills related to ${serviceArea}. Good responses should include concrete examples and demonstrate understanding of best practices.`,
            wordLimit: 500,
            score: Math.round(100 / serviceAreas.size),
          }),
        );

        return {
          questions: fallbackQuestions,
          rationale: `Fallback questions generated to cover each service area: ${Array.from(
            serviceAreas,
          ).join(', ')}`,
        };
      }
    } catch (error) {
      console.error('Error generating resource questions:', error);
      throw new Error(`Failed to generate questions: ${error.message}`);
    }
  }

  // Internal function to generate single question prompt
  private async generateSingleQuestionPrompt(
    context: any,
    existingQuestions: string[],
    userPrompt: string,
  ): Promise<string> {
    // Extract all unique skills and service areas from resources
    const allSkills = new Set<string>();
    const serviceAreas = new Set<string>();

    context.resources.forEach((resource: any) => {
      // Add service area
      if (resource.serviceArea) {
        serviceAreas.add(resource.serviceArea);
      }

      // Add all skills
      if (resource.mandatorySkills) {
        resource.mandatorySkills.forEach((skill: string) => {
          if (skill.trim()) allSkills.add(skill.trim());
        });
      }
      if (resource.optionalSkills) {
        resource.optionalSkills.forEach((skill: string) => {
          if (skill.trim()) allSkills.add(skill.trim());
        });
      }
    });

    // Perform RAG operations for skills
    let skillRagExamples = '';
    try {
      const skillPromises = Array.from(allSkills).map(async (skill) => {
        const ragResults = await this.vectorService.searchSimilar(
          'twu_resource_questions',
          skill,
          2, // Get fewer results for individual question
        );
        return { skill, results: ragResults };
      });

      const skillRagResults = await Promise.all(skillPromises);

      // Build skill examples section
      if (skillRagResults.some((sr) => sr.results.length > 0)) {
        skillRagExamples = '\n--- EXAMPLE QUESTIONS ---\n';
        skillRagResults.forEach(({ skill, results }) => {
          if (results.length > 0) {
            const questionResults = results
              .filter(
                (r) => r.metadata.full_question && r.metadata.full_guideline,
              )
              .slice(0, 1); // Limit to 1 example per skill

            if (questionResults.length > 0) {
              skillRagExamples += `\nExample for skill "${skill}":\n`;
              questionResults.forEach((result: any, _index: number) => {
                skillRagExamples += `  Question: "${result.metadata.full_question}"\n`;
              });
            }
          }
        });
        skillRagExamples += '\n--- END OF EXAMPLES ---\n';
      }
    } catch (ragError) {
      console.warn(
        'Skill RAG search failed, proceeding without skill examples:',
        ragError,
      );
    }

    // Build existing questions context
    let existingQuestionsContext = '';
    if (existingQuestions && existingQuestions.length > 0) {
      existingQuestionsContext =
        '\n--- EXISTING QUESTIONS TO AVOID DUPLICATING ---\n';
      existingQuestions.forEach((q: string, index: number) => {
        existingQuestionsContext += `${index + 1}. ${q}\n`;
      });
      existingQuestionsContext += '--- END OF EXISTING QUESTIONS ---\n';
    }

    return `${userPrompt}

OPPORTUNITY CONTEXT:
Title: ${context.title || 'N/A'}
Teaser: ${context.teaser || 'N/A'}
Description: ${context.description || 'N/A'}

RESOURCES NEEDED:
${context.resources
  .map(
    (r: any, i: number) => `
Resource ${i + 1}: ${r.serviceArea} (${r.targetAllocation}% allocation)
- Mandatory Skills: ${r.mandatorySkills?.join(', ') || 'None'}
- Optional Skills: ${r.optionalSkills?.join(', ') || 'None'}`,
  )
  .join('')}

ALL SKILLS TO EVALUATE: ${Array.from(allSkills).join(', ')}
SERVICE AREAS: ${Array.from(serviceAreas).join(', ')}

${skillRagExamples}${existingQuestionsContext}

REQUIREMENTS:
- Generate ONE evaluation question that covers multiple related skills/service areas
- The question should be scenario-based and specific to the opportunity context
- DO NOT duplicate or be too similar to existing questions listed above
- Focus on skills and service areas that haven't been fully covered by existing questions
- The question should help determine competency levels in the relevant areas
- Use the example questions above as inspiration for format and quality, but create original content

Please return only the question text, no additional formatting or explanation.`;
  }

  // Internal function to generate single guideline prompt
  private async generateSingleGuidelinePrompt(
    context: any,
    questionText: string,
    userPrompt: string,
  ): Promise<string> {
    // Extract all unique skills and service areas from resources
    const allSkills = new Set<string>();
    const serviceAreas = new Set<string>();

    context.resources.forEach((resource: any) => {
      // Add service area
      if (resource.serviceArea) {
        serviceAreas.add(resource.serviceArea);
      }

      // Add all skills
      if (resource.mandatorySkills) {
        resource.mandatorySkills.forEach((skill: string) => {
          if (skill.trim()) allSkills.add(skill.trim());
        });
      }
      if (resource.optionalSkills) {
        resource.optionalSkills.forEach((skill: string) => {
          if (skill.trim()) allSkills.add(skill.trim());
        });
      }
    });

    // Perform RAG operations for skills
    let skillRagExamples = '';
    try {
      const skillPromises = Array.from(allSkills).map(async (skill) => {
        const ragResults = await this.vectorService.searchSimilar(
          'twu_resource_questions',
          skill,
          2, // Get fewer results for individual guideline
        );
        return { skill, results: ragResults };
      });

      const skillRagResults = await Promise.all(skillPromises);

      // Build skill examples section
      if (skillRagResults.some((sr) => sr.results.length > 0)) {
        skillRagExamples = '\n--- EXAMPLE GUIDELINES ---\n';
        skillRagResults.forEach(({ skill, results }) => {
          if (results.length > 0) {
            const questionResults = results
              .filter(
                (r) => r.metadata.full_question && r.metadata.full_guideline,
              )
              .slice(0, 1); // Limit to 1 example per skill

            if (questionResults.length > 0) {
              skillRagExamples += `\nExample guideline for skill "${skill}":\n`;
              questionResults.forEach((result: any, _index: number) => {
                skillRagExamples += `  Guideline: "${result.metadata.full_guideline}"\n`;
              });
            }
          }
        });
        skillRagExamples += '\n--- END OF EXAMPLES ---\n';
      }
    } catch (ragError) {
      console.warn(
        'Skill RAG search failed, proceeding without skill examples:',
        ragError,
      );
    }

    return `${userPrompt}

QUESTION TO CREATE GUIDELINES FOR:
"${questionText}"

OPPORTUNITY CONTEXT:
Title: ${context.title || 'N/A'}
Teaser: ${context.teaser || 'N/A'}
Description: ${context.description || 'N/A'}

RESOURCES NEEDED:
${context.resources
  .map(
    (r: any, i: number) => `
Resource ${i + 1}: ${r.serviceArea} (${r.targetAllocation}% allocation)
- Mandatory Skills: ${r.mandatorySkills?.join(', ') || 'None'}
- Optional Skills: ${r.optionalSkills?.join(', ') || 'None'}`,
  )
  .join('')}

ALL SKILLS TO EVALUATE: ${Array.from(allSkills).join(', ')}
SERVICE AREAS: ${Array.from(serviceAreas).join(', ')}

${skillRagExamples}
`;
  }
}
