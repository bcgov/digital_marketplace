import { Handler, namespaceRoute, nullRequestBodyHandler, Route, Router } from 'back-end/lib/server';
import { ServerHttpMethod } from 'back-end/lib/types';

export type CrudAction<IncomingReqBody, ParsedReqBody, ValidatedReqBody, ReqBodyErrors, ResBody, Session, Connection, PickFromHandler extends keyof Handler<IncomingReqBody, ParsedReqBody, ValidatedReqBody, ReqBodyErrors, ResBody, Session> = 'parseRequestBody' | 'validateRequestBody' | 'respond'> = (connection: Connection) => Pick<Handler<IncomingReqBody, ParsedReqBody, ValidatedReqBody, ReqBodyErrors, ResBody, Session>, PickFromHandler>;

export type Create<SupportedRequestBodies, SupportedResponseBodies, ParsedReqBody, ValidatedReqBody, ReqBodyErrors, Session, Connection> = CrudAction<SupportedRequestBodies, ParsedReqBody, ValidatedReqBody, ReqBodyErrors, SupportedResponseBodies, Session, Connection>;

export type ReadOne<SupportedResponseBodies, ValidatedReqBody, ReqBodyErrors, Session, Connection> = CrudAction<null, null, ValidatedReqBody, ReqBodyErrors, SupportedResponseBodies, Session, Connection, 'validateRequestBody' | 'respond'>;

export type ReadMany<SupportedResponseBodies, Session, Connection> = CrudAction<null, null, null, null, SupportedResponseBodies, Session, Connection, 'respond'>;

export type Update<SupportedRequestBodies, SupportedResponseBodies, ParsedReqBody, ValidatedReqBody, ReqBodyErrors, Session, Connection> = CrudAction<SupportedRequestBodies, ParsedReqBody, ValidatedReqBody, ReqBodyErrors, SupportedResponseBodies, Session, Connection>;

export type Delete<SupportedResponseBodies, ValidatedReqBody, ReqBodyErrors, Session, Connection> = CrudAction<null, null, ValidatedReqBody, ReqBodyErrors, SupportedResponseBodies, Session, Connection, 'validateRequestBody' | 'respond'>;

export interface Resource<SupportedRequestBodies, SupportedResponseBodies, CreateParsedReqB, CreateValidatedReqB, CreateReqBErrors, ReadOneValidatedReqB, ReadOneReqBErrors, UpdateParsedReqB, UpdateValidatedReqB, UpdateReqBErrors, DeleteValidatedReqB, DeleteReqBErrors, Session, Connection> {
  routeNamespace: string;
  create?: Create<SupportedRequestBodies, SupportedResponseBodies, CreateParsedReqB, CreateValidatedReqB, CreateReqBErrors, Session, Connection>;
  readOne?: ReadOne<SupportedResponseBodies, ReadOneValidatedReqB, ReadOneReqBErrors, Session, Connection>;
  readMany?: ReadMany<SupportedResponseBodies, Session, Connection>;
  update?: Update<SupportedRequestBodies, SupportedResponseBodies, UpdateParsedReqB, UpdateValidatedReqB, UpdateReqBErrors, Session, Connection>;
  delete?: Delete<SupportedResponseBodies, DeleteValidatedReqB, DeleteReqBErrors, Session, Connection>;
}

export function makeCreateRoute<SupportedRequestBodies, SupportedResponseBodies, ParsedReqBody, ValidatedReqBody, ReqBodyErrors, Session, Connection>(connection: Connection, create: Create<SupportedRequestBodies, SupportedResponseBodies, ParsedReqBody, ValidatedReqBody, ReqBodyErrors, Session, Connection>): Route<SupportedRequestBodies, ParsedReqBody, ValidatedReqBody, ReqBodyErrors, SupportedResponseBodies, null, Session> {
  const handler = create(connection);
  return {
    method: ServerHttpMethod.Post,
    path: '/',
    handler
  };
}

