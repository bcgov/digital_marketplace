"use client";

import * as React from "react";

import type { PlateLeafProps } from "platejs/react";

import { PlateLeaf } from "platejs/react";

export function HighlightLeaf(props: PlateLeafProps) {
  return (
    <PlateLeaf
      {...props}
      as="mark"
      className="tw:bg-highlight/30 tw:text-inherit">
      {props.children}
    </PlateLeaf>
  );
}
