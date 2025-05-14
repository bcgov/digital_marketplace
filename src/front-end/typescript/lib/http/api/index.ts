/**
 * Exports all HTTP client functions to make requests to the
 * Digital Marketplace back-end server. Each function is organized by
 * resource and generally follows CRUD-naming conventions.
 *
 * @example
 * Since this module re-exports all client functions, you should
 * only import this module and not import the child modules directly.
 * This module also re-exports some helper functions and types to deal
 * with responses, like the {@link ResponseValidation} type.
 * ```ts
 * import * as api from "front-end/lib/http/api";
 * import { Cmd } from "front-end/lib/framework";
 * import { User } from "shared/lib/resources/user";
 *
 * type Msg = ADT<"gotUser", api.ResponseValidation<User, string[]>>;
 *
 * const getUserCmd: Cmd<Msg> =
 *   api.users.readOne()("userId", response => adt("gotUser", response));
 * ```
 *
 * @example
 * Due to limitations with the TypeScript compiler, the client functions
 * have been implemented inside "thunks" to enable better type inference.
 * In practice, this means you may need to make an extra function call
 * to use a client function, but this allows you to concretely set the type
 * parameter for what the resulting {@link Cmd} returns.
 * ```ts
 * import * as api from "front-end/lib/http/api";
 * import { User } from "shared/lib/resources/user";
 *
 * // Notice the <Msg> concrete type and the extra function call.
 * const getUserCmd =
 *   api.users.readOne<Msg>()("userId", response => adt("gotUser", response));
 * ```
 *
 * @module lib/http/api
 */

export {
  getValidValue,
  getInvalidValue,
  mapValid,
  mapInvalid,
  type ResponseValidation,
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
