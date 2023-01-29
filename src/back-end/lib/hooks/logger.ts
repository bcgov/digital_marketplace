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

const hook: RouteHook<
  unknown,
  unknown,
  unknown,
  unknown,
  [MemoryUsage, number],
  Session
> = {
  async before(request) {
    const heap = process.memoryUsage();
    request.logger.debug(
      `${chalk.gray("->")} ${request.method} ${request.path}`,
      { sessionId: request.session?.id || "anonymous" }
    );
    return [heap, Date.now()];
  },

  async after([startMemory, startTime], request, response) {
    request.logger.debug(
      `${chalk.gray("<-")} ${response.code} ${Date.now() - startTime}ms`
    );

    if (LOG_MEM_USAGE) {
      request.logger.debug("---");
      for (const key in startMemory) {
        request.logger.debug(
          `${key} ${
            Math.round(
              (startMemory[key as keyof MemoryUsage] / 1024 / 1024) * 100
            ) / 100
          } MB`
        );
      }
      request.logger.debug("---");
    }
  }
};

export default hook;
