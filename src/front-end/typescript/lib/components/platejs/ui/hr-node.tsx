"use client";

import * as React from "react";

import type { PlateElementProps } from "platejs/react";

import {
  PlateElement,
  useFocused,
  useReadOnly,
  useSelected
} from "platejs/react";

import { cn } from "./utils";

export function HrElement(props: PlateElementProps) {
  const readOnly = useReadOnly();
  const selected = useSelected();
  const focused = useFocused();

  return (
    <PlateElement {...props}>
      <div className="tw:py-6" contentEditable={false}>
        <hr
          className={cn(
            "tw:h-0.5 tw:rounded-sm tw:border-none tw:bg-muted tw:bg-clip-content",
            selected && focused && "tw:ring-2 tw:ring-ring tw:ring-offset-2",
            !readOnly && "tw:cursor-pointer"
          )}
        />
      </div>
      {props.children}
    </PlateElement>
  );
}
