"use client";

import * as React from "react";

import type { VariantProps } from "class-variance-authority";
import type { PlateContentProps, PlateViewProps } from "platejs/react";

import { cva } from "class-variance-authority";
import { PlateContainer, PlateContent, PlateView } from "platejs/react";

import { cn } from "./utils";

const editorContainerVariants = cva(
  "tw:relative tw:w-full tw:cursor-text tw:overflow-y-auto tw:caret-primary tw:select-text tw:selection:bg-brand/25 tw:focus-visible:outline-none tw:[&_.slate-selection-area]:z-50 tw:[&_.slate-selection-area]:border tw:[&_.slate-selection-area]:border-brand/25 tw:[&_.slate-selection-area]:bg-brand/15",
  {
    defaultVariants: {
      variant: "default"
    },
    variants: {
      variant: {
        comment: cn(
          "tw:flex tw:flex-wrap tw:justify-between tw:gap-1 tw:px-1 tw:py-0.5 tw:text-sm",
          "tw:rounded-md tw:border-[1.5px] tw:border-transparent tw:bg-transparent",
          "tw:has-[[data-slate-editor]:focus]:border-brand/50 tw:has-[[data-slate-editor]:focus]:ring-2 tw:has-[[data-slate-editor]:focus]:ring-brand/30",
          "tw:has-aria-disabled:border-input tw:has-aria-disabled:bg-muted"
        ),
        default: "tw:h-full",
        demo: "tw:h-[650px]",
        select: cn(
          "tw:group tw:rounded-md tw:border tw:border-input tw:ring-offset-background tw:focus-within:ring-2 tw:focus-within:ring-ring tw:focus-within:ring-offset-2",
          "tw:has-data-readonly:w-fit tw:has-data-readonly:cursor-default tw:has-data-readonly:border-transparent tw:has-data-readonly:focus-within:[box-shadow:none]"
        )
      }
    }
  }
);

export function EditorContainer({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof editorContainerVariants>) {
  return (
    <PlateContainer
      className={cn(
        "tw:ignore-click-outside/toolbar",
        editorContainerVariants({ variant }),
        className
      )}
      {...props}
    />
  );
}

const editorVariants = cva(
  cn(
    "tw:group/editor",
    "tw:relative tw:w-full tw:cursor-text tw:overflow-x-hidden tw:break-words tw:whitespace-pre-wrap tw:select-text",
    "tw:rounded-md tw:ring-offset-background tw:focus-visible:outline-none",
    "tw:placeholder:text-muted-foreground/80 tw:**:data-slate-placeholder:!top-1/2 tw:**:data-slate-placeholder:-translate-y-1/2 tw:**:data-slate-placeholder:text-muted-foreground/80 tw:**:data-slate-placeholder:opacity-100!",
    "tw:[&_strong]:font-bold"
  ),
  {
    defaultVariants: {
      variant: "default"
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
          "tw:max-h-[min(70vh,320px)] tw:w-full tw:max-w-[700px] tw:overflow-y-auto tw:px-3 tw:py-2 tw:text-base tw:md:text-sm",
        comment: cn(
          "tw:rounded-none tw:border-none tw:bg-transparent tw:text-sm"
        ),
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

export type EditorProps = PlateContentProps &
  VariantProps<typeof editorVariants>;

export const Editor = React.forwardRef<HTMLDivElement, EditorProps>(
  ({ className, disabled, focused, variant, ...props }, ref) => {
    return (
      <PlateContent
        ref={ref}
        className={cn(
          editorVariants({
            disabled,
            focused,
            variant
          }),
          className
        )}
        disabled={disabled}
        disableDefaultStyles
        {...props}
      />
    );
  }
);

Editor.displayName = "Editor";

export function EditorView({
  className,
  variant,
  ...props
}: PlateViewProps & VariantProps<typeof editorVariants>) {
  return (
    <PlateView
      {...props}
      className={cn(editorVariants({ variant }), className)}
    />
  );
}

EditorView.displayName = "EditorView";
