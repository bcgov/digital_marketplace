"use client";

import * as React from "react";

import { DndPlugin } from "@platejs/dnd";
import { useBlockSelected } from "@platejs/selection/react";
import { cva } from "class-variance-authority";
import { type PlateElementProps, usePluginOption } from "platejs/react";

export const blockSelectionVariants = cva(
  "tw:pointer-events-none tw:absolute tw:inset-0 tw:z-1 tw:bg-brand/[.13] tw:transition-opacity",
  {
    defaultVariants: {
      active: true
    },
    variants: {
      active: {
        false: "tw:opacity-0",
        true: "tw:opacity-100"
      }
    }
  }
);

export function BlockSelection(props: PlateElementProps) {
  const isBlockSelected = useBlockSelected();
  const isDragging = usePluginOption(DndPlugin, "isDragging");

  if (
    !isBlockSelected ||
    props.plugin.key === "tr" ||
    props.plugin.key === "table"
  )
    return null;

  return (
    <div
      className={blockSelectionVariants({
        active: isBlockSelected && !isDragging
      })}
      data-slot="block-selection"
    />
  );
}
