import { VITE_NODE_ENV } from "front-end/config";
import * as Immutable from "immutable";
import { ReactElement } from "react";
import { Cmd } from "front-end/lib/framework/component/cmd";
import * as cmd from "front-end/lib/framework/component/cmd";

/**
 * @remarks
 * Defines the primitives needed to achieve separation of
 * concerns and composability objectives.
 *
 * Primitives:
 * (Component + Init + Update + View types,
 * updateChild + mapDispatch helpers)
 *
 * @example
 * When building a component within another component
 * such as checkboxes in a page, mechanisms are required
 * to dispatch a msg from the child to the parent
 * `mapDispatch` and then passing the updated state
 * `updateChild` from parent (i.e. page) to the
 * child components (i.e. checkboxes)
 *
 * @example includes everything in the
 * `/src/front-end/typescript/lib/components` directory
 */

/**
 * This interface describes the shape of a component object
 * including its three required types (`Params`, `State`, `Msg`)
 * and three required functions (`init`, `update`, `view`).
 *
 * A component object that conforms to this interface can be referenced
 * by types and as a value in application code.
 *
 * @typeParam Props - Optional type parameter allows developers to
 * override the default `ComponentViewProps` expected by the `view` function.
 * Sometimes, it's better to pass data to a `view` function via its
 * `Props` instead of `State`.
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

/**
 * Updates a child component's state inside
 * a parent component's update function
 *
 * @param params - the ParentState, ParentMsg, ChildState, and ChildMessage
 * @returns UpdateReturnValue - the ParentState and ParentMsg Array
 * {@link UpdateChildParams}
 * {@link UpdateReturnValue}
 */
export function updateChild<PS, PM, CS, CM>(
  params: UpdateChildParams<PS, PM, CS, CM>
): UpdateReturnValue<PS, PM> {
  const { childStatePath, childUpdate, childMsg, mapChildMsg, updateAfter } =
    params;
  let { state } = params;
  const childState = state.getIn(childStatePath) as Immutable<CS>;
  // tslint:disable:next-line no-console
  if (VITE_NODE_ENV === "development") {
    console.assert(!!childState);
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

/**
 * Creates dispatch functions for child components inside
 * parent components. It is typically used inside parent components'
 * view function.
 *
 * @param dispatch - ParentMsg, ChildMsg
 * @param fn - a mapping function that converts a child component's Msg
 * to a parent Msg so it can be handled by the parent component's update function.
 * @returns Dispatch - the Child Msg
 */
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
