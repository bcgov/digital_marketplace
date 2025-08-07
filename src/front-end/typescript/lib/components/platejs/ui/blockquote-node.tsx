"use client";
import * as React from "react";
import { type PlateElementProps, PlateElement } from "platejs/react";

export function BlockquoteElement(props: PlateElementProps) {
  return (
    <PlateElement
      as="blockquote"
      className="tw:my-1 tw:border-l-2 tw:pl-6 tw:italic"
      {...props}
    />
  );
}
