import * as React from "react";

import type { SlateEditor, SlateElementProps, TElement } from "platejs";

import { type Heading, BaseTocPlugin, isHeading } from "@platejs/toc";
import { cva } from "class-variance-authority";
import { NodeApi, SlateElement } from "platejs";

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

export function TocElementStatic(props: SlateElementProps) {
  const { editor } = props;
  const headingList = getHeadingList(editor);

  return (
    <SlateElement {...props} className="tw:mb-1 tw:p-0">
      <div>
        {headingList.length > 0 ? (
          headingList.map((item) => (
            <Button
              key={item.title}
              variant="ghost"
              className={headingItemVariants({
                depth: item.depth as 1 | 2 | 3
              })}>
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
    </SlateElement>
  );
}

const headingDepth: Record<string, number> = {
  h1: 1,
  h2: 2,
  h3: 3,
  h4: 4,
  h5: 5,
  h6: 6
};

const getHeadingList = (editor?: SlateEditor) => {
  if (!editor) return [];

  const options = editor.getOptions(BaseTocPlugin);

  if (options.queryHeading) {
    return options.queryHeading(editor);
  }

  const headingList: Heading[] = [];

  const values = editor.api.nodes<TElement>({
    at: [],
    match: (n) => isHeading(n)
  });

  if (!values) return [];

  Array.from(values, ([node, path]) => {
    const { type } = node;
    const title = NodeApi.string(node);
    const depth = headingDepth[type];
    const id = node.id as string;

    if (title) {
      headingList.push({ id, depth, path, title, type });
    }
  });

  return headingList;
};
