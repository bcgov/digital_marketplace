import { DB_MIGRATIONS_TABLE_NAME, getConfigErrors, POSTGRES_URL, SERVER_HOST, SERVER_PORT } from 'back-end/config';
import * as crud from 'back-end/lib/crud';
import { Connection, createAnonymousSession, readOneSession } from 'back-end/lib/db';
import loggerHook from 'back-end/lib/hooks/logger';
import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import affiliationResource from 'back-end/lib/resources/affiliation';
import fileResource from 'back-end/lib/resources/file';
import organizationResource from 'back-end/lib/resources/organization';
import sessionResource from 'back-end/lib/resources/session';
import userResource from 'back-end/lib/resources/user';
import authRouter from 'back-end/lib/routers/auth';
import frontEndRouter from 'back-end/lib/routers/front-end';
import statusRouter from 'back-end/lib/routers/status';
import { addHooksToRoute, makeErrorResponseBody, namespaceRoute, notFoundJsonRoute, Route, Router } from 'back-end/lib/server';
import { express, ExpressAdapter } from 'back-end/lib/server/adapters';
import { FileUploadMetadata, SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import Knex from 'knex';
import { concat, flatten, flow, map } from 'lodash/fp';
import { flipCurried } from 'shared/lib';
import { MAX_MULTIPART_FILES_SIZE } from 'shared/lib/resources/file';
import { Session } from 'shared/lib/resources/session';
import { parseFilePermissions, parseUserType } from '../shared/lib/resources/file';

type BasicCrudResource = crud.Resource<SupportedRequestBodies, SupportedResponseBodies, any, any, any, any, any, any, any, any, any, any, Session, Connection>;

type BasicRoute = Route<SupportedRequestBodies, any, any, any, SupportedResponseBodies, any, Session>;

const logger = makeDomainLogger(consoleAdapter, 'back-end');

export function connectToDatabase(postgresUrl: string): Connection {
  return Knex({
    client: 'pg',
    connection: postgresUrl,
    migrations: {
      tableName: DB_MIGRATIONS_TABLE_NAME
    }
  });
}

export async function createRouter(connection: Connection): Promise<Router<SupportedRequestBodies, any, any, any, SupportedResponseBodies, any, Session>> {
  const hooks = [
    loggerHook
  ];

  // Add new resources to this array.
  const resources: BasicCrudResource[] = [
    affiliationResource,
    fileResource,
    organizationResource,
    sessionResource,
    userResource
  ];

  // Define CRUD routes.
  // We need to use `flippedConcat` as using `concat` binds the routes in the wrong order.
  const flippedConcat = flipCurried(concat);
  const crudRoutes = flow([
    // Create routers from resources.
    map((resource: BasicCrudResource) => {
      return crud.makeRouter(resource)(connection);
    }),
    // Make a flat list of routes.
    flatten,
    // Respond with a standard 404 JSON response if API route is not handled.
    flippedConcat(notFoundJsonRoute),
    // Namespace all CRUD routes with '/api'.
    map((route: BasicRoute) => namespaceRoute('/api', route))
  ])(resources);

  // Collect all routes.
  let allRoutes = flow([
    // API routes.
    flippedConcat(crudRoutes),
    // Authentication router for SSO with OpenID Connect.
    flippedConcat(await authRouter(connection)),
    // Front-end router.
    flippedConcat(frontEndRouter('index.html')),
    // Add global hooks to all routes.
    map((route: BasicRoute) => addHooksToRoute(hooks, route))
  ])([]);

  // Add the status router.
  // This should not be behind basic auth.
  allRoutes = statusRouter.concat(allRoutes);

  return allRoutes;
}

async function start() {
  // Ensure all environment variables are specified correctly.
  const configErrors = getConfigErrors();
  if (configErrors.length || !POSTGRES_URL) {
    configErrors.forEach((error: string) => logger.error(error));
    throw new Error('Invalid environment variable configuration.');
  }
  // Connect to Postgres.
  const connection = connectToDatabase(POSTGRES_URL);
  logger.info('connected to the database');
  const router = await createRouter(connection);
  // Bind the server to a port and listen for incoming connections.
  // Need to lock-in Session type here.
  const adapter: ExpressAdapter<any, any, any, any, Session, FileUploadMetadata> = express();
  adapter({
    router,
    sessionIdToSession: async id => {
      try {
        if (!id) { throw new Error('session ID is undefined'); }
        return await readOneSession(connection, id);
      } catch (e) {
        return await createAnonymousSession(connection);
      }
    },
    sessionToSessionId: ({ id }) => id,
    host: SERVER_HOST,
    port: SERVER_PORT,
    maxMultipartFilesSize: MAX_MULTIPART_FILES_SIZE,
    parseFileUploadMetadata(raw) {
      return parseFilePermissions(raw, parseUserType);
    }
  });
  logger.info('server started', { host: SERVER_HOST, port: String(SERVER_PORT) });
}

start()
  .catch(error => {
    logger.error('app startup failed', makeErrorResponseBody(error).value);
    process.exit(1);
  });
