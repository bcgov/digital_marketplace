"use client";

import * as React from "react";

import type { PlateLeafProps } from "platejs/react";

import { PlateLeaf } from "platejs/react";

export function CodeLeaf(props: PlateLeafProps) {
  return (
    <PlateLeaf
      {...props}
      as="code"
      className="tw:rounded-md tw:bg-muted tw:px-[0.3em] tw:py-[0.2em] tw:font-mono tw:text-sm tw:whitespace-pre-wrap">
      {props.children}
    </PlateLeaf>
  );
}
