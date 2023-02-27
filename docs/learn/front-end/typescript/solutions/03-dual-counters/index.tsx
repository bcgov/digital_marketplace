import {
  router as router_,
  component,
  immutable,
  Immutable
} from "front-end/lib/framework";
import { adt, ADT } from "shared/lib/types";
import React from "react";

import * as Counter from "learn-front-end/solutions/02-single-counter/counter";

interface State {
  counterA: Immutable<Counter.State>;
  counterB: Immutable<Counter.State>;
}

type InnerMsg = ADT<"counterA", Counter.Msg> | ADT<"counterB", Counter.Msg>;

type Msg = component.app.Msg<InnerMsg, Route>;

type Route = ADT<"any", string>;

const init: component.base.Init<null, State, Msg> = () => {
  const [counterAState, counterACmds] = Counter.component.init(null);
  const [counterBState, counterBCmds] = Counter.component.init(null);
  return [
    {
      counterA: immutable(counterAState),
      counterB: immutable(counterBState)
    },
    [
      ...component.cmd.mapMany(counterACmds, (msg) =>
        adt("counterA" as const, msg)
      ),
      ...component.cmd.mapMany(counterBCmds, (msg) =>
        adt("counterB" as const, msg)
      )
    ]
  ];
};

const update: component.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "counterA":
      return component.base.updateChild({
        state,
        childStatePath: ["counterA"],
        childUpdate: Counter.component.update,
        childMsg: msg.value,
        mapChildMsg: (msg) => adt("counterA", msg)
      });
    case "counterB":
      return component.base.updateChild({
        state,
        childStatePath: ["counterB"],
        childUpdate: Counter.component.update,
        childMsg: msg.value,
        mapChildMsg: (msg) => adt("counterB", msg)
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
      return [state, []];
  }
};

const view: component.base.ComponentView<State, Msg> = ({
  state,
  dispatch
}) => {
  return (
    <div>
      <h3>Counter A</h3>
      <Counter.component.view
        state={state.counterA}
        dispatch={component.base.mapDispatch(dispatch, (msg) =>
          adt("counterA" as const, msg)
        )}
      />
      <br />
      <h3>Counter B</h3>
      <Counter.component.view
        state={state.counterB}
        dispatch={component.base.mapDispatch(dispatch, (msg) =>
          adt("counterB" as const, msg)
        )}
      />
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
