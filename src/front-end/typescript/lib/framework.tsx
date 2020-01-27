import { BootstrapColor } from 'front-end/lib/types';
import { AvailableIcons } from 'front-end/lib/views/icon';
import * as Immutable from 'immutable';
import { get, remove } from 'lodash';
import page from 'page';
import qs from 'querystring';
import { default as React, ReactElement } from 'react';
import ReactDom from 'react-dom';
import { ADT } from 'shared/lib/types';

// Base logic.

// TODO replace Immutable with TypeScript's built-in Readonly
export type Immutable<State> = Immutable.RecordOf<State>;

export function immutable<State>(state: State): Immutable<State> {
  return Immutable.Record(state)();
}

export type Dispatch<Msg> = (msg: Msg) => Promise<any>;

// Standard Components.

export type Init<Params, State> = (params: Params) => Promise<State>;

// Update returns a tuple representing sync and async state mutations.
export type UpdateReturnValue<State, Msg> = [Immutable<State>, ((state: Immutable<State>, dispatch: Dispatch<Msg>) => Promise<Immutable<State> | null>)?];

export interface UpdateParams<State, Msg> {
  state: Immutable<State>;
  msg: Msg;
}

export type Update<State, Msg> = (params: UpdateParams<State, Msg>) => UpdateReturnValue<State, Msg>;

export interface UpdateChildParams<ParentState, ParentMsg, ChildState, ChildMsg> {
  state: Immutable<ParentState>;
  childStatePath: string[];
  childUpdate: Update<ChildState, ChildMsg>;
  childMsg: ChildMsg;
  mapChildMsg(msg: ChildMsg): ParentMsg;
}

export type ViewElement<Props = any> = null | ReactElement<Props>;

export type ViewElementChildren<Props = any> = ViewElement<Props> | string | Array<ReactElement<Props> | null | string>;

export type View<Props, ReturnValue = ViewElement> = (props: Props) => ReturnValue;

export interface ComponentViewProps<State, Msg> {
  state: Immutable<State>;
  dispatch: Dispatch<Msg>;
}

export type ComponentView<State, Msg, ReturnValue = ViewElement> = View<ComponentViewProps<State, Msg>, ReturnValue>;

/**
 * The optional `Props` type parameter enables you
 * to define views that take additional props in a
 * type-safe manner.
 */

export interface Component<Params, State, Msg, Props extends ComponentViewProps<State, Msg> = ComponentViewProps<State, Msg>> {
  init: Init<Params, State>;
  update: Update<State, Msg>;
  view: View<Props>;
}

export function mapComponentDispatch<ParentMsg, ChildMsg>(dispatch: Dispatch<ParentMsg>, fn: (childMsg: ChildMsg) => ParentMsg): Dispatch<ChildMsg> {
  return childMsg => {
    return dispatch(fn(childMsg));
  };
}

export function updateComponentChild<PS, PM, CS, CM>(params: UpdateChildParams<PS, PM, CS, CM>): UpdateReturnValue<PS, PM> {
  const { childStatePath, childUpdate, childMsg, mapChildMsg } = params;
  let { state } = params;
  const childState = state.getIn(childStatePath);
  if (!childState) { return [state]; }
  const [newChildState, newAsyncChildState] = childUpdate({
    state: childState,
    msg: childMsg
  });
  state = state.setIn(childStatePath, newChildState);
  let asyncStateUpdate;
  if (newAsyncChildState) {
    asyncStateUpdate = async (state: Immutable<PS>, dispatch: Dispatch<PM>) => {
      const mappedDispatch = mapComponentDispatch(dispatch, mapChildMsg);
      const newChildState = await newAsyncChildState(state.getIn(childStatePath), mappedDispatch);
      if (!newChildState) { return null; }
      return state.setIn(childStatePath, newChildState);
    };
  }
  return [
    state,
    asyncStateUpdate
  ];
}

// Global Components.

export type IncomingRouteMsg<Route> = ADT<'@incomingRoute', Route>;

export type NewUrlMsg = ADT<'@newUrl', string>;

export function newUrl(path: string): NewUrlMsg {
  return {
    tag: '@newUrl',
    value: path
  };
}

export type ReplaceUrlMsg = ADT<'@replaceUrl', string>;

