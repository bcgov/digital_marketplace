"use client";

import * as React from "react";

import type { PlateElementProps } from "platejs/react";

import { type VariantProps, cva } from "class-variance-authority";
import { PlateElement } from "platejs/react";

const headingVariants = cva("tw:relative tw:mb-1", {
  variants: {
    variant: {
      h1: "tw:mt-[1.6em] tw:pb-1 tw:font-heading tw:text-4xl tw:font-bold",
      h2: "tw:mt-[1.4em] tw:pb-px tw:font-heading tw:text-2xl tw:font-semibold tw:tracking-tight",
      h3: "tw:mt-[1em] tw:pb-px tw:font-heading tw:text-xl tw:font-semibold tw:tracking-tight",
      h4: "tw:mt-[0.75em] tw:font-heading tw:text-lg tw:font-semibold tw:tracking-tight",
      h5: "tw:mt-[0.75em] tw:text-lg tw:font-semibold tw:tracking-tight",
      h6: "tw:mt-[0.75em] tw:text-base tw:font-semibold tw:tracking-tight"
    }
  }
});

export function HeadingElement({
  variant = "h1",
  ...props
}: PlateElementProps & VariantProps<typeof headingVariants>) {
  return (
    <PlateElement
      as={variant!}
      className={headingVariants({ variant })}
      {...props}>
      {props.children}
    </PlateElement>
  );
}

export function H1Element(props: PlateElementProps) {
  return <HeadingElement variant="h1" {...props} />;
}

export function H2Element(props: PlateElementProps) {
  return <HeadingElement variant="h2" {...props} />;
}

export function H3Element(props: PlateElementProps) {
  return <HeadingElement variant="h3" {...props} />;
}

export function H4Element(props: PlateElementProps) {
  return <HeadingElement variant="h4" {...props} />;
}

export function H5Element(props: PlateElementProps) {
  return <HeadingElement variant="h5" {...props} />;
}

export function H6Element(props: PlateElementProps) {
  return <HeadingElement variant="h6" {...props} />;
}
