import { component } from "front-end/lib/framework";
import Separator from "front-end/lib/views/separator";
import React, { Fragment } from "react";
import { formatDate, formatDateAndTime, formatTime } from "shared/lib";

function format(date: SingleDate): string {
  switch (date.tag) {
    case "date":
      return formatDate(date.date, date.withTimeZone);
    case "time":
      return formatTime(date.date, date.withTimeZone);
    case "dateAndTime":
      return formatDateAndTime(date.date, date.withTimeZone);
  }
}

interface DateDefinition<Tag> {
  tag: Tag;
  date: Date;
  label?: string;
  withTimeZone?: boolean;
}

export const SingleDate: component.base.View<
  SingleDate & { className?: string }
> = (date) => {
  const label = date.label ? `${date.label} ` : "";
  return (
    <div className={date.className}>
      {label}
      {format(date)}
    </div>
  );
};

type SingleDate =
  | DateDefinition<"date">
  | DateDefinition<"time">
  | DateDefinition<"dateAndTime">;

export interface Props {
  dates: Array<SingleDate | null>;
  className?: string;
}

export const DateMetadata: component.base.View<Props> = ({
  dates,
  className = ""
}) => {
  return (
    <div
      className={`small text-secondary d-flex flex-nowrap flex-column flex-sm-row ${className}`}>
      {dates.map((date, i) => {
        if (!date) {
          return null;
        }
        return (
          <Fragment key={`date-metadata-${i}`}>
            <SingleDate {...date} />
            {i < dates.length - 1 ? (
              <Separator
                spacing="2"
                color="secondary"
                className="d-none d-sm-block">
                |
              </Separator>
            ) : null}
          </Fragment>
        );
      })}
    </div>
  );
};

export default DateMetadata;
