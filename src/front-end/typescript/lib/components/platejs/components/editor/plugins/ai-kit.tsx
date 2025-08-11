"use client";

import * as React from "react";

import type { AIChatPluginConfig } from "@platejs/ai/react";
import type { UseChatOptions } from "ai/react";
import type { TElement } from "platejs";

import { streamInsertChunk, withAIBatch } from "@platejs/ai";
import { AIChatPlugin, AIPlugin, CopilotPlugin, useChatChunk } from "@platejs/ai/react";
import { getPluginType, KEYS, PathApi } from "platejs";
import { usePluginOption } from "platejs/react";
import { Editor } from "slate";
import { serializeMd, stripMarkdown } from "@platejs/markdown";

import { AILoadingBar, AIMenu } from "../../../ui/ai-menu";
import { AIAnchorElement, AILeaf } from "../../../ui/ai-node";

import { CursorOverlayKit } from "./cursor-overlay-kit";
import { MarkdownKit } from "./markdown-kit";

// Helper function to serialize editor content with cursor position marker
const getEditorContentWithCursor = (editor: any) => {
  console.log("🔍 [Cursor Detection] Starting cursor content serialization");

  try {
    // Get the current selection/cursor position
    const selection = editor.selection;
    if (!selection) {
      console.log("🔍 [Cursor Detection] No selection found, using fallback");
      return "{editor}";
    }

    console.log("🔍 [Cursor Detection] Selection found:", selection);

    // Use the anchor point (cursor position) for collapsed selections
    const { anchor } = selection;
    console.log("🔍 [Cursor Detection] Cursor anchor:", anchor);

    // First, get the full serialized content for context
    let fullSerializedContent;
    try {
      if (editor.api && editor.api.markdown && editor.api.markdown.serialize) {
        fullSerializedContent = editor.api.markdown.serialize();
        console.log(
          "🔍 [Cursor Detection] Full serialized content:",
          JSON.stringify(fullSerializedContent)
        );
      } else {
        // Fallback to plain text
        fullSerializedContent = editor.children
          .map((node: any) => Editor.string(editor, [node]))
          .join("\n\n");
      }
    } catch {
      console.warn(
        "🔍 [Cursor Detection] Serialization failed, using Editor.string fallback"
      );
      fullSerializedContent = editor.children
        .map((node: any) => Editor.string(editor, [node]))
        .join("\n\n");
    }

    // Get text before cursor using Editor.string with a range
    let textBefore = "";
    try {
      // Create range from start of document to cursor position
      const beforeRange = {
        anchor: { path: [0, 0], offset: 0 },
        focus: anchor
      };
      textBefore = Editor.string(editor, beforeRange);
      console.log(
        "🔍 [Cursor Detection] Text before cursor:",
        JSON.stringify(textBefore)
      );
    } catch (error) {
      console.warn(
        "🔍 [Cursor Detection] Error getting text before cursor:",
        error
      );
      textBefore = "";
    }

    // Get text after cursor using Editor.string with a range
    let textAfter = "";
    try {
      // Find the end position of the document
      const lastNode = editor.children[editor.children.length - 1];
      const lastPath = [editor.children.length - 1];

      // Get the end position of the last node
      let endOffset = 0;
      if (lastNode && lastNode.children) {
        const lastChild = lastNode.children[lastNode.children.length - 1];
        endOffset = lastChild && lastChild.text ? lastChild.text.length : 0;
      }

      const afterRange = {
        anchor: anchor,
        focus: {
          path: [
            ...lastPath,
            lastNode.children ? lastNode.children.length - 1 : 0
          ],
          offset: endOffset
        }
      };
      textAfter = Editor.string(editor, afterRange);
      console.log(
        "🔍 [Cursor Detection] Text after cursor:",
        JSON.stringify(textAfter)
      );
    } catch (error) {
      console.warn(
        "🔍 [Cursor Detection] Error getting text after cursor:",
        error
      );
      textAfter = "";
    }

    // Fallback: Combine plain text with cursor marker
    const finalContent = textBefore + "<CURSOR_HERE>" + textAfter;

    console.log(
      "🔍 [Cursor Detection] Final content with cursor:",
      JSON.stringify(finalContent)
    );

    // If the Editor.string approach didn't work well, fall back to the full serialized content
    if (!textBefore && !textAfter && fullSerializedContent) {
      console.log(
        "🔍 [Cursor Detection] Using fallback with full serialized content"
      );
      return fullSerializedContent + "\n<CURSOR_HERE>";
    }

    return finalContent;
  } catch (error) {
    console.warn(
      "🔍 [Cursor Detection] Error getting editor content with cursor:",
      error
    );
    return "{editor}";
  }
};

