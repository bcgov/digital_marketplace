import * as React from "react";

import type {
  RenderStaticNodeWrapper,
  SlateRenderElementProps,
  TListElement
} from "platejs";

import { isOrderedList } from "@platejs/list";
import { CheckIcon } from "lucide-react";

import { cn } from "./utils";

const config: Record<
  string,
  {
    Li: React.FC<SlateRenderElementProps>;
    Marker: React.FC<SlateRenderElementProps>;
  }
> = {
  todo: {
    Li: TodoLiStatic,
    Marker: TodoMarkerStatic
  }
};

export const BlockListStatic: RenderStaticNodeWrapper = (props) => {
  if (!props.element.listStyleType) return;

  return (props) => <List {...props} />;
};

function List(props: SlateRenderElementProps) {
  const { listStart, listStyleType } = props.element as TListElement;
  const { Li, Marker } = config[listStyleType] ?? {};
  const List = isOrderedList(props.element) ? "ol" : "ul";

  return (
    <List
      className="tw:relative tw:m-0 tw:p-0"
      style={{ listStyleType }}
      start={listStart}>
      {Marker && <Marker {...props} />}
      {Li ? <Li {...props} /> : <li>{props.children}</li>}
    </List>
  );
}

function TodoMarkerStatic(props: SlateRenderElementProps) {
  const checked = props.element.checked as boolean;

  return (
    <div contentEditable={false}>
      <button
        className={cn(
          "tw:peer tw:pointer-events-none tw:absolute tw:top-1 tw:-left-6 tw:size-4 tw:shrink-0 tw:rounded-sm tw:border tw:border-primary tw:bg-background tw:ring-offset-background tw:focus-visible:ring-2 tw:focus-visible:ring-ring tw:focus-visible:ring-offset-2 tw:focus-visible:outline-none tw:data-[state=checked]:bg-primary tw:data-[state=checked]:text-primary-foreground",
          props.className
        )}
        data-state={checked ? "checked" : "unchecked"}
        type="button">
        <div
          className={cn(
            "tw:flex tw:items-center tw:justify-center tw:text-current"
          )}>
          {checked && <CheckIcon className="tw:size-4" />}
        </div>
      </button>
    </div>
  );
}

function TodoLiStatic(props: SlateRenderElementProps) {
  return (
    <li
      className={cn(
        "tw:list-none",
        (props.element.checked as boolean) &&
          "tw:text-muted-foreground tw:line-through"
      )}>
      {props.children}
    </li>
  );
}
