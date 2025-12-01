"use client";

import * as React from "react";

import type { TAudioElement } from "platejs";
import type { PlateElementProps } from "platejs/react";

import { useMediaState } from "@platejs/media/react";
import { ResizableProvider } from "@platejs/resizable";
import { PlateElement, withHOC } from "platejs/react";

import { Caption, CaptionTextarea } from "./caption";

export const AudioElement = withHOC(
  ResizableProvider,
  function AudioElement(props: PlateElementProps<TAudioElement>) {
    const { align = "center", readOnly, unsafeUrl } = useMediaState();

    return (
      <PlateElement {...props} className="tw:mb-1">
        <figure
          className="tw:group tw:relative tw:cursor-default"
          contentEditable={false}>
          <div className="tw:h-16">
            <audio className="tw:size-full" src={unsafeUrl} controls />
          </div>

          <Caption style={{ width: "100%" }} align={align}>
            <CaptionTextarea
              className="tw:h-20"
              readOnly={readOnly}
              placeholder="Write a caption..."
            />
          </Caption>
        </figure>
        {props.children}
      </PlateElement>
    );
  }
);
