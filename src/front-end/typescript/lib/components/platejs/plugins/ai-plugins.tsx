import * as React from "react";

import type { AIChatPluginConfig } from "@udecode/plate-ai/react";

import { PathApi, TElement } from "@udecode/plate";
import { Editor } from "slate";
import { streamInsertChunk, withAIBatch } from "@udecode/plate-ai";
import {
  AIChatPlugin,
  AIPlugin,
  CopilotPlugin,
  useChatChunk
} from "@udecode/plate-ai/react";
import { usePluginOption } from "@udecode/plate/react";

import { markdownPlugin } from "./markdown-plugin";
import { AILoadingBar } from "../ui/ai-loading-bar";
import { AIMenu } from "../ui/ai-menu";

import { cursorOverlayPlugin } from "./cursor-overlay-plugin";
import { serializeMd, stripMarkdown } from "@udecode/plate-markdown";
import { GhostText } from "../ghost-text";

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

    // Smart approach: use plain text cursor position to find location in markdown
    // if (fullSerializedContent && textBefore !== undefined) {
    //   // Get the plain text version for position mapping
    //   const plainTextContent = editor.children
    //     .map((node: any) => Editor.string(editor, [node]))
    //     .join('\n\n');

    //   // Find where to insert cursor in markdown by matching plain text position
    //   const plainTextBeforeLength = textBefore.length;

    //   // Convert markdown to plain text and find the position
    //   const markdownLines = fullSerializedContent.split('\n');
    //   const plainLines = plainTextContent.split('\n\n');

    //   let markdownPosition = 0;
    //   let plainPosition = 0;

    //   // Walk through the content to find the corresponding position
    //   for (let i = 0; i < markdownLines.length; i++) {
    //     const markdownLine = markdownLines[i];
    //     const plainLine = stripMarkdown(markdownLine);

    //     if (plainPosition + plainLine.length >= plainTextBeforeLength) {
    //       // Found the line where cursor should be
    //       const offsetInLine = plainTextBeforeLength - plainPosition;
    //       markdownPosition += offsetInLine;
    //       break;
    //     }

    //     plainPosition += plainLine.length + (i < plainLines.length - 1 ? 2 : 0); // +2 for \n\n between blocks
    //     markdownPosition += markdownLine.length + 1; // +1 for \n
    //   }

    //   // Insert cursor marker at the calculated position
    //   const finalContent = fullSerializedContent.slice(0, markdownPosition) +
    //                       "<CURSOR_HERE>" +
    //                       fullSerializedContent.slice(markdownPosition);

    //   console.log("🔍 [Cursor Detection] Final content with cursor:", JSON.stringify(finalContent));
    //   return finalContent;
    // }

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

const systemCommon = `\
You are an advanced AI-powered note-taking assistant, designed to enhance productivity and creativity in note management.
Respond directly to user prompts with clear, concise, and relevant content.

Rules:
- <Document> is the entire note the user is working on.
- <Reminder> is a reminder of how you should reply to INSTRUCTIONS.
- Anything else is the user prompt.
- For INSTRUCTIONS: Follow the <Reminder> exactly. Provide ONLY the content to be inserted or replaced. No explanations or comments.
- CRITICAL: when asked to write in markdown, do not start with \`\`\`markdown.
- CRITICAL: NEVER provide explanations or comments. Only output the text that's ready to be inserted or replaced.
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
Provide ONLY the text to replace <Selection>. No explanations.
Ensure it fits seamlessly within <Block>. If <Block> is empty, write ONE random sentence.
NEVER write <Block> or <Selection>.
</Reminder>
{prompt} about <Selection>`;

