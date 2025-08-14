"use client";

import React from "react";

import type { TListElement } from "platejs";

import { isOrderedList } from "@platejs/list";
import {
  useTodoListElement,
  useTodoListElementState
} from "@platejs/list/react";
import {
  type PlateElementProps,
  type RenderNodeWrapper,
  useReadOnly
} from "platejs/react";

import { Checkbox } from "./checkbox";
import { cn } from "./utils";

const config: Record<
  string,
  {
    Li: React.FC<PlateElementProps>;
    Marker: React.FC<PlateElementProps>;
  }
> = {
  todo: {
    Li: TodoLi,
    Marker: TodoMarker
  }
};

export const BlockList: RenderNodeWrapper = (props) => {
  if (!props.element.listStyleType) return;

  return (props) => <List {...props} />;
};

function List(props: PlateElementProps) {
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

function TodoMarker(props: PlateElementProps) {
  const state = useTodoListElementState({ element: props.element });
  const { checkboxProps } = useTodoListElement(state);
  const readOnly = useReadOnly();

  return (
    <div contentEditable={false}>
      <Checkbox
        className={cn(
          "tw:absolute tw:top-1 tw:-left-6",
          readOnly && "tw:pointer-events-none"
        )}
        {...checkboxProps}
      />
    </div>
  );
}

function TodoLi(props: PlateElementProps) {
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
