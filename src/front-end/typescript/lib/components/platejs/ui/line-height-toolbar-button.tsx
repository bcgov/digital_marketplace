"use client";

import * as React from "react";

import type { DropdownMenuProps } from "@radix-ui/react-dropdown-menu";

import { LineHeightPlugin } from "@platejs/basic-styles/react";
import { DropdownMenuItemIndicator } from "@radix-ui/react-dropdown-menu";
import { CheckIcon, WrapText } from "lucide-react";
import { useEditorRef, useSelectionFragmentProp } from "platejs/react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from "./dropdown-menu";

import { ToolbarButton } from "./toolbar";

export function LineHeightToolbarButton(props: DropdownMenuProps) {
  const editor = useEditorRef();
  const { defaultNodeValue, validNodeValues: values = [] } =
    editor.getInjectProps(LineHeightPlugin);

  const value = useSelectionFragmentProp({
    defaultValue: defaultNodeValue,
    getProp: (node) => node.lineHeight
  });

  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip="Line height" isDropdown>
          <WrapText />
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="tw:min-w-0" align="start">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(newValue) => {
            editor
              .getTransforms(LineHeightPlugin)
              .lineHeight.setNodes(Number(newValue));
            editor.tf.focus();
          }}>
          {values.map((value) => (
            <DropdownMenuRadioItem
              key={value}
              className="tw:min-w-[180px] tw:pl-2 tw:*:first:[span]:hidden"
              value={value}>
              <span className="tw:pointer-events-none tw:absolute tw:right-2 tw:flex tw:size-3.5 tw:items-center tw:justify-center">
                <DropdownMenuItemIndicator>
                  <CheckIcon />
                </DropdownMenuItemIndicator>
              </span>
              {value}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
