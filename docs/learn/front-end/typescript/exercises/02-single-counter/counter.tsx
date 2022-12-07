import { component as component_ } from "front-end/lib/framework";
import { adt, ADT } from "shared/lib/types";
import React from "react";
import { ComponentViewProps } from "front-end/lib/framework/component/base";

/**
 * Display a number that can be incremented and decremented
 * by clicking buttons.
 */

export interface State {
  counter: number;
}

type Params = null;

export type Msg = ADT<"increment"> | ADT<"decrement">;

const init: component_.base.Init<null, State, Msg> = () => {
  return [
    {
      counter: 0
    },
    []
  ];
};

const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "increment": {
      return [state.update("counter", (n) => n + 1), []];
    }
    case "decrement": {
      return [state.update("counter", (n) => n - 1), []];
    }
    default:
      return [state, []];
  }
};

type Props = ComponentViewProps<State, Msg>;

const view: component_.base.ComponentView<State, Msg> = ({
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

export const component: component_.base.Component<Params, State, Msg, Props> = {
  init,
  update,
  view,
};
