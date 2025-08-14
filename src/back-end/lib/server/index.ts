import { DomainLogger } from "back-end/lib/logger";
import { ServerHttpMethod } from "back-end/lib/types";
import { existsSync, readFileSync, statSync } from "fs";
import { IncomingHttpHeaders, OutgoingHttpHeaders } from "http";
import { assign } from "lodash";
import { lookup } from "mime-types";
import { ADT, BodyWithErrors, Id } from "shared/lib/types";
import { valid, Validation } from "shared/lib/validation";

export type SessionId = Id;

export function parseSessionId(raw?: string): SessionId {
  return raw || "";
}

export type SessionIdToSession<Session> = (
  sessionId?: SessionId
) => Promise<Session>;

export type SessionToSessionId<Session> = (session: Session) => SessionId;

export interface Request<Body, Session> {
  readonly id: string;
  readonly path: string;
  readonly headers: IncomingHttpHeaders;
  readonly logger: DomainLogger;
  readonly method: ServerHttpMethod;
  readonly session: Session;
  readonly params: Record<string, string>;
  readonly query: Record<string, string>;
  readonly body: Body;
}

export type TextRequestBody = ADT<"text", string>;

export function makeTextRequestBody(value: string): TextRequestBody {
  return {
    tag: "text",
    value
  };
}

type JsonValue =
  | number
  | string
  | boolean
  | null
  | JsonValue[]
  | { [property: string]: JsonValue };

export type JsonRequestBody = ADT<"json", JsonValue>;

export function makeJsonRequestBody(value: JsonValue): JsonRequestBody {
  return {
    tag: "json",
    value
  };
}

export interface FileUpload<Metadata> {
  readonly name: string;
  readonly path: string;
  readonly metadata?: Metadata;
  readonly fileSize?: string;
  readonly fileFormat?: string;
}

export type FileRequestBody<FileUploadMetadata> = ADT<
  "file",
  FileUpload<FileUploadMetadata>
>;

export function makeFileRequestBody<FileUploadMetadata>(
  value: FileUpload<FileUploadMetadata>
): FileRequestBody<FileUploadMetadata> {
  return {
    tag: "file",
    value
  };
}

export interface Response<Body, Session> {
  readonly code: number;
  readonly headers: OutgoingHttpHeaders;
  readonly session: Session;
  readonly body: Body;
}

export function basicResponse<Body, Session>(
  code: number,
  session: Session,
  body: Body
): Response<Body, Session> {
  return {
    code,
    body,
    session,
    headers: {}
  };
}

export type HtmlResponseBody = ADT<"html", string>;

export function makeHtmlResponseBody(value: string): HtmlResponseBody {
  return {
    tag: "html",
    value
  };
}

export type TextResponseBody = ADT<"text", string>;

export function makeTextResponseBody(value: string): TextResponseBody {
  return {
    tag: "text",
    value
  };
}

export function mapTextResponse<Session>(
  response: Response<string, Session>
): Response<TextResponseBody, Session> {
  return {
    code: response.code,
    headers: response.headers,
    session: response.session,
    body: makeTextResponseBody(response.body)
  };
}

export type JsonResponseBody<Value = any> = ADT<"json", Value>;

export function makeJsonResponseBody<Value = any>(
  value: Value
): JsonResponseBody<Value> {
  return {
    tag: "json",
    value
  } as JsonResponseBody<Value>;
}

export function mapJsonResponse<Session, Value = any>(
  response: Response<Value, Session>
): Response<JsonResponseBody<Value>, Session> {
  return {
    code: response.code,
    headers: response.headers,
    session: response.session,
    body: makeJsonResponseBody(response.body)
  };
}

export interface ResponseFile {
  readonly buffer: Buffer;
  readonly contentType: string;
  readonly contentEncoding?: string;
  readonly contentDisposition?: string;
}

export type FileResponseBody = ADT<"file", ResponseFile>;

function validFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

function unsafeMakeFileResponseBody(
  path: string,
  contentType?: string,
  contentEncoding?: string,
  contentDisposition?: string
): FileResponseBody {
  return {
    tag: "file",
    value: {
      buffer: readFileSync(path),
      contentType: contentType || lookup(path) || "application/octet-stream",
      contentEncoding,
      contentDisposition
    }
  };
}

export function tryMakeFileResponseBody(
  path: string,
  contentType?: string,
  contentEncoding?: string,
  contentDisposition?: string
): FileResponseBody | null {
  try {
    if (validFile(path)) {
      return unsafeMakeFileResponseBody(
        path,
        contentType,
        contentEncoding,
        contentDisposition
      );
    } else {
      return null;
    }
  } catch {
    return null;
  }
}

