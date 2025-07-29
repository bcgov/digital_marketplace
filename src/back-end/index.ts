import {
  BASIC_AUTH_PASSWORD_HASH,
  BASIC_AUTH_USERNAME,
  DB_MIGRATIONS_TABLE_NAME,
  getConfigErrors,
  KNEX_DEBUG,
  LOG_LEVEL,
  PG_CONFIG,
  SCHEDULED_DOWNTIME,
  SERVER_HOST,
  SERVER_PORT
} from "back-end/config";
import {
  BasicCrudResource as CrudResource,
  makeRouter
} from "back-end/lib/crud";
import { Connection, readOneSession } from "back-end/lib/db";
import codeWithUsHook from "back-end/lib/hooks/code-with-us";
import loggerHook from "back-end/lib/hooks/logger";
import sprintWithUsHook from "back-end/lib/hooks/sprint-with-us";
import teamWithUsHook from "back-end/lib/hooks/team-with-us";
import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import basicAuth from "back-end/lib/map-routes/basic-auth";
import affiliationResource from "back-end/lib/resources/affiliation";
import avatarResource from "back-end/lib/resources/avatar";
import contentResource from "back-end/lib/resources/content";
import counterResource from "back-end/lib/resources/counter";
import emailNotificationsResource from "back-end/lib/resources/email-notifications";
import fileResource from "back-end/lib/resources/file";
import metricsResource from "back-end/lib/resources/metrics";
import codeWithUsOpportunityResource from "back-end/lib/resources/opportunity/code-with-us";
import sprintWithUsOpportunityResource from "back-end/lib/resources/opportunity/sprint-with-us";
import teamWithUsOpportunityResource from "back-end/lib/resources/opportunity/team-with-us";
import organizationResource from "back-end/lib/resources/organization";
import ownedOrganizationResource from "back-end/lib/resources/owned-organization";
import codeWithUsProposalResource from "back-end/lib/resources/proposal/code-with-us";
import teamWithUsProposalResource from "back-end/lib/resources/proposal/team-with-us";
import sprintWithUsProposalResource from "back-end/lib/resources/proposal/sprint-with-us";
import sessionResource from "back-end/lib/resources/session";
import codeWithUsSubscriberResource from "back-end/lib/resources/subscribers/code-with-us";
import sprintWithUsSubscriberResource from "back-end/lib/resources/subscribers/sprint-with-us";
import teamWithUsSubscriberResource from "back-end/lib/resources/subscribers/team-with-us";
import sprintWithUsProposalTeamQuestionEvaluationResource from "back-end/lib/resources/proposal/sprint-with-us/team-questions/evaluations";
import sprintWithUsOpportunityTeamQuestionEvaluationResource from "back-end/lib/resources/opportunity/sprint-with-us/team-questions/evaluations";
import sprintWithUsProposalTeamQuestionConsensusResource from "back-end/lib/resources/proposal/sprint-with-us/team-questions/consensus";
import sprintWithUsOpportunityTeamQuestionConsensusResource from "back-end/lib/resources/opportunity/sprint-with-us/team-questions/consensus";
import teamWithUsProposalResourceQuestionEvaluationResource from "back-end/lib/resources/proposal/team-with-us/resource-questions/evaluations";
import teamWithUsOpportunityResourceQuestionEvaluationResource from "back-end/lib/resources/opportunity/team-with-us/resource-questions/evaluations";
import teamWithUsProposalResourceQuestionConsensusResource from "back-end/lib/resources/proposal/team-with-us/resource-questions/consensus";
import teamWithUsOpportunityResourceQuestionConsensusResource from "back-end/lib/resources/opportunity/team-with-us/resource-questions/consensus";
import userResource from "back-end/lib/resources/user";
import contactListResource from "back-end/lib/resources/contact-list";
import adminRouter from "back-end/lib/routers/admin";
import authRouter from "back-end/lib/routers/auth";
import jwtRouter from "back-end/lib/routers/jwt";
import frontEndRouter from "back-end/lib/routers/front-end";
import statusRouter from "back-end/lib/routers/status";
import {
  addHooksToRoute,
  makeErrorResponseBody,
  namespaceRoute,
  notFoundJsonRoute,
  Route,
  RouteHook,
  Router
} from "back-end/lib/server";
import { express, ExpressAdapter } from "back-end/lib/server/adapters";
import {
  FileUploadMetadata,
  SupportedRequestBodies,
  SupportedResponseBodies
} from "back-end/lib/types";
import { Application } from "express";
import { Server } from "http";
import { Knex, knex } from "knex";
import { concat, flatten, flow, map } from "lodash/fp";
import { flipCurried } from "shared/lib";
import {
  MAX_MULTIPART_FILES_SIZE,
  parseFilePermissions
} from "shared/lib/resources/file";
import { Session } from "shared/lib/resources/session";
import { isValid } from "shared/lib/validation";