export function replaceUrl(path: string): ReplaceUrlMsg {
  return {
    tag: '@replaceUrl',
    value: path
  };
}

export type NewRouteMsg<Route> = ADT<'@newRoute', Route>;

export function newRoute<Route>(route: Route): NewRouteMsg<Route> {
  return {
    tag: '@newRoute',
    value: route
  };
}

export type ReplaceRouteMsg<Route> = ADT<'@replaceRoute', Route>;

export function replaceRoute<Route>(route: Route): ReplaceRouteMsg<Route> {
  return {
    tag: '@replaceRoute',
    value: route
  };
}

export type GlobalMsg<Route>
  = NewRouteMsg<Route>
  | ReplaceRouteMsg<Route>
  | NewUrlMsg
  | ReplaceUrlMsg;

export type GlobalComponentMsg<Msg, Route> = Msg | GlobalMsg<Route>;

export function isGlobalMsg<Msg, Route>(msg: GlobalComponentMsg<Msg, Route>): msg is GlobalMsg<Route> {
  const globalMsg = msg as GlobalMsg<Route>;
  return globalMsg.tag === '@newRoute' || globalMsg.tag === '@replaceRoute' || globalMsg.tag === '@newUrl' || globalMsg.tag === '@replaceUrl';
}

export function mapGlobalComponentMsg<MsgA, MsgB, Route>(msg: GlobalComponentMsg<MsgA, Route>, map: (msg: GlobalComponentMsg<MsgA, Route>) => GlobalComponentMsg<MsgB, Route>): GlobalComponentMsg<MsgB, Route> {
  return isGlobalMsg(msg) ? msg : map(msg);
}

export function mapGlobalComponentDispatch<ParentMsg, ChildMsg, Route>(dispatch: Dispatch<GlobalComponentMsg<ParentMsg, Route>>, fn: (childMsg: GlobalComponentMsg<ChildMsg, Route>) => GlobalComponentMsg<ParentMsg, Route>): Dispatch<GlobalComponentMsg<ChildMsg, Route>> {
  return childMsg => {
    const mappedMsg = mapGlobalComponentMsg(childMsg, fn);
    return dispatch(mappedMsg);
  };
}

export function updateGlobalComponentChild<PS, PM, CS, CM, Route>(params: UpdateChildParams<PS, GlobalComponentMsg<PM, Route>, CS, GlobalComponentMsg<CM, Route>>): UpdateReturnValue<PS, GlobalComponentMsg<PM, Route>> {
  const { childStatePath, childUpdate, childMsg, mapChildMsg } = params;
  let { state } = params;
  const childState = state.getIn(childStatePath);
  if (!childState) { return [state]; }
  const [newChildState, newAsyncChildState] = childUpdate({
    state: childState,
    msg: childMsg
  });
  state = state.setIn(childStatePath, newChildState);
  let asyncStateUpdate;
  if (newAsyncChildState) {
    asyncStateUpdate = async (state: Immutable<PS>, dispatch: Dispatch<GlobalComponentMsg<PM, Route>>) => {
      const mappedDispatch = mapGlobalComponentDispatch(dispatch, mapChildMsg);
      const newChildState = await newAsyncChildState(state.getIn(childStatePath), mappedDispatch);
      if (!newChildState) { return null; }
      return state.setIn(childStatePath, newChildState);
    };
  }
  return [
    state,
    asyncStateUpdate
  ];
}

// Page components.

export interface PageInitParams<RouteParams, SharedState, Msg> {
  routeParams: Readonly<RouteParams>;
  shared: Readonly<SharedState>;
  dispatch: Dispatch<Msg>;
}

export type PageInit<RouteParams, SharedState, State, Msg> = Init<PageInitParams<RouteParams, SharedState, Msg>, State>;

export interface PageMetadata {
  title: string;
}

export type PageGetMetadata<State> = (state: Immutable<State>) => PageMetadata;

export interface PageAlert<Msg> {
  text: string | ReactElement;
  dismissMsg?: Msg;
}

export interface PageAlerts<Msg> {
  info: Array<PageAlert<Msg>>;
  warnings: Array<PageAlert<Msg>>;
  errors: Array<PageAlert<Msg>>;
}

export type PageGetAlerts<State, Msg> = (state: Immutable<State>) => PageAlerts<Msg>;

