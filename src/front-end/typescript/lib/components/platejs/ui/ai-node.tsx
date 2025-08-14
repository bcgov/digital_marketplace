"use client";

import * as React from "react";
import { AIChatPlugin } from "@platejs/ai/react";
import {
  type PlateElementProps,
  type PlateTextProps,
  PlateElement,
  PlateText,
  usePluginOption
} from "platejs/react";

import { cn } from "./utils";

export function AILeaf(props: PlateTextProps) {
  const streaming = usePluginOption(AIChatPlugin, "streaming");
  const streamingLeaf = props.editor
    .getApi(AIChatPlugin)
    .aiChat.node({ streaming: true });

  const isLast = streamingLeaf?.[0] === props.text;

  return (
    <PlateText
      className={cn(
        "tw:border-b-2 tw:border-b-purple-100 tw:bg-purple-50 tw:text-purple-800",
        "tw:transition-all tw:duration-200 tw:ease-in-out",
        isLast &&
          streaming &&
          "tw:after:ml-1.5 tw:after:inline-block tw:after:h-3 tw:after:w-3 tw:after:rounded-full tw:after:bg-primary tw:after:align-middle tw:after:content-[]"
      )}
      {...props}
    />
  );
}

export function AIAnchorElement(props: PlateElementProps) {
  return (
    <PlateElement {...props}>
      <div className="tw:h-[0.1px]" />
    </PlateElement>
  );
}
