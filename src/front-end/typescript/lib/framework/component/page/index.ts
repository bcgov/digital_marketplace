import * as base from "front-end/lib/framework/component/base";
import { ThemeColor } from "front-end/lib/types";
import { Sidebar } from "front-end/lib/framework/component/page/sidebar";
import { Metadata } from "front-end/lib/framework/component/page/metadata";
import { Actions } from "front-end/lib/framework/component/page/actions";
import { Modal } from "front-end/lib/framework/component/page/modal";
import { Breadcrumbs } from "front-end/lib/framework/component/page/breadcrumbs";
import { Alerts } from "front-end/lib/framework/component/page/alerts";
import { Msg } from "front-end/lib/framework/component/page/msg";

// Re-exports

export {
  type Msg,
  readyMsg,
  type ReadyMsg,
  mapMsg,
  mapDispatch
} from "front-end/lib/framework/component/page/msg";
export type { Metadata } from "front-end/lib/framework/component/page/metadata";
export type { Sidebar } from "front-end/lib/framework/component/page/sidebar";
export type { Actions } from "front-end/lib/framework/component/page/actions";
export * as actions from "front-end/lib/framework/component/page/actions";
export type { Modal } from "front-end/lib/framework/component/page/modal";
export * as modal from "front-end/lib/framework/component/page/modal";
export type { Breadcrumbs } from "front-end/lib/framework/component/page/breadcrumbs";
export * as breadcrumbs from "front-end/lib/framework/component/page/breadcrumbs";
export type { Alerts } from "front-end/lib/framework/component/page/alerts";
export * as alerts from "front-end/lib/framework/component/page/alerts";

// Component

export interface Component<
  RouteParams,
  SharedState,
  State,
  PageMsg,
  Route,
  Props_ extends Props<State, PageMsg, Route> = Props<State, PageMsg, Route>
> {
  fullWidth?: boolean;
  simpleNav?: boolean;
  backgroundColor?: ThemeColor;
  init: Init<RouteParams, SharedState, State, PageMsg, Route>;
  update: Update<State, PageMsg, Route>;
  view: View<State, PageMsg, Route, Props_>;
  sidebar?: Sidebar<State, Msg<PageMsg, Route>, Props_>;
  getMetadata: GetMetadata<State>;
  getAlerts?: GetAlerts<State, Msg<PageMsg, Route>>;
  getBreadcrumbs?: GetBreadcrumbs<State, Msg<PageMsg, Route>>;
  getModal?: GetModal<State, Msg<PageMsg, Route>>;
  getActions?: GetActions<State, Msg<PageMsg, Route>>;
}

// Init

export interface Params<RouteParams, SharedState> {
  routePath: string;
  routeParams: Readonly<RouteParams>;
  shared: Readonly<SharedState>;
}

export type Init<RouteParams, SharedState, State, PageMsg, Route> = base.Init<
  Params<RouteParams, SharedState>,
  State,
  Msg<PageMsg, Route>
>;

// Update

export type UpdateParams<State, PageMsg, Route> = base.UpdateParams<
  State,
  Msg<PageMsg, Route>
>;

export type Update<State, PageMsg, Route> = base.Update<
  State,
  Msg<PageMsg, Route>
>;

export type UpdateReturnValue<State, PageMsg, Route> = base.UpdateReturnValue<
  State,
  Msg<PageMsg, Route>
>;

// View

export type View<
  State,
  PageMsg,
  Route,
  Props_ extends Props<State, PageMsg, Route> = Props<State, PageMsg, Route>
> = base.View<Props_>;

//// Props

export type Props<State, PageMsg, Route> = base.ComponentViewProps<
  State,
  Msg<PageMsg, Route>
>;

// GetMetadata

export type GetMetadata<State> = (state: base.Immutable<State>) => Metadata;

// GetModal

export type GetModal<State, Msg> = (state: base.Immutable<State>) => Modal<Msg>;

// GetActions

export type GetActions<State, Msg> = (
  props: base.ComponentViewProps<State, Msg>
) => Actions;

// GetBreadcrumbs

export type GetBreadcrumbs<State, Msg> = (
  state: base.Immutable<State>
) => Breadcrumbs<Msg>;

// GetAlerts

export type GetAlerts<State, Msg> = (
  state: base.Immutable<State>
) => Alerts<Msg>;