export function emptyPageAlerts<Msg>(): PageAlerts<Msg> {
  return {
    info: [],
    warnings: [],
    errors: []
  };
}

export function mapPageAlerts<MsgA, MsgB, Route>(alerts: PageAlerts<GlobalComponentMsg<MsgA, Route>>, mapMsg: (msgA: GlobalComponentMsg<MsgA, Route>) => GlobalComponentMsg<MsgB, Route>): PageAlerts<GlobalComponentMsg<MsgB, Route>> {
  const { info, warnings, errors } = alerts;
  return {
    info: info.map(i => ({ ...i, dismissMsg: i.dismissMsg && mapGlobalComponentMsg(i.dismissMsg, mapMsg) })),
    warnings: warnings.map(i => ({ ...i, dismissMsg: i.dismissMsg && mapGlobalComponentMsg(i.dismissMsg, mapMsg) })),
    errors: errors.map(i => ({ ...i, dismissMsg: i.dismissMsg && mapGlobalComponentMsg(i.dismissMsg, mapMsg) }))
  };
}

export interface PageBreadcrumb<Msg> {
  text: string;
  onClickMsg?: Msg;
}

export type PageBreadcrumbs<Msg> = Array<PageBreadcrumb<Msg>>;

export type PageGetBreadcrumbs<State, Msg> = (state: Immutable<State>) => PageBreadcrumbs<Msg>;

export function emptyPageBreadcrumbs<Msg>(): PageBreadcrumbs<Msg> {
  return [];
}

export function mapPageBreadcrumbsMsg<MsgA, MsgB, Route>(breadcrumbs: PageBreadcrumbs<GlobalComponentMsg<MsgA, Route>>, mapMsg: (msgA: GlobalComponentMsg<MsgA, Route>) => GlobalComponentMsg<MsgB, Route>): PageBreadcrumbs<GlobalComponentMsg<MsgB, Route>> {
  return breadcrumbs.map(b => ({
    text: b.text,
    onClickMsg: b.onClickMsg && mapGlobalComponentMsg(b.onClickMsg, mapMsg)
  }));
}

export interface ModalButton<Msg> {
  text: string;
  color: 'primary' | 'info' | 'secondary' | 'danger' | 'success';
  msg: Msg;
  button?: boolean;
  icon?: AvailableIcons;
}

export interface PageModal<Msg> {
  title: string;
  body: ViewElementChildren;
  onCloseMsg: Msg;
  actions: Array<ModalButton<Msg>>;
}

export function mapPageModalMsg<MsgA, MsgB, Route>(modal: PageModal<GlobalComponentMsg<MsgA, Route>> | null, mapMsg: (msgA: GlobalComponentMsg<MsgA, Route>) => GlobalComponentMsg<MsgB, Route>): PageModal<GlobalComponentMsg<MsgB, Route>> | null {
  if (!modal) { return null; }
  return {
    ...modal,
    onCloseMsg: mapGlobalComponentMsg(modal.onCloseMsg, mapMsg),
    actions: modal.actions.map(action => {
      return {
        ...action,
        msg: mapGlobalComponentMsg(action.msg, mapMsg)
      };
    })
  };
}

export type PageGetModal<State, Msg> = (state: Immutable<State>) => PageModal<Msg> | null;

export function noPageModal<Msg>() {
  return null;
}

export interface PageSidebar<State, Msg, Props extends ComponentViewProps<State, Msg>> {
  size: 'medium' | 'large';
  color: BootstrapColor;
  view: View<Props>;
  // isEmpty tells the framework whether the sidebar is empty and should
  // adjust its padding for mobile viewports accordingly.
  isEmptyOnMobile?(state: Immutable<State>): boolean;
}

export interface PageComponent<RouteParams, SharedState, State, Msg, Props extends ComponentViewProps<State, Msg> = ComponentViewProps<State, Msg>> {
  fullWidth?: boolean;
  simpleNav?: boolean;
  init: PageInit<RouteParams, SharedState, State, Msg>;
  update: Update<State, Msg>;
  view: View<Props>;
  viewBottomBar?: View<Props>; //TODO potentially remove
  sidebar?: PageSidebar<State, Msg, Props>;
  getMetadata: PageGetMetadata<State>;
  getAlerts?: PageGetAlerts<State, Msg>;
  getBreadcrumbs?: PageGetBreadcrumbs<State, Msg>;
  getModal?: PageGetModal<State, Msg>;
}

