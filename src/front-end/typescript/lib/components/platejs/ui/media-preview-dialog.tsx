"use client";

import {
  PreviewImage,
  useImagePreview,
  useImagePreviewValue,
  useScaleInput
} from "@platejs/media/react";
import { cva } from "class-variance-authority";
import { ArrowLeft, ArrowRight, Download, Minus, Plus, X } from "lucide-react";
import { useEditorRef } from "platejs/react";
import * as React from "react";

import { cn } from "./utils";

const buttonVariants = cva("tw:rounded tw:bg-[rgba(0,0,0,0.5)] tw:px-1", {
  defaultVariants: {
    variant: "default"
  },
  variants: {
    variant: {
      default: "tw:text-white",
      disabled: "tw:cursor-not-allowed tw:text-gray-400"
    }
  }
});

const SCROLL_SPEED = 4;

export function MediaPreviewDialog() {
  const editor = useEditorRef();
  const isOpen = useImagePreviewValue("isOpen", editor.id);
  const scale = useImagePreviewValue("scale");
  const isEditingScale = useImagePreviewValue("isEditingScale");
  const {
    closeProps,
    currentUrlIndex,
    maskLayerProps,
    nextDisabled,
    nextProps,
    prevDisabled,
    prevProps,
    scaleTextProps,
    zommOutProps,
    zoomInDisabled,
    zoomInProps,
    zoomOutDisabled
  } = useImagePreview({ scrollSpeed: SCROLL_SPEED });

  return (
    <div
      className={cn(
        "tw:fixed tw:top-0 tw:left-0 tw:z-50 tw:h-screen tw:w-screen tw:select-none",
        !isOpen && "tw:hidden"
      )}
      onContextMenu={(e) => e.stopPropagation()}
      {...maskLayerProps}>
      <div className="tw:absolute tw:inset-0 tw:size-full tw:bg-black tw:opacity-30"></div>
      <div className="tw:absolute tw:inset-0 tw:size-full tw:bg-black tw:opacity-30"></div>
      <div className="tw:absolute tw:inset-0 tw:flex tw:items-center tw:justify-center">
        <div className="tw:relative tw:flex tw:max-h-screen tw:w-full tw:items-center">
          <PreviewImage
            className={cn(
              "tw:mx-auto tw:block tw:max-h-[calc(100vh-4rem)] tw:w-auto tw:object-contain tw:transition-transform"
            )}
          />
          <div
            className="tw:absolute tw:bottom-0 tw:left-1/2 tw:z-40 tw:flex tw:w-fit tw:-translate-x-1/2 tw:justify-center tw:gap-4 tw:p-2 tw:text-center tw:text-white"
            onClick={(e) => e.stopPropagation()}>
            <div className="tw:flex tw:gap-1">
              <button
                {...prevProps}
                className={cn(
                  buttonVariants({
                    variant: prevDisabled ? "disabled" : "default"
                  })
                )}
                type="button">
                <ArrowLeft />
              </button>
              {(currentUrlIndex ?? 0) + 1}
              <button
                {...nextProps}
                className={cn(
                  buttonVariants({
                    variant: nextDisabled ? "disabled" : "default"
                  })
                )}
                type="button">
                <ArrowRight />
              </button>
            </div>
            <div className="tw:flex">
              <button
                className={cn(
                  buttonVariants({
                    variant: zoomOutDisabled ? "disabled" : "default"
                  })
                )}
                {...zommOutProps}
                type="button">
                <Minus className="tw:size-4" />
              </button>
              <div className="tw:mx-px">
                {isEditingScale ? (
                  <>
                    <ScaleInput className="tw:w-10 tw:rounded tw:px-1 tw:text-slate-500 tw:outline" />{" "}
                    <span>%</span>
                  </>
                ) : (
                  <span {...scaleTextProps}>{scale * 100 + "%"}</span>
                )}
              </div>
              <button
                className={cn(
                  buttonVariants({
                    variant: zoomInDisabled ? "disabled" : "default"
                  })
                )}
                {...zoomInProps}
                type="button">
                <Plus className="tw:size-4" />
              </button>
            </div>
            {/* TODO: downLoad the image */}
            <button className={cn(buttonVariants())} type="button">
              <Download className="tw:size-4" />
            </button>
            <button
              {...closeProps}
              className={cn(buttonVariants())}
              type="button">
              <X className="tw:size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScaleInput(props: React.ComponentProps<"input">) {
  const { props: scaleInputProps, ref } = useScaleInput();

  return <input {...scaleInputProps} {...props} ref={ref} />;
}
