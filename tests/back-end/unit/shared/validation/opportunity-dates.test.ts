import { formatDateAndTime, formatTime, parseDate } from "shared/lib";
import { isValid } from "shared/lib/validation";
import { validateProposalDeadline } from "shared/lib/validation/opportunity/code-with-us";

// B.C. stays on UTC-7 year-round from November 1, 2026 (Pacific time, PCT).
// A proposal deadline is typed as a date and stored as 4 PM Pacific time on
// that date, so December 1, 2026 must be stored as 23:00 UTC.
describe("opportunity dates after B.C.'s move to year-round Pacific time", () => {
  beforeAll(() => {
    jest.useFakeTimers({ now: new Date("2026-10-16T17:00:00Z") });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("stores a December 1, 2026 proposal deadline at 4 PM UTC-7", () => {
    const deadline = validateProposalDeadline("2026-12-01");
    expect(isValid(deadline) && deadline.value.toISOString()).toBe(
      "2026-12-01T23:00:00.000Z"
    );
  });

  it("reads a typed December 1, 2026 as midnight Pacific time", () => {
    expect(parseDate("2026-12-01")?.toISOString()).toBe(
      "2026-12-01T07:00:00.000Z"
    );
  });

  it("displays a 4 PM UTC-7 deadline on December 1, 2026 as 4:00 PM", () => {
    expect(formatDateAndTime(new Date("2026-12-01T23:00:00Z"))).toBe(
      "Dec 1, 2026 4:00 PM"
    );
  });

  // The IM/IT Date and Time Standard replaces PST and PDT with PCT from
  // November 1, 2026, at 2 AM PDT (09:00 UTC), when clocks would have moved
  // back. Earlier times keep PST (UTC-8) or PDT (UTC-7), whatever label the
  // time zone database gives them.
  it.each([
    ["2025-12-02T00:00:00Z", "4:00 PM PST"],
    ["2026-03-08T09:59:00Z", "1:59 AM PST"],
    ["2026-03-08T10:00:00Z", "3:00 AM PDT"],
    ["2026-07-15T23:00:00Z", "4:00 PM PDT"],
    ["2026-11-01T08:59:00Z", "1:59 AM PDT"],
    ["2026-11-01T09:00:00Z", "2:00 AM PCT"],
    ["2026-12-01T23:00:00Z", "4:00 PM PCT"]
  ])("labels %s as %s", (instant, expected) => {
    expect(formatTime(new Date(instant), true)).toBe(expected);
  });
});
