import {
  Handler,
  namespaceRoute,
  nullRequestBodyHandler,
  Route,
  Router
} from "back-end/lib/server";
import { ServerHttpMethod } from "back-end/lib/types";
import {
  SupportedRequestBodies as DefaultSupportedRequestBodies,
  SupportedResponseBodies as DefaultSupportedResponseBodies
} from "back-end/lib/types";

export type CrudAction<
  IncomingReqBody,
  ParsedReqBody,
  ValidatedReqBody,
  ReqBodyErrors,
  ResBody,
  Session,
  Connection,
  PickFromHandler extends keyof Handler<
    IncomingReqBody,
    ParsedReqBody,
    ValidatedReqBody,
    ReqBodyErrors,
    ResBody,
    Session
  > = "parseRequestBody" | "validateRequestBody" | "respond"
> = (
  connection: Connection
) => Pick<
  Handler<
    IncomingReqBody,
    ParsedReqBody,
    ValidatedReqBody,
    ReqBodyErrors,
    ResBody,
    Session
  >,
  PickFromHandler
>;

export type Create<
  Session,
  Connection,
  ParsedReqBody = null,
  ValidatedReqBody = null,
  ReqBodyErrors = null,
  SupportedRequestBodies = DefaultSupportedRequestBodies,
  SupportedResponseBodies = DefaultSupportedResponseBodies
> = CrudAction<
  SupportedRequestBodies,
  ParsedReqBody,
  ValidatedReqBody,
  ReqBodyErrors,
  SupportedResponseBodies,
  Session,
  Connection
>;

export type ReadOne<
  Session,
  Connection,
  ValidatedReqBody = null,
  ReqBodyErrors = null,
  SupportedResponseBodies = DefaultSupportedResponseBodies
> = CrudAction<
  null,
  null,
  ValidatedReqBody,
  ReqBodyErrors,
  SupportedResponseBodies,
  Session,
  Connection,
  "validateRequestBody" | "respond"
>;

export type ReadMany<
  Session,
  Connection,
  SupportedResponseBodies = DefaultSupportedResponseBodies
> = CrudAction<
  null,
  null,
  null,
  null,
  SupportedResponseBodies,
  Session,
  Connection,
  "respond"
>;

export type Update<
  Session,
  Connection,
  ParsedReqBody = null,
  ValidatedReqBody = null,
  ReqBodyErrors = null,
  SupportedRequestBodies = DefaultSupportedRequestBodies,
  SupportedResponseBodies = DefaultSupportedResponseBodies
> = CrudAction<
  SupportedRequestBodies,
  ParsedReqBody,
  ValidatedReqBody,
  ReqBodyErrors,
  SupportedResponseBodies,
  Session,
  Connection
>;

export type Delete<
  Session,
  Connection,
  ValidatedReqBody = null,
  ReqBodyErrors = null,
  SupportedResponseBodies = DefaultSupportedResponseBodies
> = CrudAction<
  null,
  null,
  ValidatedReqBody,
  ReqBodyErrors,
  SupportedResponseBodies,
  Session,
  Connection,
  "validateRequestBody" | "respond"
>;

export type BasicCrudResource<Session, Connection> = Resource<
  DefaultSupportedRequestBodies,
  DefaultSupportedResponseBodies,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  Session,
  Connection
>;

/**
 * The Resource type for the back-end framework. Defines supported request/response bodies, CRUD operations,
 * and database connection
 *
 * @typeParam SupportedRequestBodies - supported request bodies for this resource
 * @typeParam SupportedResponseBodies - supported response bodies for this resource
 * @typeParam CreatedParsedReqB - parsed request body for the Create operation
 * @typeParam CreateValidatedReqB - validated request body for the Create operation
 * @typeParam CreateReqBErrors - validation errors for the Create operation request body
 * @typeParam ReadOneValidatedReqB - validated request body for the Read operation
 * @typeParam ReadOneReqBErrors - validation errors for the Read operation request body
 * @typeParam UpdateParsedReqB - parsed request body for the Update operation
 * @typeParam UpdateValidatedReqB - validated request body for the Update operation
 * @typeParam UpdateReqBErrors - validation errors for the Update operation request body
 * @typeParam DeleteValidatedReqB - validated request body for the Delete operation
 * @typeParam DeleteReqBErrors - validation errors for the Delete operation request body
 * @typeParam Session - session type for this resource
 * @typeParam Connection - database connection type for this resource
 */
export interface Resource<
  SupportedRequestBodies,
  SupportedResponseBodies,
  CreateParsedReqB,
  CreateValidatedReqB,
  CreateReqBErrors,
  ReadOneValidatedReqB,
  ReadOneReqBErrors,
  UpdateParsedReqB,
  UpdateValidatedReqB,
  UpdateReqBErrors,
  DeleteValidatedReqB,
  DeleteReqBErrors,
  Session,
  Connection
> {
  routeNamespace: string;
  create?: Create<
    Session,
    Connection,
    CreateParsedReqB,
    CreateValidatedReqB,
    CreateReqBErrors,
    SupportedRequestBodies,
    SupportedResponseBodies
  >;
  readOne?: ReadOne<
    Session,
    Connection,
    ReadOneValidatedReqB,
    ReadOneReqBErrors,
    SupportedResponseBodies
  >;
  readMany?: ReadMany<Session, Connection, SupportedResponseBodies>;
  update?: Update<
    Session,
    Connection,
    UpdateParsedReqB,
    UpdateValidatedReqB,
    UpdateReqBErrors,
    SupportedRequestBodies,
    SupportedResponseBodies
  >;
  delete?: Delete<
    Session,
    Connection,
    DeleteValidatedReqB,
    DeleteReqBErrors,
    SupportedResponseBodies
  >;
}

