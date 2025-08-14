"use client";

import * as React from "react";

import type { TColumnElement } from "platejs";
import type { PlateElementProps } from "platejs/react";

import { useDraggable, useDropLine } from "@platejs/dnd";
import { setColumns } from "@platejs/layout";
import { useDebouncePopoverOpen } from "@platejs/layout/react";
import { ResizableProvider } from "@platejs/resizable";
import { BlockSelectionPlugin } from "@platejs/selection/react";
import { useComposedRef } from "@udecode/cn";
import { type LucideProps, Trash2Icon } from "lucide-react";
import { GripHorizontal } from "lucide-react";
import { PathApi } from "platejs";
import {
  PlateElement,
  useEditorRef,
  useElement,
  usePluginOption,
  useReadOnly,
  useRemoveNodeButton,
  withHOC
} from "platejs/react";

import { Button } from "./button";
import { Popover, PopoverAnchor, PopoverContent } from "./popover";
import { Separator } from "./separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "./tooltip";
import { cn } from "./utils";

export const ColumnElement = withHOC(
  ResizableProvider,
  function ColumnElement(props: PlateElementProps<TColumnElement>) {
    const { width } = props.element;
    const readOnly = useReadOnly();
    const isSelectionAreaVisible = usePluginOption(
      BlockSelectionPlugin,
      "isSelectionAreaVisible"
    );

    const { isDragging, previewRef, handleRef } = useDraggable({
      element: props.element,
      orientation: "horizontal",
      type: "column",
      canDropNode: ({ dragEntry, dropEntry }) =>
        PathApi.equals(
          PathApi.parent(dragEntry[1]),
          PathApi.parent(dropEntry[1])
        )
    });

    return (
      <div
        className="tw:group/column tw:relative"
        style={{ width: width ?? "100%" }}>
        {!readOnly && !isSelectionAreaVisible && (
          <div
            ref={handleRef}
            className={cn(
              "tw:absolute tw:top-2 tw:left-1/2 tw:z-50 tw:-translate-x-1/2 tw:-translate-y-1/2",
              "tw:pointer-events-auto tw:flex tw:items-center",
              "tw:opacity-0 tw:transition-opacity tw:group-hover/column:opacity-100"
            )}>
            <ColumnDragHandle />
          </div>
        )}

        <PlateElement
          {...props}
          ref={useComposedRef(props.ref, previewRef)}
          className="tw:h-full tw:px-2 tw:pt-2 tw:group-first/column:pl-0 tw:group-last/column:pr-0">
          <div
            className={cn(
              "tw:relative tw:h-full tw:border tw:border-transparent tw:p-1.5",
              !readOnly && "tw:rounded-lg tw:border-dashed tw:border-border",
              isDragging && "tw:opacity-50"
            )}>
            {props.children}

            {!readOnly && !isSelectionAreaVisible && <DropLine />}
          </div>
        </PlateElement>
      </div>
    );
  }
);

const ColumnDragHandle = React.memo(function ColumnDragHandle() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" className="tw:h-5 tw:!px-1">
            <GripHorizontal
              className="tw:text-muted-foreground"
              onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();
              }}
            />
          </Button>
        </TooltipTrigger>

        <TooltipContent>Drag to move column</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

function DropLine() {
  const { dropLine } = useDropLine({ orientation: "horizontal" });

  if (!dropLine) return null;

  return (
    <div
      className={cn(
        "tw:slate-dropLine",
        "tw:absolute tw:bg-brand/50",
        dropLine === "left" &&
          "tw:inset-y-0 tw:left-[-10.5px] tw:w-1 tw:group-first/column:-left-1",
        dropLine === "right" &&
          "tw:inset-y-0 tw:right-[-11px] tw:w-1 tw:group-last/column:-right-1"
      )}
    />
  );
}

export function ColumnGroupElement(props: PlateElementProps) {
  return (
    <PlateElement className="tw:mb-2" {...props}>
      <ColumnFloatingToolbar>
        <div className="tw:flex tw:size-full tw:rounded">{props.children}</div>
      </ColumnFloatingToolbar>
    </PlateElement>
  );
}

