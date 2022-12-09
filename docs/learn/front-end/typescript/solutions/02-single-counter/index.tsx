import {
  router as router_,
  component,
  immutable,
  Immutable
} from "front-end/lib/framework";
import { adt, ADT } from "shared/lib/types";
import React from "react";

import * as Counter from "./counter";

interface State {
  counter: Immutable<Counter.State>;
}

type InnerMsg = ADT<"counter", Counter.Msg>;

type Msg = component.app.Msg<InnerMsg, Route>;

type Route = ADT<"any", string>;

const init: component.base.Init<null, State, Msg> = () => {
  const [counterState, _] = Counter.component.init(null);
  return [{ counter: immutable(counterState) }, []];
};

const update: component.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "counter":
      return component.base.updateChild({
        state,
        childStatePath: ["counter"],
        childUpdate: Counter.component.update,
        childMsg: msg.value,
        mapChildMsg: (value) => ({ tag: "counter", value })
      });
    case "@incomingRoute":
    case "@pageReady":
    case "@reload":
    case "@showToast":
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
  return (
    <Counter.component.view
      state={state.counter}
      dispatch={component.base.mapDispatch(dispatch, (msg) =>
        adt("counter" as const, msg)
      )}
    />
  );
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
