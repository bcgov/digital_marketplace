"use client";

import * as React from "react";

import { BoldIcon, ItalicIcon, WandSparklesIcon } from "lucide-react";
import { useEditorReadOnly, useEditorRef } from "platejs/react";
import { BoldPlugin, ItalicPlugin } from "@platejs/basic-nodes/react";
import { ImagePlugin } from "@platejs/media/react";

import { AIToolbarButton } from "./ai-toolbar-button";
import {
  BulletedListToolbarButton,
  NumberedListToolbarButton
} from "./list-toolbar-button";
import { MarkToolbarButton } from "./mark-toolbar-button";
import { MediaToolbarButton } from "./media-toolbar-button";
import { ToolbarGroup, ToolbarButton } from "./toolbar";
import { UndoToolbarButton, RedoToolbarButton } from "./history-toolbar-button";

export function FixedToolbarButtons() {
  const readOnly = useEditorReadOnly();
  const editor = useEditorRef();

  return (
    <div className="tw:flex tw:w-full">
      {!readOnly && (
        <>
          <ToolbarGroup>
            <UndoToolbarButton tooltip="Undo (⌘+Z)" />
            <RedoToolbarButton tooltip="Redo (⌘+⇧+Z)" />
          </ToolbarGroup>

          <ToolbarGroup>
            <AIToolbarButton tooltip="AI commands">
              <WandSparklesIcon />
            </AIToolbarButton>
          </ToolbarGroup>

          <ToolbarGroup>
            <ToolbarButton
              tooltip="Heading 1"
              onClick={() => editor?.tf.toggleBlock("h1")}>
              H1
            </ToolbarButton>
            <ToolbarButton
              tooltip="Heading 2"
              onClick={() => editor?.tf.toggleBlock("h2")}>
              H2
            </ToolbarButton>
          </ToolbarGroup>

          {/* <ToolbarGroup>
            <ExportToolbarButton>
              <ArrowUpToLineIcon />
            </ExportToolbarButton>

            <ImportToolbarButton />
          </ToolbarGroup> */}

          {/* <ToolbarGroup> */}
          {/* <InsertDropdownMenu /> */}
          {/* <TurnIntoDropdownMenu /> */}
          {/* <FontSizeToolbarButton /> */}
          {/* </ToolbarGroup> */}

          <ToolbarGroup>
            <MarkToolbarButton nodeType={BoldPlugin.key} tooltip="Bold (⌘+B)">
              <BoldIcon />
            </MarkToolbarButton>

            <MarkToolbarButton
              nodeType={ItalicPlugin.key}
              tooltip="Italic (⌘+I)">
              <ItalicIcon />
            </MarkToolbarButton>

            {/* <MarkToolbarButton
              nodeType={UnderlinePlugin.key}
              tooltip="Underline (⌘+U)"
            >
              <UnderlineIcon />
            </MarkToolbarButton>

            <MarkToolbarButton
              nodeType={StrikethroughPlugin.key}
              tooltip="Strikethrough (⌘+⇧+M)"
            >
              <StrikethroughIcon />
            </MarkToolbarButton>

            <MarkToolbarButton nodeType={CodePlugin.key} tooltip="Code (⌘+E)">
              <Code2Icon />
            </MarkToolbarButton>

            <ColorDropdownMenu
              nodeType={FontColorPlugin.key}
              tooltip="Text color"
            >
              <BaselineIcon />
            </ColorDropdownMenu>

            <ColorDropdownMenu
              nodeType={FontBackgroundColorPlugin.key}
              tooltip="Background color"
            >
              <PaintBucketIcon />
            </ColorDropdownMenu> */}
          </ToolbarGroup>

          <ToolbarGroup>
            <BulletedListToolbarButton />
            <NumberedListToolbarButton />
            {/* <AlignDropdownMenu /> */}
            {/* <BulletedIndentListToolbarButton /> */}
            {/* <NumberedIndentListToolbarButton /> */}
            {/* <IndentTodoToolbarButton /> */}
            {/* <ToggleToolbarButton /> */}
          </ToolbarGroup>

          {/* <ToolbarGroup>
            <LinkToolbarButton />
            <TableDropdownMenu />
            <EmojiDropdownMenu />
          </ToolbarGroup> */}

          {/* <ToolbarGroup> */}
          <MediaToolbarButton nodeType={ImagePlugin.key} />
          {/* <MediaToolbarButton nodeType={VideoPlugin.key} />
            <MediaToolbarButton nodeType={AudioPlugin.key} />
            <MediaToolbarButton nodeType={FilePlugin.key} />
          </ToolbarGroup> */}

          {/* <ToolbarGroup>
            <LineHeightDropdownMenu />
            <OutdentToolbarButton />
            <IndentToolbarButton />
          </ToolbarGroup> */}

          {/* <ToolbarGroup>
            <MoreDropdownMenu />
          </ToolbarGroup> */}
        </>
      )}

      <div className="tw:grow" />
    </div>
  );
}
