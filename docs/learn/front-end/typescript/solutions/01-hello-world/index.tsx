import { router as router_, component } from "front-end/lib/framework";
import { adt, ADT } from "shared/lib/types";
import React from "react";

interface State {
  message: string;
}

type InnerMsg = ADT<"noop">;

type Msg = component.app.Msg<InnerMsg, Route>;

type Route = ADT<"any", string>;

const init: component.base.Init<null, State, Msg> = () => {
  return [
    {
      message: "Hello, world!"
    },
    []
  ];
};

const update: component.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "@incomingRoute":
    case "@pageReady":
    case "@reload":
    case "@showToast":
    case "noop":
      return [state, []];

    case "@newRoute":
    case "@replaceRoute":
    case "@newUrl":
    case "@replaceUrl":
    default:
      return [state, []];
  }
};

const view: component.base.ComponentView<State, Msg> = ({ state }) => {
  return <div>{state.message}</div>;
};

const router: router_.Router<Route> = {
  routes: [
    {
      path: "(.*)",
      makeRoute({ path }) {
        return adt("any", path);
      }
    }
  ],
  routeToUrl(route) {
    switch (route.tag) {
      case "any":
        return route.value;
    }
  }
};

export const app: component.app.Component<State, Msg, Route> = {
  init,
  update,
  view,
  router
};
