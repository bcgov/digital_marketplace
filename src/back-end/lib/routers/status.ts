import { makeTextResponseBody, Route, Router, TextResponseBody } from 'back-end/lib/server';
import { ServerHttpMethod } from 'back-end/lib/types';

const statusRoute: Route<any, null, TextResponseBody, null, any> = {
  method: ServerHttpMethod.Get,
  path: '/status',
  handler: {
    async transformRequest(request) {
      return null;
    },
    async respond(request) {
      return {
        code: 200,
        headers: {},
        session: request.session,
        body: makeTextResponseBody('OK')
      };
    }
  }
};

const router: Router<any, TextResponseBody, any> = [ statusRoute ];

export default router;
