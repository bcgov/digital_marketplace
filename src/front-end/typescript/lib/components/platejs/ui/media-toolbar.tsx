"use client";

import * as React from "react";

import type { WithRequiredKey } from "platejs";

import {
  FloatingMedia as FloatingMediaPrimitive,
  FloatingMediaStore,
  useFloatingMediaValue,
  useImagePreviewValue
} from "@platejs/media/react";
import { cva } from "class-variance-authority";
import { Link, Trash2Icon } from "lucide-react";
import {
  useEditorRef,
  useEditorSelector,
  useElement,
  useReadOnly,
  useRemoveNodeButton,
  useSelected
} from "platejs/react";

import { Button, buttonVariants } from "./button";
import { Popover, PopoverAnchor, PopoverContent } from "./popover";
import { Separator } from "./separator";

import { CaptionButton } from "./caption";

const inputVariants = cva(
  "tw:flex tw:h-[28px] tw:w-full tw:rounded-md tw:border-none tw:bg-transparent tw:px-1.5 tw:py-1 tw:text-base tw:placeholder:text-muted-foreground tw:focus-visible:ring-transparent tw:focus-visible:outline-none tw:md:text-sm"
);

export function MediaToolbar({
  children,
  plugin
}: {
  children: React.ReactNode;
  plugin: WithRequiredKey;
}) {
  const editor = useEditorRef();
  const readOnly = useReadOnly();
  const selected = useSelected();

  const selectionCollapsed = useEditorSelector(
    (editor) => !editor.api.isExpanded(),
    []
  );
  const isImagePreviewOpen = useImagePreviewValue("isOpen", editor.id);
  const isOpen =
    !readOnly && selected && selectionCollapsed && !isImagePreviewOpen;
  const isEditing = useFloatingMediaValue("isEditing");

  React.useEffect(() => {
    if (!isOpen && isEditing) {
      FloatingMediaStore.set("isEditing", false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const element = useElement();
  const { props: buttonProps } = useRemoveNodeButton({ element });

  if (readOnly) return <>{children}</>;

  return (
    <Popover open={isOpen} modal={false}>
      <PopoverAnchor>{children}</PopoverAnchor>

      <PopoverContent
        className="tw:w-auto tw:p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}>
        {isEditing ? (
          <div className="tw:flex tw:w-[330px] tw:flex-col">
            <div className="tw:flex tw:items-center">
              <div className="tw:flex tw:items-center tw:pr-1 tw:pl-2 tw:text-muted-foreground">
                <Link className="tw:size-4" />
              </div>

              <FloatingMediaPrimitive.UrlInput
                className={inputVariants()}
                placeholder="Paste the embed link..."
                options={{ plugin }}
              />
            </div>
          </div>
        ) : (
          <div className="tw:box-content tw:flex tw:items-center">
            <FloatingMediaPrimitive.EditButton
              className={buttonVariants({ size: "sm", variant: "ghost" })}>
              Edit link
            </FloatingMediaPrimitive.EditButton>

            <CaptionButton size="sm" variant="ghost">
              Caption
            </CaptionButton>

            <Separator orientation="vertical" className="tw:mx-1 tw:h-6" />

            <Button size="sm" variant="ghost" {...buttonProps}>
              <Trash2Icon />
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
