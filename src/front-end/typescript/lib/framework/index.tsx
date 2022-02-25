import { NODE_ENV } from 'front-end/config';
import * as Router from 'front-end/lib/framework/router';
import { ThemeColor } from 'front-end/lib/types';
import { AvailableIcons } from 'front-end/lib/views/icon';
import * as Link from 'front-end/lib/views/link';
import * as Immutable from 'immutable';
import { remove } from 'lodash';
import { default as React, ReactElement } from 'react';
import ReactDom from 'react-dom';
import { adt, ADT, adtCurried } from 'shared/lib/types';

export { newUrl, replaceUrl, replaceRoute, newRoute } from 'front-end/lib/framework/router';

// Base logic.

// TODO replace Immutable with TypeScript's built-in Readonly
export type Immutable<State extends object> = Immutable.RecordOf<State>;

export function immutable<State extends object>(state: State): Immutable<State> {
  return Immutable.Record(state)();
}

export type Dispatch<Msg> = (msg: Msg) => Promise<any>;

// Standard Components.

export type Init<Params, State> = (params: Params) => Promise<State>;

// Update returns a tuple representing sync and async state mutations.
export type UpdateReturnValue<State extends object, Msg> = [Immutable<State>, ((state: Immutable<State>, dispatch: Dispatch<Msg>) => Promise<Immutable<State> | null>)?];

export interface UpdateParams<State extends object, Msg> {
  state: Immutable<State> | any;
  msg: Msg;
}

export type Update<State extends object, Msg> = (params: UpdateParams<State, Msg>) => UpdateReturnValue<State, Msg>;

export interface UpdateChildParams<ParentState extends object, ParentMsg, ChildState extends object, ChildMsg> {
  state: Immutable<ParentState>;
  childStatePath: string[];
  childUpdate: Update<ChildState, ChildMsg>;
  childMsg: ChildMsg;
  updateAfter?(state: Immutable<ParentState>): UpdateReturnValue<ParentState, ParentMsg>;
  mapChildMsg(msg: ChildMsg): ParentMsg;
}

export type ViewElement<Props = any> = null | ReactElement<Props>;

export type ViewElementChildren<Props = any> = ViewElement<Props> | string | Array<ReactElement<Props> | null | string>;

export type View<Props = Record<string, never>, ReturnValue = ViewElement> = (props: Props) => ReturnValue;

export interface ComponentViewProps<State extends object, Msg> {
  state: Immutable<State>;
  dispatch: Dispatch<Msg>;
}

export type ComponentView<State extends object, Msg, ReturnValue = ViewElement> = View<ComponentViewProps<State, Msg>, ReturnValue>;

/**
 * The optional `Props` type parameter enables you
 * to define views that take additional props in a
 * type-safe manner.
 */

export interface Component<Params, State extends object, Msg, Props extends ComponentViewProps<State, Msg> = ComponentViewProps<State, Msg>> {
  init: Init<Params, State>;
  update: Update<State, Msg>;
  view: View<Props>;
}

export function mapComponentDispatch<ParentMsg, ChildMsg>(dispatch: Dispatch<ParentMsg>, fn: (childMsg: ChildMsg) => ParentMsg): Dispatch<ChildMsg> {
  return childMsg => {
    return dispatch(fn(childMsg));
  };
}

export function updateComponentChild<PS extends object, PM, CS extends object, CM>(params: UpdateChildParams<PS , PM, CS, CM>): UpdateReturnValue<PS, PM> {
  const { childStatePath, childUpdate, childMsg, mapChildMsg, updateAfter } = params;
  let { state } = params;
  const childState = state.getIn(childStatePath);
  // tslint:disable:next-line no-console
  if (NODE_ENV === 'development') { console.assert(childState); }
  if (!childState) { return [state]; }
  const [newChildState, newAsyncChildState] = childUpdate({
    state: childState,
    msg: childMsg
  });
  state = state.setIn(childStatePath, newChildState);
  let newAsyncUpdateAfterState: UpdateReturnValue<PS, PM>[1];
  if (updateAfter) {
    const result = updateAfter(state);
    state = result[0];
    newAsyncUpdateAfterState = result[1];
  }
  let asyncStateUpdate: UpdateReturnValue<PS, PM>[1];
  if (newAsyncChildState || newAsyncUpdateAfterState) {
    asyncStateUpdate = async (state: Immutable<PS> | any, dispatch: Dispatch<PM>) => {
      const mappedDispatch = mapComponentDispatch(dispatch, mapChildMsg);
      let updated = false;
      if (newAsyncChildState) {
        const newChildState = await newAsyncChildState(state.getIn(childStatePath), mappedDispatch);
        if (newChildState) {
          state = state.setIn(childStatePath, newChildState);
          updated = true;
        }
      }
      if (newAsyncUpdateAfterState) {
        const newState = await newAsyncUpdateAfterState(state, dispatch);
        if (newState !== null) {
          state = newState;
          updated = true;
        }
      }
      return updated ? state : null;
    };
  }
  return [
    state,
    asyncStateUpdate
  ];
}

