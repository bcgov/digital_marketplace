import { LOG_MEM_USAGE } from "back-end/config";
import { RouteHook } from "back-end/lib/server";
import chalk from "chalk";
import { Session } from "shared/lib/resources/session";

interface MemoryUsage {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

const hook: RouteHook<unknown, unknown, unknown, unknown, number, Session> = {
  async before(request) {
    request.logger.debug(
      `${chalk.gray("->")} ${request.method} ${request.path}`,
      { sessionId: request.session?.id || "anonymous" }
    );
    return Date.now();
  },

  async after(startTime, request, response) {
    const heap = process.memoryUsage();
    request.logger.debug(
      `${chalk.gray("<-")} ${response.code} ${Date.now() - startTime}ms`
    );

    if (LOG_MEM_USAGE) {
      for (const key in heap) {
        request.logger.debug(
          `${key} ${
            Math.round((heap[key as keyof MemoryUsage] / 1024 / 1024) * 100) /
            100
          } MB`
        );
      }
      request.logger.debug("---");
    }
  }
};

export default hook;
