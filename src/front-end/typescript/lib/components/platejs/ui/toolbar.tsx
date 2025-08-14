"use client";

import * as React from "react";

import * as ToolbarPrimitive from "@radix-ui/react-toolbar";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { type VariantProps, cva } from "class-variance-authority";
import { ChevronDown } from "lucide-react";

import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator
} from "./dropdown-menu";
import { Separator } from "./separator";
import { Tooltip, TooltipTrigger } from "./tooltip";
import { cn } from "./utils";

export function Toolbar({
  className,
  ...props
}: React.ComponentProps<typeof ToolbarPrimitive.Root>) {
  return (
    <ToolbarPrimitive.Root
      className={cn(
        "tw:relative tw:flex tw:items-center tw:select-none",
        className
      )}
      {...props}
    />
  );
}

export function ToolbarToggleGroup({
  className,
  ...props
}: React.ComponentProps<typeof ToolbarPrimitive.ToolbarToggleGroup>) {
  return (
    <ToolbarPrimitive.ToolbarToggleGroup
      className={cn("tw:flex tw:items-center", className)}
      {...props}
    />
  );
}

export function ToolbarLink({
  className,
  ...props
}: React.ComponentProps<typeof ToolbarPrimitive.Link>) {
  return (
    <ToolbarPrimitive.Link
      className={cn(
        "tw:font-medium tw:underline tw:underline-offset-4",
        className
      )}
      {...props}
    />
  );
}

export function ToolbarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof ToolbarPrimitive.Separator>) {
  return (
    <ToolbarPrimitive.Separator
      className={cn(
        "tw:mx-2 tw:my-1 tw:w-px tw:shrink-0 tw:bg-border",
        className
      )}
      {...props}
    />
  );
}

// From toggleVariants
const toolbarButtonVariants = cva(
  "tw:inline-flex tw:cursor-pointer tw:items-center tw:justify-center tw:gap-2 tw:rounded-md tw:text-sm tw:font-medium tw:whitespace-nowrap tw:transition-[color,box-shadow] tw:outline-none tw:hover:bg-muted tw:hover:text-muted-foreground tw:focus-visible:border-ring tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/50 tw:disabled:pointer-events-none tw:disabled:opacity-50 tw:aria-checked:bg-accent tw:aria-checked:text-accent-foreground tw:aria-invalid:border-destructive tw:aria-invalid:ring-destructive/20 tw:dark:aria-invalid:ring-destructive/40 tw:[&_svg]:pointer-events-none tw:[&_svg]:shrink-0 tw:[&_svg:not([class*=size-])]:size-4",
  {
    defaultVariants: {
      size: "default",
      variant: "default"
    },
    variants: {
      size: {
        default: "tw:h-9 tw:min-w-9 tw:px-2",
        lg: "tw:h-10 tw:min-w-10 tw:px-2.5",
        sm: "tw:h-8 tw:min-w-8 tw:px-1.5"
      },
      variant: {
        default: "tw:bg-transparent",
        outline:
          "tw:border tw:border-input tw:bg-transparent tw:shadow-xs tw:hover:bg-accent tw:hover:text-accent-foreground"
      }
    }
  }
);

const dropdownArrowVariants = cva(
  cn(
    "inline-flex items-center justify-center rounded-r-md text-sm font-medium text-foreground transition-colors disabled:pointer-events-none disabled:opacity-50"
  ),
  {
    defaultVariants: {
      size: "sm",
      variant: "default"
    },
    variants: {
      size: {
        default: "tw:h-9 tw:w-6",
        lg: "tw:h-10 tw:w-8",
        sm: "tw:h-8 tw:w-4"
      },
      variant: {
        default:
          "tw:bg-transparent tw:hover:bg-muted tw:hover:text-muted-foreground tw:aria-checked:bg-accent tw:aria-checked:text-accent-foreground",
        outline:
          "tw:border tw:border-l-0 tw:border-input tw:bg-transparent tw:hover:bg-accent tw:hover:text-accent-foreground"
      }
    }
  }
);

type ToolbarButtonProps = {
  isDropdown?: boolean;
  pressed?: boolean;
} & Omit<
  React.ComponentPropsWithoutRef<typeof ToolbarToggleItem>,
  "asChild" | "value"
> &
  VariantProps<typeof toolbarButtonVariants>;

export const ToolbarButton = withTooltip(function ToolbarButton({
  children,
  className,
  isDropdown,
  pressed,
  size = "sm",
  variant,
  ...props
}: ToolbarButtonProps) {
  return typeof pressed === "boolean" ? (
    <ToolbarToggleGroup disabled={props.disabled} value="single" type="single">
      <ToolbarToggleItem
        className={cn(
          toolbarButtonVariants({
            size,
            variant
          }),
          isDropdown && "tw:justify-between tw:gap-1 tw:pr-1",
          className
        )}
        value={pressed ? "single" : ""}
        {...props}>
        {isDropdown ? (
          <>
            <div className="tw:flex tw:flex-1 tw:items-center tw:gap-2 tw:whitespace-nowrap">
              {children}
            </div>
            <div>
              <ChevronDown
                className="tw:size-3.5 tw:text-muted-foreground"
                data-icon
              />
            </div>
          </>
        ) : (
          children
        )}
      </ToolbarToggleItem>
    </ToolbarToggleGroup>
  ) : (
    <ToolbarPrimitive.Button
      className={cn(
        toolbarButtonVariants({
          size,
          variant
        }),
        isDropdown && "tw:pr-1",
        className
      )}
      {...props}>
      {children}
    </ToolbarPrimitive.Button>
  );
});

