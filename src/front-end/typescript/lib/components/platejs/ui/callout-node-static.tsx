import * as React from "react";

import type { SlateElementProps } from "platejs";

import { SlateElement } from "platejs";

import { cn } from "./utils";

export function CalloutElementStatic({
  children,
  className,
  ...props
}: SlateElementProps) {
  return (
    <SlateElement
      className={cn(
        "tw:my-1 tw:flex tw:rounded-sm tw:bg-muted tw:p-4 tw:pl-3",
        className
      )}
      style={{
        backgroundColor: props.element.backgroundColor as any
      }}
      {...props}>
      <div className="tw:flex tw:w-full tw:gap-2 tw:rounded-md">
        <div
          className="tw:size-6 tw:text-[18px] tw:select-none"
          style={{
            fontFamily:
              '"Apple Color Emoji", "Segoe UI Emoji", NotoColorEmoji, "Noto Color Emoji", "Segoe UI Symbol", "Android Emoji", EmojiSymbols'
          }}>
          <span data-plate-prevent-deserialization>
            {(props.element.icon as any) || "💡"}
          </span>
        </div>
        <div className="tw:w-full">{children}</div>
      </div>
    </SlateElement>
  );
}
