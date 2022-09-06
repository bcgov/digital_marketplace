import {
  makeTextResponseBody,
  nullRequestBodyHandler,
  Route,
  Router,
  TextResponseBody
} from "back-end/lib/server";
import { ServerHttpMethod } from "back-end/lib/types";

const statusRoute: Route<any, any, any, any, TextResponseBody, any, any> = {
  method: ServerHttpMethod.Get,
  path: "/status",
  handler: nullRequestBodyHandler(async (request) => {
    return {
      code: 200,
      headers: {},
      session: request.session,
      body: makeTextResponseBody("OK")
    };
  })
};

const router: Router<any, any, any, any, TextResponseBody, any, any> = [
  statusRoute
];

export default router;
