//TODO document intended usage, type casting and example

export {
  getValidValue,
  getInvalidValue,
  mapValid,
  mapInvalid,
  ResponseValidation,
  isValid,
  isInvalid,
  isUnhandled
} from "shared/lib/http";

export * as affiliations from "front-end/lib/http/api/affiliation";
export * as content from "front-end/lib/http/api/content";
export * as counters from "front-end/lib/http/api/counters";
export * as emailNotifications from "front-end/lib/http/api/email-notifications";
export * as files from "front-end/lib/http/api/file";
export * as metrics from "front-end/lib/http/api/metrics";
export * as opportunities from "front-end/lib/http/api/opportunity";
export * as organizations from "front-end/lib/http/api/organization";
export * as proposals from "front-end/lib/http/api/proposal";
export * as sessions from "front-end/lib/http/api/session";
export * as subscribers from "front-end/lib/http/api/subscribers";
export * as users from "front-end/lib/http/api/user";
