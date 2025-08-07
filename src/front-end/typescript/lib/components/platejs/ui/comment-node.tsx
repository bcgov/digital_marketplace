"use client";

import * as React from "react";

import type { TCommentText } from "platejs";
import type { PlateLeafProps } from "platejs/react";

import { getCommentCount } from "@platejs/comment";
import { PlateLeaf, useEditorPlugin, usePluginOption } from "platejs/react";

import { cn } from "./utils";
import { commentPlugin } from "src/front-end/typescript/lib/components/platejs/components/editor/plugins/comment-kit";

export function CommentLeaf(props: PlateLeafProps<TCommentText>) {
  const { children, leaf } = props;

  const { api, setOption } = useEditorPlugin(commentPlugin);
  const hoverId = usePluginOption(commentPlugin, "hoverId");
  const activeId = usePluginOption(commentPlugin, "activeId");

  const isOverlapping = getCommentCount(leaf) > 1;
  const currentId = api.comment.nodeId(leaf);
  const isActive = activeId === currentId;
  const isHover = hoverId === currentId;

  return (
    <PlateLeaf
      {...props}
      className={cn(
        "tw:border-b-2 tw:border-b-highlight/[.36] tw:bg-highlight/[.13] tw:transition-colors tw:duration-200",
        (isHover || isActive) && "tw:border-b-highlight tw:bg-highlight/25",
        isOverlapping &&
          "tw:border-b-2 tw:border-b-highlight/[.7] tw:bg-highlight/25",
        (isHover || isActive) &&
          isOverlapping &&
          "tw:border-b-highlight tw:bg-highlight/45"
      )}
      attributes={{
        ...props.attributes,
        onClick: () => setOption("activeId", currentId ?? null),
        onMouseEnter: () => setOption("hoverId", currentId ?? null),
        onMouseLeave: () => setOption("hoverId", null)
      }}>
      {children}
    </PlateLeaf>
  );
}
