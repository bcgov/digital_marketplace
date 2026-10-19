export function parseBooleanEnvironmentVariable(raw?: string): boolean | null {
  switch (raw) {
    case "1":
      return true;
    case "0":
      return false;
    default:
      return null;
  }
}

export const VITE_SHOW_TEST_INDICATOR =
  parseBooleanEnvironmentVariable(process.env.VITE_SHOW_TEST_INDICATOR) ??
  false;

export const CONTACT_EMAIL = "digitalmarketplace@gov.bc.ca";

export const GOV_IDP_SUFFIX = "idir";

export const GOV_IDP_NAME = "IDIR";

export const VENDOR_IDP_SUFFIX = "githubpublic";

export const VENDOR_IDP_NAME = "GitHub";

export const TIMEZONE = "America/Vancouver";

// The IM/IT Date and Time Standard replaces PST and PDT with PCT in displayed
// text from November 1, 2026. The label changes at 2 AM PDT that day, when
// clocks would have moved back.
export const PACIFIC_TIME_START = new Date("2026-11-01T09:00:00Z");

export const PACIFIC_TIME_ABBREVIATION = "PCT";

export const CWU_MAX_BUDGET = 70000;

export const SWU_MAX_BUDGET = 5000000;

export const MIN_SWU_EVALUATION_PANEL_MEMBERS = 2;

export const MIN_TWU_EVALUATION_PANEL_MEMBERS = 2;

export const COPY = {
  appTermsTitle: "Digital Marketplace Terms & Conditions for E-Bidding",
  gov: {
    name: {
      short: "B.C. Government",
      long: "Government of British Columbia"
    }
  },
  region: {
    name: {
      short: "B.C.",
      long: "British Columbia"
    }
  }
};

export const EMPTY_STRING = "—"; // emdash

export const DEFAULT_PAGE_SIZE = 50;

export const SWU_CODE_CHALLENGE_SCREEN_IN_COUNT = 4;

export const TWU_CODE_CHALLENGE_SCREEN_IN_COUNT = 3;
