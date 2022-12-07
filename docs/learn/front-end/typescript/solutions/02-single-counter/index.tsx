import { router as router_, component } from "front-end/lib/framework";
import { adt, ADT } from "shared/lib/types";
import React from "react";

/**
 * Display a number that can be incremented and decremented
 * by clicking buttons.
 */

interface State {
  counter: number;
}

type InnerMsg = ADT<"increment"> | ADT<"decrement">;

type Msg = component.app.Msg<InnerMsg, Route>;

type Route = ADT<"any", string>;

const init: component.base.Init<null, State, Msg> = () => {
  return [
    {
      counter: 0
    },
    []
  ];
};

const update: component.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "increment": {
      return [state.update("counter", (n) => n + 1), []];
    }

    case "decrement": {
      return [state.update("counter", (n) => n - 1), []];
    }

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
    <div>
      <button onClick={() => dispatch(adt("decrement"))}>- Decrement</button>
      <div>{state.counter}</div>
      <button onClick={() => dispatch(adt("increment"))}>+ Increment</button>
    </div>
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