export function makeReadOneRoute<SupportedRequestBodies, SupportedResponseBodies, ValidatedReqBody, ReqBodyErrors, Session, Connection>(connection: Connection, readOne: ReadOne<SupportedResponseBodies, ValidatedReqBody, ReqBodyErrors, Session, Connection>): Route<SupportedRequestBodies, null, ValidatedReqBody, ReqBodyErrors, SupportedResponseBodies, null, Session> {
  const handler = readOne(connection);
  return {
    method: ServerHttpMethod.Get,
    path: '/:id',
    handler: {
      ...handler,
      parseRequestBody: () => null
    }
  };
}

export function makeReadManyRoute<SupportedRequestBodies, SupportedResponseBodies, Session, Connection>(connection: Connection, readMany: ReadMany<SupportedResponseBodies, Session, Connection>): Route<SupportedRequestBodies, null, null, null, SupportedResponseBodies, null, Session> {
  const handler = readMany(connection);
  return {
    method: ServerHttpMethod.Get,
    path: '/',
    handler: nullRequestBodyHandler(handler.respond)
  };
}

export function makeUpdateRoute<SupportedRequestBodies, SupportedResponseBodies, ParsedReqBody, ValidatedReqBody, ReqBodyErrors, Session, Connection>(connection: Connection, update: Update<SupportedRequestBodies, SupportedResponseBodies, ParsedReqBody, ValidatedReqBody, ReqBodyErrors, Session, Connection>): Route<SupportedRequestBodies, ParsedReqBody, ValidatedReqBody, ReqBodyErrors, SupportedResponseBodies, null, Session> {
  const handler = update(connection);
  return {
    method: ServerHttpMethod.Put,
    path: '/:id',
    handler
  };
}

export function makeDeleteRoute<SupportedRequestBodies, SupportedResponseBodies, ValidatedReqBody, ReqBodyErrors, Session, Connection>(connection: Connection, deleteFn: Delete<SupportedResponseBodies, ValidatedReqBody, ReqBodyErrors, Session, Connection>): Route<SupportedRequestBodies, null, ValidatedReqBody, ReqBodyErrors, SupportedResponseBodies, null, Session> {
  const handler = deleteFn(connection);
  return {
    method: ServerHttpMethod.Get,
    path: '/:id',
    handler: {
      ...handler,
      parseRequestBody: () => null
    }
  };
}

export function makeRouter<SupportedRequestBodies, SupportedResponseBodies, CreateParsedReqB, CreateValidatedReqB, CreateReqBErrors, ReadOneValidatedReqB, ReadOneReqBErrors, UpdateParsedReqB, UpdateValidatedReqB, UpdateReqBErrors, DeleteValidatedReqB, DeleteReqBErrors, Session, Connection>(resource: Resource<SupportedRequestBodies, SupportedResponseBodies, CreateParsedReqB, CreateValidatedReqB, CreateReqBErrors, ReadOneValidatedReqB, ReadOneReqBErrors, UpdateParsedReqB, UpdateValidatedReqB, UpdateReqBErrors, DeleteValidatedReqB, DeleteReqBErrors, Session, Connection>): (connection: Connection) => Router<SupportedRequestBodies, any, any, any, SupportedResponseBodies, null, Session> {
  return connection => {
    // We do not destructure `delete` because it conflicts with a TypeScript keyword.
    const { create, readOne, readMany, update } = resource;
    const routes = [];
    if (create) { routes.push(namespaceRoute(resource.routeNamespace, makeCreateRoute(connection, create))); }
    if (readOne) { routes.push(namespaceRoute(resource.routeNamespace, makeReadOneRoute(connection, readOne))); }
    if (readMany) { routes.push(namespaceRoute(resource.routeNamespace, makeReadManyRoute(connection, readMany))); }
    if (update) { routes.push(namespaceRoute(resource.routeNamespace, makeUpdateRoute(connection, update))); }
    if (resource.delete) { routes.push(namespaceRoute(resource.routeNamespace, makeDeleteRoute(connection, resource.delete))); }
    return routes;
  };
}
