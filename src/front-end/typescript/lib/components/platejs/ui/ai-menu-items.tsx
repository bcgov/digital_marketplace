import * as React from 'react';

import { type SlateEditor, NodeApi } from '@udecode/plate';
import { AIChatPlugin, AIPlugin } from '@udecode/plate-ai/react';
import { useIsSelecting } from '@udecode/plate-selection/react';
import {
  type PlateEditor,
  useEditorRef,
  usePluginOption,
} from '@udecode/plate/react';
import {
  // Album,
  // BadgeHelp,
  BookOpenCheck,
  Check,
  CornerUpLeft,
  FeatherIcon,
  ListEnd,
  ListMinus,
  ListPlus,
  PenLine,
  // SmileIcon,
  Wand,
  X,
} from 'lucide-react';

import { CommandGroup, CommandItem } from '../ui/command';
import { MARKETPLACE_AI_URL } from 'front-end/config';
import { TWUServiceArea } from 'shared/lib/resources/opportunity/team-with-us';
import { twuServiceAreaToTitleCase } from 'front-end/lib/pages/opportunity/team-with-us/lib';

export type EditorChatState =
  | 'cursorCommand'
  | 'cursorSuggestion'
  | 'selectionCommand'
  | 'selectionSuggestion';

export const aiChatItems = {
  accept: {
    icon: <Check />,
    label: 'Accept',
    value: 'accept',
    onSelect: ({ editor }) => {
      editor.getTransforms(AIChatPlugin).aiChat.accept();
      editor.tf.focus({ edge: 'end' });
    },
  },
  continueWrite: {
    icon: <PenLine />,
    label: 'Continue writing',
    value: 'continueWrite',
    onSelect: ({ editor }) => {
      const ancestorNode = editor.api.block({ highest: true });

      if (!ancestorNode) return;

      const isEmpty = NodeApi.string(ancestorNode[0]).trim().length === 0;

      void editor.getApi(AIChatPlugin).aiChat.submit({
        mode: 'insert',
        prompt: isEmpty
          ? `<Document>
{editor}
</Document>
Start writing a new paragraph AFTER <Document> ONLY ONE SENTENCE`
          : 'Continue writing AFTER <Block> ONLY ONE SENTENCE. DONT REPEAT THE TEXT.',
      });
    },
  },
  discard: {
    icon: <X />,
    label: 'Discard',
    shortcut: 'Escape',
    value: 'discard',
    onSelect: ({ editor }) => {
      editor.getTransforms(AIPlugin).ai.undo();
      editor.getApi(AIChatPlugin).aiChat.hide();
    },
  },
  // emojify: {
  //   icon: <SmileIcon />,
  //   label: 'Emojify',
  //   value: 'emojify',
  //   onSelect: ({ editor }) => {
  //     void editor.getApi(AIChatPlugin).aiChat.submit({
  //       prompt: 'Emojify',
  //     });
  //   },
  // },
  // explain: {
  //   icon: <BadgeHelp />,
  //   label: 'Explain',
  //   value: 'explain',
  //   onSelect: ({ editor }) => {
  //     void editor.getApi(AIChatPlugin).aiChat.submit({
  //       prompt: {
  //         default: 'Explain {editor}',
  //         selecting: 'Explain',
  //       },
  //     });
  //   },
  // },
  fixSpelling: {
    icon: <Check />,
    label: 'Fix spelling & grammar',
    value: 'fixSpelling',
    onSelect: ({ editor }) => {
      void editor.getApi(AIChatPlugin).aiChat.submit({
        prompt: 'Fix spelling and grammar',
      });
    },
  },
  generateMarkdownSample: {
    icon: <BookOpenCheck />,
    label: 'Generate Markdown sample',
    value: 'generateMarkdownSample',
    onSelect: ({ editor }) => {
      void editor.getApi(AIChatPlugin).aiChat.submit({
        prompt: 'Generate a markdown sample',
      });
    },
  },
  generateOpportunityDescription: {
    icon: <BookOpenCheck />,
    label: 'Generate opportunity description',
    value: 'generateOpportunityDescription',
    onSelect: async ({ editor }) => {
      const context = editor.getOption({ key: 'opportunityContext' }, 'context');
      const title = context?.title || '';
      const teaser = context?.teaser || '';
      const resources = context?.resources || [];
      const location = context?.location || '';
      const remoteOk = context?.remoteOk;
      const remoteDesc = context?.remoteDesc || '';
      const maxBudget = context?.maxBudget;
      const proposalDeadline = context?.proposalDeadline;
      const assignmentDate = context?.assignmentDate;
      const startDate = context?.startDate;
      const completionDate = context?.completionDate;

      try {
        // throw new Error('test');

        // First, search for similar opportunities using RAG
        const searchRequest = {
          title: title,
          teaser: teaser,
          limit: 2
        };

        // Call the marketplace-ai service directly
        const response = await fetch(`${MARKETPLACE_AI_URL}/rag/search-opportunities`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(searchRequest),
        });

        if (!response.ok) {
          throw new Error(`RAG search failed: ${response.statusText}`);
        }

        const ragSearchResults = await response.json();

        // Build enhanced prompt with RAG results
        let prompt = 'Generate a comprehensive opportunity description based on the following information:\n\n';

        if (title) {
          prompt += `Title: ${title}\n`;
        }
        if (teaser) {
          prompt += `Teaser: ${teaser}\n`;
        }

        // Add service areas and associated skills from resources
        if (resources && resources.length > 0) {
          prompt += '\n--- Service Areas and Skills ---\n';
          resources.forEach((resource: any, index: number) => {
            // Convert service area enum to user-friendly name
            const serviceAreaName = resource.serviceArea && typeof resource.serviceArea === 'string'
              ? twuServiceAreaToTitleCase(resource.serviceArea as TWUServiceArea)
              : 'Unknown Service Area';

            prompt += `Service Area ${index + 1}: ${serviceAreaName} (${resource.targetAllocation}% allocation)\n`;
            if (resource.mandatorySkills && resource.mandatorySkills.length > 0) {
              prompt += `  Mandatory Skills: ${resource.mandatorySkills.join(', ')}\n`;
            }
            if (resource.optionalSkills && resource.optionalSkills.length > 0) {
              prompt += `  Optional Skills: ${resource.optionalSkills.join(', ')}\n`;
            }
          });
        }

        // Add dates information
        if (proposalDeadline || assignmentDate || startDate || completionDate) {
          prompt += '\n--- Timeline ---\n';
          if (proposalDeadline) {
            prompt += `Proposal Deadline: ${proposalDeadline}\n`;
          }
          if (assignmentDate) {
            prompt += `Contract Award Date: ${assignmentDate}\n`;
          }
          if (startDate) {
            prompt += `Contract Start Date: ${startDate}\n`;
          }
          if (completionDate) {
            prompt += `Contract Completion Date: ${completionDate}\n`;
          }
        }

        // Add location and remote work information
        if (location) {
          prompt += `\nLocation: ${location}\n`;
        }
        if (remoteOk !== undefined) {
          prompt += `Remote Work: ${remoteOk ? 'Yes' : 'No'}\n`;
          if (remoteOk && remoteDesc) {
            prompt += `Remote Work Details: ${remoteDesc}\n`;
          }
        }

        // Add budget information
        if (maxBudget) {
          prompt += `Maximum Budget: $${maxBudget.toLocaleString()}\n`;
        }

        prompt += `\n\nIMPORTANT RULES:\nThe description should be follow the format similar to the reference material.
        Ensure to include Organization, contract outcome, key responsibilities, minimum requirements, years of experience, and estimated procurement timeline.
        For responsibilities and requirements, ensure to cover all aspects of service areas.
        Include contract extension language if it exists in reference material.
        If reference material is provided, use it for inspiration but create unique, original content.
        Ignore markdown rules in reference material, and use standard markdown rules instead.
        If some information is missing in the context, use placeholder text, for example "[YOUR ORGANIZATION]".
        Use placeholders for any other unknown data that's present in example material, but not in provided context. Use only if necessary.
        Important: follow the general format and length of the reference material as closely as possible.\n`;


        // Add similar opportunities context if found
        const results = ragSearchResults.results;
        if (results && results.length > 0) {
          prompt += '\n--- REFERENCE MATERIAL - Similar Opportunities for Reference ---\n';
          results.forEach((result: any, index: number) => {
            prompt += `\nSimilar Opportunity Description ${index + 1} ("${result.metadata.title}"):\n`;
            // prompt += `Title: ${result.metadata.title}\n`;
            // prompt += `Teaser: \n\n ${result.metadata.teaser}\n\n`;
            // prompt += `Description: \n\n ${result.metadata.full_description}\n`;
            prompt += `${result.metadata.full_description}\n`;
          });
          prompt += '\n--- End of Reference Material ---\n';
        }


        console.log('prompt', prompt);
        // throw new Error('test');

        void editor.getApi(AIChatPlugin).aiChat.submit({
          prompt,
        });

      } catch (error) {
        // throw error;
        console.error('RAG search failed, falling back to basic prompt:', error);

        // Fallback to enhanced basic prompt with available context
        let prompt = 'Generate a comprehensive opportunity description based on the following information:\n\n';

        if (title) {
          prompt += `Title: ${title}\n`;
        }
        if (teaser) {
          prompt += `Teaser: ${teaser}\n`;
        }

        // Add service areas and skills even in fallback
        if (resources && resources.length > 0) {
          prompt += '\n--- Service Areas and Skills ---\n';
          resources.forEach((resource: any, index: number) => {
            // Convert service area enum to user-friendly name
            const serviceAreaName = resource.serviceArea && typeof resource.serviceArea === 'string'
              ? twuServiceAreaToTitleCase(resource.serviceArea as TWUServiceArea)
              : 'Unknown Service Area';

            prompt += `Service Area ${index + 1}: ${serviceAreaName} (${resource.targetAllocation}% allocation)\n`;
            if (resource.mandatorySkills && resource.mandatorySkills.length > 0) {
              prompt += `  Mandatory Skills: ${resource.mandatorySkills.join(', ')}\n`;
            }
            if (resource.optionalSkills && resource.optionalSkills.length > 0) {
              prompt += `  Optional Skills: ${resource.optionalSkills.join(', ')}\n`;
            }
          });
        }

        // Add timeline information
        if (proposalDeadline || assignmentDate || startDate || completionDate) {
          prompt += '\n--- Timeline ---\n';
          if (proposalDeadline) {
            prompt += `Proposal Deadline: ${proposalDeadline}\n`;
          }
          if (assignmentDate) {
            prompt += `Contract Award Date: ${assignmentDate}\n`;
          }
          if (startDate) {
            prompt += `Contract Start Date: ${startDate}\n`;
          }
          if (completionDate) {
            prompt += `Contract Completion Date: ${completionDate}\n`;
          }
        }

        // Add location and budget in fallback
        if (location) {
          prompt += `\nLocation: ${location}\n`;
        }
        if (remoteOk !== undefined) {
          prompt += `Remote Work: ${remoteOk ? 'Yes' : 'No'}\n`;
          if (remoteOk && remoteDesc) {
            prompt += `Remote Work Details: ${remoteDesc}\n`;
          }
        }
        if (maxBudget) {
          prompt += `Maximum Budget: $${maxBudget.toLocaleString()}\n`;
        }

        prompt += '\nPlease create a detailed description that expands on this information, suitable for a professional opportunity posting. Include relevant context, background information, what the opportunity entails, key responsibilities based on the service areas and skills, minimum requirements, and timeline information.';

        void editor.getApi(AIChatPlugin).aiChat.submit({
          prompt,
        });
      }
    },
  },
  generateQuestion: {
    icon: <BookOpenCheck />,
    label: 'Generate question',
    value: 'generateQuestion',
    onSelect: async ({ editor }) => {
      const context = editor.getOption({ key: 'opportunityContext' }, 'context');

      if (!context) {
        console.error('No context available for question generation');
        return;
      }

      try {
        const generationContext = {
          title: context.title || '',
          teaser: context.teaser || '',
          description: context.description || '',
          location: context.location || '',
          remoteOk: context.remoteOk || false,
          remoteDesc: context.remoteDesc || '',
          resources: context.resources || []
        };

        const existingQuestions = context.existingQuestions || [];

        // Default prompt for question generation
        const defaultPrompt = `Generate a single evaluation question for a Team With Us opportunity.

REQUIREMENTS:
- Generate ONE evaluation question that covers multiple related skills/service areas
- The question should be scenario-based and specific to the opportunity context
- DO NOT duplicate or be too similar to existing questions listed below
- Focus on skills and service areas that haven't been fully covered by existing questions
- The question should help determine competency levels in the relevant areas
- Use the example questions below as inspiration for format and quality, but create original content

Please return only the question text, no additional formatting or explanation.`;

        // Create a special prompt with markers that the backend will detect
        const specialPrompt = `__USER_PROMPT_START__${defaultPrompt}__USER_PROMPT_END__
__GENERATE_QUESTION__
__CONTEXT_START__${JSON.stringify(generationContext)}__CONTEXT_END__
__EXISTING_QUESTIONS_START__${JSON.stringify(existingQuestions)}__EXISTING_QUESTIONS_END__`;

        void editor.getApi(AIChatPlugin).aiChat.submit({
          mode: 'insert',
          prompt: specialPrompt,
        });

      } catch (error) {
        console.error('Question generation failed:', error);

        // Fallback to basic question generation
        void editor.getApi(AIChatPlugin).aiChat.submit({
          prompt: 'Generate an evaluation question that assesses technical competency relevant to the skills and service areas mentioned in the context.',
        });
      }
    },
  },
  generateGuideline: {
    icon: <BookOpenCheck />,
    label: 'Generate guideline',
    value: 'generateGuideline',
    onSelect: async ({ editor }) => {
      const context = editor.getOption({ key: 'opportunityContext' }, 'context');

      if (!context) {
        console.error('No context available for guideline generation');
        return;
      }

      const currentQuestionText = context.currentQuestionText || '';

      try {
        const generationContext = {
          title: context.title || '',
          teaser: context.teaser || '',
          description: context.description || '',
          location: context.location || '',
          remoteOk: context.remoteOk || false,
          remoteDesc: context.remoteDesc || '',
          resources: context.resources || []
        };

        // Default prompt for guideline generation
        const defaultPrompt = `Generate evaluation guidelines for the following question in an opportunity.

QUESTION TO GENERATE THE GUIDELINE FOR:

${currentQuestionText}

REQUIREMENTS:
- Generate clear evaluation guidelines for the specific question below
- Include what evaluators should look for in a good response
- Provide specific criteria for assessing competency
- Include guidance on how to score/evaluate responses
- Focus on the skills and service areas relevant to the question
- Use the example guidelines below as inspiration for format and quality, but create original content

Please return only the guideline text, no additional formatting or explanation.`;

        // Create a special prompt with markers that the backend will detect
        const specialPrompt = `__USER_PROMPT_START__${defaultPrompt}__USER_PROMPT_END__
__GENERATE_GUIDELINE__
__CONTEXT_START__${JSON.stringify(generationContext)}__CONTEXT_END__
__QUESTION_TEXT_START__${currentQuestionText}__QUESTION_TEXT_END__`;

        void editor.getApi(AIChatPlugin).aiChat.submit({
          mode: 'insert',
          prompt: specialPrompt,
        });

      } catch (error) {
        console.error('Guideline generation failed:', error);

        // Fallback to basic guideline generation
        const fallbackPrompt = currentQuestionText
          ? `Generate evaluation guidelines for the following question: "${currentQuestionText}". Include what evaluators should look for in a good response and how to assess competency.`
          : 'Generate evaluation guidelines that help evaluators assess candidate responses to technical questions. Include specific criteria for assessment and scoring guidance.';

        void editor.getApi(AIChatPlugin).aiChat.submit({
          prompt: fallbackPrompt,
        });
      }
    },
  },
  improveWriting: {
    icon: <Wand />,
    label: 'Improve writing',
    value: 'improveWriting',
    onSelect: ({ editor }) => {
      void editor.getApi(AIChatPlugin).aiChat.submit({
        prompt: 'Improve the writing',
      });
    },
  },
  insertBelow: {
    icon: <ListEnd />,
    label: 'Insert below',
    value: 'insertBelow',
    onSelect: ({ aiEditor, editor }) => {
      void editor.getTransforms(AIChatPlugin).aiChat.insertBelow(aiEditor);
    },
  },
  makeLonger: {
    icon: <ListPlus />,
    label: 'Make longer',
    value: 'makeLonger',
    onSelect: ({ editor }) => {
      void editor.getApi(AIChatPlugin).aiChat.submit({
        prompt: 'Make longer',
      });
    },
  },
  makeShorter: {
    icon: <ListMinus />,
    label: 'Make shorter',
    value: 'makeShorter',
    onSelect: ({ editor }) => {
      void editor.getApi(AIChatPlugin).aiChat.submit({
        prompt: 'Make shorter',
      });
    },
  },
  replace: {
    icon: <Check />,
    label: 'Replace selection',
    value: 'replace',
    onSelect: ({ aiEditor, editor }) => {
      void editor.getTransforms(AIChatPlugin).aiChat.replaceSelection(aiEditor);
    },
  },
  simplifyLanguage: {
    icon: <FeatherIcon />,
    label: 'Simplify language',
    value: 'simplifyLanguage',
    onSelect: ({ editor }) => {
      void editor.getApi(AIChatPlugin).aiChat.submit({
        prompt: 'Simplify the language',
      });
    },
  },
  // summarize: {
  //   icon: <Album />,
  //   label: 'Add a summary',
  //   value: 'summarize',
  //   onSelect: ({ editor }) => {
  //     void editor.getApi(AIChatPlugin).aiChat.submit({
  //       mode: 'insert',
  //       prompt: {
  //         default: 'Summarize {editor}',
  //         selecting: 'Summarize',
  //       },
  //     });
  //   },
  // },
  tryAgain: {
    icon: <CornerUpLeft />,
    label: 'Try again',
    value: 'tryAgain',
    onSelect: ({ editor }) => {
      void editor.getApi(AIChatPlugin).aiChat.reload();
    },
  },
} satisfies Record<
  string,
  {
    icon: React.ReactNode;
    label: string;
    value: string;
    component?: React.ComponentType<{ menuState: EditorChatState }>;
    filterItems?: boolean;
    items?: { label: string; value: string }[];
    shortcut?: string;
    onSelect?: ({
      aiEditor,
      editor,
    }: {
      aiEditor: SlateEditor;
      editor: PlateEditor;
    }) => void;
  }
