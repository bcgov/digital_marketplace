"use client";

import * as React from "react";

import type { PlateElementProps } from "platejs/react";

import { useToggleButton, useToggleButtonState } from "@platejs/toggle/react";
import { ChevronRight } from "lucide-react";
import { PlateElement } from "platejs/react";

import { Button } from "./button";

export function ToggleElement(props: PlateElementProps) {
  const element = props.element;
  const state = useToggleButtonState(element.id as string);
  const { buttonProps, open } = useToggleButton(state);

  return (
    <PlateElement {...props} className="tw:pl-6">
      <Button
        size="icon"
        variant="ghost"
        className="tw:absolute tw:top-0 tw:-left-0.5 tw:size-6 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-md tw:p-px tw:text-muted-foreground tw:transition-colors tw:select-none tw:hover:bg-accent tw:[&_svg]:size-4"
        contentEditable={false}
        {...buttonProps}>
        <ChevronRight
          className={
            open
              ? "rotate-90 transition-transform duration-75"
              : "rotate-0 transition-transform duration-75"
          }
        />
      </Button>
      {props.children}
    </PlateElement>
  );
}
