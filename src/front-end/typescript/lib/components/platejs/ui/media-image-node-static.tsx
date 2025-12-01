import * as React from "react";

import type {
  SlateElementProps,
  TCaptionProps,
  TImageElement,
  TResizableProps
} from "platejs";

import { NodeApi, SlateElement } from "platejs";

import { cn } from "./utils";

export function ImageElementStatic(
  props: SlateElementProps<TImageElement & TCaptionProps & TResizableProps>
) {
  const { align = "center", caption, url, width } = props.element;

  return (
    <SlateElement {...props} className="tw:py-2.5">
      <figure
        className="tw:group tw:relative tw:m-0 tw:inline-block"
        style={{ width }}>
        <div
          className="tw:relative tw:max-w-full tw:min-w-[92px]"
          style={{ textAlign: align }}>
          <img
            className={cn(
              "tw:w-full tw:max-w-full tw:cursor-default tw:object-cover tw:px-0",
              "tw:rounded-sm"
            )}
            alt={(props.attributes as any).alt}
            src={url}
          />
          {caption && (
            <figcaption className="tw:mx-auto tw:mt-2 tw:h-[24px] tw:max-w-full">
              {NodeApi.string(caption[0])}
            </figcaption>
          )}
        </div>
      </figure>
      {props.children}
    </SlateElement>
  );
}
