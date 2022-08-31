import { component } from "front-end/lib/framework";
import Icon from "front-end/lib/views/icon";
import React from "react";

export type ProgramType = "cwu" | "swu";

export interface Props {
  type_: ProgramType;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const ProgramType: component.base.View<Props> = ({
  type_,
  className = "",
  size = "md"
}) => {
  const sizeClassName = (() => {
    switch (size) {
      case "sm":
        return "font-size-small";
      case "md":
        return "font-size-base";
      case "lg":
        return "font-size-large";
    }
  })();
  const iconSize = (() => {
    switch (size) {
      case "sm":
        return 0.9;
      case "md":
        return 1;
      case "lg":
        return 1.2;
    }
  })();
  return (
    <div
      className={`d-flex flex-nowrap align-items-center font-weight-bold text-info ${sizeClassName} ${className}`}>
      <Icon
        className="mr-2 flex-shrink-0 flex-grow-0"
        width={iconSize}
        height={iconSize}
        name={type_ === "cwu" ? "code" : "users-class"}
      />
      {type_ === "cwu" ? "Code With Us" : "Sprint With Us"}
    </div>
  );
};

export default ProgramType;
