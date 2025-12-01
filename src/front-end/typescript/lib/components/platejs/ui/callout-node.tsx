"use client";

import * as React from "react";

import { useCalloutEmojiPicker } from "@platejs/callout/react";
import { useEmojiDropdownMenuState } from "@platejs/emoji/react";
import { PlateElement } from "platejs/react";

import { Button } from "./button";
import { cn } from "./utils";

import { EmojiPicker, EmojiPopover } from "./emoji-toolbar-button";

export function CalloutElement({
  attributes,
  children,
  className,
  ...props
}: React.ComponentProps<typeof PlateElement>) {
  const { emojiPickerState, isOpen, setIsOpen } = useEmojiDropdownMenuState({
    closeOnSelect: true
  });

  const { emojiToolbarDropdownProps, props: calloutProps } =
    useCalloutEmojiPicker({
      isOpen,
      setIsOpen
    });

  return (
    <PlateElement
      className={cn(
        "tw:my-1 tw:flex tw:rounded-sm tw:bg-muted tw:p-4 tw:pl-3",
        className
      )}
      style={{
        backgroundColor: props.element.backgroundColor as any
      }}
      attributes={{
        ...attributes,
        "data-plate-open-context-menu": true
      }}
      {...props}>
      <div className="tw:flex tw:w-full tw:gap-2 tw:rounded-md">
        <EmojiPopover
          {...emojiToolbarDropdownProps}
          control={
            <Button
              variant="ghost"
              className="tw:size-6 tw:p-1 tw:text-[18px] tw:select-none tw:hover:bg-muted-foreground/15"
              style={{
                fontFamily:
                  '"Apple Color Emoji", "Segoe UI Emoji", NotoColorEmoji, "Noto Color Emoji", "Segoe UI Symbol", "Android Emoji", EmojiSymbols'
              }}
              contentEditable={false}>
              {(props.element.icon as any) || "💡"}
            </Button>
          }>
          <EmojiPicker {...emojiPickerState} {...calloutProps} />
        </EmojiPopover>
        <div className="tw:w-full">{children}</div>
      </div>
    </PlateElement>
  );
}
