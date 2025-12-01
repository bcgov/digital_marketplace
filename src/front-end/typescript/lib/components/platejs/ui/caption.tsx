"use client";

import * as React from "react";

import type { VariantProps } from "class-variance-authority";

import {
  Caption as CaptionPrimitive,
  CaptionTextarea as CaptionTextareaPrimitive,
  useCaptionButton,
  useCaptionButtonState
} from "@platejs/caption/react";
import { createPrimitiveComponent } from "@udecode/cn";
import { cva } from "class-variance-authority";

import { Button } from "./button";
import { cn } from "./utils";

const captionVariants = cva("tw:max-w-full", {
  defaultVariants: {
    align: "center"
  },
  variants: {
    align: {
      center: "tw:mx-auto",
      left: "tw:mr-auto",
      right: "tw:ml-auto"
    }
  }
});

export function Caption({
  align,
  className,
  ...props
}: React.ComponentProps<typeof CaptionPrimitive> &
  VariantProps<typeof captionVariants>) {
  return (
    <CaptionPrimitive
      {...props}
      className={cn(captionVariants({ align }), className)}
    />
  );
}

export function CaptionTextarea(
  props: React.ComponentProps<typeof CaptionTextareaPrimitive>
) {
  return (
    <CaptionTextareaPrimitive
      {...props}
      className={cn(
        "tw:mt-2 tw:w-full tw:resize-none tw:border-none tw:bg-inherit tw:p-0 tw:font-[inherit] tw:text-inherit",
        "tw:focus:outline-none tw:focus:[&::placeholder]:opacity-0",
        "tw:text-center tw:print:placeholder:text-transparent",
        props.className
      )}
    />
  );
}

export const CaptionButton = createPrimitiveComponent(Button)({
  propsHook: useCaptionButton,
  stateHook: useCaptionButtonState
});
