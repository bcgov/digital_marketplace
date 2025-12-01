'use client';

import type { TElement } from 'platejs';

import { CopilotPlugin } from '@platejs/ai/react';
import { serializeMd, stripMarkdown } from '@platejs/markdown';

import { GhostText } from 'src/front-end/typescript/lib/components/platejs/ui/ghost-text';

import { MarkdownKit } from './markdown-kit';

export const CopilotKit = [
  ...MarkdownKit,
  CopilotPlugin.configure(({ api }) => ({
    options: {
      getPrompt: ({ editor }) => {
        console.log('getPrompt');
        const contextEntry = editor.api.block({ highest: true });

        if (!contextEntry) return "";

        const prompt = serializeMd(editor, {
          value: [contextEntry[0] as TElement]
        });

        return `Continue the text up to the next punctuation mark:
"""
${prompt}
"""`;
      },
      completeOptions: {
        api:
          (process.env.VITE_AI_SERVICE_URL || "http://localhost:5000") +
          "/api/ai/copilot",
        body: {
          system: `You are an advanced AI writing assistant, similar to VSCode Copilot but for general text. Your task is to predict and generate the next part of the text based on the given context.

Rules:
- Continue the text naturally up to the next punctuation mark (., ,, ;, :, ?, or !).
- Maintain style and tone. Don't repeat given text.
- For unclear context, provide the most likely continuation.
- Handle code snippets, lists, or structured text if needed.
- Don't include """ in your response.
- CRITICAL: Always end with a punctuation mark.
- CRITICAL: Avoid starting a new block. Do not use block formatting like >, #, 1., 2., -, etc. The suggestion should continue in the same block as the context.
- If no context is provided or you can't generate a continuation, return "0" without explanation.`
        },
        onError: () => {
          api.copilot.setBlockSuggestion({
            text: stripMarkdown("This is a mock suggestion.")
          });
        },
        onFinish: (_, completion) => {
          if (completion === "0") return;

          api.copilot.setBlockSuggestion({
            text: stripMarkdown(completion)
          });
        }
      },
      debounceDelay: 500,
      renderGhostText: GhostText
    },
    shortcuts: {
      accept: { keys: "tab" },
      acceptNextWord: { keys: "mod+right" },
      reject: { keys: "escape" },
      triggerSuggestion: { keys: "ctrl+space" }
    }
  })),
];
