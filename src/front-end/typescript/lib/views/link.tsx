import router from "front-end/lib/app/router";
import { Route } from "front-end/lib/app/types";
import { component } from "front-end/lib/framework";
import { ButtonColor, TextColor } from "front-end/lib/types";
import Icon, { AvailableIcons } from "front-end/lib/views/icon";
import React, { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { Spinner } from "reactstrap";
import { adt, ADT, adtCurried } from "shared/lib/types";

type RouteDest = ADT<"route", Route>;
export const routeDest = adtCurried<RouteDest>("route");

type ExternalDest = ADT<"external", string>;
export const externalDest = adtCurried<ExternalDest>("external");

type EmailDest = ADT<"email", [string, string?]>; //[to, subject]
export const emailDest = adtCurried<EmailDest>("email");

export type Dest = RouteDest | ExternalDest | EmailDest;

type IconLinkSymbol = ADT<"icon", AvailableIcons>;
export const iconLinkSymbol = adtCurried<IconLinkSymbol>("icon");

type ImageLinkSymbol = ADT<"image", string>;
export const imageLinkSymbol = adtCurried<ImageLinkSymbol>("image");

type EmptyIconLinkSymbol = ADT<"emptyIcon">;
export const emptyIconLinkSymbol = () => adt("emptyIcon" as const);

export function makeEmptyLinkSymbol(
  s?: Placement<LinkSymbol>
): Placement<LinkSymbol> | undefined {
  if (s && s.value.tag === "icon") {
    return adt(s.tag, emptyIconLinkSymbol());
  } else {
    return undefined;
  }
}

export type LinkSymbol = IconLinkSymbol | ImageLinkSymbol | EmptyIconLinkSymbol;

interface LinkSymbolProps {
  symbol_: LinkSymbol;
  iconSymbolSize?: number;
  className?: string;
  style?: CSSProperties;
}

const ICON_SIZE_LINK = 1; //rem
const ICON_SIZE_SMALL_BUTTON = 1; //rem
const ICON_SIZE_MEDIUM_BUTTON = 1.2; //rem

const LinkSymbol: component.base.View<LinkSymbolProps> = ({
  symbol_,
  iconSymbolSize = ICON_SIZE_LINK,
  className = "",
  style
}) => {
  className = `${className} flex-shrink-0 flex-grow-0`;
  switch (symbol_.tag) {
    case "icon":
      return (
        <Icon
          name={symbol_.value}
          className={className}
          width={iconSymbolSize}
          height={iconSymbolSize}
          style={style}
        />
      );
    case "image":
      return (
        <img
          src={symbol_.value}
          className={className}
          style={{
            width: "1.75rem",
            height: "1.75rem",
            objectFit: "cover",
            borderRadius: "50%",
            ...style
          }}
        />
      );
    case "emptyIcon":
      return (
        <div
          style={{
            width: `${iconSymbolSize}rem`,
            height: `${iconSymbolSize}rem`,
            ...style
          }}
          className={className}></div>
      );
  }
};

type LeftPlacement<Value> = ADT<"left", Value>;

export function leftPlacement<Value>(value: Value): LeftPlacement<Value> {
  return adt("left", value);
}

type RightPlacement<Value> = ADT<"right", Value>;

export function rightPlacement<Value>(value: Value): RightPlacement<Value> {
  return adt("right", value);
}

export type Placement<Value> = LeftPlacement<Value> | RightPlacement<Value>;

interface BaseProps {
  tag?: "a" | "div";
  dest?: Dest;
  symbol_?: Placement<LinkSymbol>;
  symbolClassName?: string;
  symbolStyle?: CSSProperties;
  iconSymbolSize?: number; //rem
  children?: component.base.ViewElementChildren;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  newTab?: boolean;
  focusable?: boolean;
  onClick?(e?: MouseEvent): void;
}

export interface AnchorProps extends BaseProps {
  button?: false | undefined;
  color?: TextColor | "inherit";
  nav?: boolean;
  download?: boolean;
}

export interface ButtonProps extends BaseProps {
  button: true;
  outline?: boolean;
  loading?: boolean;
  color?: ButtonColor;
  size?: "sm" | "md" | "lg";
}

export type Props = AnchorProps | ButtonProps;

export type OmitProps<OmitKeys extends keyof BaseProps | "" = ""> =
  | Omit<AnchorProps, OmitKeys>
  | Omit<ButtonProps, OmitKeys>;

export type ExtendProps<Extension> =
  | (AnchorProps & Extension)
  | (ButtonProps & Extension);

export type ExtendAndOmitProps<Extension, OmitKeys extends keyof BaseProps> =
  | (Omit<AnchorProps, OmitKeys> & Extension)
  | (Omit<ButtonProps, OmitKeys> & Extension);

function AnchorLink(props: AnchorProps) {
  // Initialize props.
  const {
    dest,
    color,
    nav = false,
    className = "",
    style,
    disabled = false,
    children,
    onClick,
    newTab = false,
    download = false,
    symbol_,
    symbolClassName = "",
    symbolStyle,
    iconSymbolSize,
    focusable = true,
    tag = "a"
  } = props;
  const href: string | undefined = (() => {
    if (disabled) {
      return undefined;
    }
    if (!dest) {
      return undefined;
    }
    switch (dest.tag) {
      case "route":
        return router.routeToUrl(dest.value);
      case "external":
        return dest.value;
      case "email":
        return `mailto:${dest.value[0]}${
          dest.value[1] ? `?subject=${dest.value[1]}` : ""
        }`;
    }
  })();
  let finalClassName = "a d-inline-flex align-items-center flex-nowrap";
  finalClassName += nav ? " nav-link" : "";
  finalClassName += disabled ? " disabled" : "";
  finalClassName += color && color !== "inherit" ? ` text-${color}` : "";
  finalClassName +=
    color && color !== "inherit" && !disabled ? ` text-hover-${color}` : "";
  finalClassName += ` ${className}`;
  const finalOnClick =
    !disabled && onClick
      ? (e: MouseEvent) => {
          if (!newTab && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
          }
          onClick(e);
        }
      : undefined;
  const finalOnKeyUp =
    !disabled && !newTab && !dest && onClick
      ? (e: KeyboardEvent) => {
          const code = e.keyCode || e.which;
          // Simulate click if the user presses the enter or space keys.
          if (code === 13 || code === 32) {
            e.preventDefault();
            onClick();
          }
        }
      : undefined;
  const finalProps = {
    href,
    tabIndex: !disabled && focusable ? 0 : -1,
    onClick: finalOnClick,
    onKeyUp: finalOnKeyUp,
    style: {
      ...style,
      color: (() => {
        if (color === "inherit") {
          return "inherit";
        } else if (style && style.color) {
          return style.color;
        } else {
          return undefined;
        }
      })()
    },
    className: finalClassName,
    target: newTab ? "_blank" : undefined,
    download,
    rel: dest && dest.tag === "external" ? "external" : undefined
  };
  const Tag = tag;
  return (
    <Tag {...finalProps}>
      {symbol_ && symbol_.tag === "left" ? (
        <LinkSymbol
          symbol_={symbol_.value}
          iconSymbolSize={iconSymbolSize}
          className={`me-2 ${symbolClassName}`}
          style={symbolStyle}
        />
      ) : null}
      {children}
      {symbol_ && symbol_.tag === "right" ? (
        <LinkSymbol
          symbol_={symbol_.value}
          iconSymbolSize={iconSymbolSize}
          className={`ms-2 ${symbolClassName}`}
          style={symbolStyle}
        />
      ) : null}
    </Tag>
  );
}

export function ButtonLink(props: ButtonProps) {
  const {
    color,
    className = "",
    size = "md",
    outline = false,
    children,
    loading,
    symbol_
  } = props;
  const disabled = props.disabled !== undefined ? props.disabled : loading;
  const anchorProps: AnchorProps = {
    ...props,
    disabled,
    symbol_: loading ? makeEmptyLinkSymbol(symbol_) : symbol_,
    children: undefined,
    button: false,
    color: undefined,
    className: `${className} position-relative btn btn-${size} ${
      color ? `btn-${!disabled && outline ? "outline-" : ""}${color}` : ""
    }`,
    iconSymbolSize:
      props.iconSymbolSize ||
      (() => {
        switch (size) {
          case "sm":
            return ICON_SIZE_SMALL_BUTTON;
          case "md":
            return ICON_SIZE_MEDIUM_BUTTON;
          case "lg":
            return ICON_SIZE_MEDIUM_BUTTON;
        }
      })()
  };
  return (
    <AnchorLink {...anchorProps}>
      {loading ? (
        <div>
          <div
            className="position-absolute d-flex"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)"
            }}>
            <Spinner color="light" size="sm" />
          </div>
          <div className="o-0 d-inline-flex align-items-center flex-nowrap">
            {children}
          </div>
        </div>
      ) : (
        children
      )}
    </AnchorLink>
  );
}

function Link(props: Props) {
  if (props.button) {
    return <ButtonLink {...props} />;
  } else {
    return <AnchorLink {...props} />;
  }
}

export default Link;