type BasicCrudResource = CrudResource<Session, Connection>;

type BasicRoute = Route<
  SupportedRequestBodies,
  any,
  any,
  any,
  SupportedResponseBodies,
  any,
  Session
>;

type AppRouter = Router<
  SupportedRequestBodies,
  any,
  any,
  any,
  SupportedResponseBodies,
  any,
  Session
>;

// logger should be declared before getConfigErrors() gets triggered
const logger = makeDomainLogger(consoleAdapter, "back-end");

// Ensure all environment variables are specified correctly.
const configErrors = getConfigErrors();

if (configErrors.length || !PG_CONFIG) {
  configErrors.forEach((error: string) => logger.error(error));
  throw new Error("Invalid environment variable configuration.");
}

const config: Knex.Config = {
  client: "pg",
  connection: PG_CONFIG,
  migrations: {
    tableName: DB_MIGRATIONS_TABLE_NAME
  },
  debug: KNEX_DEBUG
};

export const connectToDatabase: () => Connection = (() => {
  let _connection: Connection | null = null;
  return function (): Connection {
    _connection = _connection || knex(config);
    return _connection;
  };
})();

const globalHooks = [loggerHook];

const addHooks: (
  hooks: RouteHook<unknown, unknown, unknown, unknown, any, Session>[]
) => (_: BasicRoute[]) => BasicRoute[] = (
  hooks: RouteHook<unknown, unknown, unknown, unknown, any, Session>[]
) => map((route: BasicRoute) => addHooksToRoute(hooks, route));

// We need to use `flippedConcat` as using `concat` binds the routes in the wrong order.
const flippedConcat = flipCurried(concat);

/**
 * Creates a router using the provided {@link Connection}.
 *
 * @returns a {@link AppRouter} constructed from the Digital Marketplace resources.
 */
export function createRouter(connection: Connection): AppRouter {
  // Add new resources to this array.
  const resources: BasicCrudResource[] = [
    affiliationResource,
    avatarResource,
    codeWithUsOpportunityResource,
    contentResource,
    sprintWithUsOpportunityResource,
    teamWithUsOpportunityResource,
    codeWithUsProposalResource,
    sprintWithUsProposalResource,
    codeWithUsSubscriberResource,
    sprintWithUsSubscriberResource,
    teamWithUsSubscriberResource,
    teamWithUsProposalResource,
    fileResource,
    counterResource,
    organizationResource,
    ownedOrganizationResource,
    sessionResource,
    userResource,
    contactListResource,
    metricsResource,
    emailNotificationsResource,
    sprintWithUsProposalTeamQuestionEvaluationResource,
    sprintWithUsOpportunityTeamQuestionEvaluationResource,
    sprintWithUsProposalTeamQuestionConsensusResource,
    sprintWithUsOpportunityTeamQuestionConsensusResource,
    teamWithUsProposalResourceQuestionEvaluationResource,
    teamWithUsOpportunityResourceQuestionEvaluationResource,
    teamWithUsProposalResourceQuestionConsensusResource,
    teamWithUsOpportunityResourceQuestionConsensusResource
  ];

  // Define CRUD routes.
  const crudRoutes = flow([
    // Create routers from resources.
    map((resource: BasicCrudResource) => {
      return makeRouter(resource)(connection);
    }),
    // Make a flat list of routes.
    flatten,
    // Respond with a standard 404 JSON response if API route is not handled.
    flippedConcat(notFoundJsonRoute),
    // Namespace all CRUD routes with '/api'.
    map((route: BasicRoute) => namespaceRoute("/api", route)),
    addHooks([
      codeWithUsHook(connection),
      sprintWithUsHook(connection),
      teamWithUsHook(connection)
    ])
  ])(resources);

  // Collect all routes.
  let allRoutes = flow([
    // API routes.
    flippedConcat(crudRoutes),
    // Authentication router for SSO with OpenID Connect.
    flippedConcat(authRouter(connection)),
    // JWT router for AI service authentication.
    flippedConcat(jwtRouter(connection)),
    // Admin router
    flippedConcat(
      adminRouter().map((route) => namespaceRoute("/admin", route))
    ),
    // Front-end router.
    flippedConcat(frontEndRouter("index.html")),
    // Add global hooks to all routes.
    addHooks(globalHooks)
  ])([]);

  if (BASIC_AUTH_USERNAME && BASIC_AUTH_PASSWORD_HASH) {
    allRoutes = allRoutes.map(
      basicAuth({
        username: BASIC_AUTH_USERNAME,
        passwordHash: BASIC_AUTH_PASSWORD_HASH,
        mapHook: (a) => a
      })
    );
  }

  return allRoutes;
}

