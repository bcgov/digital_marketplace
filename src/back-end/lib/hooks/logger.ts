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
    request.logger.info(
      `${chalk.gray("->")} ${request.method} ${request.path}`,
      { sessionId: request.session?.id || "anonymous" }
    );
    return [heap, Date.now()];
  },

  async after([startMemory, startTime], request, response) {
    request.logger.info(
      `${chalk.gray("<-")} ${response.code} ${Date.now() - startTime}ms`
    );

    request.logger.info("");
    for (const key in startMemory) {
      request.logger.info(
        `${key} ${
          Math.round(
            (startMemory[key as keyof MemoryUsage] / 1024 / 1024) * 100
          ) / 100
        } MB`
      );
    }
    request.logger.info("");
  }
};

export default hook;
