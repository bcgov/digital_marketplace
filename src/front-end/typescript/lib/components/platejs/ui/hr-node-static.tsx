import * as React from "react";

import type { SlateElementProps } from "platejs";

import { SlateElement } from "platejs";

import { cn } from "./utils";

export function HrElementStatic(props: SlateElementProps) {
  return (
    <SlateElement {...props}>
      <div className="tw:cursor-text tw:py-6" contentEditable={false}>
        <hr
          className={cn(
            "tw:h-0.5 tw:rounded-sm tw:border-none tw:bg-muted tw:bg-clip-content"
          )}
        />
      </div>
      {props.children}
    </SlateElement>
  );
}
