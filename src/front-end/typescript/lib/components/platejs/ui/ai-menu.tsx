'use client';

import * as React from 'react';

import {
  AIChatPlugin,
  AIPlugin,
  useEditorChat,
  useLastAssistantMessage,
} from '@platejs/ai/react';
import { BlockSelectionPlugin, useIsSelecting } from '@platejs/selection/react';
import { Command as CommandPrimitive } from 'cmdk';
import {
  Album,
  BadgeHelp,
  BookOpenCheck,
  Check,
  CornerUpLeft,
  FeatherIcon,
  ListEnd,
  ListMinus,
  ListPlus,
  Loader2Icon,
  PauseIcon,
  PenLine,
  SmileIcon,
  Wand,
  X,
} from 'lucide-react';
import { type NodeEntry, type SlateEditor, isHotkey, NodeApi } from 'platejs';
import { useEditorPlugin, useHotkeys, usePluginOption } from 'platejs/react';
import { type PlateEditor, useEditorRef } from 'platejs/react';

import { Button } from './button';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from './command';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from './popover';
import { cn } from './utils';
import { useChat } from 'src/front-end/typescript/lib/components/platejs/components/editor/use-chat';
import { MARKETPLACE_AI_URL } from '../../../../config';
import { TWUServiceArea } from 'shared/lib/resources/opportunity/team-with-us';
import { twuServiceAreaToTitleCase } from 'front-end/lib/pages/opportunity/team-with-us/lib';

import { AIChatEditor } from './ai-chat-editor';

