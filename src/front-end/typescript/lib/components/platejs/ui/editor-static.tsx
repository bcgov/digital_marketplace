import * as React from "react";

import type { VariantProps } from "class-variance-authority";

import { cva } from "class-variance-authority";
import { type PlateStaticProps, PlateStatic } from "platejs";

import { cn } from "./utils";

export const editorVariants = cva(
  cn(
    "group/editor",
    "relative w-full cursor-text overflow-x-hidden break-words whitespace-pre-wrap select-text",
    "rounded-md ring-offset-background focus-visible:outline-none",
    "placeholder:text-muted-foreground/80 **:data-slate-placeholder:top-[auto_!important] **:data-slate-placeholder:text-muted-foreground/80 **:data-slate-placeholder:opacity-100!",
    "[&_strong]:font-bold"
  ),
  {
    defaultVariants: {
      variant: "none"
    },
    variants: {
      disabled: {
        true: "tw:cursor-not-allowed tw:opacity-50"
      },
      focused: {
        true: "tw:ring-2 tw:ring-ring tw:ring-offset-2"
      },
      variant: {
        ai: "tw:w-full tw:px-0 tw:text-base tw:md:text-sm",
        aiChat:
          "tw:max-h-[min(70vh,320px)] tw:w-full tw:max-w-[700px] tw:overflow-y-auto tw:px-5 tw:py-3 tw:text-base tw:md:text-sm",
        default:
          "tw:size-full tw:px-16 tw:pt-4 tw:pb-72 tw:text-base tw:sm:px-[max(64px,calc(50%-350px))]",
        demo: "tw:size-full tw:px-16 tw:pt-4 tw:pb-72 tw:text-base tw:sm:px-[max(64px,calc(50%-350px))]",
        fullWidth:
          "tw:size-full tw:px-16 tw:pt-4 tw:pb-72 tw:text-base tw:sm:px-24",
        none: "tw:",
        select: "tw:px-3 tw:py-2 tw:text-base tw:data-readonly:w-fit"
      }
    }
  }
);

export function EditorStatic({
  className,
  variant,
  ...props
}: PlateStaticProps & VariantProps<typeof editorVariants>) {
  return (
    <PlateStatic
      className={cn(editorVariants({ variant }), className)}
      {...props}
    />
  );
}
