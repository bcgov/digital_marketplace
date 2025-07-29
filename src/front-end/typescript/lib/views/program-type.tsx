import { component } from "front-end/lib/framework";
import Icon from "front-end/lib/views/icon";
import React from "react";

export type ProgramType = "cwu" | "swu" | "twu";

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
      className={`d-flex flex-nowrap align-items-center fw-bold text-info ${sizeClassName} ${className}`}>
      <Icon
        className="me-2 flex-shrink-0 flex-grow-0"
        width={iconSize}
        height={iconSize}
        name={
          type_ === "cwu" ? "code" : type_ === "swu" ? "users-class" : "trophy"
        }
      />
      {type_ === "cwu"
        ? "Code With Us"
        : type_ === "swu"
        ? "Sprint With Us"
        : "Team With Us"}
    </div>
  );
};

export default ProgramType;
