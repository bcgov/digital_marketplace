import init from "front-end/lib/app/init";
import router from "front-end/lib/app/router";
import { InnerMsg, Route, State } from "front-end/lib/app/types";
import update from "front-end/lib/app/update";
import view from "front-end/lib/app/view";
import { component } from "front-end/lib/framework";

const app: component.app.Component<State, InnerMsg, Route> = {
  init,
  update,
  view,
  router
};

export default app;
