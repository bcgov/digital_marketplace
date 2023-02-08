// Implement a "Hello, world!" application that changes "world"
// to a name specified by the URL.
//
// e.g. / -> Hello, world!
// e.g. /Brad -> Hello, Brad!
// e.g. /ian -> Hello, ian!
// e.g. /jOsH -> Hello, jOsH!

import { router as router_, component } from "front-end/lib/framework";
import { adt, ADT } from "shared/lib/types";
import React from "react";

interface State {
  name: string;
}

type InnerMsg = ADT<"noop">;

type Msg = component.app.Msg<InnerMsg, Route>;

type Route =
  | ADT<"hello", string> // name: string
  | ADT<"notFound", string>; // path: string

const DEFAULT_NAME = "world";

const init: component.base.Init<null, State, Msg> = () => {
  return [
    {
      name: DEFAULT_NAME
    },
    []
  ];
};

const update: component.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "@incomingRoute": {
      const { route } = msg.value;
      switch (route.tag) {
        case "hello":
          return [state.set("name", route.value || DEFAULT_NAME), []];
        case "notFound":
        default:
          return [state.set("name", DEFAULT_NAME), []];
      }
    }

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
  return <div>Hello, {state.name}!</div>;
};

const router: router_.Router<Route> = {
  routes: [
    {
      path: "/",
      makeRoute() {
        return adt("hello", "");
      }
    },
    {
      path: "/:name",
      makeRoute({ params }) {
        return adt("hello", params.name || "");
      }
    },
    {
      path: "(.*)",
      makeRoute({ path }) {
        return adt("notFound", path);
      }
    }
  ],
  routeToUrl(route) {
    switch (route.tag) {
      case "hello":
        return `/${route.value}`;
      case "notFound":
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