export function tryMakeGenericCompressedFileResponseBody(
  filePath: string,
  compressionExtension: string,
  encoding: string
): FileResponseBody | null {
  const compressedFilePath = filePath.replace(
    new RegExp(`(\\.${compressionExtension})?$`),
    `.${compressionExtension}`
  );
  const response = tryMakeFileResponseBody(
    compressedFilePath,
    lookup(filePath) || undefined,
    encoding
  );
  return response || tryMakeFileResponseBody(filePath);
}

export function tryMakeGzipFileResponseBody(
  filePath: string
): FileResponseBody | null {
  return tryMakeGenericCompressedFileResponseBody(filePath, "gz", "gzip");
}

export function tryMakeBrotliFileResponseBody(
  filePath: string
): FileResponseBody | null {
  return tryMakeGenericCompressedFileResponseBody(filePath, "br", "br");
}

export function tryMakeAnyCompressedFileResponseBody(
  filePath: string,
  acceptEncodingHeader: string
): FileResponseBody | null {
  const accept = acceptEncodingHeader.split(/\s*,\s*/);
  const responseBody: FileResponseBody | null = (() => {
    if (accept.includes("br")) {
      return tryMakeBrotliFileResponseBody(filePath);
    } else if (accept.includes("gzip")) {
      return tryMakeGzipFileResponseBody(filePath);
    } else {
      return null;
    }
  })();
  return responseBody || tryMakeFileResponseBody(filePath);
}

export function mapFileResponse<Session>(
  response: Response<string, Session>
): Response<FileResponseBody | null, Session> {
  return {
    code: response.code,
    headers: response.headers,
    session: response.session,
    body: tryMakeFileResponseBody(response.body)
  };
}

export interface ErrorValue {
  readonly message: string;
  readonly stack?: string;
  readonly raw: string;
}

export type ErrorResponseBody = ADT<"error", ErrorValue>;

export function makeErrorResponseBody(error: Error): ErrorResponseBody {
  return {
    tag: "error",
    value: {
      message: error.message,
      stack: error.stack,
      raw: error.toString()
    }
  };
}

export function mapErrorResponse<Session>(
  response: Response<Error, Session>
): Response<ErrorResponseBody, Session> {
  return {
    code: response.code,
    headers: response.headers,
    session: response.session,
    body: makeErrorResponseBody(response.body)
  };
}

export type TransformRequest<RBA, RBB, Session> = (
  request: Request<RBA, Session>
) => Promise<RBB>;

export function composeTransformRequest<RBA, RBB, RBC, Session>(
  a: TransformRequest<RBA, RBB, Session>,
  b: TransformRequest<RBB, RBC, Session>
): TransformRequest<RBA, RBC, Session> {
  return async (request) => {
    const bodyA = await a(request);
    return await b({
      ...request,
      body: bodyA
    });
  };
}

export type Respond<ReqB, ResB, Session> = (
  request: Request<ReqB, Session>
) => Promise<Response<ResB, Session>>;

export function mapRespond<ReqB, ResBA, ResBB, Session>(
  respond: Respond<ReqB, ResBA, Session>,
  fn: (response: Response<ResBA, Session>) => Response<ResBB, Session>
): Respond<ReqB, ResBB, Session> {
  return async (request) => {
    const response = await respond(request);
    return fn(response);
  };
}

export type ParseRequestBody<IncomingReqBody, ParsedReqBody, Session> = (
  request: Request<IncomingReqBody, Session>
) => Promise<ParsedReqBody>;

export type ValidateRequestBody<
  ParsedReqBody,
  ValidatedReqBody,
  ReqBodyErrors,
  Session
> = (
  request: Request<ParsedReqBody, Session>
) => Promise<Validation<ValidatedReqBody, ReqBodyErrors>>;

export interface Handler<
  IncomingReqBody,
  ParsedReqBody,
  ValidatedReqBody,
  ReqBodyErrors,
  ResBody,
  Session
> {
  readonly parseRequestBody: ParseRequestBody<
    IncomingReqBody,
    ParsedReqBody,
    Session
  >;
  readonly validateRequestBody: ValidateRequestBody<
    ParsedReqBody,
    ValidatedReqBody,
    ReqBodyErrors,
    Session
  >;
  readonly respond: Respond<
    Validation<ValidatedReqBody, ReqBodyErrors>,
    ResBody,
    Session
  >;
}

