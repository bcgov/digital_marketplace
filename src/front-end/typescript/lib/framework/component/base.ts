import { NODE_ENV } from "front-end/config";
import * as Immutable from "immutable";
import { ReactElement } from "react";
import { Cmd } from "front-end/lib/framework/component/cmd";
import * as cmd from "front-end/lib/framework/component/cmd";

// Component

/**
 * The optional `Props` type parameter enables you
 * to define views that take additional props in a
 * type-safe manner.
 */

export interface Component<
  Params,
  State,
  Msg,
  Props extends ComponentViewProps<State, Msg> = ComponentViewProps<State, Msg>
> {
  init: Init<Params, State, Msg>;
  update: Update<State, Msg>;
  view: View<Props>;
}

// Init

export type InitReturnValue<State, Msg> = [State, Array<Cmd<Msg>>];

export type Init<Params, State, Msg> = (
  params: Params
) => InitReturnValue<State, Msg>;

// Update

export type UpdateReturnValue<State, Msg> = [Immutable<State>, Array<Cmd<Msg>>];

export interface UpdateParams<State, Msg> {
  state: Immutable<State>;
  msg: Msg;
}

export type Update<State, Msg> = (
  params: UpdateParams<State, Msg>
) => UpdateReturnValue<State, Msg>;

//// Update Children

export interface UpdateChildParams<
  ParentState,
  ParentMsg,
  ChildState,
  ChildMsg
> {
  state: Immutable<ParentState>;
  childStatePath: string[];
  childUpdate: Update<ChildState, ChildMsg>;
  childMsg: ChildMsg;
  updateAfter?(
    state: Immutable<ParentState>
  ): UpdateReturnValue<ParentState, ParentMsg>;
  mapChildMsg(msg: ChildMsg): ParentMsg;
}

export function updateChild<PS, PM, CS, CM>(
  params: UpdateChildParams<PS, PM, CS, CM>
): UpdateReturnValue<PS, PM> {
  const { childStatePath, childUpdate, childMsg, mapChildMsg, updateAfter } =
    params;
  let { state } = params;
  const childState = state.getIn(childStatePath) as Immutable<CS>;
  // tslint:disable:next-line no-console
  if (NODE_ENV === "development") {
    console.assert(childState);
  }
  if (!childState) {
    return [state, []];
  }
  const [newChildState, childCmds] = childUpdate({
    state: childState,
    msg: childMsg
  });
  state = state.setIn(childStatePath, newChildState);
  let updateAfterCmds: UpdateReturnValue<PS, PM>[1] = [];
  if (updateAfter) {
    const result = updateAfter(state);
    state = result[0];
    updateAfterCmds = result[1];
  }
  const cmds = [
    ...childCmds.map((c) => cmd.map(c, mapChildMsg)),
    ...updateAfterCmds
  ];
  return [state, cmds];
}

// View

export type ViewElement<Props = Record<string, unknown>> =
  null | ReactElement<Props>;

export type ViewElementChildren<Props = Record<string, unknown>> =
  | ViewElement<Props>
  | string
  | Array<ReactElement<Props> | null | string>;

export type View<Props = Record<string, never>, ReturnValue = ViewElement> = (
  props: Props
) => ReturnValue;

//// ComponentView

export type ComponentView<State, Msg, ReturnValue = ViewElement> = View<
  ComponentViewProps<State, Msg>,
  ReturnValue
>;

//// ComponentViewProps

export interface ComponentViewProps<State, Msg> {
  state: Immutable<State>;
  dispatch: Dispatch<Msg>;
}

//// Dispatch

export type Dispatch<Msg> = (msg: Msg) => void;

export function mapDispatch<ParentMsg, ChildMsg>(
  dispatch: Dispatch<ParentMsg>,
  fn: (childMsg: ChildMsg) => ParentMsg
): Dispatch<ChildMsg> {
  return (childMsg) => {
    return dispatch(fn(childMsg));
  };
}

// Immutable

export type Immutable<State> = Immutable.Record<State & object> &
  Readonly<State>;

export function immutable<State>(state: State): Immutable<State> {
  return Immutable.Record(state as State & object)();
}
