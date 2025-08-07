import * as React from "react";

import type { SlateElementProps, TColumnElement } from "platejs";

import { SlateElement } from "platejs";

export function ColumnElementStatic(props: SlateElementProps<TColumnElement>) {
  const { width } = props.element;

  return (
    <div
      className="tw:group/column tw:relative"
      style={{ width: width ?? "100%" }}>
      <SlateElement
        className="tw:h-full tw:px-2 tw:pt-2 tw:group-first/column:pl-0 tw:group-last/column:pr-0"
        {...props}>
        <div className="tw:relative tw:h-full tw:border tw:border-transparent tw:p-1.5">
          {props.children}
        </div>
      </SlateElement>
    </div>
  );
}

export function ColumnGroupElementStatic(props: SlateElementProps) {
  return (
    <SlateElement className="tw:mb-2" {...props}>
      <div className="tw:flex tw:size-full tw:rounded">{props.children}</div>
    </SlateElement>
  );
}
