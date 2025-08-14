"use client";

import * as React from "react";

import type { PlateElementProps } from "platejs/react";

import { PlateElement } from "platejs/react";

import { cn } from "./utils";

export function ParagraphElement(props: PlateElementProps) {
  return (
    <PlateElement {...props} className={cn("tw:m-0 tw:px-0 tw:py-1")}>
      {props.children}
    </PlateElement>
  );
}
