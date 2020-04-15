import assert from 'assert';
import loggerHook from 'back-end/lib/hooks/logger';
import { DomainLogger } from 'back-end/lib/logger';
import * as mocks from 'back-end/lib/routers/admin/mocks';
import { Request } from 'back-end/lib/server';
import { ServerHttpMethod } from 'back-end/lib/types';
import { noop } from 'lodash';
import { Session } from 'shared/lib/resources/session';

type LogFunctionKind = keyof DomainLogger;

function makeStubRequest(onLog: (kind: LogFunctionKind, msg: string, data?: object) => void): Request<null, Session> {
  const makeLogFn = (kind: LogFunctionKind) => (msg: string, data?: object) => onLog(kind, msg, data);
  return {
    headers: {},
    params: {},
    query: {},
    id: 'id__',
    method: ServerHttpMethod.Patch,
    path: '/path__',
    body: null,
    session: {
      id: 'sId__',
      accessToken: 'token__',
      createdAt: new Date(),
      updatedAt: new Date(),
      user: mocks.vendorUser
    },
    logger: {
      info: makeLogFn('info'),
      debug: makeLogFn('debug'),
      warn: makeLogFn('warn'),
      error: makeLogFn('error')
    }
  };
}

describe('loggerHook', () => {

  describe('before', () => {

    describe('when provided a request', () => {

      it('calls any function on the logger', async () => {
        let called = false;
        const request = makeStubRequest(k => {
          called = true;
        });
        await loggerHook.before(request);
        assert(called, 'request.logger.* was called');
      });

      it('logs the appropriate information', async () => {
        let msg = '';
        let data: any = {};
        const request = makeStubRequest((k, m, d) => {
          msg = m;
          data = d || {};
        });
        await loggerHook.before(request);
        assert(msg.indexOf(request.method) !== -1, 'contains the request method');
        assert(msg.indexOf(request.path) !== -1, 'contains the request path');
        assert(data.sessionId === request.session?.id, 'contains the session ID');
      });

      it('returns the current epoch time', async () => {
        const request = makeStubRequest(noop);
        const timestamp = await loggerHook.before(request);
        assert(typeof timestamp === 'number', 'the return value is a number');
        assert(Date.now() - timestamp < 10000, 'the difference between the current time and the timestamp is reasonably small');
      });

    });

  });

});