function ColumnFloatingToolbar({ children }: React.PropsWithChildren) {
  const editor = useEditorRef();
  const readOnly = useReadOnly();
  const element = useElement<TColumnElement>();

  const { props: buttonProps } = useRemoveNodeButton({ element });

  const isOpen = useDebouncePopoverOpen();

  const onColumnChange = (widths: string[]) => {
    setColumns(editor, {
      at: element,
      widths
    });
  };

  if (readOnly) return <>{children}</>;

  return (
    <Popover open={isOpen} modal={false}>
      <PopoverAnchor>{children}</PopoverAnchor>
      <PopoverContent
        className="tw:w-auto tw:p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
        align="center"
        side="top"
        sideOffset={10}>
        <div className="tw:box-content tw:flex tw:h-8 tw:items-center">
          <Button
            variant="ghost"
            className="tw:size-8"
            onClick={() => onColumnChange(["50%", "50%"])}>
            <DoubleColumnOutlined />
          </Button>
          <Button
            variant="ghost"
            className="tw:size-8"
            onClick={() => onColumnChange(["33%", "33%", "33%"])}>
            <ThreeColumnOutlined />
          </Button>
          <Button
            variant="ghost"
            className="tw:size-8"
            onClick={() => onColumnChange(["70%", "30%"])}>
            <RightSideDoubleColumnOutlined />
          </Button>
          <Button
            variant="ghost"
            className="tw:size-8"
            onClick={() => onColumnChange(["30%", "70%"])}>
            <LeftSideDoubleColumnOutlined />
          </Button>
          <Button
            variant="ghost"
            className="tw:size-8"
            onClick={() => onColumnChange(["25%", "50%", "25%"])}>
            <DoubleSideDoubleColumnOutlined />
          </Button>

          <Separator orientation="vertical" className="tw:mx-1 tw:h-6" />
          <Button variant="ghost" className="tw:size-8" {...buttonProps}>
            <Trash2Icon />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const DoubleColumnOutlined = (props: LucideProps) => (
  <svg
    fill="none"
    height="16"
    viewBox="0 0 16 16"
    width="16"
    xmlns="http://www.w3.org/2000/svg"
    {...props}>
    <path
      clipRule="evenodd"
      d="M8.5 3H13V13H8.5V3ZM7.5 2H8.5H13C13.5523 2 14 2.44772 14 3V13C14 13.5523 13.5523 14 13 14H8.5H7.5H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2H7.5ZM7.5 13H3L3 3H7.5V13Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
);

const ThreeColumnOutlined = (props: LucideProps) => (
  <svg
    fill="none"
    height="16"
    viewBox="0 0 16 16"
    width="16"
    xmlns="http://www.w3.org/2000/svg"
    {...props}>
    <path
      clipRule="evenodd"
      d="M9.25 3H6.75V13H9.25V3ZM9.25 2H6.75H5.75H3C2.44772 2 2 2.44772 2 3V13C2 13.5523 2.44772 14 3 14H5.75H6.75H9.25H10.25H13C13.5523 14 14 13.5523 14 13V3C14 2.44772 13.5523 2 13 2H10.25H9.25ZM10.25 3V13H13V3H10.25ZM3 13H5.75V3H3L3 13Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
);

const RightSideDoubleColumnOutlined = (props: LucideProps) => (
  <svg
    fill="none"
    height="16"
    viewBox="0 0 16 16"
    width="16"
    xmlns="http://www.w3.org/2000/svg"
    {...props}>
    <path
      clipRule="evenodd"
      d="M11.25 3H13V13H11.25V3ZM10.25 2H11.25H13C13.5523 2 14 2.44772 14 3V13C14 13.5523 13.5523 14 13 14H11.25H10.25H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2H10.25ZM10.25 13H3L3 3H10.25V13Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
);

const LeftSideDoubleColumnOutlined = (props: LucideProps) => (
  <svg
    fill="none"
    height="16"
    viewBox="0 0 16 16"
    width="16"
    xmlns="http://www.w3.org/2000/svg"
    {...props}>
    <path
      clipRule="evenodd"
      d="M5.75 3H13V13H5.75V3ZM4.75 2H5.75H13C13.5523 2 14 2.44772 14 3V13C14 13.5523 13.5523 14 13 14H5.75H4.75H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2H4.75ZM4.75 13H3L3 3H4.75V13Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
);

const DoubleSideDoubleColumnOutlined = (props: LucideProps) => (
  <svg
    fill="none"
    height="16"
    viewBox="0 0 16 16"
    width="16"
    xmlns="http://www.w3.org/2000/svg"
    {...props}>
    <path
      clipRule="evenodd"
      d="M10.25 3H5.75V13H10.25V3ZM10.25 2H5.75H4.75H3C2.44772 2 2 2.44772 2 3V13C2 13.5523 2.44772 14 3 14H4.75H5.75H10.25H11.25H13C13.5523 14 14 13.5523 14 13V3C14 2.44772 13.5523 2 13 2H11.25H10.25ZM11.25 3V13H13V3H11.25ZM3 13H4.75V3H3L3 13Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
);
