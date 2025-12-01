import * as React from "react";

import type { SlateElementProps, TEquationElement } from "platejs";

import { getEquationHtml } from "@platejs/math";
import { RadicalIcon } from "lucide-react";
import { SlateElement } from "platejs";

import { cn } from "./utils";

export function EquationElementStatic(
  props: SlateElementProps<TEquationElement>
) {
  const { element } = props;

  const html = getEquationHtml({
    element,
    options: {
      displayMode: true,
      errorColor: "#cc0000",
      fleqn: false,
      leqno: false,
      macros: { "\\f": "#1f(#2)" },
      output: "htmlAndMathml",
      strict: "warn",
      throwOnError: false,
      trust: false
    }
  });

  return (
    <SlateElement className="tw:my-1" {...props}>
      <div
        className={cn(
          "tw:group tw:flex tw:items-center tw:justify-center tw:rounded-sm tw:select-none tw:hover:bg-primary/10 tw:data-[selected=true]:bg-primary/10",
          element.texExpression.length === 0
            ? "tw:bg-muted tw:p-3 tw:pr-9"
            : "tw:px-2 tw:py-1"
        )}>
        {element.texExpression.length > 0 ? (
          <span
            dangerouslySetInnerHTML={{
              __html: html
            }}
          />
        ) : (
          <div className="tw:flex tw:h-7 tw:w-full tw:items-center tw:gap-2 tw:text-sm tw:whitespace-nowrap tw:text-muted-foreground">
            <RadicalIcon className="tw:size-6 tw:text-muted-foreground/80" />
            <div>Add a Tex equation</div>
          </div>
        )}
      </div>
      {props.children}
    </SlateElement>
  );
}

export function InlineEquationElementStatic(
  props: SlateElementProps<TEquationElement>
) {
  const html = getEquationHtml({
    element: props.element,
    options: {
      displayMode: true,
      errorColor: "#cc0000",
      fleqn: false,
      leqno: false,
      macros: { "\\f": "#1f(#2)" },
      output: "htmlAndMathml",
      strict: "warn",
      throwOnError: false,
      trust: false
    }
  });

  return (
    <SlateElement
      {...props}
      className="tw:inline-block tw:rounded-sm tw:select-none tw:[&_.katex-display]:my-0">
      <div
        className={cn(
          "tw:after:absolute tw:after:inset-0 tw:after:-top-0.5 tw:after:-left-1 tw:after:z-1 tw:after:h-[calc(100%)+4px] tw:after:w-[calc(100%+8px)] tw:after:rounded-sm tw:after:content-[]",
          "tw:h-6",
          props.element.texExpression.length === 0 &&
            "tw:text-muted-foreground tw:after:bg-neutral-500/10"
        )}>
        <span
          className={cn(
            props.element.texExpression.length === 0 && "tw:hidden",
            "tw:font-mono tw:leading-none"
          )}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      {props.children}
    </SlateElement>
  );
}
