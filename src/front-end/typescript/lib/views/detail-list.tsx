import { View, ViewElementChildren } from "front-end/lib/framework";
import React, { Fragment } from "react";

interface DescriptionItem {
  name: string;
  children: ViewElementChildren;
  className?: string;
}

export const DescriptionItem: View<DescriptionItem> = ({
  className = "",
  name,
  children
}) => {
  return (
    <div
      className={`d-flex flex-row flex-nowrap align-items-stretch ${className}`}>
      <div className="font-weight-bold align-self-start">{name}:</div>
      <div className="ml-3 d-flex align-items-center">{children}</div>
    </div>
  );
};

export interface Props {
  details: DescriptionItem[];
  className?: string;
}

export const DescriptionList: View<Props> = ({ details, className }) => {
  return (
    <div>
      {details.map((detail, i) => (
        <Fragment key={`details-${i}`}>
          <DescriptionItem
            {...detail}
            className={i < details.length - 1 ? "mb-3" : ""}
          />
        </Fragment>
      ))}
    </div>
  );
};

export default DescriptionList;