export function ToolbarSplitButton({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof ToolbarButton>) {
  return (
    <ToolbarButton
      className={cn(
        "tw:group tw:flex tw:gap-0 tw:px-0 tw:hover:bg-transparent",
        className
      )}
      {...props}
    />
  );
}

type ToolbarSplitButtonPrimaryProps = Omit<
  React.ComponentPropsWithoutRef<typeof ToolbarToggleItem>,
  "value"
> &
  VariantProps<typeof toolbarButtonVariants>;

export function ToolbarSplitButtonPrimary({
  children,
  className,
  size = "sm",
  variant,
  ...props
}: ToolbarSplitButtonPrimaryProps) {
  return (
    <span
      className={cn(
        toolbarButtonVariants({
          size,
          variant
        }),
        "tw:rounded-r-none",
        "tw:group-data-[pressed=true]:bg-accent tw:group-data-[pressed=true]:text-accent-foreground",
        className
      )}
      {...props}>
      {children}
    </span>
  );
}

export function ToolbarSplitButtonSecondary({
  className,
  size,
  variant,
  ...props
}: React.ComponentPropsWithoutRef<"span"> &
  VariantProps<typeof dropdownArrowVariants>) {
  return (
    <span
      className={cn(
        dropdownArrowVariants({
          size,
          variant
        }),
        "tw:group-data-[pressed=true]:bg-accent tw:group-data-[pressed=true]:text-accent-foreground",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      role="button"
      {...props}>
      <ChevronDown className="tw:size-3.5 tw:text-muted-foreground" data-icon />
    </span>
  );
}

export function ToolbarToggleItem({
  className,
  size = "sm",
  variant,
  ...props
}: React.ComponentProps<typeof ToolbarPrimitive.ToggleItem> &
  VariantProps<typeof toolbarButtonVariants>) {
  return (
    <ToolbarPrimitive.ToggleItem
      className={cn(toolbarButtonVariants({ size, variant }), className)}
      {...props}
    />
  );
}

export function ToolbarGroup({
  children,
  className
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "tw:group/toolbar-group",
        "tw:relative tw:hidden tw:has-[button]:flex",
        className
      )}>
      <div className="tw:flex tw:items-center">{children}</div>

      <div className="tw:mx-1.5 tw:py-0.5 tw:group-last/toolbar-group:hidden!">
        <Separator orientation="vertical" />
      </div>
    </div>
  );
}

type TooltipProps<T extends React.ElementType> = {
  tooltip?: React.ReactNode;
  tooltipContentProps?: Omit<
    React.ComponentPropsWithoutRef<typeof TooltipContent>,
    "children"
  >;
  tooltipProps?: Omit<
    React.ComponentPropsWithoutRef<typeof Tooltip>,
    "children"
  >;
  tooltipTriggerProps?: React.ComponentPropsWithoutRef<typeof TooltipTrigger>;
} & React.ComponentProps<T>;

function withTooltip<T extends React.ElementType>(Component: T) {
  return function ExtendComponent({
    tooltip,
    tooltipContentProps,
    tooltipProps,
    tooltipTriggerProps,
    ...props
  }: TooltipProps<T>) {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
      setMounted(true);
    }, []);

    const component = <Component {...(props as React.ComponentProps<T>)} />;

    if (tooltip && mounted) {
      return (
        <Tooltip {...tooltipProps}>
          <TooltipTrigger asChild {...tooltipTriggerProps}>
            {component}
          </TooltipTrigger>

          <TooltipContent {...tooltipContentProps}>{tooltip}</TooltipContent>
        </Tooltip>
      );
    }

    return component;
  };
}

function TooltipContent({
  children,
  className,
  // CHANGE
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        className={cn(
          "tw:z-50 tw:w-fit tw:origin-(--radix-tooltip-content-transform-origin) tw:rounded-md tw:bg-primary tw:px-3 tw:py-1.5 tw:text-xs tw:text-balance tw:text-primary-foreground",
          className
        )}
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        {...props}>
        {children}
        {/* CHANGE */}
        {/* <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-primary fill-primary" /> */}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export function ToolbarMenuGroup({
  children,
  className,
  label,
  ...props
}: React.ComponentProps<typeof DropdownMenuRadioGroup> & { label?: string }) {
  return (
    <>
      <DropdownMenuSeparator
        className={cn(
          "tw:hidden",
          "tw:mb-0 tw:shrink-0 tw:peer-has-[[role=menuitem]]/menu-group:block tw:peer-has-[[role=menuitemradio]]/menu-group:block tw:peer-has-[[role=option]]/menu-group:block"
        )}
      />

      <DropdownMenuRadioGroup
        {...props}
        className={cn(
          "tw:hidden",
          "tw:peer/menu-group tw:group/menu-group tw:my-1.5 tw:has-[[role=menuitem]]:block tw:has-[[role=menuitemradio]]:block tw:has-[[role=option]]:block",
          className
        )}>
        {label && (
          <DropdownMenuLabel className="tw:text-xs tw:font-semibold tw:text-muted-foreground tw:select-none">
            {label}
          </DropdownMenuLabel>
        )}
        {children}
      </DropdownMenuRadioGroup>
    </>
  );
}
