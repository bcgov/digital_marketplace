import * as React from "react";

import type { SlateLeafProps } from "platejs";

import { SlateLeaf } from "platejs";

export function HighlightLeafStatic(props: SlateLeafProps) {
  return (
    <SlateLeaf
      {...props}
      as="mark"
      className="tw:bg-highlight/30 tw:text-inherit">
      {props.children}
    </SlateLeaf>
  );
}
