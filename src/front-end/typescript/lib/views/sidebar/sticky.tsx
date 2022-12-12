import { component } from "front-end/lib/framework";
import React from "react";

/**
 * This view makes it children sticky (to the top)
 * of the sidebar on desktop (md and up) viewports.
 */

export interface Props {
  children: component.base.ViewElementChildren;
  className?: string;
}

export const view: component.base.View<Props> = ({
  children,
  className = ""
}) => {
  return <div className={`sticky-md ${className}`}>{children}</div>;
};

export default view;
