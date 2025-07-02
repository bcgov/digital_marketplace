import * as base from "front-end/lib/framework/component/base";
import * as app from "front-end/lib/framework/component/app";
import * as router from "front-end/lib/framework/router";
import { remove } from "lodash";
import { Cmd } from "front-end/lib/framework/component/cmd";
import { adt, ADT } from "shared/lib/types";
import { createRoot, Root as ReactDOMRoot } from "react-dom/client";
import React from "react";

// Process

export interface Process<State, Msg> {
  dispatch: base.Dispatch<Msg>;
  subscribe: Subscribe<State, Msg>;
  unsubscribe: Unsubscribe<State, Msg>;
  getState(): base.Immutable<State>;
}

// Subscriptions

export type Subscription<State, Msg> = (event: Event<State, Msg>) => void;

//// Event

export type Event<State, Msg> =
  | ADT<
      "stateChanged",
      { state: base.Immutable<State>; dispatch: base.Dispatch<Msg> }
    >
  | ADT<"msgDispatched", Msg>;

//// Subscribe

export type Subscribe<State, Msg> = (
  subscription: Subscription<State, Msg>
) => boolean;

//// Unsubscribe

export type Unsubscribe<State, Msg> = (
  subscription: Subscription<State, Msg>
) => boolean;

// App Execution

export function start<AppState extends object, AppMsg, Route>(
  app: app.Component<AppState, AppMsg, Route>,
  element: HTMLElement,
  debug: boolean
): Process<AppState, app.Msg<AppMsg, Route>> {
  // Initialize state.
  // We do not need the RecordFactory, so we create the Record immediately.
  const [initState, initCmds] = app.init(null);
  let state = base.immutable(initState);
  // Set up subscription state.
  const subscriptions: Array<Subscription<AppState, app.Msg<AppMsg, Route>>> =
    [];
  const subscribe: Subscribe<AppState, app.Msg<AppMsg, Route>> = (
    subscription
  ) => (subscriptions.push(subscription) && true) || false;
  const unsubscribe: Unsubscribe<AppState, app.Msg<AppMsg, Route>> = (
    subscription
  ) => (remove(subscriptions, (a) => a === subscription) && true) || false;
  // Set up state accessor function.
  const getState = () => state;
  // Set up executeCmds function to run Cmds.
  const executeCmds = (cmds: Array<Cmd<app.Msg<AppMsg, Route>>>) =>
    cmds.forEach((cmd) => {
      cmd.value().then((msg) => dispatch(msg));
    });
  // Set up dispatch function to queue state mutations.
  const dispatch: base.Dispatch<app.Msg<AppMsg, Route>> = (
    msg: app.Msg<AppMsg, Route>
  ) => {
    publishMsgDispatched(msg);
    // Handle routing as required.
    routeManager.handleRouterMsg(msg as router.RouterMsg<Route>);
    // Update state.
    const [newState, updateCmds] = app.update({ state, msg });
    state = newState;
    publishStateChanged();
    executeCmds(updateCmds);
  };
  // Set up publish function.
  const publish = (event: Event<AppState, app.Msg<AppMsg, Route>>) => {
    subscriptions.forEach((subscription) => subscription(event));
    // tslint:disable:next-line no-console
    if (debug) {
      console.log("process event published", event);
    }
  };
  const publishMsgDispatched = (msg: app.Msg<AppMsg, Route>) =>
    publish(adt("msgDispatched", msg));
  const publishStateChanged = () =>
    publish(
      adt("stateChanged", {
        dispatch,
        state: getState()
      })
    );
  // Create the React root - enables async rendering - allows pauses in rendering to respond to user events
  const root: ReactDOMRoot = createRoot(element);
  // Initalize render function, passing the root.
  const render = makeRender(app.view, root);
  // Start handling routes in the app.
  const routeManager = router.makeRouteManager<Route>(app.router, dispatch);
  // Render the app on state changes.
  subscribe(render);
  // Trigger state initialization notification.
  publishStateChanged();
  // Create the Process.
  const process_ = {
    dispatch,
    subscribe,
    unsubscribe,
    getState
  };
  // Start the router.
  router.start(routeManager);
  // Process init Cmds
  executeCmds(initCmds);
  // Return the app process.
  return process_;
}

//// App Rendering

function makeRender<AppState, AppMsg, Route>(
  View: app.Component<AppState, AppMsg, Route>["view"],
  root: ReactDOMRoot
): (event: Event<AppState, app.Msg<AppMsg, Route>>) => void {
  return (event) => {
    if (event.tag === "stateChanged")
      root.render(
        <View state={event.value.state} dispatch={event.value.dispatch} />
      );
  };
}
