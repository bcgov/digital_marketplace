import { formatDateAndTime, parseDate } from "shared/lib";
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
});
