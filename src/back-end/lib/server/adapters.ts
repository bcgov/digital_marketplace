import QueryString from "qs";
import {
  COOKIE_SECRET,
  ORIGIN,
  SWAGGER_ENABLE,
  SWAGGER_UI_PATH,
  TMP_DIR
} from "back-end/config";
import { generateUuid } from "back-end/lib";
import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import {
  ErrorResponseBody,
  FileRequestBody,
  FileResponseBody,
  HtmlResponseBody,
  JsonRequestBody,
  JsonResponseBody,
  makeErrorResponseBody,
  makeFileRequestBody,
  makeJsonRequestBody,
  parseSessionId,
  Request,
  Response,
  Route,
  Router,
  SessionIdToSession,
  SessionToSessionId,
  TextResponseBody
} from "back-end/lib/server";
import specs from "back-end/lib/swagger";
import { parseServerHttpMethod, ServerHttpMethod } from "back-end/lib/types";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import corsLib from "cors";
import expressLib from "express";
import { createWriteStream, existsSync, unlinkSync } from "fs";
import { IncomingHttpHeaders } from "http";
import { castArray, isArray } from "lodash";
import multiparty from "multiparty";
import * as path from "path";
import { addDays, parseJsonSafely } from "shared/lib";
import { Validation } from "shared/lib/validation";
import swaggerUI from "swagger-ui-express";

const SESSION_COOKIE_NAME = "sid";

export interface AdapterRunParams<
  SupportedRequestBodies,
  ParsedReqBody,
  ValidatedReqBody,
  ReqBodyErrors,
  SupportedResponseBodies,
  HookState,
  Session,
  FileUploadMetaData
> {
  router: Router<
    SupportedRequestBodies,
    ParsedReqBody,
    ValidatedReqBody,
    ReqBodyErrors,
    SupportedResponseBodies,
    HookState,
    Session
  >;
  sessionIdToSession: SessionIdToSession<Session>;
  sessionToSessionId: SessionToSessionId<Session>;
  host: string;
  port: number;
  maxMultipartFilesSize: number;
  parseFileUploadMetadata(raw: any): FileUploadMetaData;
}

export type Adapter<
  App,
  SupportedRequestBodies,
  ParsedReqBody,
  ValidatedReqBody,
  ReqBodyErrors,
  SupportedResponseBodies,
  HookState,
  Session,
  FileUploadMetaData
> = (
  params: AdapterRunParams<
    SupportedRequestBodies,
    ParsedReqBody,
    ValidatedReqBody,
    ReqBodyErrors,
    SupportedResponseBodies,
    HookState,
    Session,
    FileUploadMetaData
  >
) => App;

export type ExpressRequestBodies<FileUploadMetaData> =
  | JsonRequestBody
  | FileRequestBody<FileUploadMetaData>;

export type ExpressResponseBodies =
  | HtmlResponseBody
  | JsonResponseBody
  | FileResponseBody
  | TextResponseBody
  | ErrorResponseBody;

export type ExpressAdapter<
  ParsedReqBody,
  ValidatedReqBody,
  ReqBodyErrors,
  HookState,
  Session,
  FileUploadMetaData
> = Adapter<
  expressLib.Application,
  ExpressRequestBodies<FileUploadMetaData>,
  ParsedReqBody,
  ValidatedReqBody,
  ReqBodyErrors,
  ExpressResponseBodies,
  HookState,
  Session,
  FileUploadMetaData
>;

function incomingHeaderMatches(
  headers: IncomingHttpHeaders,
  header: string,
  value: string
): boolean {
  header = castArray(headers[header] || "").join(" ");
  return !!header.match(value);
}

/**
 * Use `multiparty` to parse a HTTP request with a multipart body.
 * It currently only supports multipart bodies with these fields:
 *
 * `file` must be the file you want to upload.
 *
 * `name` must be the user-defined name of the file.
 *
 * `metadata` is an optional field containing a JSON string
 */