export function setPageMetadata(metadata: PageMetadata): void {
  document.title = metadata.title;
}

// Router.

export type RouteParams = Record<string, string | undefined>;

export type RouteQuery = Record<string, string | string[] | undefined>;

export interface RouteDefinitionParams {
  params: RouteParams;
  query: RouteQuery;
}

export interface RouteDefinition<Route> {
  path: string;
  makeRoute(params: RouteDefinitionParams): Route;
}

export interface Router<Route> {
  routes: Array<RouteDefinition<Route>>;
  routeToUrl(route: Route): string;
}

export function startRouter<State, Msg, Route>(router: Router<Route>, stateManager: StateManager<State, AppMsg<Msg, Route>>): void {
  // Parse the query string.
  page((ctx, next) => {
    ctx.query = qs.parse(ctx.querystring);
    next();
  });
  // Bind all routes for pushState.
  router.routes.forEach(({ path, makeRoute }) => {
    page(path, ctx => {
      // Do nothing if a hash is present in the path
      // only if it isn't the initial load.
      if (!ctx.init && ctx.hash) { return; }
      const parsedRoute = makeRoute({
        params: get(ctx, 'params', {}),
        query: get(ctx, 'query', {})
      });
      return stateManager
        .dispatch({
          tag: '@incomingRoute',
          value: parsedRoute
        });
    });
  });
  // Start the router.
  page();
}

export function runNewUrl(url: string): void {
  page(url);
}

export function runReplaceUrl(url: string): void {
  page.redirect(url);
}

// App.

export type AppMsg<Msg, Route> = GlobalComponentMsg<Msg, Route> | IncomingRouteMsg<Route>;

export interface AppComponent<State, Msg, Route> extends Component<null, State, AppMsg<Msg, Route>> {
  router: Router<Route>;
}

export function mapAppDispatch<ParentMsg, ChildMsg, Route>(dispatch: Dispatch<AppMsg<ParentMsg, Route>>, fn: (childMsg: GlobalComponentMsg<ChildMsg, Route>) => AppMsg<ParentMsg, Route>): Dispatch<GlobalComponentMsg<ChildMsg, Route>> {
  return childMsg => {
    const mappedMsg = mapGlobalComponentMsg(childMsg, msg => fn(msg) as GlobalComponentMsg<ParentMsg, Route>);
    return dispatch(mappedMsg);
  };
}

export interface InitAppChildPageParams<ParentState, ParentMsg, ChildRouteParams, ChildState, ChildMsg, SharedState> {
  state: Immutable<ParentState>;
  dispatch: Dispatch<ParentMsg>;
  childStatePath: string[];
  childRouteParams: ChildRouteParams;
  childInit: PageInit<ChildRouteParams, SharedState, ChildState, ChildMsg>;
  childGetMetadata: PageGetMetadata<ChildState>;
  childGetModal?: PageGetModal<ChildState, ChildMsg>;
  getSharedState(state: Immutable<ParentState>): SharedState;
  mapChildMsg(msg: ChildMsg): ParentMsg;
  setModal(state: Immutable<ParentState>, modal: PageModal<ParentMsg> | null): Immutable<ParentState>;
}

/**
 * Use this function to initialize a PageComponent's state
 * in an AppComponent's update function.
 */

export async function initAppChildPage<ParentState, ParentMsg, ChildRouteParams, ChildState, ChildMsg, SharedState, Route>(params: InitAppChildPageParams<ParentState, AppMsg<ParentMsg, Route>, ChildRouteParams, ChildState, GlobalComponentMsg<ChildMsg, Route>, SharedState>): Promise<Immutable<ParentState>> {
  const childDispatch = mapAppDispatch(params.dispatch, params.mapChildMsg);
  const childState = immutable(await params.childInit({
    routeParams: params.childRouteParams,
    shared: params.getSharedState(params.state),
    dispatch: childDispatch
  }));
  setPageMetadata(params.childGetMetadata(childState));
  const childModal = params.childGetModal
    ? params.childGetModal(childState)
    : null;
  const parentModal = mapPageModalMsg(childModal, msg => params.mapChildMsg(msg) as GlobalComponentMsg<ParentMsg, Route>);
  const parentState = params.state.setIn(params.childStatePath, childState);
  return params.setModal(parentState, parentModal);
}

