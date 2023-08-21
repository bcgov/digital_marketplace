import { normalizeDateTimezone } from "shared/lib";

function dateAt4PM(date: Date) {
  return normalizeDateTimezone(
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 16)
  ).toDate();
}

export { dateAt4PM };