function parseMultipartRequest<FileUploadMetadata>(
  maxSize: number,
  parseFileUploadMetadata: (raw: any) => FileUploadMetadata,
  expressReq: expressLib.Request
): Promise<FileRequestBody<FileUploadMetadata>> {
  return new Promise((resolve, reject) => {
    // Reject the promise if the content length is too large.
    const contentLength = expressReq.get("content-length") || maxSize + 1;
    if (Number(contentLength) > maxSize) {
      return reject(new Error("Content-Length is too large."));
    }
    // Parse the request.
    let filePath: string | undefined;
    let metadata = "";
    let fileName = "";
    let fileSize: number;
    let fileFormat: string;
    const form = new multiparty.Form();
    // Listen for files and fields.
    // We only want to receive one file, so we disregard all other files.
    // We only want the (optional) metadata field, so we disregard all other fields.
    form.on("part", (part) => {
      part.on("error", (error) => reject(error));
      // We expect the file's field to have the name `file`.
      if (part.name === "file" && part.filename && !filePath) {
        // We only want to receive one file.
        const tmpPath = path.join(TMP_DIR, generateUuid());
        part.pipe(createWriteStream(tmpPath));
        filePath = tmpPath;
        fileSize = part.byteCount;
        fileFormat = part.headers["content-type"];
      } else if (part.name === "metadata" && !part.filename && !metadata) {
        part.setEncoding("utf8");
        part.on("data", (chunk) => (metadata += chunk));
        // No need to listen to 'end' event as the multiparty form won't end until the
        // entire request body has been processed.
      } else if (part.name === "name" && !part.filename && !metadata) {
        part.setEncoding("utf8");
        part.on("data", (chunk) => (fileName += chunk));
        // No need to listen to 'end' event as the multiparty form won't end until the
        // entire request body has been processed.
      } else {
        // Ignore all other files and fields.
        part.resume();
      }
    });
    // Handle errors.
    form.on("error", (error) => reject(error));
    // Resolve the promise once the request has finished parsing.
    form.on("close", () => {
      if (filePath && metadata && fileName && fileSize && fileFormat) {
        const jsonMetadata = parseJsonSafely(metadata);
        switch (jsonMetadata.tag) {
          case "valid":
            resolve(
              makeFileRequestBody({
                name: fileName,
                path: filePath,
                metadata: parseFileUploadMetadata(jsonMetadata.value),
                fileSize: fileSize.toString(),
                fileFormat
              })
            );
            break;
          case "invalid":
            reject(new Error("Invalid `metadata` field."));
            break;
        }
      }
      if (filePath && metadata && fileName) {
        const jsonMetadata = parseJsonSafely(metadata);
        switch (jsonMetadata.tag) {
          case "valid":
            resolve(
              makeFileRequestBody({
                name: fileName,
                path: filePath,
                metadata: parseFileUploadMetadata(jsonMetadata.value)
              })
            );
            break;
          case "invalid":
            reject(new Error("Invalid `metadata` field."));
            break;
        }
      } else if (filePath && fileName) {
        resolve(
          makeFileRequestBody({
            name: fileName,
            path: filePath
          })
        );
      } else {
        reject(new Error("No file uploaded"));
      }
    });
    // Parse the form.
    form.parse(expressReq);
  });
}

export function express<
  ParsedReqBody,
  ValidatedReqBody,
  ReqBodyErrors,
  HookState,
  Session,
  FileUploadMetaData
>(): ExpressAdapter<
  ParsedReqBody,
  ValidatedReqBody,
  ReqBodyErrors,
  HookState,
  Session,
  FileUploadMetaData
