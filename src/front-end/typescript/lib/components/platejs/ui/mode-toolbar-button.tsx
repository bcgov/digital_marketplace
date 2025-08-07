"use client";

import * as React from "react";

import { SuggestionPlugin } from "@platejs/suggestion/react";
import {
  type DropdownMenuProps,
  DropdownMenuItemIndicator
} from "@radix-ui/react-dropdown-menu";
import { CheckIcon, EyeIcon, PencilLineIcon, PenIcon } from "lucide-react";
import { useEditorRef, usePlateState, usePluginOption } from "platejs/react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from "./dropdown-menu";

import { ToolbarButton } from "./toolbar";

export function ModeToolbarButton(props: DropdownMenuProps) {
  const editor = useEditorRef();
  const [readOnly, setReadOnly] = usePlateState("readOnly");
  const [open, setOpen] = React.useState(false);

  const isSuggesting = usePluginOption(SuggestionPlugin, "isSuggesting");

  let value = "editing";

  if (readOnly) value = "viewing";

  if (isSuggesting) value = "suggestion";

  const item: Record<string, { icon: React.ReactNode; label: string }> = {
    editing: {
      icon: <PenIcon />,
      label: "Editing"
    },
    suggestion: {
      icon: <PencilLineIcon />,
      label: "Suggestion"
    },
    viewing: {
      icon: <EyeIcon />,
      label: "Viewing"
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip="Editing mode" isDropdown>
          {item[value].icon}
          <span className="tw:hidden tw:lg:inline">{item[value].label}</span>
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="tw:min-w-[180px]" align="start">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(newValue) => {
            if (newValue === "viewing") {
              setReadOnly(true);

              return;
            } else {
              setReadOnly(false);
            }

            if (newValue === "suggestion") {
              editor.setOption(SuggestionPlugin, "isSuggesting", true);

              return;
            } else {
              editor.setOption(SuggestionPlugin, "isSuggesting", false);
            }

            if (newValue === "editing") {
              editor.tf.focus();

              return;
            }
          }}>
          <DropdownMenuRadioItem
            className="tw:pl-2 tw:*:first:[span]:hidden tw:*:[svg]:text-muted-foreground"
            value="editing">
            <Indicator />
            {item.editing.icon}
            {item.editing.label}
          </DropdownMenuRadioItem>

          <DropdownMenuRadioItem
            className="tw:pl-2 tw:*:first:[span]:hidden tw:*:[svg]:text-muted-foreground"
            value="viewing">
            <Indicator />
            {item.viewing.icon}
            {item.viewing.label}
          </DropdownMenuRadioItem>

          <DropdownMenuRadioItem
            className="tw:pl-2 tw:*:first:[span]:hidden tw:*:[svg]:text-muted-foreground"
            value="suggestion">
            <Indicator />
            {item.suggestion.icon}
            {item.suggestion.label}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Indicator() {
  return (
    <span className="tw:pointer-events-none tw:absolute tw:right-2 tw:flex tw:size-3.5 tw:items-center tw:justify-center">
      <DropdownMenuItemIndicator>
        <CheckIcon />
      </DropdownMenuItemIndicator>
    </span>
  );
}
