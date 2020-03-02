import { UPDATE_HOOK_THROTTLE } from 'back-end/config';
import * as db from 'back-end/lib/db';
import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import { RouteHook } from 'back-end/lib/server';
import { throttle } from 'lodash';
import { Session } from 'shared/lib/resources/session';
import { isInvalid, isValid, Validation } from 'shared/lib/validation';

const logger = makeDomainLogger(consoleAdapter, 'hooks');

const createCrudHook: (connection: db.Connection) => RouteHook<unknown, unknown, unknown, unknown, number, Session> = (connection: db.Connection) => {
  const throttledBefore = throttle(() => {
    logger.info(`Invoked cwuCrudHook at ${new Date()}`);
    db.closeCWUOpportunities(connection)
        .then((result: Validation<number, null>) => {
          if (isValid(result) && result.value > 0) {
            logger.info(`${result.value} Code With Us opportunities were set to Evaluation`);
          } else if (isInvalid(result)) {
            logger.warn('Unable to update lapsed Code With Us opportunities');
          }
        });
      },
      UPDATE_HOOK_THROTTLE,
      { leading: true, trailing: true });

  return {
    async before() {
      throttledBefore();
      return Date.now();
    }
  };
};

export default createCrudHook;
