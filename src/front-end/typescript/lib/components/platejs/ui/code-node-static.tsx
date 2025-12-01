import * as React from "react";

import type { SlateLeafProps } from "platejs";

import { SlateLeaf } from "platejs";

export function CodeLeafStatic(props: SlateLeafProps) {
  return (
    <SlateLeaf
      {...props}
      as="code"
      className="tw:rounded-md tw:bg-muted tw:px-[0.3em] tw:py-[0.2em] tw:font-mono tw:text-sm tw:whitespace-pre-wrap">
      {props.children}
    </SlateLeaf>
  );
}
