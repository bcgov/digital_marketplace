"use client";

import * as React from "react";
import TextareaAutosize, {
  type TextareaAutosizeProps
} from "react-textarea-autosize";

import type { TEquationElement } from "platejs";
import type { PlateElementProps } from "platejs/react";

import { useEquationElement, useEquationInput } from "@platejs/math/react";
import { BlockSelectionPlugin } from "@platejs/selection/react";
import { CornerDownLeftIcon, RadicalIcon } from "lucide-react";
import {
  createPrimitiveComponent,
  PlateElement,
  useEditorRef,
  useEditorSelector,
  useElement,
  useReadOnly,
  useSelected
} from "platejs/react";

import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "./utils";

export function EquationElement(props: PlateElementProps<TEquationElement>) {
  const selected = useSelected();
  const [open, setOpen] = React.useState(selected);
  const katexRef = React.useRef<HTMLDivElement | null>(null);

  useEquationElement({
    element: props.element,
    katexRef: katexRef,
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
    <PlateElement className="tw:my-1" {...props}>
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <div
            className={cn(
              "tw:group tw:flex tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-sm tw:select-none tw:hover:bg-primary/10 tw:data-[selected=true]:bg-primary/10",
              props.element.texExpression.length === 0
                ? "tw:bg-muted tw:p-3 tw:pr-9"
                : "tw:px-2 tw:py-1"
            )}
            data-selected={selected}
            contentEditable={false}
            role="button">
            {props.element.texExpression.length > 0 ? (
              <span ref={katexRef} />
            ) : (
              <div className="tw:flex tw:h-7 tw:w-full tw:items-center tw:gap-2 tw:text-sm tw:whitespace-nowrap tw:text-muted-foreground">
                <RadicalIcon className="tw:size-6 tw:text-muted-foreground/80" />
                <div>Add a Tex equation</div>
              </div>
            )}
          </div>
        </PopoverTrigger>

        <EquationPopoverContent
          open={open}
          placeholder={`f(x) = \\begin{cases}\n  x^2, &\\quad x > 0 \\\\\n  0, &\\quad x = 0 \\\\\n  -x^2, &\\quad x < 0\n\\end{cases}`}
          isInline={false}
          setOpen={setOpen}
        />
      </Popover>

      {props.children}
    </PlateElement>
  );
}

export function InlineEquationElement(
  props: PlateElementProps<TEquationElement>
) {
  const element = props.element;
  const katexRef = React.useRef<HTMLDivElement | null>(null);
  const selected = useSelected();
  const isCollapsed = useEditorSelector(
    (editor) => editor.api.isCollapsed(),
    []
  );
  const [open, setOpen] = React.useState(selected && isCollapsed);

  React.useEffect(() => {
    if (selected && isCollapsed) {
      setOpen(true);
    }
  }, [selected, isCollapsed]);

  useEquationElement({
    element,
    katexRef: katexRef,
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
    <PlateElement
      {...props}
      className={cn(
        "tw:mx-1 tw:inline-block tw:rounded-sm tw:select-none tw:[&_.katex-display]:my-0!"
      )}>
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <div
            className={cn(
              "tw:after:absolute tw:after:inset-0 tw:after:-top-0.5 tw:after:-left-1 tw:after:z-1 tw:after:h-[calc(100%)+4px] tw:after:w-[calc(100%+8px)] tw:after:rounded-sm tw:after:content-[]",
              "tw:h-6",
              ((element.texExpression.length > 0 && open) || selected) &&
                "tw:after:bg-brand/15",
              element.texExpression.length === 0 &&
                "tw:text-muted-foreground tw:after:bg-neutral-500/10"
            )}
            contentEditable={false}>
            <span
              ref={katexRef}
              className={cn(
                element.texExpression.length === 0 && "tw:hidden",
                "tw:font-mono tw:leading-none"
              )}
            />
            {element.texExpression.length === 0 && (
              <span>
                <RadicalIcon className="tw:mr-1 tw:inline-block tw:h-[19px] tw:w-4 tw:py-[1.5px] tw:align-text-bottom" />
                New equation
              </span>
            )}
          </div>
        </PopoverTrigger>

        <EquationPopoverContent
          className="tw:my-auto"
          open={open}
          placeholder="E = mc^2"
          setOpen={setOpen}
          isInline
        />
      </Popover>

      {props.children}
    </PlateElement>
  );
}

const EquationInput = createPrimitiveComponent(TextareaAutosize)({
  propsHook: useEquationInput
});

const EquationPopoverContent = ({
  className,
  isInline,
  open,
  setOpen,
  ...props
}: {
  isInline: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
} & TextareaAutosizeProps) => {
  const editor = useEditorRef();
  const readOnly = useReadOnly();
  const element = useElement<TEquationElement>();

  React.useEffect(() => {
    if (isInline && open) {
      setOpen(true);
    }
  }, [isInline, open, setOpen]);

  if (readOnly) return null;

  const onClose = () => {
    setOpen(false);

    if (isInline) {
      editor.tf.select(element, { focus: true, next: true });
    } else {
      editor
        .getApi(BlockSelectionPlugin)
        .blockSelection.set(element.id as string);
    }
  };

  return (
    <PopoverContent
      className="tw:flex tw:gap-2"
      onEscapeKeyDown={(e) => {
        e.preventDefault();
      }}
      contentEditable={false}>
      <EquationInput
        className={cn(
          "tw:max-h-[50vh] tw:grow tw:resize-none tw:p-2 tw:text-sm",
          className
        )}
        state={{ isInline, open, onClose }}
        autoFocus
        {...props}
      />

      <Button variant="secondary" className="tw:px-3" onClick={onClose}>
        Done <CornerDownLeftIcon className="tw:size-3.5" />
      </Button>
    </PopoverContent>
  );
};
