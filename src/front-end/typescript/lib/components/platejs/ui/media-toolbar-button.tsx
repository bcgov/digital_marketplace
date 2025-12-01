"use client";

import * as React from "react";

import { PlaceholderPlugin } from "@platejs/media/react";
import { ImageIcon } from "lucide-react";
import { useEditorRef } from "platejs/react";
import { useFilePicker } from "use-file-picker";

import {
  ToolbarButton
} from "./toolbar";

export function MediaToolbarButton({
  nodeType,
  ...props
}: { nodeType: string } & React.ComponentProps<typeof ToolbarButton>) {
  const editor = useEditorRef();

  const { openFilePicker } = useFilePicker({
    accept: ["image/*"],
    multiple: true,
    onFilesSelected: ({ plainFiles: updatedFiles }) => {
      editor.getTransforms(PlaceholderPlugin).insert.media(updatedFiles);
    }
  });

  return (
    <ToolbarButton
      onClick={() => {
        openFilePicker();
      }}
      tooltip="Insert Image"
      {...props}>
      <ImageIcon className="tw:size-4" />
    </ToolbarButton>
  );
}
