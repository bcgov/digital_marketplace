import { component } from "front-end/lib/framework";
import React, { Fragment } from "react";

interface DescriptionItem {
  name: string;
  children: component.base.ViewElementChildren;
  className?: string;
}

export const DescriptionItem: component.base.View<DescriptionItem> = ({
  className = "",
  name,
  children
}) => {
  return (
    <div
      className={`d-flex flex-row flex-nowrap align-items-stretch ${className}`}>
      <div className="fw-bold align-self-start">{name}</div>
      <div className="ms-3 d-flex align-items-center">{children}</div>
    </div>
  );
};

export interface Props {
  // Allow null values to simplify usage of dynamic DescriptionLists.
  items: Array<DescriptionItem | null>;
  className?: string;
}

export const DescriptionList: component.base.View<Props> = ({
  items,
  className
}) => {
  items = items.filter((i) => !!i);
  return (
    <div className={className}>
      {items.map(
        (detail, i) =>
          detail && (
            <Fragment key={`description-list-items-${i}`}>
              <DescriptionItem
                {...detail}
                className={i < items.length - 1 ? "mb-3" : ""}
              />
            </Fragment>
          )
      )}
    </div>
  );
};

export default DescriptionList;
