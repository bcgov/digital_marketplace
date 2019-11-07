import { Handler, namespaceRoute, Route, Router } from 'back-end/lib/server';
import { ServerHttpMethod } from 'back-end/lib/types';

export type CrudAction<IncomingReqBody, TransformedReqBody, ResBody, Session, Connection> = (connection: Connection) => Handler<IncomingReqBody, TransformedReqBody, ResBody, Session>;

export type Create<SupportedRequestBodies, SupportedResponseBodies, TransformedReqBody, Session, Connection> = CrudAction<SupportedRequestBodies, TransformedReqBody, SupportedResponseBodies, Session, Connection>;

export type ReadOne<SupportedResponseBodies, Session, Connection> = CrudAction<null, null, SupportedResponseBodies, Session, Connection>;

export type ReadMany<SupportedResponseBodies, Session, Connection> = CrudAction<null, null, SupportedResponseBodies, Session, Connection>;

export type Update<SupportedRequestBodies, SupportedResponseBodies, TransformedReqBody, Session, Connection> = CrudAction<SupportedRequestBodies, TransformedReqBody, SupportedResponseBodies, Session, Connection>;

export type Delete<SupportedResponseBodies, Session, Connection> = CrudAction<null, null, SupportedResponseBodies, Session, Connection>;

export interface Resource<SupportedRequestBodies, SupportedResponseBodies, CReqB, UReqB, Session, Connection> {
  routeNamespace: string;
  create?: Create<SupportedRequestBodies, SupportedResponseBodies, CReqB, Session, Connection>;
  readOne?: ReadOne<SupportedResponseBodies, Session, Connection>;
  readMany?: ReadMany<SupportedResponseBodies, Session, Connection>;
  update?: Update<SupportedRequestBodies, SupportedResponseBodies, UReqB, Session, Connection>;
  delete?: Delete<SupportedResponseBodies, Session, Connection>;
}

export function makeCreateRoute<SupportedRequestBodies, SupportedResponseBodies, ReqB, Session, Connection>(connection: Connection, create: Create<SupportedRequestBodies, SupportedResponseBodies, ReqB, Session, Connection>): Route<SupportedRequestBodies, ReqB, SupportedResponseBodies, null, Session> {
  const handler = create(connection);
  return {
    method: ServerHttpMethod.Post,
    path: '/',
    handler
  };
}

export function makeReadOneRoute<SupportedRequestBodies, SupportedResponseBodies, Session, Connection>(connection: Connection, readOne: ReadOne<SupportedResponseBodies, Session, Connection>): Route<SupportedRequestBodies, null, SupportedResponseBodies, null, Session> {
  const handler = readOne(connection);
  return {
    method: ServerHttpMethod.Get,
    path: '/:id',
    handler: {
      ...handler,
      async transformRequest() {
        return null;
      }
    }
  };
}

export function makeReadManyRoute<SupportedRequestBodies, SupportedResponseBodies, Session, Connection>(connection: Connection, readMany: ReadMany<SupportedResponseBodies, Session, Connection>): Route<SupportedRequestBodies, null, SupportedResponseBodies, null, Session> {
  const handler = readMany(connection);
  return {
    method: ServerHttpMethod.Get,
    path: '/',
    handler: {
      ...handler,
      async transformRequest() {
        return null;
      }
    }
  };
}

export function makeUpdateRoute<SupportedRequestBodies, SupportedResponseBodies, ReqB, Session, Connection>(connection: Connection, update: Update<SupportedRequestBodies, SupportedResponseBodies, ReqB, Session, Connection>): Route<SupportedRequestBodies, ReqB, SupportedResponseBodies, null, Session> {
  const handler = update(connection);
  return {
    method: ServerHttpMethod.Put,
    path: '/:id',
    handler
  };
}

export function makeDeleteRoute<SupportedRequestBodies, SupportedResponseBodies, Session, Connection>(connection: Connection, deleteFn: Delete<SupportedResponseBodies, Session, Connection>): Route<SupportedRequestBodies, null, SupportedResponseBodies, null, Session> {
  const handler = deleteFn(connection);
  return {
    method: ServerHttpMethod.Delete,
    path: '/:id',
    handler: {
      ...handler,
      async transformRequest() {
        return null;
      }
    }
  };
}

export function makeRouter<SupportedRequestBodies, SupportedResponseBodies, CReqB, UReqB, Session, Connection>(resource: Resource<SupportedRequestBodies, SupportedResponseBodies, CReqB, UReqB, Session, Connection>): (connection: Connection) => Router<SupportedRequestBodies, SupportedResponseBodies, Session> {
  return connection => {
    // We do not destructure `delete` because it conflicts with a TypeScript keyword.
    const { create, readOne, readMany, update } = resource;
    const routes = [];
    if (create) { routes.push(makeCreateRoute(connection, create)); }
    if (readOne) { routes.push(makeReadOneRoute(connection, readOne)); }
    if (readMany) { routes.push(makeReadManyRoute(connection, readMany)); }
    if (update) { routes.push(makeUpdateRoute(connection, update)); }
    if (resource.delete) { routes.push(makeDeleteRoute(connection, resource.delete)); }
    return routes.map(route => namespaceRoute(resource.routeNamespace, route));
  };
}