export function AIMenu() {
  const { api, editor } = useEditorPlugin(AIChatPlugin);
  const open = usePluginOption(AIChatPlugin, 'open');
  const mode = usePluginOption(AIChatPlugin, 'mode');
  const streaming = usePluginOption(AIChatPlugin, 'streaming');
  const isSelecting = useIsSelecting();

  const [value, setValue] = React.useState('');

  const chat = useChat(); // editor.id todo: add editor.id to useChat

  const { input, messages, setInput, status } = chat;
  const [anchorElement, setAnchorElement] = React.useState<HTMLElement | null>(
    null
  );

  const content = useLastAssistantMessage()?.content;

  React.useEffect(() => {
    // console.log('streaming', streaming);
    // if (streaming) {
    const anchor = api.aiChat.node({ anchor: true });
    setTimeout(() => {
      console.log("anchor", anchor);
      if (!anchor) return;
      const anchorDom = editor.api.toDOMNode(anchor![0])!;
      setAnchorElement(anchorDom);
    }, 0);
    // }
  }, [streaming]);

  const setOpen = (open: boolean) => {
    console.log("setOpen", open, api.aiChat);
    if (open) {
      api.aiChat.show();
    } else {
      api.aiChat.hide();
    }
  };

  const show = (anchorElement: HTMLElement) => {
    console.log("show", anchorElement);
    setAnchorElement(anchorElement);
    setOpen(true);
  };

  useEditorChat({
    chat,
    onOpenBlockSelection: (blocks: NodeEntry[]) => {
      console.log("onOpenBlockSelection");
      show(editor.api.toDOMNode(blocks.at(-1)![0])!);
    },
    onOpenChange: (open) => {
      console.log('onOpenChange', open);
      if (!open) {
        setAnchorElement(null);
        setInput('');
      }
    },
    onOpenCursor: () => {
      console.log("onOpenCursor");
      const [ancestor] = editor.api.block({ highest: true })!;

      console.log("onOpenCursor", editor.api.isAt({ end: true }), editor.api.isEmpty(ancestor));
      if (!editor.api.isAt({ end: true }) && !editor.api.isEmpty(ancestor)) {
        console.log('condition met')
        editor
          .getApi(BlockSelectionPlugin)
          .blockSelection.set(ancestor.id as string);
      }

      show(editor.api.toDOMNode(ancestor)!);
    },
    onOpenSelection: () => {
      console.log("onOpenSelection");
      show(editor.api.toDOMNode(editor.api.blocks().at(-1)![0])!);
    },
  });

  useHotkeys('esc', () => {
    api.aiChat.stop();

    // remove when you implement the route /api/ai/command
    chat._abortFakeStream();
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  if (isLoading && mode === 'insert') {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverAnchor virtualRef={{ current: anchorElement! }} />

      <PopoverContent
        className="tw:border-none tw:bg-transparent tw:p-0 tw:shadow-none"
        style={{
          width: anchorElement?.offsetWidth,
        }}
        onEscapeKeyDown={(e) => {
          e.preventDefault();

          api.aiChat.hide();
        }}
        align="center"
        side="bottom"
      >
        <Command
          className="tw:w-full tw:rounded-lg tw:border tw:shadow-md"
          value={value}
          onValueChange={setValue}
        >
          {mode === 'chat' && isSelecting && content && (
            <AIChatEditor content={content} />
          )}

          {isLoading ? (
            <div className="tw:flex tw:grow tw:items-center tw:gap-2 tw:p-2 tw:text-sm tw:text-muted-foreground tw:select-none">
              <Loader2Icon className="tw:size-4 tw:animate-spin" />
              {messages.length > 1 ? 'Editing...' : 'Thinking...'}
            </div>
          ) : (
            <CommandPrimitive.Input
              className={cn(
                "tw:flex tw:h-9 tw:w-full tw:min-w-0 tw:border-input tw:bg-transparent tw:px-3 tw:py-1 tw:text-base tw:transition-[color,box-shadow] tw:outline-none tw:placeholder:text-muted-foreground tw:md:text-sm tw:dark:bg-input/30",
                "tw:aria-invalid:border-destructive tw:aria-invalid:ring-destructive/20 tw:dark:aria-invalid:ring-destructive/40",
                "tw:border-b tw:focus-visible:ring-transparent"
              )}
              value={input}
              onKeyDown={(e) => {
                if (isHotkey('backspace')(e) && input.length === 0) {
                  e.preventDefault();
                  api.aiChat.hide();
                }
                if (isHotkey("enter")(e) && !e.shiftKey && !value) {
                  e.preventDefault();
                  const context = editor.getOption(
                    { key: "opportunityContext" },
                    "context"
                  );
                  const fieldType = context?.fieldType;

                  if (
                    context &&
                    (fieldType === "question" || fieldType === "guideline")
                  ) {
                    // For resource-questions context, append the same context markers that the special menu items use
                    const generationContext = {
                      title: context.title || "",
                      teaser: context.teaser || "",
                      description: context.description || "",
                      location: context.location || "",
                      remoteOk: context.remoteOk || false,
                      remoteDesc: context.remoteDesc || "",
                      resources: context.resources || []
                    };

                    let contextualPrompt = "";
                    if (fieldType === "question") {
                      const existingQuestions = context.existingQuestions || [];
                      contextualPrompt = `__USER_PROMPT_START__${input}__USER_PROMPT_END__
__GENERATE_QUESTION__
__CONTEXT_START__${JSON.stringify(generationContext)}__CONTEXT_END__
__EXISTING_QUESTIONS_START__${JSON.stringify(
                        existingQuestions
                      )}__EXISTING_QUESTIONS_END__`;
                    } else if (fieldType === "guideline") {
                      const currentQuestionText =
                        context.currentQuestionText || "";
                      contextualPrompt = `__USER_PROMPT_START__${input}__USER_PROMPT_END__
__GENERATE_GUIDELINE__
__CONTEXT_START__${JSON.stringify(generationContext)}__CONTEXT_END__
__QUESTION_TEXT_START__${currentQuestionText}__QUESTION_TEXT_END__`;
                    }

                    void api.aiChat.submit({
                      prompt: contextualPrompt
                    });
                  } else {
                    // For non-resource-questions context, just use the regular prompt
                    void api.aiChat.submit({
                      prompt: input
                    });
                  }
                }
              }}
              onValueChange={setInput}
              placeholder="Ask AI anything..."
              data-plate-focus
              autoFocus
            />
          )}

          {!isLoading && (
            <CommandList>
              <AIMenuItems setValue={setValue} />
            </CommandList>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

type EditorChatState =
  | 'cursorCommand'
  | 'cursorSuggestion'
  | 'selectionCommand'
  | 'selectionSuggestion';

const aiChatItems = {
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
  emojify: {
    icon: <SmileIcon />,
    label: 'Emojify',
    value: 'emojify',
    onSelect: ({ editor }) => {
      void editor.getApi(AIChatPlugin).aiChat.submit({
        prompt: 'Emojify',
      });
    },
  },
  explain: {
    icon: <BadgeHelp />,
    label: 'Explain',
    value: 'explain',
    onSelect: ({ editor }) => {
      void editor.getApi(AIChatPlugin).aiChat.submit({
        prompt: {
          default: 'Explain {editor}',
          selecting: 'Explain',
        },
      });
    },
  },
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
            prompt += `${result.metadata.full_description}\n`;
          });
          prompt += '\n--- End of Reference Material ---\n';
        }

        console.log('prompt', prompt);

        void editor.getApi(AIChatPlugin).aiChat.submit({
          prompt,
        });

      } catch (error) {
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
      /** format: 'none'  Fix insert table */
      void editor.getTransforms(AIChatPlugin).aiChat.insertBelow(aiEditor, { format: 'none' });
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
  summarize: {
    icon: <Album />,
    label: 'Add a summary',
    value: 'summarize',
    onSelect: ({ editor }) => {
      void editor.getApi(AIChatPlugin).aiChat.submit({
        mode: 'insert',
        prompt: {
          default: 'Summarize {editor}',
          selecting: 'Summarize',
        },
      });
    },
  },
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
        aiChatItems.continueWrite,
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
              className="tw:[&_svg]:text-muted-foreground"
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

export function AILoadingBar() {
  const chat = usePluginOption(AIChatPlugin, 'chat');
  const mode = usePluginOption(AIChatPlugin, 'mode');

  const { status } = chat;

  const { api } = useEditorPlugin(AIChatPlugin);

  const isLoading = status === 'streaming' || status === 'submitted';

  const visible = isLoading && mode === 'insert';

  if (!visible) return null;

  return (
    <div
      className={cn(
        "tw:absolute tw:bottom-4 tw:left-1/2 tw:z-10 tw:flex tw:-translate-x-1/2 tw:items-center tw:gap-3 tw:rounded-md tw:border tw:border-border tw:bg-muted tw:px-3 tw:py-1.5 tw:text-sm tw:text-muted-foreground tw:shadow-md tw:transition-all tw:duration-300"
      )}
    >
      <span className="tw:h-4 tw:w-4 tw:animate-spin tw:rounded-full tw:border-2 tw:border-muted-foreground tw:border-t-transparent" />
      <span>{status === 'submitted' ? 'Thinking...' : 'Writing...'}</span>
      <Button
        size="sm"
        variant="ghost"
        className="tw:flex tw:items-center tw:gap-1 tw:text-xs"
        onClick={() => api.aiChat.stop()}
      >
        <PauseIcon className="tw:h-4 tw:w-4" />
        Stop
        <kbd className="tw:ml-1 tw:rounded tw:bg-border tw:px-1 tw:font-mono tw:text-[10px] tw:text-muted-foreground tw:shadow-sm">
          Esc
        </kbd>
      </Button>
    </div>
  );
}