// Global Components.

export interface ToastContent {
  title: string;
  body: string | ReactElement;
}

export type Toast
  = ADT<'info', ToastContent>
  | ADT<'error', ToastContent>
  | ADT<'warning', ToastContent>
  | ADT<'success', ToastContent>;

type ToastMsg = ADT<'@toast', Toast>;

export const toast = adtCurried<ToastMsg>('@toast');

type ReloadMsg = ADT<'@reload'>;

export const reload = () => adt('@reload') as ReloadMsg;

export type GlobalMsg<Route>  = Router.RouterMsg<Route> | ToastMsg | ReloadMsg;

export type GlobalComponentMsg<Msg, Route> = Msg | GlobalMsg<Route>;

export function isGlobalMsg<Msg, Route>(msg: GlobalComponentMsg<Msg, Route>): msg is GlobalMsg<Route> {
  const globalMsg = msg as GlobalMsg<Route>;
  return globalMsg.tag === '@toast' || globalMsg.tag === '@newRoute' || globalMsg.tag === '@replaceRoute' || globalMsg.tag === '@newUrl' || globalMsg.tag === '@replaceUrl' || globalMsg.tag === '@reload';
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

export function updateGlobalComponentChild<PS extends object, PM, CS extends object, CM, Route>(params: UpdateChildParams<PS, GlobalComponentMsg<PM, Route>, CS, GlobalComponentMsg<CM, Route>>): UpdateReturnValue<PS, GlobalComponentMsg<PM, Route>> {
  const { childStatePath, childUpdate, childMsg, mapChildMsg, updateAfter } = params;
  let { state } = params;
  const childState = state.getIn(childStatePath);
  if (!childState) { return [state]; }
  const [newChildState, newAsyncChildState] = childUpdate({
    state: childState,
    msg: childMsg
  });
  state = state.setIn(childStatePath, newChildState);
  let newAsyncUpdateAfterState: UpdateReturnValue<PS, GlobalComponentMsg<PM, Route>>[1];
  if (updateAfter) {
    const result = updateAfter(state);
    state = result[0];
    newAsyncUpdateAfterState = result[1];
  }
  let asyncStateUpdate: UpdateReturnValue<PS, GlobalComponentMsg<PM, Route>>[1];
  if (newAsyncChildState) {
    asyncStateUpdate = async (state: Immutable<PS> | any, dispatch: Dispatch<GlobalComponentMsg<PM, Route>>) => {
      const mappedDispatch = mapGlobalComponentDispatch(dispatch, mapChildMsg);
      let updated = false;
      if (newAsyncChildState) {
        const newChildState = await newAsyncChildState(state.getIn(childStatePath), mappedDispatch);
        if (newChildState) {
          state = state.setIn(childStatePath, newChildState);
          updated = true;
        }
      }
      if (newAsyncUpdateAfterState) {
        const newState = await newAsyncUpdateAfterState(state, dispatch);
        if (newState !== null) {
          state = newState;
          updated = true;
        }
      }
      return updated ? state : null;
    };
  }
  return [
    state,
    asyncStateUpdate
  ];
}

// Page components.

export interface PageInitParams<RouteParams, SharedState, Msg> {
  routePath: string;
  routeParams: Readonly<RouteParams>;
  shared: Readonly<SharedState>;
  dispatch: Dispatch<Msg>;
}

export type PageInit<RouteParams, SharedState, State, Msg> = Init<PageInitParams<RouteParams, SharedState, Msg>, State>;

export interface PageMetadata {
  title: string;
}

export type PageGetMetadata<State extends object> = (state: Immutable<State>) => PageMetadata;

export interface PageAlert<Msg> {
  text: string | ReactElement;
  dismissMsg?: Msg;
}

export interface PageAlerts<Msg> {
  info?: Array<PageAlert<Msg>>;
  warnings?: Array<PageAlert<Msg>>;
  errors?: Array<PageAlert<Msg>>;
}

export type PageGetAlerts<State extends object, Msg> = (state: Immutable<State>) => PageAlerts<Msg>;

export function emptyPageAlerts<Msg>(): PageAlerts<Msg> {
  return {};
}

export function mapPageAlerts<MsgA, MsgB, Route>(alerts: PageAlerts<GlobalComponentMsg<MsgA, Route>>, mapMsg: (msgA: GlobalComponentMsg<MsgA, Route>) => GlobalComponentMsg<MsgB, Route>): PageAlerts<GlobalComponentMsg<MsgB, Route>> {
  const { info, warnings, errors } = alerts;
  return {
    info: info?.map(i => ({ ...i, dismissMsg: i.dismissMsg && mapGlobalComponentMsg(i.dismissMsg, mapMsg) })),
    warnings: warnings?.map(i => ({ ...i, dismissMsg: i.dismissMsg && mapGlobalComponentMsg(i.dismissMsg, mapMsg) })),
    errors: errors?.map(i => ({ ...i, dismissMsg: i.dismissMsg && mapGlobalComponentMsg(i.dismissMsg, mapMsg) }))
  };
}

export function mergePageAlerts<Msg>(a: PageAlerts<Msg>, b: PageAlerts<Msg>): PageAlerts<Msg> {
  return {
    info: [...(a.info || []), ...(b.info || [])],
    warnings: [...(a.warnings || []), ...(b.warnings || [])],
    errors: [...(a.errors || []), ...(b.errors || [])]
  };
}

export interface PageBreadcrumb<Msg> {
  text: string;
  onClickMsg?: Msg;
}

export type PageBreadcrumbs<Msg> = Array<PageBreadcrumb<Msg>>;

export type PageGetBreadcrumbs<State extends object, Msg> = (state: Immutable<State>) => PageBreadcrumbs<Msg>;

export function emptyPageBreadcrumbs<Msg>(): PageBreadcrumbs<Msg> {
  return [];
}

export function mapPageBreadcrumbsMsg<MsgA, MsgB, Route>(breadcrumbs: PageBreadcrumbs<GlobalComponentMsg<MsgA, Route>>, mapMsg: (msgA: GlobalComponentMsg<MsgA, Route>) => GlobalComponentMsg<MsgB, Route>): PageBreadcrumbs<GlobalComponentMsg<MsgB, Route>> {
  return breadcrumbs.map(b => ({
    text: b.text,
    onClickMsg: b.onClickMsg && mapGlobalComponentMsg(b.onClickMsg, mapMsg)
  }));
}

export interface ModalAction<Msg> {
  text: string;
  color: 'primary' | 'info' | 'secondary' | 'danger' | 'success' | 'warning';
  msg: Msg;
  button?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: AvailableIcons;
}

export interface PageModal<Msg> {
  title: string;
  onCloseMsg: Msg;
  actions: Array<ModalAction<Msg>>;
  body(dispatch: Dispatch<Msg>): ViewElementChildren;
}

export function mapPageModalGlobalComponentMsg<MsgA, MsgB, Route>(modal: PageModal<GlobalComponentMsg<MsgA, Route>> | null, mapMsg: (msgA: GlobalComponentMsg<MsgA, Route>) => GlobalComponentMsg<MsgB, Route>): PageModal<GlobalComponentMsg<MsgB, Route>> | null {
  return mapPageModalMsg(modal, msg => mapGlobalComponentMsg(msg, mapMsg));
}

export function mapPageModalMsg<MsgA, MsgB>(modal: PageModal<MsgA> | null, mapMsg: (msgA: MsgA) => MsgB): PageModal<MsgB> | null {
  if (!modal) { return null; }
  return {
    ...modal,
    body: dispatch => modal.body(mapComponentDispatch(dispatch, mapMsg)),
    onCloseMsg: mapMsg(modal.onCloseMsg),
    actions: modal.actions.map(action => {
      return {
        ...action,
        msg: mapMsg(action.msg)
      };
    })
  };
}

export type PageGetModal<State extends object, Msg> = (state: Immutable<State>) => PageModal<Msg> | null;

export function noPageModal<Msg>() {
  return null;
}

export interface PageSidebar<State extends object, Msg, Props extends ComponentViewProps<State, Msg> = ComponentViewProps<State, Msg>> {
  size: 'medium' | 'large';
  color: ThemeColor;
  view: View<Props>;
  // isEmpty tells the framework whether the sidebar is empty and should
  // adjust its padding for mobile viewports accordingly.
  isEmptyOnMobile?(state: Immutable<State>): boolean;
}

export interface PageContextualDropdownLinkGroup {
  label?: string;
  links: Link.Props[];
}

export interface PageContextualDropdown {
  text: string;
  loading?: boolean;
  linkGroups: PageContextualDropdownLinkGroup[];
}

export type PageContextualActions
  = ADT<'links', Link.Props[]>
  | ADT<'dropdown', PageContextualDropdown>;

export type PageGetContextualActions<State extends object, Msg> = (props: ComponentViewProps<State, Msg>) => PageContextualActions | null;

export interface PageComponent<RouteParams, SharedState, State extends object, Msg, Props extends ComponentViewProps<State, Msg> = ComponentViewProps<State, Msg>> {
  fullWidth?: boolean;
  simpleNav?: boolean;
  backgroundColor?: ThemeColor;
  init: PageInit<RouteParams, SharedState, State, Msg>;
  update: Update<State, Msg>;
  view: View<Props>;
  sidebar?: PageSidebar<State, Msg, Props>;
  getMetadata: PageGetMetadata<State>;
  getAlerts?: PageGetAlerts<State, Msg>;
  getBreadcrumbs?: PageGetBreadcrumbs<State, Msg>;
  getModal?: PageGetModal<State, Msg>;
  getContextualActions?: PageGetContextualActions<State, Msg>;
}

export function setPageMetadata(metadata: PageMetadata): void {
  document.title = metadata.title;
}

// App.

export type AppMsg<Msg, Route> = GlobalComponentMsg<Msg, Route> | Router.IncomingRouteMsg<Route>;

export type AppGetAlerts<State extends object, Msg> = (props: ComponentViewProps<State, Msg>) => PageAlerts<Msg>;

export interface AppComponent<State extends object, Msg, Route> extends Component<null, State, AppMsg<Msg, Route>> {
  router: Router.Router<Route>;
}

export function mapAppDispatch<ParentMsg, ChildMsg, Route>(dispatch: Dispatch<AppMsg<ParentMsg, Route>>, fn: (childMsg: GlobalComponentMsg<ChildMsg, Route>) => AppMsg<ParentMsg, Route>): Dispatch<GlobalComponentMsg<ChildMsg, Route>> {
  return childMsg => {
    const mappedMsg = mapGlobalComponentMsg(childMsg, msg => fn(msg) as GlobalComponentMsg<ParentMsg, Route>);
    return dispatch(mappedMsg);
  };
}

export interface InitAppChildPageParams<ParentState extends object, ParentMsg, ChildRouteParams, ChildState extends object, ChildMsg, SharedState> {
  state: Immutable<ParentState>;
  dispatch: Dispatch<ParentMsg>;
  routePath: string;
  childStatePath: string[];
  childRouteParams: ChildRouteParams;
  childInit: PageInit<ChildRouteParams, SharedState, ChildState, ChildMsg>;
  childGetMetadata: PageGetMetadata<ChildState>;
  getSharedState(state: Immutable<ParentState>): SharedState;
  mapChildMsg(msg: ChildMsg): ParentMsg;
}

/**
 * Use this function to initialize a PageComponent's state
 * in an AppComponent's update function.
 */

export async function initAppChildPage<ParentState extends object, ParentMsg, ChildRouteParams, ChildState extends object, ChildMsg, SharedState, Route>(params: InitAppChildPageParams<ParentState, AppMsg<ParentMsg, Route>, ChildRouteParams, ChildState, GlobalComponentMsg<ChildMsg, Route>, SharedState>): Promise<Immutable<ParentState>> {
  const childDispatch = mapAppDispatch(params.dispatch, params.mapChildMsg);
  const childState = immutable(await params.childInit({
    routePath: params.routePath,
    routeParams: params.childRouteParams,
    shared: params.getSharedState(params.state),
    dispatch: childDispatch
  }));
  setPageMetadata(params.childGetMetadata(childState));
  return params.state.setIn(params.childStatePath, childState);
}

/**
 * Use this function to update a standard Component's state
 * in an AppComponent's update function.
 */

export function updateAppChild<PS extends object, PM, CS extends object, CM, Route>(params: UpdateChildParams<PS, AppMsg<PM, Route>, CS, GlobalComponentMsg<CM, Route>>): UpdateReturnValue<PS, AppMsg<PM, Route>> {
  const { childStatePath, childUpdate, childMsg, mapChildMsg, updateAfter } = params;
  let { state } = params;
  const childState = state.getIn(childStatePath);
  if (!childState) { return [state]; }
  const [newChildState, newAsyncChildState] = childUpdate({
    state: childState,
    msg: childMsg
  });
  state = state.setIn(childStatePath, newChildState);
  let newAsyncUpdateAfterState: UpdateReturnValue<PS, AppMsg<PM, Route>>[1];
  if (updateAfter) {
    const result = updateAfter(state);
    state = result[0];
    newAsyncUpdateAfterState = result[1];
  }
  let asyncStateUpdate: UpdateReturnValue<PS, AppMsg<PM, Route>>[1];
  if (newAsyncChildState) {
    asyncStateUpdate = async (state: Immutable<PS> | any, dispatch: Dispatch<AppMsg<PM, Route>>) => {
      const mappedDispatch = mapAppDispatch(dispatch, mapChildMsg);
      let updated = false;
      if (newAsyncChildState) {
        const newChildState = await newAsyncChildState(state.getIn(childStatePath), mappedDispatch);
        if (newChildState) {
          state = state.setIn(childStatePath, newChildState);
          updated = true;
        }
      }
      if (newAsyncUpdateAfterState) {
        const newState = await newAsyncUpdateAfterState(state, dispatch);
        if (newState !== null) {
          state = newState;
          updated = true;
        }
      }
      return updated ? state : null;
    };
  }
  return [
    state,
    asyncStateUpdate
  ];
}

export interface UpdateChildPageParams<PS extends object, PM, CS extends object, CM> extends UpdateChildParams<PS, PM, CS, CM> {
  childGetMetadata: PageGetMetadata<CS>;
}

/**
 * Use this function to update a PageComponent's state
 * in an AppComponent's update function.
 */

export function updateAppChildPage<PS extends object, PM, CS extends object, CM, Route>(params: UpdateChildPageParams<PS, AppMsg<PM, Route>, CS, GlobalComponentMsg<CM, Route>>): UpdateReturnValue<PS, AppMsg<PM, Route>> {
  const [newState, newAsyncState] = updateAppChild(params);
  const setMetadata = (parentState: Immutable<PS> | any) => {
    const pageState = parentState.getIn(params.childStatePath);
    const metadata = params.childGetMetadata(pageState);
    setPageMetadata(metadata);
  };
  setMetadata(newState);
  const asyncStateUpdate = async (state: Immutable<PS>, dispatch: Dispatch<AppMsg<PM, Route>>) => {
    let newState: any = null;
    if (newAsyncState) { newState = await newAsyncState(state, dispatch); }
    if (!newState) { return state; }
    setMetadata(newState);
    return newState;
  };
  return [
    newState,
    asyncStateUpdate
  ];
}

// State Manager.

export type StateSubscription<State extends object, Msg> = (state: Immutable<State>, dispatch: Dispatch<Msg>) => void;

export type StateSubscribe<State extends object, Msg> = (fn: StateSubscription<State, Msg>) => boolean;

export type StateUnsubscribe<State extends object, Msg> = (fn: StateSubscription<State, Msg>) => boolean;

export type MsgSubscription<Msg> = (msg: Msg) => void;

export type MsgSubscribe<Msg> = (fn: MsgSubscription<Msg>) => boolean;

export type MsgUnsubscribe<Msg> = (fn: MsgSubscription<Msg>) => boolean;

export interface StateManager<State extends object, Msg> {
  dispatch: Dispatch<Msg>;
  stateSubscribe: StateSubscribe<State, Msg>;
  stateUnsubscribe: StateUnsubscribe<State, Msg>;
  msgSubscribe: MsgSubscribe<Msg>;
  msgUnsubscribe: MsgUnsubscribe<Msg>;
  getState(): Immutable<State>;
}

// Start.

export async function start<State extends object, Msg extends ADT<any, any>, Route>(app: AppComponent<State, Msg, Route>, element: HTMLElement, debug: boolean): Promise<StateManager<State, AppMsg<Msg, Route>>> {
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
  // Start handling routes in the app.
  const routeManager = Router.makeRouteManager<State, Msg, Route>(app.router, dispatch);
  // Set up dispatch function to queue state mutations.
  function dispatch(msg: AppMsg<Msg, Route>) {
    // Synchronous state changes should happen outside a promise chain
    // in the main thread. Otherwise real-time UI changes don't happen
    // (e.g. form input) causing a bad UX.
    notifyMsgSubscriptions(msg);
    // Handle routing as required.
    routeManager.handleRouterMsg(msg as Router.RouterMsg<Route>);
    // Update state.
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
          if (newState !== null) {
            state = newState;
            notifyStateSubscriptions();
          }
        });
    }
    return promise;
  }
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
    if (debug) { console.log('state updated', state.toJS()); }
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
  // Start the router.
  Router.start(routeManager);
  // Return StateManager.
  return stateManager;
}