export function passThroughRequestBodyHandler<
  IncomingReqBody,
  ResponseBody,
  Session
>(
  respond: Respond<Validation<IncomingReqBody, any>, ResponseBody, Session>
): Handler<
  IncomingReqBody,
  IncomingReqBody,
  IncomingReqBody,
  any,
  ResponseBody,
  Session
> {
  return {
    parseRequestBody: async (request) => request.body,
    validateRequestBody: async (request) => valid(request.body),
    respond
  };
}

export function nullRequestBodyHandler<ResponseBody, Session>(
  respond: Respond<Validation<null, any>, ResponseBody, Session>
): Handler<unknown, null, null, any, ResponseBody, Session> {
  return {
    parseRequestBody: async () => null,
    validateRequestBody: async () => valid(null),
    respond
  };
}

export const notFoundJsonHandler = nullRequestBodyHandler<
  JsonResponseBody,
  unknown
>(async (request) => {
  return {
    code: 404,
    headers: {},
    session: request.session,
    body: makeJsonResponseBody({})
  };
});

type BeforeHook<ReqB, State, Session> = (
  request: Request<ReqB, Session>
) => Promise<State>;

type AfterHook<ReqB, ResB, State, Session> = (
  state: State,
  request: Request<ReqB, Session>,
  response: Response<ResB, Session>
) => Promise<void>;

export interface RouteHook<
  IncomingReqBody,
  ValidatedReqBody,
  ReqBodyErrors,
  ResBody,
  State,
  Session
> {
  readonly before: BeforeHook<IncomingReqBody, State, Session>;
  readonly after?: AfterHook<
    Validation<ValidatedReqBody, ReqBodyErrors>,
    ResBody,
    State,
    Session
  >;
}

export function combineHooks<Session>(
  hooks: Array<RouteHook<any, any, any, any, any, Session>>
): RouteHook<any, any, any, any, any, Session> {
  return {
    async before(request) {
      const results: Array<any> = [];
      for (const hook of hooks) {
        results.push({
          state: await hook.before(request),
          after: hook.after
        });
      }
      return results;
    },
    async after(state, request, response) {
      for (const hook of state) {
        if (hook.after) {
          hook.after(hook.state, request, response);
        }
      }
    }
  };
}

export interface Route<
  IncomingReqBody,
  ParsedReqBody,
  ValidatedReqBody,
  ReqBodyErrors,
  ResBody,
  HookState,
  Session
> {
  readonly method: ServerHttpMethod;
  readonly path: string;
  readonly handler: Handler<
    IncomingReqBody,
    ParsedReqBody,
    ValidatedReqBody,
    ReqBodyErrors,
    ResBody,
    Session
  >;
  readonly hook?: RouteHook<
    IncomingReqBody,
    ValidatedReqBody,
    ReqBodyErrors,
    ResBody,
    HookState,
    Session
  >;
}

export function namespaceRoute<A, B, C, D, E, F, G>(
  prefix: string,
  route: Route<A, B, C, D, E, F, G>
): Route<A, B, C, D, E, F, G> {
  const path = `${prefix.replace(/\/*$/, "")}/${route.path.replace(
    /^\/*/,
    ""
  )}`;
  return assign(route, { path });
}

export function addHooksToRoute<Session>(
  hooks: Array<RouteHook<any, any, any, any, any, Session>>,
  route: Route<any, any, any, any, any, any, Session>
): Route<any, any, any, any, any, any, Session> {
  const newHook = combineHooks(hooks);
  return {
    ...route,
    hook: route.hook ? combineHooks([newHook, route.hook]) : newHook
  };
}

export type MapHandler<
  IncomingReqB,
  ParsedReqBA,
  ParsedReqBB,
  ValidatedReqBA,
  ValidatedReqBB,
  ReqBErrorsA,
  ReqBErrorsB,
  ResBA,
  ResBB,
  Session
> = (
  oldHandler: Handler<
    IncomingReqB,
    ParsedReqBA,
    ValidatedReqBA,
    ReqBErrorsA,
    ResBA,
    Session
  >
) => Handler<
  IncomingReqB,
  ParsedReqBB,
  ValidatedReqBB,
  ReqBErrorsB,
  ResBB,
  Session
>;

export type MapHook<
  IncomingReqB,
  ValidatedReqBA,
  ValidatedReqBB,
  ReqBErrorsA,
  ReqBErrorsB,
  ResBA,
  ResBB,
  StateA,
  StateB,
  Session
