import { RouteHook } from "back-end/lib/server";
import chalk from "chalk";
import { Session } from "shared/lib/resources/session";

const hook: RouteHook<unknown, unknown, unknown, unknown, number, Session> = {
  async before(request) {
    request.logger.debug(
      `${chalk.gray("->")} ${request.method} ${request.path}`,
      { sessionId: request.session?.id || "anonymous" }
    );
    return Date.now();
  },

  async after(startTime, request, response) {
    request.logger.debug(
      `${chalk.gray("<-")} ${response.code} ${Date.now() - startTime}ms`
    );
  }
};

export default hook;
