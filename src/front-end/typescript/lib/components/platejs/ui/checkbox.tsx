"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";

import { cn } from "./utils";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "tw:peer tw:border-input tw:dark:bg-input/30 tw:data-[state=checked]:bg-primary tw:data-[state=checked]:text-primary-foreground tw:dark:data-[state=checked]:bg-primary tw:data-[state=checked]:border-primary tw:focus-visible:border-ring tw:focus-visible:ring-ring/50 tw:aria-invalid:ring-destructive/20 tw:dark:aria-invalid:ring-destructive/40 tw:aria-invalid:border-destructive tw:size-4 tw:shrink-0 tw:rounded-[4px] tw:border tw:shadow-xs tw:transition-shadow tw:outline-none tw:focus-visible:ring-[3px] tw:disabled:cursor-not-allowed tw:disabled:opacity-50",
        className
      )}
      {...props}>
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="tw:flex tw:items-center tw:justify-center tw:text-current tw:transition-none">
        <CheckIcon className="tw:size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
