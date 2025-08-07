import * as React from "react";

import type {
  SlateElementProps,
  TCaptionElement,
  TResizableProps,
  TVideoElement
} from "platejs";

import { NodeApi, SlateElement } from "platejs";

export function VideoElementStatic(
  props: SlateElementProps<TVideoElement & TCaptionElement & TResizableProps>
) {
  const { align = "center", caption, url, width } = props.element;

  return (
    <SlateElement className="tw:py-2.5" {...props}>
      <div style={{ textAlign: align }}>
        <figure
          className="tw:group tw:relative tw:m-0 tw:inline-block tw:cursor-default"
          style={{ width }}>
          <video
            className="tw:w-full tw:max-w-full tw:rounded-sm tw:object-cover tw:px-0"
            src={url}
            controls
          />
          {caption && <figcaption>{NodeApi.string(caption[0])}</figcaption>}
        </figure>
      </div>
      {props.children}
    </SlateElement>
  );
}
