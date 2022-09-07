import { authenticatePassword } from "back-end/lib/security";
import {
  createMapRoute,
  JsonResponseBody,
  makeJsonResponseBody,
  MapHandler,
  MapHook,
  MapRoute
} from "back-end/lib/server";
import { adt, ADT } from "shared/lib/types";
import { valid } from "shared/lib/validation";

type BasicAuthRequestBody<Body> = ADT<"authorized", Body> | ADT<"unauthorized">;

type UnauthorizedResponseBody = JsonResponseBody<["Unauthorized"]>;

function addBasicAuth<IReq, PReq, VReq, ReqE, Res, Session>(
  username: string,
  passwordHash: string
): MapHandler<
  IReq,
  PReq,
  PReq,
  VReq,
  BasicAuthRequestBody<VReq>,
  ReqE,
  ReqE,
  Res,
  Res | UnauthorizedResponseBody,
  Session
> {
  return (oldHandler) => ({
    parseRequestBody: oldHandler.parseRequestBody,

    async validateRequestBody(request) {
      const unauthorized: BasicAuthRequestBody<VReq> = adt("unauthorized");
      let authHeader = request.headers.authorization;
      if (!authHeader) {
        return valid(unauthorized);
      }
      authHeader = typeof authHeader === "string" ? authHeader : authHeader[0];
      const basicAuthMatch = authHeader.match(/\s*Basic\s+(\S+)/);
      if (!basicAuthMatch) {
        return valid(unauthorized);
      }
      const decoded = Buffer.from(basicAuthMatch[1], "base64").toString("utf8");
      const [rawUsername = "", rawPassword = ""] = decoded.split(":");
      const authorized =
        rawUsername === username &&
        (await authenticatePassword(rawPassword, passwordHash));
      if (!authorized) {
        return valid(unauthorized);
      }
      const validated = await oldHandler.validateRequestBody(request);
      switch (validated.tag) {
        case "valid":
          return valid(adt("authorized" as const, validated.value));
        case "invalid":
          return validated;
      }
    },

    async respond(request) {
      switch (request.body.tag) {
        case "valid":
          return await (() => {
            switch (request.body.value.tag) {
              case "authorized":
                return oldHandler.respond({
                  ...request,
                  body: valid(request.body.value.value)
                });
              case "unauthorized":
                return {
                  code: 401,
                  headers: {
                    "www-authenticate": 'Basic realm="Restricted website."'
                  },
                  session: request.session,
                  body: makeJsonResponseBody(["Unauthorized"] as [
                    "Unauthorized"
                  ])
                };
            }
          })();
        case "invalid":
          return await oldHandler.respond({
            ...request,
            body: request.body
          });
      }
    }
  });
}

interface Params<IReq, PReq, VReq, ReqE, Res, HookState, Session> {
  username: string;
  passwordHash: string;
  mapHook: MapHook<
    IReq,
    VReq,
    BasicAuthRequestBody<VReq>,
    ReqE,
    ReqE,
    Res,
    Res | UnauthorizedResponseBody,
    HookState,
    HookState,
    Session
  >;
}

export default function <IReq, PReq, VReq, ReqE, Res, HookState, Session>(
  params: Params<IReq, PReq, VReq, ReqE, Res, HookState, Session>
): MapRoute<
  IReq,
  PReq,
  PReq,
  VReq,
  BasicAuthRequestBody<VReq>,
  ReqE,
  ReqE,
  Res,
  Res | UnauthorizedResponseBody,
  HookState,
  HookState,
  Session
> {
  return createMapRoute(
    addBasicAuth(params.username, params.passwordHash),
    params.mapHook
  );
}
