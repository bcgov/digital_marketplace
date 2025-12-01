import * as React from "react";

import type { SlateElementProps } from "platejs";

import { type VariantProps, cva } from "class-variance-authority";
import { SlateElement } from "platejs";

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

export function HeadingElementStatic({
  variant = "h1",
  ...props
}: SlateElementProps & VariantProps<typeof headingVariants>) {
  return (
    <SlateElement
      as={variant!}
      className={headingVariants({ variant })}
      {...props}>
      {props.children}
    </SlateElement>
  );
}

export function H1ElementStatic(props: SlateElementProps) {
  return <HeadingElementStatic variant="h1" {...props} />;
}

export function H2ElementStatic(
  props: React.ComponentProps<typeof HeadingElementStatic>
) {
  return <HeadingElementStatic variant="h2" {...props} />;
}

export function H3ElementStatic(
  props: React.ComponentProps<typeof HeadingElementStatic>
) {
  return <HeadingElementStatic variant="h3" {...props} />;
}

export function H4ElementStatic(
  props: React.ComponentProps<typeof HeadingElementStatic>
) {
  return <HeadingElementStatic variant="h4" {...props} />;
}

export function H5ElementStatic(
  props: React.ComponentProps<typeof HeadingElementStatic>
) {
  return <HeadingElementStatic variant="h5" {...props} />;
}

export function H6ElementStatic(
  props: React.ComponentProps<typeof HeadingElementStatic>
) {
  return <HeadingElementStatic variant="h6" {...props} />;
}
