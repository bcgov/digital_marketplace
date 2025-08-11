// import { withProps } from "@udecode/cn";
import { AIKit } from "front-end/lib/components/platejs/components/editor/plugins/ai-kit";
// import { AIChatPlugin, AIPlugin } from "@udecode/plate-ai/react";
// import {
//   BoldPlugin,
//   ItalicPlugin,
//   StrikethroughPlugin,
//   SubscriptPlugin,
//   SuperscriptPlugin,
//   UnderlinePlugin
// } from "@udecode/plate-basic-marks/react";
// import { BlockquotePlugin } from "@udecode/plate-block-quote/react";
// import { HEADING_KEYS } from "@udecode/plate-heading";
// import { KbdPlugin } from "@udecode/plate-kbd/react";
// import {
//   ImagePlugin
// } from "@udecode/plate-media/react";
// import {
//   type CreatePlateEditorOptions,
//   ParagraphPlugin,
//   PlateElement,
//   PlateLeaf,
//   usePlateEditor
// } from "@udecode/plate/react";

import { AIAnchorElement } from "../ui/ai-node";
// import { AILeaf } from "../ui/ai-leaf";
// import { BlockquoteElement } from "../ui/blockquote-element";
// import { HeadingElement } from "../ui/heading-element";
// import { ImageElement } from "../ui/image-element";
// import { KbdLeaf } from "../ui/kbd-leaf";
// import { ParagraphElement } from "../ui/paragraph-element";
// import { editorPlugins, viewPlugins } from "./editor-plugins";
// import { NumberedListPlugin } from "@udecode/plate-list/react";
// import { ListItemPlugin } from "@udecode/plate-list/react";
// import { BulletedListPlugin } from "@udecode/plate-list/react";
// import { ListElement } from "../ui/list-element";
import { TrailingBlockPlugin, Value } from "platejs";
import { CreatePlateEditorOptions, usePlateEditor } from "platejs/react";
import { FixedToolbarKit } from "../components/editor/plugins/fixed-toolbar-kit";
import { BlockPlaceholderKit } from "../components/editor/plugins/block-placeholder-kit";
import { MarkdownKit } from "../components/editor/plugins/markdown-kit";
import { AutoformatKit } from "../components/editor/plugins/autoformat-kit";
import { BasicBlocksKit } from "../components/editor/plugins/basic-blocks-kit";
import { BasicMarksKit } from "../components/editor/plugins/basic-marks-kit";
import { BlockMenuKit } from "../components/editor/plugins/block-menu-kit";
import { CommentKit } from "../components/editor/plugins/comment-kit";
import { CursorOverlayKit } from "../components/editor/plugins/cursor-overlay-kit";
import { DndKit } from "../components/editor/plugins/dnd-kit";
import { ExitBreakKit } from "../components/editor/plugins/exit-break-kit";
import { ListKit } from "../components/editor/plugins/list-kit";
import { MediaKit } from "../components/editor/plugins/media-kit";
import { AIChatPlugin } from "@platejs/ai/react";
import { CopilotKit } from "../components/editor/plugins/copilot-kit";

export const viewComponents = {
  [AIChatPlugin.key]: AIAnchorElement,
  // [BlockquotePlugin.key]: BlockquoteElement,
  // [BoldPlugin.key]: withProps(PlateLeaf, { as: "strong" }),
  // [HEADING_KEYS.h1]: withProps(HeadingElement, { variant: "h1" }),
  // [HEADING_KEYS.h2]: withProps(HeadingElement, { variant: "h2" }),
  // [HEADING_KEYS.h3]: withProps(HeadingElement, { variant: "h3" }),
  // [HEADING_KEYS.h4]: withProps(HeadingElement, { variant: "h4" }),
  // [HEADING_KEYS.h5]: withProps(HeadingElement, { variant: "h5" }),
  // [HEADING_KEYS.h6]: withProps(HeadingElement, { variant: "h6" }),
  // [ImagePlugin.key]: ImageElement,
  // [ItalicPlugin.key]: withProps(PlateLeaf, { as: "em" }),
  // [KbdPlugin.key]: KbdLeaf,
  // [ParagraphPlugin.key]: ParagraphElement,
  // [StrikethroughPlugin.key]: withProps(PlateLeaf, { as: "s" }),
  // [SubscriptPlugin.key]: withProps(PlateLeaf, { as: "sub" }),
  // [SuperscriptPlugin.key]: withProps(PlateLeaf, { as: "sup" }),
  // [UnderlinePlugin.key]: withProps(PlateLeaf, { as: "u" }),
  // [BulletedListPlugin.key]: withProps(ListElement, { variant: "ul" }),
  // [ListItemPlugin.key]: withProps(PlateElement, { as: "li" }),
  // [NumberedListPlugin.key]: withProps(ListElement, { variant: "ol" })
};

export const editorComponents = {
  ...viewComponents
  // [AIPlugin.key]: AILeaf
};

export const useCreateEditor = (
  {
    components,
    placeholders = true,
    readOnly,
    ...options
  }: {
    placeholders?: boolean;
    plugins?: any[];
    readOnly?: boolean;
  } & Omit<CreatePlateEditorOptions, "plugins"> = {},
  deps: any[] = []
) => {
  console.log("useCreateEditor");
  const editorPlugins = [
    ...CopilotKit,
    ...AIKit,
    ...BlockMenuKit,
    // Elements
    ...BasicBlocksKit,
    // ...CodeBlockKit,
    // ...TableKit,
    // ...ToggleKit,
    // ...TocKit,
    ...MediaKit,
    // ...CalloutKit,
    // ...ColumnKit,
    // ...MathKit,
    // ...DateKit,
    // ...LinkKit,
    // ...MentionKit,
    // Marks
    ...BasicMarksKit,
    // ...FontKit,
    // Block Style
    ...ListKit,
    // ...AlignKit,
    // ...LineHeightKit,
    // Collaboration
    // ...DiscussionKit,
    ...CommentKit,
    // ...SuggestionKit,
    // Editing
    // ...SlashKit,
    ...AutoformatKit,
    ...CursorOverlayKit,
    ...DndKit,
    // ...EmojiKit,
    ...ExitBreakKit,
    TrailingBlockPlugin,
    // Parsers
    // ...DocxKit,
    ...MarkdownKit,
    // UI
    ...BlockPlaceholderKit,
    ...FixedToolbarKit
    // ...FloatingToolbarKit,
  ];

  const configuredEditorPlugins = readOnly
    ? [] //viewPlugins
    : [
        // Add all editor plugins
        ...editorPlugins
      ];

  return usePlateEditor<Value, typeof editorPlugins[number]>(
    {
      components: {
        ...(readOnly
          ? viewComponents
          : placeholders
          ? editorComponents
          : editorComponents),
        ...components
      },
      plugins: configuredEditorPlugins as any
      // ...options
    }
    // deps
  );
};
