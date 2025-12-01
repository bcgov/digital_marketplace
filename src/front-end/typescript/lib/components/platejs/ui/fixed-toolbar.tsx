"use client";

import * as React from "react";
import { useEditorReadOnly } from "platejs/react";
import { cn } from "./utils";

import { Toolbar } from "./toolbar";

export function FixedToolbar(props: React.ComponentProps<typeof Toolbar>) {
  const readOnly = useEditorReadOnly();

  // Don't render the toolbar when in readOnly mode
  if (readOnly) {
    return null;
  }

  return (
    <Toolbar
      {...props}
      className={cn(
        "tw:sticky tw:top-0 tw:left-0 tw:z-50 tw:scrollbar-hide tw:w-full tw:justify-between tw:overflow-x-auto tw:rounded-t-lg tw:border-b tw:border-b-border tw:bg-background/95 tw:p-1 tw:backdrop-blur-sm tw:supports-backdrop-blur:bg-background/60",
        props.className
      )}
    />
  );
}
