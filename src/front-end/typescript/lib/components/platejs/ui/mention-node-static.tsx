import * as React from "react";

import type { SlateElementProps, TMentionElement } from "platejs";

import { KEYS, SlateElement } from "platejs";

import { cn } from "./utils";

export function MentionElementStatic(
  props: SlateElementProps<TMentionElement> & {
    prefix?: string;
  }
) {
  const { prefix } = props;
  const element = props.element;

  return (
    <SlateElement
      {...props}
      className={cn(
        "tw:inline-block tw:rounded-md tw:bg-muted tw:px-1.5 tw:py-0.5 tw:align-baseline tw:text-sm tw:font-medium",
        element.children[0][KEYS.bold] === true && "tw:font-bold",
        element.children[0][KEYS.italic] === true && "tw:italic",
        element.children[0][KEYS.underline] === true && "tw:underline"
      )}
      attributes={{
        ...props.attributes,
        "data-slate-value": element.value
      }}>
      <React.Fragment>
        {props.children}
        {prefix}
        {element.value}
      </React.Fragment>
    </SlateElement>
  );
}