> = (
  oldHook: RouteHook<
    IncomingReqB,
    ValidatedReqBA,
    ReqBErrorsA,
    ResBA,
    StateA,
    Session
  >
) => RouteHook<
  IncomingReqB,
  ValidatedReqBB,
  ReqBErrorsB,
  ResBB,
  StateB,
  Session
>;

export type MapRoute<
  IncomingReqB,
  ParsedReqBA,
  ParsedReqBB,
  ValidatedReqBA,
  ValidatedReqBB,
  ReqBErrorsA,
  ReqBErrorsB,
  ResBA,
  ResBB,
  HookStateA,
  HookStateB,
  Session
> = (
  oldRoute: Route<
    IncomingReqB,
    ParsedReqBA,
    ValidatedReqBA,
    ReqBErrorsA,
    ResBA,
    HookStateA,
    Session
  >
) => Route<
  IncomingReqB,
  ParsedReqBB,
  ValidatedReqBB,
  ReqBErrorsB,
  ResBB,
  HookStateB,
  Session
>;

/**
 * Create a function that transforms a route's handler and hook
 * in a type-safe way.
 */

export function createMapRoute<
  IncomingReqB,
  ParsedReqBA,
  ParsedReqBB,
  ValidatedReqBA,
  ValidatedReqBB,
  ReqBErrorsA,
  ReqBErrorsB,
  ResBA,
  ResBB,
  HookStateA,
  HookStateB,
  Session
>(
  mapHandler: MapHandler<
    IncomingReqB,
    ParsedReqBA,
    ParsedReqBB,
    ValidatedReqBA,
    ValidatedReqBB,
    ReqBErrorsA,
    ReqBErrorsB,
    ResBA,
    ResBB,
    Session
  >,
  mapHook: MapHook<
    IncomingReqB,
    ValidatedReqBA,
    ValidatedReqBB,
    ReqBErrorsA,
    ReqBErrorsB,
    ResBA,
    ResBB,
    HookStateA,
    HookStateB,
    Session
  >
): MapRoute<
  IncomingReqB,
  ParsedReqBA,
  ParsedReqBB,
  ValidatedReqBA,
  ValidatedReqBB,
  ReqBErrorsA,
  ReqBErrorsB,
  ResBA,
  ResBB,
  HookStateA,
  HookStateB,
  Session
> {
  return (route) => ({
    ...route,
    handler: mapHandler(route.handler),
    hook: route.hook && mapHook(route.hook)
  });
}

export const notFoundJsonRoute: Route<
  any,
  any,
  any,
  any,
  JsonResponseBody,
  any,
  any
> = {
  method: ServerHttpMethod.Any,
  path: "*path",
  handler: notFoundJsonHandler
};

export type Router<
  IncomingReqBody,
  ParsedReqBody,
  ValidatedReqBody,
  ReqBodyErrors,
  ResBody,
  HookState,
  Session
> = Array<
  Route<
    IncomingReqBody,
    ParsedReqBody,
    ValidatedReqBody,
    ReqBodyErrors,
    ResBody,
    HookState,
    Session
  >
>;

interface ResponseValidation<
  ValidReqB,
  InvalidReqB,
  ValidResB,
  InvalidResB,
  Session
> {
  valid: Respond<ValidReqB, ValidResB | InvalidResB, Session>;
  invalid: Respond<InvalidReqB, InvalidResB, Session>;
}

export function wrapRespond<
  ValidReqB,
  InvalidReqB extends BodyWithErrors,
  ValidResB,
  InvalidResB,
  Session
>(
  responseValidation: ResponseValidation<
    ValidReqB,
    InvalidReqB,
    ValidResB,
    InvalidResB,
    Session
  >
): Respond<
  Validation<ValidReqB, InvalidReqB>,
  ValidResB | InvalidResB | JsonResponseBody<InvalidReqB>,
  Session
> {
  return async (request) => {
    const respond = (code: number, body: InvalidReqB) =>
      basicResponse(code, request.session, makeJsonResponseBody(body));
    switch (request.body.tag) {
      case "invalid":
        if (request.body.value.permissions) {
          return respond(401, request.body.value);
        } else if (request.body.value.database) {
          return respond(503, request.body.value);
        } else if (request.body.value.notFound) {
          return respond(404, request.body.value);
        } else if (request.body.value.conflict) {
          return respond(409, request.body.value);
        } else {
          return await responseValidation.invalid({
            ...request,
            body: request.body.value
          });
        }
      case "valid":
        return await responseValidation.valid({
          ...request,
          body: request.body.value
        });
    }
  };
}
