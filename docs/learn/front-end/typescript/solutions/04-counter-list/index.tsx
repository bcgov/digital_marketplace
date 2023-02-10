import {
  router as router_,
  component,
  Immutable,
  immutable
} from "front-end/lib/framework";
import { adt, ADT } from "shared/lib/types";
import React from "react";

import * as Counter from "learn-front-end/solutions/02-single-counter/counter";

interface State {
  counters: Immutable<Counter.State>[];
}

type InnerMsg =
  | ADT<"counter", [number, Counter.Msg]>
  | ADT<"add">
  | ADT<"remove", number>;

type Msg = component.app.Msg<InnerMsg, Route>;

type Route = ADT<"any", string>;

const init: component.base.Init<null, State, Msg> = () => {
  return [
    {
      counters: []
    },
    []
  ];
};

const update: component.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "counter": {
      const [indexToUpdate, counterMsg] = msg.value;
      return component.base.updateChild({
        state,
        childStatePath: ["counters", `${indexToUpdate}`],
        childUpdate: Counter.component.update,
        childMsg: counterMsg,
        mapChildMsg: (msg) => adt("counter", [indexToUpdate, msg]) as Msg
      });
    }

    case "add": {
      const [counterState, counterCmds] = Counter.component.init(null);
      return [
        state.update("counters", (counters) => [
          ...counters,
          immutable(counterState)
        ]),
        component.cmd.mapMany(
          counterCmds,
          (msg) => adt("counter", [state.counters.length, msg]) as Msg
        )
      ];
    }

    case "remove": {
      const indexToRemove = msg.value;
      return [
        state.update("counters", (counters) =>
          counters.filter((_, index) => index !== indexToRemove)
        ),
        []
      ];
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
      return [state, []];
  }
};

const view: component.base.ComponentView<State, Msg> = ({
  state,
  dispatch
}) => {
  return (
    <div>
      <h1>Counters</h1>
      <button onClick={() => dispatch(adt("add"))}>Add Counter</button>
      {state.counters.map((counter, index) => {
        return (
          <div key={`counter-${index}`}>
            <br />
            <h3>Counter {index}</h3>
            <button onClick={() => dispatch(adt("remove", index))}>
              Remove
            </button>
            <br />
            <Counter.component.view
              state={counter}
              dispatch={component.base.mapDispatch(
                dispatch,
                (msg) => adt("counter", [index, msg]) as Msg
              )}
            />
          </div>
        );
      })}
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
