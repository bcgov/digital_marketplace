"use client";

import * as React from "react";

import type { TImageElement } from "platejs";
import type { PlateElementProps } from "platejs/react";

import { useDraggable } from "@platejs/dnd";
import { Image, ImagePlugin, useMediaState } from "@platejs/media/react";
import { ResizableProvider, useResizableValue } from "@platejs/resizable";
import { PlateElement, withHOC } from "platejs/react";

import { cn } from "./utils";

import { Caption, CaptionTextarea } from "./caption";
import { MediaToolbar } from "./media-toolbar";
import {
  mediaResizeHandleVariants,
  Resizable,
  ResizeHandle
} from "./resize-handle";

export const ImageElement = withHOC(
  ResizableProvider,
  function ImageElement(props: PlateElementProps<TImageElement>) {
    const { align = "center", focused, readOnly, selected } = useMediaState();
    const width = useResizableValue("width");

    const { isDragging, handleRef } = useDraggable({
      element: props.element
    });

    return (
      <MediaToolbar plugin={ImagePlugin}>
        <PlateElement {...props} className="tw:py-2.5">
          <figure
            className="tw:group tw:relative tw:m-0"
            contentEditable={false}>
            <Resizable
              align={align}
              options={{
                align,
                readOnly
              }}>
              <ResizeHandle
                className={mediaResizeHandleVariants({ direction: "left" })}
                options={{ direction: "left" }}
              />
              <Image
                ref={handleRef}
                className={cn(
                  "tw:block tw:w-full tw:max-w-full tw:cursor-pointer tw:object-cover tw:px-0",
                  "tw:rounded-sm",
                  focused &&
                    selected &&
                    "tw:ring-2 tw:ring-ring tw:ring-offset-2",
                  isDragging && "tw:opacity-50"
                )}
                alt={props.attributes.alt as string | undefined}
              />
              <ResizeHandle
                className={mediaResizeHandleVariants({
                  direction: "right"
                })}
                options={{ direction: "right" }}
              />
            </Resizable>

            <Caption style={{ width }} align={align}>
              <CaptionTextarea
                readOnly={readOnly}
                onFocus={(e) => {
                  e.preventDefault();
                }}
                placeholder="Write a caption..."
              />
            </Caption>
          </figure>

          {props.children}
        </PlateElement>
      </MediaToolbar>
    );
  }
);
