import { component } from "front-end/lib/framework";
import { ThemeColor } from "front-end/lib/types";
import Icon, { AvailableIcons } from "front-end/lib/views/icon";
import React from "react";

export interface ReportCard {
  icon: AvailableIcons;
  iconColor?: ThemeColor;
  name: string;
  value: string;
  className?: string;
}

export const ReportCard: component.base.View<ReportCard> = ({
  icon,
  iconColor = "c-report-card-icon-default",
  name,
  value,
  className = ""
}) => {
  return (
    <div
      style={{ minWidth: "200px", paddingLeft: "1.25rem" }}
      className={`py-4 pe-4 bg-c-report-card-bg d-flex flex-nowrap align-items-center rounded-3 ${className}`}>
      <div
        className="flex-shrink-0 d-flex align-items-center justify-content-center rounded-circle bg-white me-3"
        style={{ width: "2.8rem", height: "2.8rem" }}>
        <Icon name={icon} width={1.25} height={1.25} color={iconColor} />
      </div>
      <div className="flex-grow-1 text-nowrap">
        <div className="fw-bold">{value}</div>
        <div className="font-size-small">{name}</div>
      </div>
    </div>
  );
};

export interface ReportCardList {
  reportCards: Array<ReportCard | null>;
  className?: string;
}

export const ReportCardList: component.base.View<ReportCardList> = ({
  reportCards,
  className = ""
}) => {
  return (
    <div
      className={`d-flex flex-column flex-sm-row align-items-stretch align-items-sm-start flex-sm-wrap mb-n4 ${className}`}>
      {reportCards.map((card, i) => {
        if (!card) {
          return null;
        }
        return (
          <ReportCard
            key={`report-card-${i}`}
            className={`${i < reportCards.length - 1 ? "me-sm-4" : ""} mb-4`}
            {...card}
          />
        );
      })}
    </div>
  );
};

export default ReportCardList;
