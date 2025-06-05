import type { Value } from "@udecode/plate";

import { withProps } from "@udecode/cn";
import { AIChatPlugin, AIPlugin } from "@udecode/plate-ai/react";
import {
  BoldPlugin,
  // CodePlugin,
  ItalicPlugin,
  StrikethroughPlugin,
  SubscriptPlugin,
  SuperscriptPlugin,
  UnderlinePlugin
} from "@udecode/plate-basic-marks/react";
import { BlockquotePlugin } from "@udecode/plate-block-quote/react";
// import {
//   CodeBlockPlugin
// } from "@udecode/plate-code-block/react";
// import { EmojiInputPlugin } from "@udecode/plate-emoji/react";
import { HEADING_KEYS } from "@udecode/plate-heading";
import { KbdPlugin } from "@udecode/plate-kbd/react";
import {
  //   AudioPlugin,
  // FilePlugin,
  ImagePlugin
  //   MediaEmbedPlugin,
  //   PlaceholderPlugin,
  // VideoPlugin
} from "@udecode/plate-media/react";
// import { SlashInputPlugin } from "@udecode/plate-slash-command/react";
import {
  type CreatePlateEditorOptions,
  ParagraphPlugin,
  PlateElement,
  PlateLeaf,
  usePlateEditor
} from "@udecode/plate/react";

import { AIAnchorElement } from "../ui/ai-anchor-element";
import { AILeaf } from "../ui/ai-leaf";
import { BlockquoteElement } from "../ui/blockquote-element";
// import { CodeBlockElement } from "../ui/code-block-element";
// import { CodeLeaf } from "../ui/code-leaf";
// import { EmojiInputElement } from "../ui/emoji-input-element";
import { HeadingElement } from "../ui/heading-element";
import { ImageElement } from "../ui/image-element";
import { KbdLeaf } from "../ui/kbd-leaf";
// import { MediaAudioElement } from '../ui/media-audio-element';
// import { MediaEmbedElement } from '../ui/media-embed-element';
// import { MediaFileElement } from "../ui/media-file-element";
// import { MediaPlaceholderElement } from '../ui/media-placeholder-element';
// import { MediaVideoElement } from "../ui/media-video-element";
import { ParagraphElement } from "../ui/paragraph-element";
// import { withPlaceholders } from "../ui/placeholder";
// import { SlashInputElement } from "../ui/slash-input-element";

import { editorPlugins, viewPlugins } from "./editor-plugins";
import { NumberedListPlugin } from "@udecode/plate-list/react";
import { ListItemPlugin } from "@udecode/plate-list/react";
import { BulletedListPlugin } from "@udecode/plate-list/react";
import { ListElement } from "../ui/list-element";

export const viewComponents = {
  [AIChatPlugin.key]: AIAnchorElement,
  //   [AudioPlugin.key]: MediaAudioElement,
  [BlockquotePlugin.key]: BlockquoteElement,
  [BoldPlugin.key]: withProps(PlateLeaf, { as: "strong" }),
  // [CodeBlockPlugin.key]: CodeBlockElement,
  // [CodePlugin.key]: CodeLeaf,
  // [FilePlugin.key]: MediaFileElement,
  [HEADING_KEYS.h1]: withProps(HeadingElement, { variant: "h1" }),
  [HEADING_KEYS.h2]: withProps(HeadingElement, { variant: "h2" }),
  [HEADING_KEYS.h3]: withProps(HeadingElement, { variant: "h3" }),
  [HEADING_KEYS.h4]: withProps(HeadingElement, { variant: "h4" }),
  [HEADING_KEYS.h5]: withProps(HeadingElement, { variant: "h5" }),
  [HEADING_KEYS.h6]: withProps(HeadingElement, { variant: "h6" }),
  [ImagePlugin.key]: ImageElement,
  [ItalicPlugin.key]: withProps(PlateLeaf, { as: "em" }),
  [KbdPlugin.key]: KbdLeaf,
  //   [MediaEmbedPlugin.key]: MediaEmbedElement,
  [ParagraphPlugin.key]: ParagraphElement,
  //   [PlaceholderPlugin.key]: MediaPlaceholderElement,
  [StrikethroughPlugin.key]: withProps(PlateLeaf, { as: "s" }),
  [SubscriptPlugin.key]: withProps(PlateLeaf, { as: "sub" }),
  [SuperscriptPlugin.key]: withProps(PlateLeaf, { as: "sup" }),
  [UnderlinePlugin.key]: withProps(PlateLeaf, { as: "u" }),
  // [VideoPlugin.key]: MediaVideoElement,

  [BulletedListPlugin.key]: withProps(ListElement, { variant: "ul" }),
  [ListItemPlugin.key]: withProps(PlateElement, { as: "li" }),
  [NumberedListPlugin.key]: withProps(ListElement, { variant: "ol" })
};

export const editorComponents = {
  ...viewComponents,
  [AIPlugin.key]: AILeaf
  // [EmojiInputPlugin.key]: EmojiInputElement,
  // [SlashInputPlugin.key]: SlashInputElement
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
  const configuredEditorPlugins = readOnly
    ? viewPlugins
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
          ? editorComponents //withPlaceholders(editorComponents)
          : editorComponents),
        ...components
      },
      plugins: configuredEditorPlugins as any,
      ...options
    },
    deps
  );
};