export function makeCreateRoute<
  SupportedRequestBodies,
  SupportedResponseBodies,
  ParsedReqBody,
  ValidatedReqBody,
  ReqBodyErrors,
  Session,
  Connection
>(
  connection: Connection,
  create: Create<
    Session,
    Connection,
    ParsedReqBody,
    ValidatedReqBody,
    ReqBodyErrors,
    SupportedRequestBodies,
    SupportedResponseBodies
  >
): Route<
  SupportedRequestBodies,
  ParsedReqBody,
  ValidatedReqBody,
  ReqBodyErrors,
  SupportedResponseBodies,
  null,
  Session
> {
  const handler = create(connection);
  return {
    method: ServerHttpMethod.Post,
    path: "/",
    handler
  };
}

export function makeReadOneRoute<
  SupportedRequestBodies,
  SupportedResponseBodies,
  ValidatedReqBody,
  ReqBodyErrors,
  Session,
  Connection
>(
  connection: Connection,
  readOne: ReadOne<
    Session,
    Connection,
    ValidatedReqBody,
    ReqBodyErrors,
    SupportedResponseBodies
  >
): Route<
  SupportedRequestBodies,
  null,
  ValidatedReqBody,
  ReqBodyErrors,
  SupportedResponseBodies,
  null,
  Session
> {
  const handler = readOne(connection);
  return {
    method: ServerHttpMethod.Get,
    path: "/:id",
    handler: {
      ...handler,
      parseRequestBody: async () => null
    }
  };
}

export function makeReadManyRoute<
  SupportedRequestBodies,
  SupportedResponseBodies,
  Session,
  Connection
>(
  connection: Connection,
  readMany: ReadMany<Session, Connection, SupportedResponseBodies>
): Route<
  SupportedRequestBodies,
  null,
  null,
  null,
  SupportedResponseBodies,
  null,
  Session
> {
  const handler = readMany(connection);
  return {
    method: ServerHttpMethod.Get,
    path: "/",
    handler: nullRequestBodyHandler(handler.respond)
  };
}

export function makeUpdateRoute<
  SupportedRequestBodies,
  SupportedResponseBodies,
  ParsedReqBody,
  ValidatedReqBody,
  ReqBodyErrors,
  Session,
  Connection
>(
  connection: Connection,
  update: Update<
    Session,
    Connection,
    ParsedReqBody,
    ValidatedReqBody,
    ReqBodyErrors,
    SupportedRequestBodies,
    SupportedResponseBodies
  >
): Route<
  SupportedRequestBodies,
  ParsedReqBody,
  ValidatedReqBody,
  ReqBodyErrors,
  SupportedResponseBodies,
  null,
  Session
> {
  const handler = update(connection);
  return {
    method: ServerHttpMethod.Put,
    path: "/:id",
    handler
  };
}

export function makeDeleteRoute<
  SupportedRequestBodies,
  SupportedResponseBodies,
  ValidatedReqBody,
  ReqBodyErrors,
  Session,
  Connection
>(
  connection: Connection,
  deleteFn: Delete<
    Session,
    Connection,
    ValidatedReqBody,
    ReqBodyErrors,
    SupportedResponseBodies
  >
): Route<
  SupportedRequestBodies,
  null,
  ValidatedReqBody,
  ReqBodyErrors,
  SupportedResponseBodies,
  null,
  Session
> {
  const handler = deleteFn(connection);
  return {
    method: ServerHttpMethod.Delete,
    path: "/:id",
    handler: {
      ...handler,
      parseRequestBody: async () => null
    }
  };
}

export function makeRouter<
  SupportedRequestBodies,
  SupportedResponseBodies,
  CreateParsedReqB,
  CreateValidatedReqB,
  CreateReqBErrors,
  ReadOneValidatedReqB,
  ReadOneReqBErrors,
  UpdateParsedReqB,
  UpdateValidatedReqB,
  UpdateReqBErrors,
  DeleteValidatedReqB,
  DeleteReqBErrors,
  Session,
  Connection
>(
  resource: Resource<
    SupportedRequestBodies,
    SupportedResponseBodies,
    CreateParsedReqB,
    CreateValidatedReqB,
    CreateReqBErrors,
    ReadOneValidatedReqB,
    ReadOneReqBErrors,
    UpdateParsedReqB,
    UpdateValidatedReqB,
    UpdateReqBErrors,
    DeleteValidatedReqB,
    DeleteReqBErrors,
    Session,
    Connection
  >
): (
  connection: Connection
) => Router<
  SupportedRequestBodies,
  any,
  any,
  any,
  SupportedResponseBodies,
  null,
  Session
> {
  return (connection) => {
    // We do not destructure `delete` because it conflicts with a TypeScript keyword.
    const { create, readOne, readMany, update } = resource;
    const routes: Route<
      SupportedRequestBodies,
      any,
      any,
      any,
      SupportedResponseBodies,
      null,
      Session
    >[] = [];
    if (create) {
      routes.push(
        namespaceRoute(
          resource.routeNamespace,
          makeCreateRoute(connection, create)
        )
      );
    }
    if (readOne) {
      routes.push(
        namespaceRoute(
          resource.routeNamespace,
          makeReadOneRoute(connection, readOne)
        )
      );
    }
    if (readMany) {
      routes.push(
        namespaceRoute(
          resource.routeNamespace,
          makeReadManyRoute(connection, readMany)
        )
      );
    }
    if (update) {
      routes.push(
        namespaceRoute(
          resource.routeNamespace,
          makeUpdateRoute(connection, update)
        )
      );
    }
    if (resource.delete) {
      routes.push(
        namespaceRoute(
          resource.routeNamespace,
          makeDeleteRoute(connection, resource.delete)
        )
      );
    }
    return routes;
  };
}
