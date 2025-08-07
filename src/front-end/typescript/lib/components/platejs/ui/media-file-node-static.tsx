import * as React from "react";

import type { SlateElementProps, TFileElement } from "platejs";

import { FileUp } from "lucide-react";
import { SlateElement } from "platejs";

export function FileElementStatic(props: SlateElementProps<TFileElement>) {
  const { name, url } = props.element;

  return (
    <SlateElement className="tw:my-px tw:rounded-sm" {...props}>
      <a
        className="tw:group tw:relative tw:m-0 tw:flex tw:cursor-pointer tw:items-center tw:rounded tw:px-0.5 tw:py-[3px] tw:hover:bg-muted"
        contentEditable={false}
        download={name}
        href={url}
        rel="noopener noreferrer"
        role="button"
        target="_blank">
        <div className="tw:flex tw:items-center tw:gap-1 tw:p-1">
          <FileUp className="tw:size-5" />
          <div>{name}</div>
        </div>
      </a>
      {props.children}
    </SlateElement>
  );
}