export function createDowntimeRouter(): AppRouter {
  return flow([
    // Front-end router.
    flippedConcat(frontEndRouter("downtime.html")),
    // Add global hooks to all routes.
    addHooks(globalHooks)
  ])([]);
}

export async function initApplication() {
  // Output log level.
  logger.info(`Log level set to: ${LOG_LEVEL.toUpperCase()}`);
  // Connect to Postgres.
  const connection = connectToDatabase();
  // Test DB connection
  await connection.raw("SELECT 1");
  logger.info("PostgreSQL connected");

  // Create the router.
  let router: AppRouter = (
    SCHEDULED_DOWNTIME ? createDowntimeRouter : createRouter
  )(connection);
  // Add the status router.
  // This should not be behind basic auth.
  // Also, run the CWU and SWU hooks with the status router.
  // i.e. The status route effectively acts as an action triggered by a CRON job.
  const statusRouterWithHooks = addHooks([
    codeWithUsHook(connection),
    sprintWithUsHook(connection),
    teamWithUsHook(connection)
  ])(statusRouter as AppRouter);
  router = [...statusRouterWithHooks, ...router];
  // Bind the server to a port and listen for incoming connections.
  // Need to lock-in Session type here.
  const adapter: ExpressAdapter<
    any,
    any,
    any,
    any,
    Session,
    FileUploadMetadata | null
  > = express();

  const app = adapter({
    router,
    sessionIdToSession: async (id) => {
      //Do not touch the database:
      //1. During scheduled downtime.
      //2. If the ID is empty.
      if (SCHEDULED_DOWNTIME || !id) {
        return null;
      }
      try {
        //Try reading user session.
        const dbResult = await readOneSession(connection, id);
        if (isValid(dbResult)) {
          return dbResult.value;
        } else {
          throw new Error(`Failed to read session: ${id}`);
        }
      } catch (e) {
        logger.warn((e as Error).message);
        return null;
      }
    },
    sessionToSessionId: (session) => session?.id || "",
    host: SERVER_HOST,
    port: SERVER_PORT,
    maxMultipartFilesSize: MAX_MULTIPART_FILES_SIZE,
    parseFileUploadMetadata(raw) {
      return parseFilePermissions(raw);
    }
  });

  return app;
}

let server: Server;
export let app: Application;

export async function startServer({ port = SERVER_PORT } = {}) {
  try {
    app = await initApplication();
    server = app.listen(port, SERVER_HOST);
    logger.info("server started", {
      host: SERVER_HOST,
      port: String(port)
    });
  } catch (error) {
    logger.error(
      "app startup failed",
      makeErrorResponseBody(error as Error).value
    );
    process.exit(1);
  }
}

export async function stopServer() {
  if (!server) {
    console.error("Server is not started");
    process.exit(1);
  }

  try {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          connectToDatabase()
            .destroy()
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  } catch (error) {
    console.error("Error stopping the server:", error);
    process.exit(1);
  }
}
