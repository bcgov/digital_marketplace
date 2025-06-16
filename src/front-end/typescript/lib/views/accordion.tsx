import { component } from "front-end/lib/framework";
import { ThemeColor } from "front-end/lib/types";
import Icon, { AvailableIcons } from "front-end/lib/views/icon";
import Link from "front-end/lib/views/link";
import React from "react";

export interface Props {
  open: boolean;
  disabled?: boolean;
  color: ThemeColor;
  title: string | component.base.ViewElement;
  titleClassName?: string;
  icon?: AvailableIcons;
  iconWidth?: number;
  iconHeight?: number;
  iconClassName?: string;
  iconColor?: ThemeColor;
  chevronWidth?: number;
  chevronHeight?: number;
  chevronClassName?: string;
  linkClassName?: string;
  className?: string;
  children: component.base.ViewElementChildren;
  childrenWrapperClassName?: string;
  toggle(): void;
}

export const view: component.base.View<Props> = (props) => {
  const {
    open,
    disabled,
    color,
    title,
    titleClassName = "",
    icon,
    iconWidth,
    iconHeight,
    iconClassName,
    iconColor,
    chevronWidth,
    chevronHeight,
    className = "",
    children,
    childrenWrapperClassName = "",
    chevronClassName = "",
    linkClassName = "",
    toggle
  } = props;
  return (
    <div className={`pt-2 ${open ? "pb-4" : "pb-2"} ${className}`}>
      <Link
        color={color}
        disabled={disabled}
        className={`align-items-center flex-nowrap w-100 text-decoration-none ${linkClassName}`}
        onClick={toggle}>
        <div className="d-flex align-items-center flex-nowrap">
          {icon ? (
            <Icon
              name={icon}
              color={iconColor}
              className={`me-2 ${iconClassName}`}
              width={iconWidth}
              height={iconHeight}
            />
          ) : null}
          <div className={titleClassName}>{title}</div>
        </div>
        <div className="ms-auto">
          <Icon
            className={chevronClassName}
            name={open ? "chevron-up" : "chevron-down"}
            width={chevronWidth}
            height={chevronHeight}
          />
        </div>
      </Link>
      <div
        className={`${childrenWrapperClassName} ${open ? "mt-4" : "d-none"}`}>
        {children}
      </div>
    </div>
  );
};

export default view;