// Ghost text component for copilot suggestions
// const GhostText = () => {
//   return (
//     <span
//       className="pointer-events-none select-none text-muted-foreground opacity-50"
//       contentEditable={false}
//     />
//   );
// };

export const aiChatPlugin = AIChatPlugin.extend({
  options: {
    chatOptions: {
      api:
      (process.env.VITE_AI_SERVICE_URL || "http://localhost:5000") +
      "/api/ai/command",
      body: {}
    } as UseChatOptions,
    promptTemplate: ({ isBlockSelecting, isSelecting }) => {
      return isBlockSelecting
        ? PROMPT_TEMPLATES.userBlockSelecting
        : isSelecting
        ? PROMPT_TEMPLATES.userSelecting
        : PROMPT_TEMPLATES.userDefault;
    },
    systemTemplate: ({ isBlockSelecting, isSelecting, editor }) => {
      console.log("🎯 [AI System Template] Processing template for:", {
        isBlockSelecting,
        isSelecting,
        hasEditor: !!editor,
        editorId: editor?.id
      });

      // Create custom system template with cursor position
      const baseTemplate = isBlockSelecting
        ? PROMPT_TEMPLATES.systemBlockSelecting
        : isSelecting
        ? PROMPT_TEMPLATES.systemSelecting
        : PROMPT_TEMPLATES.systemDefault;

      // For non-selecting modes (insert mode), inject cursor position
      if (!isSelecting && !isBlockSelecting) {
        console.log(
          "🎯 [AI System Template] Injecting cursor position for insert mode"
        );
        // Get the editor content with cursor marker
        const editorContentWithCursor = getEditorContentWithCursor(editor);

        console.log(
          "🎯 [AI System Template] Editor content with cursor:",
          editorContentWithCursor
        );

        // Replace the {editor} placeholder with our enhanced content
        const enhancedTemplate = baseTemplate.replace(
          "{editor}",
          editorContentWithCursor
        );

        return enhancedTemplate;
      }

      console.log(
        "🎯 [AI System Template] Using base template (selection mode)"
      );
      return baseTemplate;
    }
  },
  render: {
    afterContainer: AILoadingBar,
    afterEditable: AIMenu,
    node: AIAnchorElement
  },
  shortcuts: { show: { keys: "mod+j" } },
  useHooks: ({ editor, getOption }) => {
    const mode = usePluginOption(
      { key: KEYS.aiChat } as AIChatPluginConfig,
      "mode"
    );

    // const shouldInsertRef = React.useRef<boolean>(false);

    useChatChunk({
      onChunk: ({ chunk, isFirst, nodes }) => {
        console.log("onChunk", chunk, isFirst, nodes);
        // this was removed
        if (isFirst && mode == "insert") {
          editor.tf.withoutSaving(() => {
            editor.tf.insertNodes(
              {
                children: [{ text: "" }],
                type: getPluginType(editor, KEYS.aiChat)
              },
              {
                at: PathApi.next(editor.selection!.focus.path.slice(0, 1))
              }
            );
          });
          console.log('would be inserting nodes FIRST');
          // shouldInsertRef.current = true;
          editor.setOption(AIChatPlugin, "streaming", true);
        }

        if (mode === "insert" && nodes.length > 0) {
          console.log('inserting nodes', nodes);
          withAIBatch(
            editor,
            () => {
              // this was removed
              if (!getOption("streaming")) return;
              // console.log('inserting nodes withAIBatch');
              // if (!getOption("streaming")) {
              //   console.log('streaming is false');
              //   return;
              // }
              // this was removed
              editor.tf.withScrolling(() => {
                streamInsertChunk(editor, chunk, {
                  textProps: {
                    [getPluginType(editor, KEYS.ai)]: true
                  }
                });
                // console.log(
                //   "inserting nodes withAIBatch withScrolling: ",
                //   chunk
                // );

                // // Helper function to apply formatting rules
                // const applyFormattingRules = (text: string): string => {
                //   let cleaned = text;
                //   console.log("before cleaning: ", cleaned);

                //   // Rule 1: Remove trailing spaces before newlines
                //   cleaned = cleaned.replace(/ +\n/g, "\n");
                //   console.log("after cleaning 1: ", cleaned);

                //   // Rule 2: Ensure double newlines after bold headers (like "**Description:**\n")
                //   // Look for patterns like **text:** followed by single newline
                //   cleaned = cleaned.replace(/(\*\*[^*\n]+\*\*)\n/g, "$1\n\n");
                //   console.log("after cleaning 2: ", cleaned);

                //   // Rule 3: Remove trailing spaces at the end of list items
                //   // Match list items (- or * or numbers) and remove trailing spaces before newlines
                //   cleaned = cleaned.replace(
                //     /^(\s*[-*]|\s*\d+\.)\s*(.+?) +\n/gm,
                //     "$1 $2\n"
                //   );
                //   console.log("after cleaning 3: ", cleaned);

                //   return cleaned;
                // };

                // // Apply formatting rules to the chunk before inserting
                // const cleanedChunk = applyFormattingRules(chunk);

                // // Validate editor state before streamInsertChunk to prevent crashes
                // if (
                //   !editor.selection ||
                //   !editor.selection.focus ||
                //   !editor.selection.focus.path
                // ) {
                //   console.error(
                //     "❌ [AI Streaming] Invalid editor selection - aborting streamInsertChunk"
                //   );
                //   return;
                // }

                // try {
                //   streamInsertChunk(editor, cleanedChunk, {
                //     textProps: {
                //       [getPluginType(editor, KEYS.ai)]: true
                //     }
                //   });
                // } catch (error) {
                //   console.error(
                //     "❌ [AI Streaming] streamInsertChunk failed:",
                //     error
                //   );
                //   console.error("❌ [AI Streaming] Editor state:", {
                //     hasSelection: !!editor.selection,
                //     selectionPath: editor.selection?.focus?.path,
                //     chunk: cleanedChunk
                //   });
                //   // Stop streaming to prevent further errors
                //   // editor.setOption(AIChatPlugin, "streaming", false);
                // }
              });
            },
            { split: isFirst }
          );
        }
      },
      onFinish: () => {
        // if (shouldInsertRef.current) {
        //   console.log('preparing to insert ai node');
        //   editor.tf.withoutSaving(() => {
        //     console.log('inserting AI node at recorded position');
        //     console.log('inserting ai node, editor: ', editor);
        //     let atPosition;
        //     try {
        //       atPosition = PathApi.next(
        //         editor.selection!.focus.path.slice(0, 1)
        //       );
        //     } catch (error) {
        //       console.warn("error getting atPosition: ", error);
        //       atPosition = [0];
        //     }
        //     console.log('atPosition: ', atPosition);
        //     editor.tf.insertNodes(
        //       {
        //         children: [{ text: "" }],
        //         type: getPluginType(editor, KEYS.aiChat)
        //       },
        //       {
        //         at: atPosition
        //       }
        //     );
        //   });
        // }
        // console.log('onFinish');
        editor.setOption(AIChatPlugin, "streaming", false);
        editor.setOption(AIChatPlugin, "_blockChunks", "");
        editor.setOption(AIChatPlugin, "_blockPath", null);
        // shouldInsertRef.current = false;
      }
    });
  }
});

