// Implement a an application that has two pages:
//
// Hello, world! Page: /hello -> Hello, world!
// Hello, <name>! Page: /hello/:name -> Hello, <name>!
// Single Counter Page: /counter/single -> Renders a single counter component.

import {
  router as router_,
  component,
  Immutable
} from "front-end/lib/framework";
import { adt, ADT } from "shared/lib/types";
import React from "react";
import * as HelloPage from "learn-front-end/solutions/06-pages/pages/hello";
import { SharedState, Route } from "learn-front-end/solutions/06-pages/types";

interface State {
  shared: SharedState;
  activeRoute: Route | null;
  pages: {
    hello: Immutable<HelloPage.State> | null;
  };
}

type InnerMsg = ADT<"noop"> | ADT<"helloPage", HelloPage.Msg>;

type Msg = component.app.Msg<InnerMsg, Route>;

const init: component.base.Init<null, State, Msg> = () => {
  return [
    {
      shared: {},
      activeRoute: null,
      pages: {
        hello: null
      }
    },
    []
  ];
};

function initPage(
  state: Immutable<State>,
  route: Route
): component.base.UpdateReturnValue<State, Msg> {
  state = state.set("activeRoute", route);
  switch (route.tag) {
    case "hello":
      return component.app.initPage({
        state,
        routePath: router.routeToUrl(route),
        pageStatePath: ["pages", "hello"],
        pageRouteParams: { name: route.value },
        pageInit: HelloPage.init,
        pageGetMetadata: HelloPage.page.getMetadata,
        getSharedState: (state) => state.shared,
        mapPageMsg: (childMsg) => adt("helloPage", childMsg),
        noopMsg: adt("noop") as InnerMsg
      });
    case "singleCounter":
    case "notFound":
      return [state, []];
  }
}

const update: component.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "@incomingRoute": {
      const { route } = msg.value;
      return initPage(state, route);
    }

    case "helloPage":
      return component.app.updatePage<
        State,
        InnerMsg,
        HelloPage.State,
        HelloPage.InnerMsg,
        Route
      >({
        state,
        pageStatePath: ["pages", "hello"],
        pageUpdate: HelloPage.update,
        pageMsg: msg.value,
        mapPageMsg: (childMsg) => adt("helloPage", childMsg),
        pageGetMetadata: HelloPage.page.getMetadata,
        noopMsg: adt("noop") as InnerMsg
      });

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

const view: component.base.ComponentView<State, Msg> = ({
  state,
  dispatch
}) => {
  const activeRoute = state.activeRoute;
  if (!activeRoute) return <div>Loading...</div>;
  const notFound = <div>Not Found</div>;
  switch (activeRoute.tag) {
    case "hello": {
      const pageState = state.pages.hello;
      if (!pageState) return notFound;
      return (
        <HelloPage.view
          state={pageState}
          dispatch={component.app.mapDispatch<Msg, HelloPage.InnerMsg, Route>(
            dispatch,
            (msg) => adt("helloPage", msg)
          )}
        />
      );
    }
    case "singleCounter":
      return <div>Single Counter</div>;
    case "notFound":
      return notFound;
  }
};

const router: router_.Router<Route> = {
  routes: [
    {
      path: "/hello",
      makeRoute() {
        return adt("hello", "");
      }
    },
    {
      path: "/hello/:name",
      makeRoute({ params }) {
        return adt("hello", params.name || "");
      }
    },
    {
      path: "/counter/single",
      makeRoute() {
        return adt("singleCounter");
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
        return `/hello/${route.value}`;
      case "singleCounter":
        return "/counter/single";
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
