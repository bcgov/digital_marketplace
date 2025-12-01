import * as React from "react";

import type { SlateElementProps } from "platejs";

import { ChevronRight } from "lucide-react";
import { SlateElement } from "platejs";

export function ToggleElementStatic(props: SlateElementProps) {
  return (
    <SlateElement {...props} className="tw:pl-6">
      <div
        className="tw:absolute tw:top-0 tw:-left-0.5 tw:size-6 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-md tw:p-px tw:text-muted-foreground tw:transition-colors tw:select-none tw:hover:bg-accent tw:[&_svg]:size-4"
        contentEditable={false}>
        <ChevronRight className="tw:rotate-0 tw:transition-transform tw:duration-75" />
      </div>
      {props.children}
    </SlateElement>
  );
}