>;

const menuStateItems: Record<
  EditorChatState,
  {
    items: (typeof aiChatItems)[keyof typeof aiChatItems][];
    heading?: string;
  }[]
> = {
  cursorCommand: [
    {
      items: [
        aiChatItems.generateOpportunityDescription,
        // aiChatItems.generateMarkdownSample,
        aiChatItems.continueWrite,
        // aiChatItems.summarize,
        // aiChatItems.explain,
      ],
    },
  ],
  cursorSuggestion: [
    {
      items: [aiChatItems.accept, aiChatItems.discard, aiChatItems.tryAgain],
    },
  ],
  selectionCommand: [
    {
      items: [
        aiChatItems.improveWriting,
        // aiChatItems.emojify,
        aiChatItems.makeLonger,
        aiChatItems.makeShorter,
        aiChatItems.fixSpelling,
        aiChatItems.simplifyLanguage,
      ],
    },
  ],
  selectionSuggestion: [
    {
      items: [
        aiChatItems.replace,
        aiChatItems.insertBelow,
        aiChatItems.discard,
        aiChatItems.tryAgain,
      ],
    },
  ],
};

export const AIMenuItems = ({
  setValue,
}: {
  setValue: (value: string) => void;
}) => {
  const editor = useEditorRef();
  const { messages } = usePluginOption(AIChatPlugin, 'chat');
  const aiEditor = usePluginOption(AIChatPlugin, 'aiEditor')!;
  const isSelecting = useIsSelecting();

  // Get context to determine which menu items to show
  const context = editor.getOption({ key: 'opportunityContext' }, 'context');
  const fieldType = context?.fieldType;

  const menuState = React.useMemo(() => {
    if (messages && messages.length > 0) {
      return isSelecting ? 'selectionSuggestion' : 'cursorSuggestion';
    }

    return isSelecting ? 'selectionCommand' : 'cursorCommand';
  }, [isSelecting, messages]);

  const menuGroups = React.useMemo(() => {
    let items = menuStateItems[menuState];

    // Modify items based on field type context
    if (fieldType === 'question' || fieldType === 'guideline') {
      // For resource questions, show different cursor command items
      if (menuState === 'cursorCommand') {
        const resourceQuestionItems = [];

        if (fieldType === 'question') {
          resourceQuestionItems.push(aiChatItems.generateQuestion);
        } else if (fieldType === 'guideline') {
          resourceQuestionItems.push(aiChatItems.generateGuideline);
        }

        resourceQuestionItems.push(
          // aiChatItems.generateMarkdownSample,
          aiChatItems.continueWrite
        );

        items = [
          {
            items: resourceQuestionItems,
          },
        ];
      }
      // Keep other menu states (selectionCommand, suggestions) as they are
    }

    return items;
  }, [menuState, fieldType]);

  React.useEffect(() => {
    if (menuGroups.length > 0 && menuGroups[0].items.length > 0) {
      setValue(menuGroups[0].items[0].value);
    }
  }, [menuGroups, setValue]);

  return (
    <>
      {menuGroups.map((group, index) => (
        <CommandGroup key={index} heading={group.heading}>
          {group.items.map((menuItem) => (
            <CommandItem
              key={menuItem.value}
              className="[&_svg]:text-muted-foreground"
              value={menuItem.value}
              onSelect={() => {
                menuItem.onSelect?.({
                  aiEditor,
                  editor: editor,
                });
              }}
            >
              {menuItem.icon}
              <span>{menuItem.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      ))}
    </>
  );
};
