import {
  getAlertsValid,
  getContextualActionsValid,
  getMetadataValid,
  getModalValid,
  makePageMetadata,
  sidebarValid,
  updateValid,
  viewValid
} from "front-end/lib";
import { isUserType } from "front-end/lib/access-control";
import { SharedState } from "front-end/lib/app/types";
import * as TabbedPage from "front-end/lib/components/sidebar/menu/tabbed-page";
import {
  immutable,
  Immutable,
  PageComponent,
  PageInit,
  replaceRoute
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Tab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab";
import {
  DEFAULT_OPPORTUNITY_TITLE,
  SWUOpportunity
} from "shared/lib/resources/opportunity/sprint-with-us";
import { UserType } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";

interface ValidState<K extends Tab.TabId> extends Tab.ParentState<K> {
  opportunity: SWUOpportunity;
}

export type State_<K extends Tab.TabId> = Validation<
  Immutable<ValidState<K>>,
  null
>;

export type State = State_<Tab.TabId>;

export type Msg_<K extends Tab.TabId> = Tab.ParentMsg<K, ADT<"noop">>;

export type Msg = Msg_<Tab.TabId>;

export interface RouteParams {
  opportunityId: Id;
  tab?: Tab.TabId;
}

function makeInit<K extends Tab.TabId>(): PageInit<
  RouteParams,
  SharedState,
  State_<K>,
  Msg_<K>
> {
  return isUserType({
    userType: [UserType.Government, UserType.Admin],

    async success({ routePath, routeParams, shared, dispatch }) {
      // Get the opportunity.
      const opportunityResult = await api.opportunities.swu.readOne(
        routeParams.opportunityId
      );
      // If the request failed, then show the "Not Found" page.
      // The back-end will return a 404 if the viewer is a Government
      // user and is not the owner.
      if (!api.isValid(opportunityResult)) {
        dispatch(replaceRoute(adt("notFound" as const, { path: routePath })));
        return invalid(null);
      }
      const opportunity = opportunityResult.value;
      // Set up the visible tab state.
      const tabId = routeParams.tab || "summary";
      const tabState = immutable(
        await Tab.idToDefinition(tabId).component.init({
          opportunity,
          viewerUser: shared.sessionUser
        })
      );
      // Everything checks out, return valid state.
      return valid(
        immutable({
          opportunity,
          tab: [tabId, tabState],
          sidebar: await Tab.makeSidebarState(opportunity, tabId)
        })
      ) as State_<K>;
    },

    async fail({ routePath, dispatch }) {
      dispatch(replaceRoute(adt("notFound" as const, { path: routePath })));
      return invalid(null);
    }
  });
}

function makeComponent<K extends Tab.TabId>(): PageComponent<
  RouteParams,
  SharedState,
  State_<K>,
  Msg_<K>
> {
  const idToDefinition: TabbedPage.IdToDefinitionWithState<
    Tab.Tabs,
    K,
    ValidState<K>
  > = () => Tab.idToDefinition;
  return {
    init: makeInit(),
    update: updateValid(
      TabbedPage.makeParentUpdate({
        extraUpdate: ({ state }) => [state],
        idToDefinition
      })
    ),
    view: viewValid(TabbedPage.makeParentView(idToDefinition)),
    sidebar: sidebarValid(TabbedPage.makeParentSidebar()),
    getAlerts: getAlertsValid(TabbedPage.makeGetParentAlerts(idToDefinition)),
    getModal: getModalValid(TabbedPage.makeGetParentModal(idToDefinition)),
    getContextualActions: getContextualActionsValid(
      TabbedPage.makeGetParentContextualActions(idToDefinition)
    ),
    getMetadata: getMetadataValid(
      TabbedPage.makeGetParentMetadata({
        idToDefinition,
        getTitleSuffix: (state) =>
          state.opportunity.title || DEFAULT_OPPORTUNITY_TITLE
      }),
      makePageMetadata("Edit Sprint With Us Opportunity")
    )
  };
}

export const component: PageComponent<RouteParams, SharedState, State, Msg> =
  makeComponent();
