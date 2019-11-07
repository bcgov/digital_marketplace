import { RouteHook } from 'back-end/lib/server';
import chalk from 'chalk';
import { Session } from 'shared/lib/types';

const hook: RouteHook<unknown, unknown, number, Session>  = {

  async before(request) {
    request.logger.info(`${chalk.gray('->')} ${request.method} ${request.path}`, { sessionId: request.session.id });
    return Date.now();
  },

  async after(startTime, request, response) {
    request.logger.info(`${chalk.gray('<-')} ${response.code} ${Date.now() - startTime}ms`);
  }

}

export default hook;
