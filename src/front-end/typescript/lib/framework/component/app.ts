import * as base from "front-end/lib/framework/component/base";
import * as page from "front-end/lib/framework/component/page";
import * as global from "front-end/lib/framework/component/global";
import * as router from "front-end/lib/framework/router";
import { Cmd } from "front-end/lib/framework/component/cmd";
import { ADT } from "shared/lib/types";
import * as cmd from "front-end/lib/framework/component/cmd";

// Component

export interface Component<State, AppMsg, Route>
  extends base.Component<null, State, Msg<AppMsg, Route>> {
  router: router.Router<Route>;
}

// Msg

export type Msg<AppMsg, Route> =
  | global.Msg<AppMsg, Route>
  | router.IncomingRouteMsg<Route>
  | page.ReadyMsg;

//// mapMsg

export function mapMsg<PageMsg extends ADT<unknown, unknown>, AppMsg, Route>(
  msg: page.Msg<PageMsg, Route>,
  map: (msg: PageMsg) => AppMsg
): Msg<AppMsg, Route> {
  return page.mapMsg(msg, map);
}

//// mapDispatch

export function mapDispatch<
  AppMsg,
  PageMsg extends ADT<unknown, unknown>,
  Route
>(
  dispatch: base.Dispatch<Msg<AppMsg, Route>>,
  map: (msg: PageMsg) => AppMsg
): base.Dispatch<page.Msg<PageMsg, Route>> {
  return (msg: page.Msg<PageMsg, Route>) => dispatch(mapMsg(msg, map));
}

// Page Management

//// Init Child Page

export interface InitPageParams<
  AppState,
  AppMsg,
  PageRouteParams,
  PageState,
  PageMsg,
  SharedState,
  Route
> {
  state: base.Immutable<AppState>;
  routePath: string;
  pageStatePath: string[];
  pageRouteParams: PageRouteParams;
  pageInit: page.Init<PageRouteParams, SharedState, PageState, PageMsg, Route>;
  pageGetMetadata: page.GetMetadata<PageState>;
  getSharedState(state: base.Immutable<AppState>): SharedState;
  mapPageMsg(msg: PageMsg): AppMsg;
  noopMsg: AppMsg;
}

/**
 * Use this function to initialize a PageComponent's state
 * in an AppComponent's update function.
 */

export function initPage<
  AppState,
  AppMsg,
  PageRouteParams,
  PageState,
  PageMsg extends ADT<unknown, unknown>,
  SharedState,
  Route
>(
  params: InitPageParams<
    AppState,
    AppMsg,
    PageRouteParams,
    PageState,
    PageMsg,
    SharedState,
    Route
  >
): base.InitReturnValue<base.Immutable<AppState>, Msg<AppMsg, Route>> {
  const [pageState, pageCmds] = params.pageInit({
    routePath: params.routePath,
    routeParams: params.pageRouteParams,
    shared: params.getSharedState(params.state)
  });
  const immutablePageState = base.immutable(pageState);
  const newAppState = params.state.setIn(
    params.pageStatePath,
    immutablePageState
  );
  const toAppMsg = (pageMsg: page.Msg<PageMsg, Route>) =>
    page.mapMsg(pageMsg, params.mapPageMsg);
  const cmds = [
    ...pageCmds.map((c) => cmd.map(c, toAppMsg)),
    cmd.setPageMetadata<Msg<AppMsg, Route>>(
      params.pageGetMetadata(immutablePageState),
      params.noopMsg
    )
  ];
  return [newAppState, cmds];
}

//// Update Child Page

export interface UpdatePageParams<AppState, AppMsg, PageState, PageMsg, Route> {
  state: base.Immutable<AppState>;
  pageStatePath: string[];
  pageUpdate: page.Update<PageState, PageMsg, Route>;
  pageMsg: page.Msg<PageMsg, Route>;
  mapPageMsg(msg: PageMsg): AppMsg;
  pageGetMetadata: page.GetMetadata<PageState>;
  noopMsg: AppMsg;
}

/**
 * Use this function to update a PageComponent's state
 * in an AppComponent's update function.
 */

export function updatePage<
  AppState,
  AppMsg,
  PageState,
  PageMsg extends ADT<unknown, unknown>,
  Route
>(
  params: UpdatePageParams<AppState, AppMsg, PageState, PageMsg, Route>
): base.UpdateReturnValue<AppState, Msg<AppMsg, Route>> {
  const [newState, cmds] = base.updateChild({
    state: params.state,
    childStatePath: params.pageStatePath,
    childUpdate: params.pageUpdate,
    childMsg: params.pageMsg,
    mapChildMsg: (pageMsg) => page.mapMsg(pageMsg, params.mapPageMsg)
  });
  const setMetadata = (
    appState: base.Immutable<AppState>
  ): Cmd<Msg<AppMsg, Route>> => {
    const pageState = appState.getIn(params.pageStatePath);
    const metadata = params.pageGetMetadata(
      pageState as base.Immutable<PageState>
    );
    return cmd.setPageMetadata(metadata, params.noopMsg);
  };
  return [newState, [...cmds, setMetadata(newState)]];
}