const userBlockSelecting = `<Reminder>
Provide ONLY the content to replace the entire <Selection>. No explanations.
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

export const aiPlugins = [
  cursorOverlayPlugin,
  markdownPlugin,
  CopilotPlugin.configure(({ api }) => ({
    options: {
      getPrompt: ({ editor }) => {
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
  AIPlugin,
  AIChatPlugin.configure({
    options: {
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
      afterContainer: () => <AILoadingBar />,
      afterEditable: () => <AIMenu />
    }
  }).extend({
    useHooks: ({ editor, getOption }) => {
      const mode = usePluginOption(
        { key: "aiChat" } as AIChatPluginConfig,
        "mode"
      );

      // const insertionPathRef = React.useRef<any>(null);
      const shouldInsertRef = React.useRef<boolean>(false);

      useChatChunk({
        onChunk: ({ chunk, isFirst, nodes }) => {
          // console.log("onChunk", chunk, isFirst, nodes);
          if (isFirst && mode == "insert") {
            // console.log('would be inserting nodes FIRST');
            shouldInsertRef.current = true;
            // Record the position where the AI node should be inserted
            // insertionPathRef.current = PathApi.next(editor.selection!.focus.path.slice(0, 1));
            // console.log('setting insertionPathRef.current', insertionPathRef.current);
            // console.log('from: ', editor.selection!.focus.path.slice(0, 1));
            // console.log('from2: ', editor.selection!.focus.path);

            // editor.tf.withoutSaving(() => {
            //   console.log('inserting nodes FIRST without saving');
            //   editor.tf.insertNodes(
            //     {
            //       children: [{ text: "" }],
            //       type: AIChatPlugin.key
            //     },
            //     {
            //       at: PathApi.next(editor.selection!.focus.path.slice(0, 1))
            //     }
            //   );
            // });
            editor.setOption(AIChatPlugin, "streaming", true);
          }

          if (mode === "insert" && nodes.length > 0) {
            // console.log('inserting nodes', nodes);
            withAIBatch(
              editor,
              () => {
                // console.log('inserting nodes withAIBatch');
                if (!getOption("streaming")) {
                  // console.log('streaming is false');
                  return;
                }
                editor.tf.withScrolling(() => {
                  console.log(
                    "inserting nodes withAIBatch withScrolling: ",
                    chunk
                  );

                  // Helper function to apply formatting rules
                  const applyFormattingRules = (text: string): string => {
                    let cleaned = text;
                    console.log("before cleaning: ", cleaned);

                    // Rule 1: Remove trailing spaces before newlines
                    cleaned = cleaned.replace(/ +\n/g, "\n");
                    console.log("after cleaning 1: ", cleaned);

                    // Rule 2: Ensure double newlines after bold headers (like "**Description:**\n")
                    // Look for patterns like **text:** followed by single newline
                    cleaned = cleaned.replace(/(\*\*[^*\n]+\*\*)\n/g, "$1\n\n");
                    console.log("after cleaning 2: ", cleaned);

                    // Rule 3: Remove trailing spaces at the end of list items
                    // Match list items (- or * or numbers) and remove trailing spaces before newlines
                    cleaned = cleaned.replace(
                      /^(\s*[-*]|\s*\d+\.)\s*(.+?) +\n/gm,
                      "$1 $2\n"
                    );
                    console.log("after cleaning 3: ", cleaned);

                    return cleaned;
                  };

                  // Apply formatting rules to the chunk before inserting
                  const cleanedChunk = applyFormattingRules(chunk);

                  // Validate editor state before streamInsertChunk to prevent crashes
                  if (
                    !editor.selection ||
                    !editor.selection.focus ||
                    !editor.selection.focus.path
                  ) {
                    console.error(
                      "❌ [AI Streaming] Invalid editor selection - aborting streamInsertChunk"
                    );
                    return;
                  }

                  try {
                    streamInsertChunk(editor, cleanedChunk, {
                      textProps: {
                        ai: true
                      }
                    });
                  } catch (error) {
                    console.error(
                      "❌ [AI Streaming] streamInsertChunk failed:",
                      error
                    );
                    console.error("❌ [AI Streaming] Editor state:", {
                      hasSelection: !!editor.selection,
                      selectionPath: editor.selection?.focus?.path,
                      chunk: cleanedChunk
                    });
                    // Stop streaming to prevent further errors
                    // editor.setOption(AIChatPlugin, "streaming", false);
                  }
                });
              },
              { split: isFirst }
            );
          }
        },
        onFinish: () => {
          // if (insertionPathRef.current) {
          if (shouldInsertRef.current) {
            // console.log('preparing to insert ai node');
            editor.tf.withoutSaving(() => {
              // console.log('inserting AI node at recorded position: ', insertionPathRef.current);
              // console.log('inserting ai node, editor: ', editor);
              let atPosition;
              try {
                atPosition = PathApi.next(
                  editor.selection!.focus.path.slice(0, 1)
                );
              } catch (error) {
                console.warn("error getting atPosition: ", error);
                atPosition = [0];
              }
              // console.log('atPosition: ', atPosition);
              editor.tf.insertNodes(
                {
                  children: [{ text: "" }],
                  type: AIChatPlugin.key
                },
                {
                  at: atPosition
                }
              );
            });
          }
          // }
          // console.log('onFinish');
          editor.setOption(AIChatPlugin, "streaming", false);
          editor.setOption(AIChatPlugin, "_blockChunks", "");
          editor.setOption(AIChatPlugin, "_blockPath", null);
          // insertionPathRef.current = null;
          shouldInsertRef.current = false;
        }
      });
    }
  })
] as const;
