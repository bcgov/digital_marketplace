"use client";

import * as React from "react";

import { type NodeEntry, isHotkey } from "@udecode/plate";
import {
  AIChatPlugin,
  useEditorChat,
  useLastAssistantMessage
} from "@udecode/plate-ai/react";
import {
  BlockSelectionPlugin,
  useIsSelecting
} from "@udecode/plate-selection/react";
import {
  useEditorPlugin,
  useHotkeys,
  usePluginOption
} from "@udecode/plate/react";
import { Command as CommandPrimitive } from "cmdk";
import { Loader2Icon } from "lucide-react";

import { Command, CommandList } from "../ui/command";
import { Popover, PopoverAnchor, PopoverContent } from "../ui/popover";
import { cn } from "../utils";
import { useChat } from "../use-chat";

import { AIChatEditor } from "./ai-chat-editor";
import { AIMenuItems } from "./ai-menu-items";

export function AIMenu() {
  const { api, editor } = useEditorPlugin(AIChatPlugin);
  const open = usePluginOption(AIChatPlugin, "open");
  const mode = usePluginOption(AIChatPlugin, "mode");
  const streaming = usePluginOption(AIChatPlugin, "streaming");
  const isSelecting = useIsSelecting();

  const [value, setValue] = React.useState("");

  const chat = useChat(editor.id);

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
      // console.log("anchor", anchor);
      if (!anchor) return;
      const anchorDom = editor.api.toDOMNode(anchor![0])!;
      setAnchorElement(anchorDom);
    }, 0);
    // }
  }, [streaming]);

  const setOpen = (open: boolean) => {
    if (open) {
      api.aiChat.show();
    } else {
      api.aiChat.hide();
    }
  };

  const show = (anchorElement: HTMLElement) => {
    setAnchorElement(anchorElement);
    setOpen(true);
  };

  useEditorChat({
    chat,
    onOpenBlockSelection: (blocks: NodeEntry[]) => {
      show(editor.api.toDOMNode(blocks.at(-1)![0])!);
    },
    onOpenChange: (open) => {
      if (!open) {
        setAnchorElement(null);
        setInput("");
      }
    },
    onOpenCursor: () => {
      const [ancestor] = editor.api.block({ highest: true })!;

      if (!editor.api.isAt({ end: true }) && !editor.api.isEmpty(ancestor)) {
        editor
          .getApi(BlockSelectionPlugin)
          .blockSelection.set(ancestor.id as string);
      }

      show(editor.api.toDOMNode(ancestor)!);
    },
    onOpenSelection: () => {
      show(editor.api.toDOMNode(editor.api.blocks().at(-1)![0])!);
    }
  });

  useHotkeys(
    "meta+j",
    () => {
      api.aiChat.show();
    },
    { enableOnContentEditable: true, enableOnFormTags: true }
  );

  useHotkeys("esc", () => {
    api.aiChat.stop();

    // remove when you implement the route /api/ai/command
    chat._abortFakeStream();
  });

  const isLoading = status === "streaming" || status === "submitted";

  if (isLoading && mode === "insert") {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverAnchor virtualRef={{ current: anchorElement! }} />

      <PopoverContent
        className="border-none bg-transparent p-0 shadow-none"
        style={{
          width: anchorElement?.offsetWidth
        }}
        onEscapeKeyDown={(e) => {
          e.preventDefault();

          api.aiChat.hide();
        }}
        align="center"
        side="bottom">
        <Command
          className="w-full rounded-lg border shadow-md"
          value={value}
          onValueChange={setValue}>
          {mode === "chat" && isSelecting && content && (
            <AIChatEditor content={content} />
          )}

          {isLoading ? (
            <div className="flex grow items-center gap-2 p-2 text-sm text-muted-foreground select-none">
              <Loader2Icon className="size-4 animate-spin" />
              {messages.length > 1 ? "Editing..." : "Thinking..."}
            </div>
          ) : (
            <CommandPrimitive.Input
              className={cn(
                "flex h-9 w-full min-w-0 border-input bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none placeholder:text-muted-foreground md:text-sm dark:bg-input/30",
                "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
                "border-b focus-visible:ring-transparent"
              )}
              value={input}
              onKeyDown={(e) => {
                if (isHotkey("backspace")(e) && input.length === 0) {
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

// import * as React from "react";

// import { type NodeEntry, isHotkey } from "@udecode/plate";
// import {
//   AIChatPlugin,
//   useEditorChat,
//   useLastAssistantMessage
// } from "@udecode/plate-ai/react";
// import {
//   BlockSelectionPlugin,
//   useIsSelecting
// } from "@udecode/plate-selection/react";
// import {
//   useEditorPlugin,
//   useHotkeys,
//   usePluginOption
// } from "@udecode/plate/react";
// import { Command as CommandPrimitive } from "cmdk";
// import { Loader2Icon } from "lucide-react";

// import { Command, CommandList } from "../ui/command";
// import { Popover, PopoverAnchor, PopoverContent } from "../ui/popover";
// import { cn } from "../utils";
// import { useChat } from "../use-chat";

// import { AIChatEditor } from "./ai-chat-editor";
// import { AIMenuItems } from "./ai-menu-items";

// export function AIMenu() {
//   const { api, editor } = useEditorPlugin(AIChatPlugin);
//   const open = usePluginOption(AIChatPlugin, "open");
//   const mode = usePluginOption(AIChatPlugin, "mode");
//   const streaming = usePluginOption(AIChatPlugin, "streaming");
//   const isSelecting = useIsSelecting();

//   const [value, setValue] = React.useState("");

//   const chat = useChat();

//   const { input, messages, setInput, status } = chat;
//   const [anchorElement, setAnchorElement] = React.useState<HTMLElement | null>(
//     null
//   );

//   const content = useLastAssistantMessage()?.content;

//   // Improved anchor management - refresh anchor when streaming state changes
//   React.useEffect(() => {
//     console.log('HOOK')
//     if (streaming) {
//       console.log('streaming')
//       const refreshAnchor = () => {
//         try {
//           // First try to find the AI Chat anchor node
//           const anchor = api.aiChat.node({ anchor: true });
//           if (anchor) {
//             console.log('anchor:', anchor)
//             const anchorDom = editor.api.toDOMNode(anchor[0]);
//             if (anchorDom) {
//               console.log("option 1");
//               setAnchorElement(anchorDom);
//               return;
//             }else{
//               console.log('no anchorDom')
//             }
//           }else{
//             console.log('no anchor')
//           }

//           // Fallback: Find the last AI node in the editor
//           const aiNodes = editor.api.nodes({
//             match: (n) => n.type === AIChatPlugin.key,
//             reverse: true
//           });

//           const lastAiNode = aiNodes.next();
//           if (!lastAiNode.done) {
//             const aiDom = editor.api.toDOMNode(lastAiNode.value[0]);
//             if (aiDom) {
//               console.log("option 2");
//               setAnchorElement(aiDom);
//               return;
//             }else{
//               console.log('no aiDom')
//             }
//           }else{
//             console.log('no lastAiNode')
//           }

//           // Final fallback: Use the current block
//           const [currentBlock] = editor.api.block({ highest: true }) || [];
//           if (currentBlock) {
//             const blockDom = editor.api.toDOMNode(currentBlock);
//             if (blockDom) {
//               console.log("option 3");
//               setAnchorElement(blockDom);
//             }else{
//               console.log('no blockDom')
//             }
//           }else{
//             console.log('no currentBlock')
//           }
//         } catch (error) {
//           console.warn("Failed to find AI anchor element:", error);
//           // Last resort: use editor container
//           const editorContainer = document.querySelector(
//             '[data-slate-editor="true"]'
//           );
//           if (editorContainer) {
//             console.log("option 4");
//             setAnchorElement(editorContainer as HTMLElement);
//           }else{
//             console.log('no editorContainer')
//           }
//         }
//       };

//       // Refresh immediately and then periodically during streaming
//       refreshAnchor();

//       const interval = setInterval(refreshAnchor, 100);
//       return () => clearInterval(interval);
//     }
//     console.log("not streaming");
//     return;
//   }, [streaming, api, editor]);

//   const setOpen = (open: boolean) => {
//     if (open) {
//       api.aiChat.show();
//     } else {
//       api.aiChat.hide();
//     }
//   };

//   const show = (anchorElement: HTMLElement) => {
//     setAnchorElement(anchorElement);
//     setOpen(true);
//   };

//   useEditorChat({
//     chat,
//     onOpenBlockSelection: (blocks: NodeEntry[]) => {
//       show(editor.api.toDOMNode(blocks.at(-1)![0])!);
//     },
//     onOpenChange: (open) => {
//       if (!open) {
//         setAnchorElement(null);
//         setInput("");
//       }
//     },
//     onOpenCursor: () => {
//       const [ancestor] = editor.api.block({ highest: true })!;

//       if (!editor.api.isAt({ end: true }) && !editor.api.isEmpty(ancestor)) {
//         editor
//           .getApi(BlockSelectionPlugin)
//           .blockSelection.set(ancestor.id as string);
//       }

//       show(editor.api.toDOMNode(ancestor)!);
//     },
//     onOpenSelection: () => {
//       show(editor.api.toDOMNode(editor.api.blocks().at(-1)![0])!);
//     }
//   });

//   useHotkeys(
//     "meta+j",
//     () => {
//       api.aiChat.show();
//     },
//     { enableOnContentEditable: true, enableOnFormTags: true }
//   );

//   useHotkeys("esc", () => {
//     api.aiChat.stop();

//     // remove when you implement the route /api/ai/command
//     chat._abortFakeStream();
//   });

//   const isLoading = status === "streaming" || status === "submitted";

//   if (isLoading && mode === "insert") {
//     return null;
//   }

//   return (
//     <Popover open={open} onOpenChange={setOpen} modal={false}>
//       <PopoverAnchor virtualRef={{ current: anchorElement! }} />

//       <PopoverContent
//         className="border-none bg-transparent p-0 shadow-none tw-scoped"
//         style={{
//           width: anchorElement?.offsetWidth
//         }}
//         onEscapeKeyDown={(e) => {
//           e.preventDefault();

//           api.aiChat.hide();
//         }}
//         align="center"
//         side="bottom">
//         <Command
//           className="w-full rounded-lg border shadow-md"
//           value={value}
//           onValueChange={setValue}>
//           {mode === "chat" && isSelecting && content && (
//             <AIChatEditor content={content} />
//           )}

//           {isLoading ? (
//             <div className="flex grow items-center gap-2 p-2 text-sm text-muted-foreground select-none">
//               <Loader2Icon className="size-4 animate-spin" />
//               {messages.length > 1 ? "Editing..." : "Thinking..."}
//             </div>
//           ) : (
//             <CommandPrimitive.Input
//               className={cn(
//                 "flex h-9 w-full min-w-0 border-input bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none placeholder:text-muted-foreground md:text-sm dark:bg-input/30",
//                 "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
//                 "border-b focus-visible:ring-transparent"
//               )}
//               value={input}
//               onKeyDown={(e) => {
//                 if (isHotkey("backspace")(e) && input.length === 0) {
//                   e.preventDefault();
//                   api.aiChat.hide();
//                 }
//                 if (isHotkey("enter")(e) && !e.shiftKey && !value) {
//                   e.preventDefault();
//                   void api.aiChat.submit();
//                 }
//               }}
//               onValueChange={setInput}
//               placeholder="Ask AI anything..."
//               data-plate-focus
//               autoFocus
//             />
//           )}

//           {!isLoading && (
//             <CommandList>
//               <AIMenuItems setValue={setValue} />
//             </CommandList>
//           )}
//         </Command>
//       </PopoverContent>
//     </Popover>
//   );
// }