/**
 * Use this function to update a standard Component's state
 * in an AppComponent's update function.
 */

export function updateAppChild<PS, PM, CS, CM, Route>(params: UpdateChildParams<PS, AppMsg<PM, Route>, CS, GlobalComponentMsg<CM, Route>>): UpdateReturnValue<PS, AppMsg<PM, Route>> {
  const { childStatePath, childUpdate, childMsg, mapChildMsg } = params;
  let { state } = params;
  const childState = state.getIn(childStatePath);
  if (!childState) { return [state]; }
  const [newChildState, newAsyncChildState] = childUpdate({
    state: childState,
    msg: childMsg
  });
  state = state.setIn(childStatePath, newChildState);
  let asyncStateUpdate;
  if (newAsyncChildState) {
    asyncStateUpdate = async (state: Immutable<PS>, dispatch: Dispatch<AppMsg<PM, Route>>) => {
      const mappedDispatch = mapAppDispatch(dispatch, mapChildMsg);
      const newChildState = await newAsyncChildState(state.getIn(childStatePath), mappedDispatch);
      if (!newChildState) { return null; }
      return state.setIn(childStatePath, newChildState);
    };
  }
  return [
    state,
    asyncStateUpdate
  ];
}

export interface UpdateChildPageParams<PS, PM, CS, CM> extends UpdateChildParams<PS, PM, CS, CM> {
  childGetMetadata: PageGetMetadata<CS>;
  childGetModal?: PageGetModal<CS, CM>;
  setModal(state: Immutable<PS>, modal: PageModal<PM> | null): Immutable<PS>;
}

/**
 * Use this function to update a PageComponent's state
 * in an AppComponent's update function.
 */

export function updateAppChildPage<PS, PM, CS, CM, Route>(params: UpdateChildPageParams<PS, AppMsg<PM, Route>, CS, GlobalComponentMsg<CM, Route>>): UpdateReturnValue<PS, AppMsg<PM, Route>> {
  const [newState, newAsyncState] = updateAppChild(params);
  const setMetadata = (parentState: Immutable<PS>) => {
    const pageState = parentState.getIn(params.childStatePath);
    const metadata = params.childGetMetadata(pageState);
    setPageMetadata(metadata);
  };
  const setModal = (parentState: Immutable<PS>): Immutable<PS>  => {
    const pageState = parentState.getIn(params.childStatePath);
    const childModal = params.childGetModal
      ? params.childGetModal(pageState)
      : null;
    const parentModal = mapPageModalMsg(childModal, msg => params.mapChildMsg(msg) as GlobalComponentMsg<PM, Route>);
    return params.setModal(parentState, parentModal);
  };
  setMetadata(newState);
  const newStateWithModal = setModal(newState);
  const asyncStateUpdate = async (state: Immutable<PS>, dispatch: Dispatch<AppMsg<PM, Route>>) => {
    state = setModal(state);
    let newState = null;
    if (newAsyncState) { newState = await newAsyncState(state, dispatch); }
    if (!newState) { return state; }
    setMetadata(newState);
    return setModal(newState);
  };
  return [
    newStateWithModal,
    asyncStateUpdate
  ];
}

// State Manager.

export type StateSubscription<State, Msg> = (state: Immutable<State>, dispatch: Dispatch<Msg>) => void;

export type StateSubscribe<State, Msg> = (fn: StateSubscription<State, Msg>) => boolean;

export type StateUnsubscribe<State, Msg> = (fn: StateSubscription<State, Msg>) => boolean;

export type MsgSubscription<Msg> = (msg: Msg) => void;

export type MsgSubscribe<Msg> = (fn: MsgSubscription<Msg>) => boolean;

export type MsgUnsubscribe<Msg> = (fn: MsgSubscription<Msg>) => boolean;

export interface StateManager<State, Msg> {
  dispatch: Dispatch<Msg>;
  stateSubscribe: StateSubscribe<State, Msg>;
  stateUnsubscribe: StateUnsubscribe<State, Msg>;
  msgSubscribe: MsgSubscribe<Msg>;
  msgUnsubscribe: MsgUnsubscribe<Msg>;
  getState(): Immutable<State>;
}

