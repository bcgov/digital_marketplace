import * as React from "react";

import type { SlateElementProps } from "platejs";

import { SlateElement } from "platejs";

import { cn } from "./utils";

export function ParagraphElementStatic(props: SlateElementProps) {
  return (
    <SlateElement {...props} className={cn("tw:m-0 tw:px-0 tw:py-1")}>
      {props.children}
    </SlateElement>
  );
}