// todo: implement copilot plugin
// Copilot plugin configuration
// export const copilotPlugin = CopilotPlugin.configure(({ api }) => ({
//   options: {
//     getPrompt: ({ editor }) => {
//       const contextEntry = editor.api.block({ highest: true });

//       if (!contextEntry) return "";

//       const prompt = serializeMd(editor, {
//         value: [contextEntry[0] as TElement]
//       });

//       return `Continue the text up to the next punctuation mark:
// """
// ${prompt}
// """`;
//     },
//     completeOptions: {
//       api:
//         (process.env.VITE_AI_SERVICE_URL || "http://localhost:5000") +
//         "/api/ai/copilot",
//       body: {
//         system: `You are an advanced AI writing assistant, similar to VSCode Copilot but for general text. Your task is to predict and generate the next part of the text based on the given context.

// Rules:
// - Continue the text naturally up to the next punctuation mark (., ,, ;, :, ?, or !).
// - Maintain style and tone. Don't repeat given text.
// - For unclear context, provide the most likely continuation.
// - Handle code snippets, lists, or structured text if needed.
// - Don't include """ in your response.
// - CRITICAL: Always end with a punctuation mark.
// - CRITICAL: Avoid starting a new block. Do not use block formatting like >, #, 1., 2., -, etc. The suggestion should continue in the same block as the context.
// - If no context is provided or you can't generate a continuation, return "0" without explanation.`
//       },
//       onError: () => {
//         api.copilot.setBlockSuggestion({
//           text: stripMarkdown("This is a mock suggestion.")
//         });
//       },
//       onFinish: (_, completion) => {
//         if (completion === "0") return;

