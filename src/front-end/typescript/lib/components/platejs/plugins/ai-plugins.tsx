import * as React from "react";

import type { AIChatPluginConfig } from "@udecode/plate-ai/react";

import { PathApi } from "@udecode/plate";
import { streamInsertChunk, withAIBatch } from "@udecode/plate-ai";
import { AIChatPlugin, AIPlugin, useChatChunk } from "@udecode/plate-ai/react";
import { usePluginOption } from "@udecode/plate/react";

import { markdownPlugin } from "./markdown-plugin";
import { AILoadingBar } from "../ui/ai-loading-bar";
import { AIMenu } from "../ui/ai-menu";

import { cursorOverlayPlugin } from "./cursor-overlay-plugin";

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

    // First, serialize the content normally using PlateJS
    let serializedContent;
    try {
      if (editor.api && editor.api.markdown && editor.api.markdown.serialize) {
        console.log("🔍 [Cursor Detection] Using PlateJS markdown serializer");
        serializedContent = editor.api.markdown.serialize();
        console.log(
          "🔍 [Cursor Detection] Original serialized content:",
          JSON.stringify(serializedContent)
        );
      } else {
        throw new Error("Markdown API not available");
      }
    } catch {
      console.warn(
        "🔍 [Cursor Detection] Markdown serialization failed, using fallback"
      );

      // Fallback: Simple text serialization
      const serializeToText = (nodes: any[]): string => {
        return nodes
          .map((node) => {
            if (node.text !== undefined) {
              return node.text;
            }
            if (node.children) {
              return serializeToText(node.children);
            }
            return "";
          })
          .join("");
      };

      serializedContent = serializeToText(editor.children);
    }

    // Calculate the exact character position in serialized content
    const cursorPath = selection.focus.path;
    const [blockIndex, textNodeIndex, charOffset] = cursorPath;

    console.log(
      "🔍 [Cursor Detection] Cursor path:",
      cursorPath,
      "Block:",
      blockIndex,
      "TextNode:",
      textNodeIndex,
      "Offset:",
      charOffset
    );
    console.log("🔍 [Cursor Detection] Editor children:", editor.children);

    // Calculate character position by iterating through blocks
    let characterPosition = 0;

    for (let i = 0; i < blockIndex && i < editor.children.length; i++) {
      const block = editor.children[i];
      console.log(`🔍 [Cursor Detection] Processing block ${i}:`, block);

      // Get the text content of this block
      const blockText = getBlockText(block);
      console.log(
        `🔍 [Cursor Detection] Block ${i} text:`,
        JSON.stringify(blockText)
      );

      // Add the block text length plus newlines
      characterPosition += blockText.length;

      // Add newlines - PlateJS blocks are separated by double newlines in markdown
      if (i < editor.children.length - 1) {
        characterPosition += 2; // Double newline between blocks
      }

      console.log(
        `🔍 [Cursor Detection] After block ${i}, position:`,
        characterPosition
      );
    }

    // Now add the character offset within the target block
    if (blockIndex < editor.children.length) {
      const targetBlock = editor.children[blockIndex];
      console.log("🔍 [Cursor Detection] Target block:", targetBlock);

      // Special handling for lists where cursor is within a specific list item
      if (
        (targetBlock.type === "ul" || targetBlock.type === "ol") &&
        textNodeIndex !== undefined
      ) {
        console.log("🔍 [Cursor Detection] Handling cursor within list");

        // Calculate text from previous list items
        for (
          let i = 0;
          i < textNodeIndex && i < targetBlock.children.length;
          i++
        ) {
          const listItem = targetBlock.children[i];
          const prefix = targetBlock.type === "ul" ? "* " : `${i + 1}. `;
          const itemText = getBlockText(listItem);
          const fullItemText = prefix + itemText;
          characterPosition += fullItemText.length;
          if (i < targetBlock.children.length - 1) {
            characterPosition += 1; // newline between list items
          }
        }

        // Add the prefix for the current list item
        if (textNodeIndex < targetBlock.children.length) {
          const prefix =
            targetBlock.type === "ul" ? "* " : `${textNodeIndex + 1}. `;
          characterPosition += prefix.length;

          // Add character offset within the current list item's text
          if (charOffset !== undefined) {
            characterPosition += charOffset;
          }
        }
      }
      // Standard handling for non-list blocks
      else if (textNodeIndex !== undefined && charOffset !== undefined) {
        // Add text from previous text nodes in this block
        for (
          let i = 0;
          i < textNodeIndex && i < targetBlock.children.length;
          i++
        ) {
          const textNode = targetBlock.children[i];
          if (textNode.text !== undefined) {
            characterPosition += textNode.text.length;
          }
        }

        // Add the character offset within the current text node
        characterPosition += charOffset;
      } else if (charOffset !== undefined) {
        // Direct character offset in the block
        characterPosition += charOffset;
      } else if (textNodeIndex === 0) {
        // Cursor is at the beginning of the target block (textNodeIndex 0, no charOffset)
        // characterPosition is already correct - the newlines before this block
        // were already added when processing the previous blocks
        // No additional offset needed
      }
      // If no offset, cursor is at the start of the block (position already calculated)
    }

    console.log(
      "🔍 [Cursor Detection] Final character position:",
      characterPosition
    );

    // Insert cursor marker at the calculated position
    const beforeCursor = serializedContent.slice(0, characterPosition);
    const afterCursor = serializedContent.slice(characterPosition);
    const finalContent = beforeCursor + "<CURSOR_HERE>" + afterCursor;

    console.log(
      "🔍 [Cursor Detection] Final content with cursor:",
      JSON.stringify(finalContent)
    );
    return finalContent;
  } catch (error) {
    console.warn(
      "🔍 [Cursor Detection] Error getting editor content with cursor:",
      error
    );
    return "{editor}";
  }
};

// Helper function to get text content from a block, matching markdown serialization
const getBlockText = (block: any): string => {
  if (block.text !== undefined) {
    return block.text;
  }

  if (block.children && Array.isArray(block.children)) {
    // Handle lists specially to match markdown format
    if (block.type === "ul" || block.type === "ol") {
      return block.children
        .map((listItem: any, index: number) => {
          const prefix = block.type === "ul" ? "* " : `${index + 1}. `;
          const itemText = getBlockText(listItem);
          return prefix + itemText;
        })
        .join("\n");
    }

    // Handle list items
    if (block.type === "li") {
      // For list items, just return the text content without prefix (prefix is handled by parent ul/ol)
      return block.children.map((child: any) => getBlockText(child)).join("");
    }

    // For other blocks with children, join the text
    return block.children.map((child: any) => getBlockText(child)).join("");
  }

  return "";
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
- <CURSOR_HERE> marks the APPROXIMATE position where the user's cursor is located in the document.
- If <CURSOR_HERE> appears mid-word (like 'mile<CURSOR_HERE>stones'), do NOT complete the word fragment. Instead, position after the block and insert full sentences. Never output partial words or word completions. Example: If cursor is at 'deliver mile<CURSOR_HERE>stones', move to after 'milestones' and insert complete sentences, never just 'stones'.
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

export const aiPlugins = [
  cursorOverlayPlugin,
  markdownPlugin,
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
                  // console.log('inserting nodes withAIBatch withScrolling');
                  streamInsertChunk(editor, chunk, {
                    textProps: {
                      ai: true
                    }
                  });
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
