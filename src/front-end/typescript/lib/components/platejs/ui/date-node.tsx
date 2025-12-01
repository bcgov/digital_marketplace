"use client";

import type { TDateElement } from "platejs";
import type { PlateElementProps } from "platejs/react";

import { PlateElement, useReadOnly } from "platejs/react";

import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "./utils";

export function DateElement(props: PlateElementProps<TDateElement>) {
  const { editor, element } = props;

  const readOnly = useReadOnly();

  const trigger = (
    <span
      className={cn(
        "tw:w-fit tw:cursor-pointer tw:rounded-sm tw:bg-muted tw:px-1 tw:text-muted-foreground"
      )}
      contentEditable={false}
      draggable>
      {element.date ? (
        (() => {
          const today = new Date();
          const elementDate = new Date(element.date);
          const isToday =
            elementDate.getDate() === today.getDate() &&
            elementDate.getMonth() === today.getMonth() &&
            elementDate.getFullYear() === today.getFullYear();

          const isYesterday =
            new Date(today.setDate(today.getDate() - 1)).toDateString() ===
            elementDate.toDateString();
          const isTomorrow =
            new Date(today.setDate(today.getDate() + 2)).toDateString() ===
            elementDate.toDateString();

          if (isToday) return "Today";
          if (isYesterday) return "Yesterday";
          if (isTomorrow) return "Tomorrow";

          return elementDate.toLocaleDateString(undefined, {
            day: "numeric",
            month: "long",
            year: "numeric"
          });
        })()
      ) : (
        <span>Pick a date</span>
      )}
    </span>
  );

  if (readOnly) {
    return trigger;
  }

  return (
    <PlateElement
      {...props}
      className="tw:inline-block"
      attributes={{
        ...props.attributes,
        contentEditable: false
      }}>
      <Popover>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent className="tw:w-auto tw:p-0">
          <Calendar
            selected={new Date(element.date as string)}
            onSelect={(date) => {
              if (!date) return;

              editor.tf.setNodes(
                { date: date.toDateString() },
                { at: element }
              );
            }}
            mode="single"
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {props.children}
    </PlateElement>
  );
}
