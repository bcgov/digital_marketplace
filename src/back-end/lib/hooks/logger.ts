import { LOG_MEM_USAGE } from "back-end/config";
import { RouteHook } from "back-end/lib/server";
import chalk from "chalk";
import { Session } from "shared/lib/resources/session";

interface FormattedMemoryUsage {
  rss: string;
  heapTotal: string;
  heapUsed: string;
  external: string;
  arrayBuffers: string;
}

const roundToMb = (value: number): string => {
  return `${Math.round((value / 1024 / 1024) * 100) / 100} MB`;
};

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

    if (LOG_MEM_USAGE) {
      const rawHeap = process.memoryUsage();
      const heap: FormattedMemoryUsage = {
        rss: roundToMb(rawHeap.rss),
        heapTotal: roundToMb(rawHeap.heapTotal),
        heapUsed: roundToMb(rawHeap.heapUsed),
        external: roundToMb(rawHeap.external),
        arrayBuffers: roundToMb(rawHeap.arrayBuffers)
      };
      request.logger.debug(chalk.gray("memory usage"), heap);
    }
  }
};

export default hook;
