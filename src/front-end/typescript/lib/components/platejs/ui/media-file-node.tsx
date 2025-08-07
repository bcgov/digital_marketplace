"use client";

import * as React from "react";

import type { TFileElement } from "platejs";
import type { PlateElementProps } from "platejs/react";

import { useMediaState } from "@platejs/media/react";
import { ResizableProvider } from "@platejs/resizable";
import { FileUp } from "lucide-react";
import { PlateElement, useReadOnly, withHOC } from "platejs/react";

import { Caption, CaptionTextarea } from "./caption";

export const FileElement = withHOC(
  ResizableProvider,
  function FileElement(props: PlateElementProps<TFileElement>) {
    const readOnly = useReadOnly();
    const { name, unsafeUrl } = useMediaState();

    return (
      <PlateElement className="tw:my-px tw:rounded-sm" {...props}>
        <a
          className="tw:group tw:relative tw:m-0 tw:flex tw:cursor-pointer tw:items-center tw:rounded tw:px-0.5 tw:py-[3px] tw:hover:bg-muted"
          contentEditable={false}
          download={name}
          href={unsafeUrl}
          rel="noopener noreferrer"
          role="button"
          target="_blank">
          <div className="tw:flex tw:items-center tw:gap-1 tw:p-1">
            <FileUp className="tw:size-5" />
            <div>{name}</div>
          </div>

          <Caption align="left">
            <CaptionTextarea
              className="tw:text-left"
              readOnly={readOnly}
              placeholder="Write a caption..."
            />
          </Caption>
        </a>
        {props.children}
      </PlateElement>
    );
  }
);
