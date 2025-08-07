import * as React from "react";

import type { SlateElementProps, TAudioElement } from "platejs";

import { SlateElement } from "platejs";

export function AudioElementStatic(props: SlateElementProps<TAudioElement>) {
  return (
    <SlateElement {...props} className="tw:mb-1">
      <figure className="tw:group tw:relative tw:cursor-default">
        <div className="tw:h-16">
          <audio className="tw:size-full" src={props.element.url} controls />
        </div>
      </figure>
      {props.children}
    </SlateElement>
  );
}
