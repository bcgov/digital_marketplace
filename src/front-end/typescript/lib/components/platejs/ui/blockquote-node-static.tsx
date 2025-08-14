import * as React from "react";

import { type SlateElementProps, SlateElement } from "platejs";

export function BlockquoteElementStatic(props: SlateElementProps) {
  return (
    <SlateElement
      as="blockquote"
      className="tw:my-1 tw:border-l-2 tw:pl-6 tw:italic"
      {...props}
    />
  );
}
