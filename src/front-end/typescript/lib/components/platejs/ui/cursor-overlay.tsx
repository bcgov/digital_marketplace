"use client";

import * as React from "react";

import { AIChatPlugin } from "@platejs/ai/react";
import {
  type CursorData,
  type CursorOverlayState,
  useCursorOverlay
} from "@platejs/selection/react";
import { RangeApi } from "platejs";
import { usePluginOption } from "platejs/react";

import { cn } from "./utils";

export function CursorOverlay() {
  const { cursors } = useCursorOverlay();

  return (
    <>
      {cursors.map((cursor) => (
        <Cursor key={cursor.id} {...cursor} />
      ))}
    </>
  );
}

function Cursor({
  id,
  caretPosition,
  data,
  selection,
  selectionRects
}: CursorOverlayState<CursorData>) {
  const streaming = usePluginOption(AIChatPlugin, "streaming");
  const { style, selectionStyle = style } = data ?? ({} as CursorData);
  const isCursor = RangeApi.isCollapsed(selection);

  if (streaming) return null;

  return (
    <>
      {selectionRects.map((position, i) => {
        return (
          <div
            key={i}
            className={cn(
              "tw:pointer-events-none tw:absolute tw:z-10",
              id === "selection" && "tw:bg-brand/25",
              id === "selection" && isCursor && "tw:bg-primary"
            )}
            style={{
              ...selectionStyle,
              ...position
            }}
          />
        );
      })}
      {caretPosition && (
        <div
          className={cn(
            "tw:pointer-events-none tw:absolute tw:z-10 tw:w-0.5",
            id === "drag" && "tw:w-px tw:bg-brand"
          )}
          style={{ ...caretPosition, ...style }}
        />
      )}
    </>
  );
}
