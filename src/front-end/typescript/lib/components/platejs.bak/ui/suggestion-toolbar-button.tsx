import * as React from "react";

import { SuggestionPlugin } from "@udecode/plate-suggestion/react";
import { useEditorPlugin, usePluginOption } from "@udecode/plate/react";
import { PencilLineIcon } from "lucide-react";

import { cn } from "../utils";

import { ToolbarButton } from "./toolbar";

export function SuggestionToolbarButton() {
  const { setOption } = useEditorPlugin(SuggestionPlugin);
  const isSuggesting = usePluginOption(SuggestionPlugin, "isSuggesting");

  return (
    <ToolbarButton
      className={cn(isSuggesting && "text-brand/80 hover:text-brand/80")}
      onClick={() => setOption("isSuggesting", !isSuggesting)}
      onMouseDown={(e) => e.preventDefault()}
      tooltip={isSuggesting ? "Turn off suggesting" : "Suggestion edits"}>
      <PencilLineIcon />
    </ToolbarButton>
  );
}
