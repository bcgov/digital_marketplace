"use client";

import { BlockMenuPlugin } from "@platejs/selection/react";

import { BlockContextMenu } from "front-end/lib/components/platejs/ui/block-context-menu";

import { BlockSelectionKit } from "./block-selection-kit";

export const BlockMenuKit = [
  ...BlockSelectionKit,
  BlockMenuPlugin.configure({
    render: { aboveEditable: BlockContextMenu }
  })
];