// Start.

export async function start<State, Msg extends ADT<any, any>, Route>(app: AppComponent<State, Msg, Route>, element: HTMLElement, debug: boolean): Promise<StateManager<State, AppMsg<Msg, Route>>> {
  // Initialize state.
  // We do not need the RecordFactory, so we create the Record immediately.
  let state = Immutable.Record(await app.init(null))({});
  // Set up subscription state.
  const stateSubscriptions: Array<StateSubscription<State, AppMsg<Msg, Route>>> = [];
  const msgSubscriptions: Array<MsgSubscription<AppMsg<Msg, Route>>> = [];
  const stateSubscribe: StateSubscribe<State, AppMsg<Msg, Route>> = fn => (stateSubscriptions.push(fn) && true) || false;
  const stateUnsubscribe: StateUnsubscribe<State, AppMsg<Msg, Route>> = fn => (remove(stateSubscriptions, a => a === fn) && true) || false;
  const msgSubscribe: MsgSubscribe<AppMsg<Msg, Route>> = fn => (msgSubscriptions.push(fn) && true) || false;
  const msgUnsubscribe: MsgUnsubscribe<AppMsg<Msg, Route>> = fn => (remove(msgSubscriptions, a => a === fn) && true) || false;
  // Set up state accessor function.
  const getState = () => state;
  // Initialize state mutation promise chain.
  // i.e. Mutate state sequentially in a single thread.
  let promise = Promise.resolve();
  // Set up dispatch function to queue state mutations.
  const dispatch: Dispatch<AppMsg<Msg, Route>> = msg => {
    // Synchronous state changes should happen outside a promise chain
    // in the main thread. Otherwise real-time UI changes don't happen
    // (e.g. form input) causing a bad UX.
    notifyMsgSubscriptions(msg);
    switch (msg.tag) {
      case '@newUrl':
        runNewUrl(msg.value);
        break;
      case '@replaceUrl':
        runReplaceUrl(msg.value);
        break;
      case '@newRoute':
        runNewUrl(app.router.routeToUrl(msg.value));
        break;
      case '@replaceRoute':
        runReplaceUrl(app.router.routeToUrl(msg.value));
        break;
    }
    const [newState, promiseState] = app.update({ state, msg });
    state = newState;
    notifyStateSubscriptions();
    // Asynchronous changes should be sequenced inside
    // a promise chain.
    if (promiseState) {
      promise = promise
        .then((): Promise<Immutable<State> | null> => new Promise((resolve, reject) => {
          // We want to run async state updates after
          // the current "tick" to ensure all
          // sync updates are processed first.
          setTimeout(() => {
            promiseState(state, dispatch)
              .then(newState => resolve(newState))
              .catch(reject);
          }, 0);
        }))
        .then(newState => {
          // Update state with its asynchronous change.
          if (newState) {
            state = newState;
            notifyStateSubscriptions();
          }
        });
    }
    return promise;
  };
  // Render the view whenever state changes.
  const render = (state: Immutable<State>, dispatch: Dispatch<AppMsg<Msg, Route>>): void => {
    ReactDom.render(
      <app.view state={state} dispatch={dispatch} />,
      element
    );
  };
  stateSubscribe(render);
  // Set up function to notify msg subscriptions.
  function notifyMsgSubscriptions(msg: AppMsg<Msg, Route>): void {
    msgSubscriptions.forEach(fn => fn(msg));
    // tslint:disable:next-line no-console
    if (debug) { console.log('msg dispatched', msg); }
  }
  // Set up function to notify state subscriptions.
  function notifyStateSubscriptions(): void {
    stateSubscriptions.forEach(fn => fn(state, dispatch));
    // tslint:disable:next-line no-console
    if (debug) { console.log('state updated', state.toJSON()); }
  }
  // Trigger state initialization notification.
  notifyStateSubscriptions();
  // Create the StateManager.
  const stateManager = {
    dispatch,
    stateSubscribe,
    stateUnsubscribe,
    msgSubscribe,
    msgUnsubscribe,
    getState
  };
  // Start handling routes in the app.
  startRouter(app.router, stateManager);
  // Return StateManager.
  return stateManager;
}
