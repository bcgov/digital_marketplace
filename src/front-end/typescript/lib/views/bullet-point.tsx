import { component } from "front-end/lib/framework";
import { ThemeColor } from "front-end/lib/types";
import Icon, { AvailableIcons } from "front-end/lib/views/icon";
import React from "react";

export interface Props {
  icon: AvailableIcons;
  iconColor: ThemeColor;
  header: string;
  subText?: string;
  className?: string;
}

export const BulletPoint: component.base.View<Props> = ({
  icon,
  iconColor = "info",
  header,
  subText,
  className
}) => {
  return (
    <div className={`d-flex ${className}`}>
      <Icon className="flex-shrink-0" name={icon} color={iconColor} />
      <div className="ms-2">
        <h6 className="m-0">{header}</h6>
        <span className="font-size-small">{subText}</span>
      </div>
    </div>
  );
};

export default BulletPoint;