//         api.copilot.setBlockSuggestion({
//           text: stripMarkdown(completion)
//         });
//       }
//     },
//     debounceDelay: 500,
//     renderGhostText: GhostText
//   },
//   shortcuts: {
//     accept: { keys: "tab" },
//     acceptNextWord: { keys: "mod+right" },
//     reject: { keys: "escape" },
//     triggerSuggestion: { keys: "ctrl+space" }
//   }
// }));

export const AIKit = [
  ...CursorOverlayKit,
  ...MarkdownKit,
  // copilotPlugin, // todo: implement
  AIPlugin.withComponent(AILeaf),
  aiChatPlugin
];

const systemCommon = `\
You are an advanced AI-powered note-taking assistant, designed to enhance productivity and creativity in note management.
Respond directly to user prompts with clear, concise, and relevant content. Maintain a neutral, helpful tone.

Rules:
- <Document> is the entire note the user is working on.
- <Reminder> is a reminder of how you should reply to INSTRUCTIONS. It does not apply to questions.
- Anything else is the user prompt.
- Your response should be tailored to the user's prompt, providing precise assistance to optimize note management.
- For INSTRUCTIONS: Follow the <Reminder> exactly. Provide ONLY the content to be inserted or replaced. No explanations or comments.
- For QUESTIONS: Provide a helpful and concise answer. You may include brief explanations if necessary.
- CRITICAL: DO NOT remove or modify the following custom MDX tags: <u>, <callout>, <kbd>, <toc>, <sub>, <sup>, <mark>, <del>, <date>, <span>, <column>, <column_group>, <file>, <audio>, <video> in <Selection> unless the user explicitly requests this change.
- CRITICAL: Distinguish between INSTRUCTIONS and QUESTIONS. Instructions typically ask you to modify or add content. Questions ask for information or clarification.
- CRITICAL: when asked to write in markdown, do not start with \`\`\`markdown.
- CRITICAL: When writing the column, such line breaks and indentation must be preserved.
<column_group>
  <column>
    1
  </column>
  <column>
    2
  </column>
  <column>
    3
  </column>
</column_group>
`;

const systemDefault = `\
${systemCommon}
- <Block> is the current block of text the user is working on.
- Ensure your output can seamlessly fit into the existing <Block> structure.
- <CURSOR_HERE> marks the position where the user's cursor is located in the document.
- When inserting content, consider the cursor position as the insertion point.

<Block>
{block}
</Block>
<Document>
{editor}
</Document>
`;

const systemSelecting = `\
${systemCommon}
- <Block> is the block of text containing the user's selection, providing context.
- Ensure your output can seamlessly fit into the existing <Block> structure.
- <Selection> is the specific text the user has selected in the block and wants to modify or ask about.
- Consider the context provided by <Block>, but only modify <Selection>. Your response should be a direct replacement for <Selection>.
<Block>
{block}
</Block>
<Selection>
{selection}
</Selection>
<Document>
{editor}
</Document>
`;

const systemBlockSelecting = `\
${systemCommon}
- <Selection> represents the full blocks of text the user has selected and wants to modify or ask about.
- Your response should be a direct replacement for the entire <Selection>.
- Maintain the overall structure and formatting of the selected blocks, unless explicitly instructed otherwise.
- CRITICAL: Provide only the content to replace <Selection>. Do not add additional blocks or change the block structure unless specifically requested.
<Selection>
{block}
</Selection>
<Document>
{editor}
</Document>
`;

const userDefault = `<Reminder>
CRITICAL: NEVER write <Block>.
</Reminder>
{prompt}`;
const userSelecting = `<Reminder>
If this is a question, provide a helpful and concise answer about <Selection>.
If this is an instruction, provide ONLY the text to replace <Selection>. No explanations.
Ensure it fits seamlessly within <Block>. If <Block> is empty, write ONE random sentence.
NEVER write <Block> or <Selection>.
</Reminder>
{prompt} about <Selection>`;

const userBlockSelecting = `<Reminder>
If this is a question, provide a helpful and concise answer about <Selection>.
If this is an instruction, provide ONLY the content to replace the entire <Selection>. No explanations.
Maintain the overall structure unless instructed otherwise.
NEVER write <Block> or <Selection>.
</Reminder>
{prompt} about <Selection>`;

export const PROMPT_TEMPLATES = {
  systemBlockSelecting,
  systemDefault,
  systemSelecting,
  userBlockSelecting,
  userDefault,
  userSelecting
};
