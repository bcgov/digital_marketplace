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

type CrudAction<
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

/**
 * Defines a Create action with type parameters for session, connection, and supported request and response bodies.
 * A Create CRUD operation parses and validates the passed request body, and creates a new resource.
 *
 * @typeParam Session - The session type
 * @typeParam Connection - The database connection type
 * @typeParam ParsedReqBody - The expected parsed request body. (Optional - defaults to `null`)
 * @typeParam ValidatedReqBody - The expected validated request body. (Optional - defaults to `null`)
 * @typeParam ReqBodyErrors - The possible request body errors that may occur during parsing or validation (Optional - defaults to `null`)
 * @typeParam SupportedRequestBodies - The supported request body types (Optional - defaults to {@link DefaultSupportedRequestBodies})
 * @typeParam SupportedResponseBodies - The supported response body types (Optional - defaults to {@link DefaultSupportedResponseBodies})
 */
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

/**
 * Defines a ReadOne action with type parameters for session, connection, and supported request and response bodies.
 * A ReadOne CRUD operation will read an individual resource based on the specified request parameters and return it.
 *
 * @typeParam Session - The session type
 * @typeParam Connection - The database connection type
 * @typeParam ValidatedReqBody - The expected validated request body. (Optional - defaults to `null`)
 * @typeParam ReqBodyErrors - The possible request body errors that may occur during parsing or validation (Optional - defaults to `null`)
 * @typeParam SupportedResponseBodies - The supported response body types (Optional - defaults to {@link DefaultSupportedResponseBodies})
 */
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

/**
 * Defines a ReadMany action with type parameters for session, connection, and supported response bodies.
 * A ReadMany CRUD operation will read multiple resources and return them.
 *
 * @typeParam Session - The session type
 * @typeParam Connection - The database connection type
 * @typeParam SupportedResponseBodies - The supported response body types (Optional - defaults to {@link DefaultSupportedResponseBodies})
 */
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

/**
 * Defines an Update action with type parameters for session, connection, and supported request and response bodies.
 * An Update CRUD operation will update an individual resource. The request body defines the full resource definition to be used in the
 * update (partial updates not supported).
 *
 * @typeParam Session - The session type
 * @typeParam Connection - The database connection type
 * @typeParam ParsedReqBody - The expected parsed request body. (Optional - defaults to `null`)
 * @typeParam ValidatedReqBody - The expected validated request body. (Optional - defaults to `null`)
 * @typeParam ReqBodyErrors - The possible request body errors that may occur during parsing or validation (Optional - defaults to `null`)
 * @typeParam SupportedRequestBodies - The supported request body types (Optional - defaults to {@link DefaultSupportedRequestBodies})
 * @typeParam SupportedResponseBodies - The supported response body types (Optional - defaults to {@link DefaultSupportedResponseBodies})
 */
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

/**
 * Defines a Delete action with type parameters for session, connection, and supported request and response bodies.
 * A Delete CRUD operation will delete an individual resource based on the provided parameters.
 *
 * @typeParam Session - The session type
 * @typeParam Connection - The database connection type
 * @typeParam ValidatedReqBody - The expected validated request body. (Optional - defaults to `null`)
 * @typeParam ReqBodyErrors - The possible request body errors that may occur during parsing or validation (Optional - defaults to `null`)
 * @typeParam SupportedRequestBodies - The supported request body types (Optional - defaults to {@link DefaultSupportedRequestBodies})
 */
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

/** A basic CRUD resource that includes type parameters for session and resource.
 * This is a helper type meant to simplify the creation of new {@link Resources}
 *
 * @typeParam Session - The session type
 * @typeParam Connection - The database connection type
 */
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

function makeReadOneRoute<
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

function makeReadManyRoute<
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

function makeUpdateRoute<
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

function makeDeleteRoute<
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

/**
 * Takes a {@link Resource} as an argument, and returns a function that can be passed a {@typeParam Connection} to create a new router
 * based on the CRUD operations defined in the provided {@link Resource}.
 *
 * @param resource - The resource used as the basis for the resulting router.
 * @returns A function that accepts a {@typeParam Connection} and returns a {@link Router} supported the specified {@link Resource}
 */
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
