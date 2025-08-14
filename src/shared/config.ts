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
  process.env.VITE_SHOW_TEST_INDICATOR || false;

export const CONTACT_EMAIL = "digitalmarketplace@gov.bc.ca";

export const GOV_IDP_SUFFIX = "idir";

export const GOV_IDP_NAME = "IDIR";

export const VENDOR_IDP_SUFFIX = "githubpublic";

export const VENDOR_IDP_NAME = "GitHub";

export const TIMEZONE = "America/Vancouver";

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

export const TWU_CODE_CHALLENGE_SCREEN_IN_COUNT = 4;
