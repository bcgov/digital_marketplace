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

      try {
        throw new Error('test');

        // First, search for similar opportunities using RAG
        const searchRequest = {
          title: title,
          teaser: teaser,
          limit: 3
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

        // Add similar opportunities context if found
        const results = ragSearchResults.results;
        if (results && results.length > 0) {
          prompt += '\n--- Similar Opportunities for Reference ---\n';
          results.forEach((result: any, index: number) => {
            prompt += `\nSimilar Opportunity ${index + 1}:\n`;
            prompt += `Title: ${result.metadata.title}\n`;
            prompt += `Teaser: ${result.metadata.teaser}\n`;
            prompt += `Description: ${result.content.substring(0, 500)}...\n`;
          });
          prompt += '\n--- End of Reference Material ---\n';
        }

        // prompt += '\nPlease create a detailed description that expands on this information, suitable for a professional opportunity posting. Include relevant context, background information, and what the opportunity entails. If reference material is provided, use it for inspiration but create unique, original content.';
        prompt += '\nGenerate a very short, two sentence description of the opportunity. Use the title and teaser to create a concise summary.';

        void editor.getApi(AIChatPlugin).aiChat.submit({
          prompt,
        });

      } catch (error) {
        console.error('RAG search failed, falling back to basic prompt:', error);
        throw error;

        // Fallback to original behavior if RAG fails
        let prompt = 'Generate a comprehensive opportunity description based on the following information:\n\n';

        if (title) {
          prompt += `Title: ${title}\n`;
        }
        if (teaser) {
          prompt += `Teaser: ${teaser}\n`;
        }

        prompt += '\nPlease create a detailed description that expands on this information, suitable for a professional opportunity posting. Include relevant context, background information, and what the opportunity entails.';
        // prompt += '\nGenerate a very short, two sentence description of the opportunity. Use the title and teaser to create a concise summary.';

        void editor.getApi(AIChatPlugin).aiChat.submit({
          prompt,
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
        aiChatItems.generateMarkdownSample,
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

  const menuState = React.useMemo(() => {
    if (messages && messages.length > 0) {
      return isSelecting ? 'selectionSuggestion' : 'cursorSuggestion';
    }

    return isSelecting ? 'selectionCommand' : 'cursorCommand';
  }, [isSelecting, messages]);

  const menuGroups = React.useMemo(() => {
    const items = menuStateItems[menuState];

    return items;
  }, [menuState]);

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
