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

        3. Ensure lists don't have a trailing space in the end of each list item
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

      // Use pipeDataStreamToResponse to stream the result to the client
      result.pipeDataStreamToResponse(res);
    } catch (error) {
      console.error('Error in /api/ai/command endpoint:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: 'Error processing AI command.' });
    }
  }

  @Post('/api/ai/command_T')
  async handleCommandRequest_T(
    @Body() body: CommandApiDto,
    @Res() res: Response,
  ) {
    try {
      // Create a mock result object that mimics the streamText result structure
      const result = {
        pipeDataStreamToResponse: async (response: Response) => {
          // Set the same headers that the original streaming would use
          response.setHeader('Content-Type', 'text/plain');
          response.setHeader('Cache-Control', 'no-cache');
          response.setHeader('Connection', 'keep-alive');

          // Helper function to add delay between chunks
          const writeWithDelay = async (chunk: string, delay: number = 200) => {
            response.write(chunk);
            await new Promise((resolve) => setTimeout(resolve, delay));
          };

          // Generate the streaming format with the new data and delays
          await writeWithDelay('f:{"messageId":"msg-messageid"}\n');
          await writeWithDelay('0:"**Title:** Full Stack Developer\\n\\n"\n');
          await writeWithDelay(
            '0:"**Teaser:** Join our team as a Full Stack Developer and shape innovative web applications using cutting-edge technologies across the entire development stack.\\n\\n"\n',
          );
          await writeWithDelay(
            '0:"**Organization:**  \\nThe opportunity is based in Victoria, BC, and requires on-site presence. The role is part of a dynamic team focused on delivering high-quality web solutions.\\n\\n"\n',
          );
          await writeWithDelay(
            '0:"**Contract Outcome:**  \\nThe successful candidate will contribute to the development and enhancement of web applications, ensuring they meet the highest standards of functionality, accessibility, and user experience. The contract is for a fixed term with a maximum budget of $1,234.\\n\\n"\n',
          );
          await writeWithDelay('0:"**Key Responsibilities:**\\n\\n"\n');
          await writeWithDelay(
            '0:"- **Full Stack Development (90% allocation):**\\n  - Develop and maintain web applications using Amazon Web Services (AWS) and Android App Development.\\n  - Implement back-end solutions to support application functionality.\\n  - Collaborate with team members to integrate front-end and back-end components.\\n  - Utilize Git for version control and Angular for front-end development (optional).\\n\\n"\n',
          );
          await writeWithDelay(
            '0:"- **Data Professional (90% allocation):**\\n  - Work within an Agile framework to deliver data-driven solutions.\\n  - Develop and maintain applications using C++, Go, and Java.\\n  - Implement containerization solutions using Docker (optional).\\n  - Create data visualizations and reports using PowerBI (optional).\\n\\n"\n',
          );
          await writeWithDelay('0:"**Minimum Requirements:**\\n\\n"\n');
          await writeWithDelay(
            '0:"- **Full Stack Developer:**  \\n  - Proficiency in Amazon Web Services (AWS), Android App Development, and Back-End Development.  \\n  - Experience with Git and Angular is a plus.\\n\\n"\n',
          );
          await writeWithDelay(
            '0:"- **Data Professional:**  \\n  - Strong skills in Agile methodologies, C++, Go, and Java.  \\n  - Familiarity with Docker and PowerBI is advantageous.\\n\\n"\n',
          );
          await writeWithDelay(
            '0:"**Years of Experience:**  \\nCandidates should have a minimum of 3 years of experience in full stack development and data professional roles, with a proven track record of delivering high-quality solutions.\\n\\n"\n',
          );
          await writeWithDelay(
            '0:"**Estimated Procurement Timeline:**\\n\\n"\n',
          );
          await writeWithDelay(
            '0:"- **Proposal Deadline:** 2025-06-23  \\n- **Contract Award Date:** 2025-06-23  \\n- **Contract Start Date:** 2025-06-23  \\n- **Contract Completion Date:** 2025-06-23  \\n\\n"\n',
          );
          await writeWithDelay(
            '0:"**Contract Extension:**  \\nThis contract does not include provisions for extensions. The project is expected to be completed within the specified timeline.\\n\\n"\n',
          );
          await writeWithDelay('0:"**Acceptance Criteria:**\\n\\n"\n');
          await writeWithDelay(
            '0:"- Deliver fully functional web applications that meet the specified requirements.  \\n- Ensure all solutions are accessible and comply with relevant standards.  \\n- Participate in regular team meetings and provide updates on progress.  \\n- Collaborate with stakeholders to gather and implement feedback.  \\n\\n"\n',
          );
          await writeWithDelay(
            '0:"**Note:** This opportunity is open to all qualified candidates, and previous incumbents are not restricted from applying."\n',
          );
          await writeWithDelay(
            'e:{"finishReason":"unknown","usage":{"promptTokens":1865,"completionTokens":551},"isContinued":false}\n',
          );
          await writeWithDelay(
            'd:{"finishReason":"unknown","usage":{"promptTokens":1865,"completionTokens":551}}\n',
          );

          response.end();
        },
      };

      // Use the same pipeDataStreamToResponse call as before
      await result.pipeDataStreamToResponse(res);
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

      const prompt = `Generate comprehensive evaluation questions for a Team With Us opportunity.

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

${skillRagExamples}${serviceAreaRagExamples}

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
- Optimize for comprehensive evaluation with minimal question count`;

      const messages = [
        {
          role: 'system',
          content:
            'You are an expert at creating comprehensive technical evaluation question sets. Always respond with valid JSON only. Optimize for comprehensive coverage while minimizing redundancy. Group related skills logically rather than creating individual questions for each skill.',
        },
        { role: 'user', content: prompt },
      ];

      // console.log(prompt);
      // throw new Error('test');

      const response = await this.appService.generateChatCompletion(messages);

      let responseText: string;
      if (typeof response === 'string') {
        responseText = response;
      } else if (response && response.choices && response.choices[0]) {
        responseText = response.choices[0].message.content;
      } else {
        throw new Error('Unexpected response format');
      }

      console.log('responseText: \n', responseText);

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

  @Post('generate-resource-question')
  async generateResourceQuestion(@Body() dto: any) {
    throw new Error('deprecated');
    try {
      const { skill, context } = dto;

      // First, search for similar questions and guidelines using RAG
      let ragExamples = '';
      try {
        // Use VectorService directly instead of HTTP fetch
        const ragResults = await this.vectorService.searchSimilar(
          'twu_resource_questions',
          skill,
          6, // Get more results for variety
        );

        // Filter and process results similar to the RAG controller
        const questionResults = ragResults
          .filter((r) => r.metadata.full_question && r.metadata.full_guideline)
          .slice(0, 3); // Limit to 3 examples

        if (questionResults.length > 0) {
          ragExamples = '\n--- EXAMPLE QUESTIONS FOR REFERENCE ---\n';
          questionResults.forEach((result: any, index: number) => {
            ragExamples += `\nExample ${index + 1} (from "${
              result.metadata.opportunity_title
            }"):\n`;
            ragExamples += `Question: "${result.metadata.full_question}"\n`;
            ragExamples += `Guideline: "${result.metadata.full_guideline}"\n`;
          });
          ragExamples += '\n--- END OF EXAMPLES ---\n';
        }
      } catch (ragError) {
        console.warn(
          'RAG search failed, proceeding without examples:',
          ragError,
        );
      }

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
  .join('')}${ragExamples}

REQUIREMENTS:
- Create ONE evaluation question specifically for the "${skill}" skill
- Focus on practical application and real-world experience
- Make it scenario-based and specific to the opportunity context
- Provide clear evaluation guidelines for assessors
- The question should help determine competency level in this skill
- Use the example questions above as inspiration for format and style, but create original content
- Ensure the question is relevant to the specific opportunity context provided

OUTPUT FORMAT (JSON):
{
  "question": "Question text in plain text format",
  "guideline": "Clear guidance for evaluators on what constitutes a good response, including what to look for and how to assess competency. \\n new line"
}

Please return only valid JSON. IMPORTANT: escape new line characters - instead of "\n" use "\\n"`;

      const messages = [
        {
          role: 'system',
          content:
            'You are an expert at creating technical evaluation questions. Always respond with valid JSON only. Use the provided examples as inspiration for quality and format, but ensure your output is original and tailored to the specific context.',
        },
        { role: 'user', content: prompt },
      ];

      // console.log('messages: ', messages);

      const response = await this.appService.generateChatCompletion(messages);

      let responseText: string;
      if (typeof response === 'string') {
        responseText = response;
      } else if (response && response.choices && response.choices[0]) {
        responseText = response.choices[0].message.content;
      } else {
        throw new Error('Unexpected response format');
      }

      // console.log('responseText: \n', responseText);

      // Try to parse JSON response
      try {
        const parsed = JSON.parse(responseText);
        return parsed;
      } catch (parseError) {
        // If JSON parsing fails, try to extract question and guideline
        console.warn(
          'Failed to parse JSON, attempting text extraction:',
          parseError,
          responseText,
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