> {
  const logger = makeDomainLogger(consoleAdapter, "adapter:express");

  return ({
    router,
    sessionIdToSession,
    sessionToSessionId,
    maxMultipartFilesSize,
    parseFileUploadMetadata
  }) => {
    function respond(
      response: Response<ExpressResponseBodies, Session>,
      expressRes: expressLib.Response
    ): void {
      expressRes.status(response.code).set(response.headers);
      // Manage the session ID cookie.
      const setSessionId = (id: string) =>
        expressRes.cookie(SESSION_COOKIE_NAME, id, {
          signed: true,
          httpOnly: true,
          sameSite: "lax",
          expires: addDays(new Date(), 2) //Expire cookie if not re-used within 2 days.
        });
      const sessionId = sessionToSessionId(response.session);
      if (sessionId) {
        setSessionId(sessionId.toString());
      }
      switch (response.body.tag) {
        case "error":
        case "json":
          expressRes.json(response.body.value);
          break;
        case "file": {
          const file = response.body.value;
          expressRes.set("Content-Type", file.contentType);
          if (file.contentEncoding) {
            expressRes.set("Content-Encoding", file.contentEncoding);
          }
          if (file.contentDisposition) {
            expressRes.set("Content-Disposition", file.contentDisposition);
          }
          expressRes.send(response.body.value.buffer);
          break;
        }
        case "text":
          expressRes
            .set("Content-Type", "text/plain")
            .send(response.body.value);
          break;
        case "html":
          expressRes.set("Content-Type", "text/html").send(response.body.value);
          break;
      }
    }

    function makeExpressRequestHandler(
      route: Route<
        ExpressRequestBodies<FileUploadMetaData>,
        ParsedReqBody,
        ValidatedReqBody,
        ReqBodyErrors,
        ExpressResponseBodies,
        HookState,
        Session
      >
    ): expressLib.RequestHandler {
      function asyncHandler(
        fn: (
          request: expressLib.Request,
          expressRes: expressLib.Response,
          next: expressLib.NextFunction
        ) => Promise<void>
      ): expressLib.RequestHandler {
        return (expressReq, expressRes, next) => {
          fn(expressReq, expressRes, next).catch((error) => {
            const jsonError = makeErrorResponseBody(error).value;
            // Respond with a 500 if an error occurs.
            logger.error("unhandled error", jsonError);
            expressRes.status(500).json(jsonError);
          });
        };
      }
      return asyncHandler(async (expressReq, expressRes, next) => {
        // Handle the request if it has the correct HTTP method.
        // Default to `Any` to make following logic simpler.
        const method =
          parseServerHttpMethod(expressReq.method) || ServerHttpMethod.Any;
        if (method !== route.method) {
          next();
          return;
        }
        // Create the session.
        const sessionId = parseSessionId(
          expressReq.signedCookies[SESSION_COOKIE_NAME]
        );
        const session = await sessionIdToSession(sessionId);
        // Set up the request body.
        const headers = expressReq.headers;
        let body: ExpressRequestBodies<FileUploadMetaData> =
          makeJsonRequestBody(null);
        if (
          method !== ServerHttpMethod.Get &&
          incomingHeaderMatches(headers, "content-type", "application/json")
        ) {
          body = makeJsonRequestBody(expressReq.body);
        } else if (
          method !== ServerHttpMethod.Get &&
          incomingHeaderMatches(headers, "content-type", "multipart")
        ) {
          body = await parseMultipartRequest(
            maxMultipartFilesSize,
            parseFileUploadMetadata,
            expressReq
          );
        }

        // Process query params but only accept individual string values. We do not handle array inputs on query params
        const processQueryParams = (
          query: QueryString.ParsedQs
        ): Record<string, string> => {
          const params: Record<string, string> = {};
          Object.entries(query).forEach(([key, value]) => {
            if (!value) params[key] = "";
            else if (!isArray(value) && typeof value === "string")
              params[key] = params[key] = value;
          });

          return params;
        };

        // Create the initial request.
        const requestId = generateUuid();
        const initialRequest: Request<
          ExpressRequestBodies<FileUploadMetaData>,
          Session
        > = {
          id: requestId,
          path: expressReq.path,
          method,
          headers,
          session,
          logger: makeDomainLogger(consoleAdapter, `request:${requestId}`),
          params: expressReq.params,
          query: processQueryParams(expressReq.query),
          body
        };
        // Run the before hook if specified.
        const hookState = route.hook
          ? await route.hook.before(initialRequest)
          : null;
        // Parse the request according to the route handler.
        const parsedRequest: Request<ParsedReqBody, Session> = {
          ...initialRequest,
          body: await route.handler.parseRequestBody(initialRequest)
        };
        // Validate the request according to the route handler.
        const validatedRequest: Request<
          Validation<ValidatedReqBody, ReqBodyErrors>,
          Session
        > = {
          ...parsedRequest,
          body: await route.handler.validateRequestBody(parsedRequest)
        };
        // Respond to the request.
        const response = await route.handler.respond(validatedRequest);
        // Delete temporary file if it exists.
        if (body.tag === "file" && existsSync(body.value.path)) {
          unlinkSync(body.value.path);
        }
        // Run the after hook if specified.
        // Note: we run the after hook after our business logic has completed,
        // not once the express framework sends the response.
        if (route.hook && route.hook.after) {
          await route.hook.after(
            hookState as HookState,
            validatedRequest,
            response
          );
        }
        // Respond over HTTP.
        respond(response, expressRes);
      });
    }

    const allowedList = [ORIGIN];
    function corsOptionDelegate(
      req: expressLib.Request,
      callback: (err: Error | null, options?: corsLib.CorsOptions) => void
    ) {
      let corsOptions: corsLib.CorsOptions;
      if (allowedList.indexOf(req.header("Origin") || "") !== -1) {
        corsOptions = { origin: true };
      } else {
        corsOptions = { origin: false };
      }
      callback(null, corsOptions);
    }

    // Set up the express app.
    const app = expressLib();
    // Parse JSON request bodies when provided.
    app.use(
      bodyParser.json({
        type: "application/json"
      })
    );

    // Sign and parse cookies.
    app.use(cookieParser(COOKIE_SECRET));

    // Set up CORS to limit API access to specific domains
    app.use(corsLib(corsOptionDelegate));

    // Mount each route to the Express application.
    router.forEach((route) => {
      app.all(route.path, makeExpressRequestHandler(route));
      if (SWAGGER_ENABLE) {
        app.use(SWAGGER_UI_PATH, swaggerUI.serve, swaggerUI.setup(specs));
      }
    });

    return app;
  };
}
