"use client";

import * as React from "react";

import type { DropdownMenuProps } from "@radix-ui/react-dropdown-menu";

import {
  KeyboardIcon,
  MoreHorizontalIcon,
  SubscriptIcon,
  SuperscriptIcon
} from "lucide-react";
import { KEYS } from "platejs";
import { useEditorRef } from "platejs/react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "./dropdown-menu";

import { ToolbarButton } from "./toolbar";

export function MoreToolbarButton(props: DropdownMenuProps) {
  const editor = useEditorRef();
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip="Insert">
          <MoreHorizontalIcon />
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="tw:ignore-click-outside/toolbar tw:flex tw:max-h-[500px] tw:min-w-[180px] tw:flex-col tw:overflow-y-auto"
        align="start">
        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={() => {
              editor.tf.toggleMark(KEYS.kbd);
              editor.tf.collapse({ edge: "end" });
              editor.tf.focus();
            }}>
            <KeyboardIcon />
            Keyboard input
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => {
              editor.tf.toggleMark(KEYS.sup, {
                remove: KEYS.sub
              });
              editor.tf.focus();
            }}>
            <SuperscriptIcon />
            Superscript
            {/* (⌘+,) */}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              editor.tf.toggleMark(KEYS.sub, {
                remove: KEYS.sup
              });
              editor.tf.focus();
            }}>
            <SubscriptIcon />
            Subscript
            {/* (⌘+.) */}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
