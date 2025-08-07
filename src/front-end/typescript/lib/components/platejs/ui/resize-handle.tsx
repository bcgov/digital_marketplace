"use client";

import * as React from "react";

import type { VariantProps } from "class-variance-authority";

import {
  type ResizeHandle as ResizeHandlePrimitive,
  Resizable as ResizablePrimitive,
  useResizeHandle,
  useResizeHandleState
} from "@platejs/resizable";
import { cva } from "class-variance-authority";

import { cn } from "./utils";

export const mediaResizeHandleVariants = cva(
  cn(
    "top-0 flex w-6 flex-col justify-center select-none",
    "after:flex after:h-16 after:w-[3px] after:rounded-[6px] after:bg-ring after:opacity-0 after:content-['_'] group-hover:after:opacity-100"
  ),
  {
    variants: {
      direction: {
        left: "tw:-left-3 tw:-ml-3 tw:pl-3",
        right: "tw:-right-3 tw:-mr-3 tw:items-end tw:pr-3"
      }
    }
  }
);

const resizeHandleVariants = cva("tw:absolute tw:z-40", {
  variants: {
    direction: {
      bottom: "tw:w-full tw:cursor-row-resize",
      left: "tw:h-full tw:cursor-col-resize",
      right: "tw:h-full tw:cursor-col-resize",
      top: "tw:w-full tw:cursor-row-resize"
    }
  }
});

export function ResizeHandle({
  className,
  options,
  ...props
}: React.ComponentProps<typeof ResizeHandlePrimitive> &
  VariantProps<typeof resizeHandleVariants>) {
  const state = useResizeHandleState(options ?? {});
  const resizeHandle = useResizeHandle(state);

  if (state.readOnly) return null;

  return (
    <div
      className={cn(
        resizeHandleVariants({ direction: options?.direction }),
        className
      )}
      data-resizing={state.isResizing}
      {...resizeHandle.props}
      {...props}
    />
  );
}

const resizableVariants = cva("tw:", {
  variants: {
    align: {
      center: "tw:mx-auto",
      left: "tw:mr-auto",
      right: "tw:ml-auto"
    }
  }
});

export function Resizable({
  align,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive> &
  VariantProps<typeof resizableVariants>) {
  return (
    <ResizablePrimitive
      {...props}
      className={cn(resizableVariants({ align }), className)}
    />
  );
}
