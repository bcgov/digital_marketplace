"use client";

import * as React from "react";

import type { PlateElementProps } from "platejs/react";

import { useTocElement, useTocElementState } from "@platejs/toc/react";
import { cva } from "class-variance-authority";
import { PlateElement } from "platejs/react";

import { Button } from "./button";

const headingItemVariants = cva(
  "tw:block tw:h-auto tw:w-full tw:cursor-pointer tw:truncate tw:rounded-none tw:px-0.5 tw:py-1.5 tw:text-left tw:font-medium tw:text-muted-foreground tw:underline tw:decoration-[0.5px] tw:underline-offset-4 tw:hover:bg-accent tw:hover:text-muted-foreground",
  {
    variants: {
      depth: {
        1: "tw:pl-0.5",
        2: "tw:pl-[26px]",
        3: "tw:pl-[50px]"
      }
    }
  }
);

export function TocElement(props: PlateElementProps) {
  const state = useTocElementState();
  const { props: btnProps } = useTocElement(state);
  const { headingList } = state;

  return (
    <PlateElement {...props} className="tw:mb-1 tw:p-0">
      <div contentEditable={false}>
        {headingList.length > 0 ? (
          headingList.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className={headingItemVariants({
                depth: item.depth as 1 | 2 | 3
              })}
              onClick={(e) => btnProps.onClick(e, item, "smooth")}
              aria-current>
              {item.title}
            </Button>
          ))
        ) : (
          <div className="tw:text-sm tw:text-gray-500">
            Create a heading to display the table of contents.
          </div>
        )}
      </div>
      {props.children}
    </PlateElement>
  );
}
