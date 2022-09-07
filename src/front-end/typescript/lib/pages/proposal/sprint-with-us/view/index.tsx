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
import * as Tab from "front-end/lib/pages/proposal/sprint-with-us/view/tab";
import {
  DEFAULT_SWU_PROPOSAL_TITLE,
  SWUProposal
} from "shared/lib/resources/proposal/sprint-with-us";
import { UserType } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";

interface ValidState<K extends Tab.TabId> extends Tab.ParentState<K> {
  proposal: SWUProposal;
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
  proposalId: Id;
  tab?: Tab.TabId;
}

function makeInit<K extends Tab.TabId>(): PageInit<
  RouteParams,
  SharedState,
  State_<K>,
  Msg_<K>
> {
  return isUserType({
    userType: [UserType.Admin, UserType.Government],

    async success({ routePath, routeParams, shared, dispatch }) {
      const fail = () => {
        dispatch(replaceRoute(adt("notFound" as const, { path: routePath })));
        return invalid(null);
      };
      // Get the proposal.
      const proposalResult = await api.proposals.swu.readOne(
        routeParams.opportunityId,
        routeParams.proposalId
      );
      // If the request failed, then show the "Not Found" page.
      if (!api.isValid(proposalResult)) {
        return fail();
      }
      const proposal = proposalResult.value;
      const opportunityResult = await api.opportunities.swu.readOne(
        proposal.opportunity.id
      );
      if (!api.isValid(opportunityResult)) {
        return fail();
      }
      const viewerUser = shared.sessionUser;
      // Set up the visible tab state.
      const tabId = routeParams.tab || "proposal";
      const tabState = immutable(
        await Tab.idToDefinition(tabId).component.init({
          proposal,
          opportunity: opportunityResult.value,
          viewerUser
        })
      );
      // Everything checks out, return valid state.
      return valid(
        immutable({
          proposal,
          tab: [tabId, tabState],
          sidebar: await Tab.makeSidebarState(proposal, tabId)
        })
      ) as State_<K>;
    },

    async fail({ routePath, dispatch }) {
      dispatch(replaceRoute(adt("notFound" as const, { path: routePath })));
      return invalid(null);
    }
  });
}

function getProposal<K extends Tab.TabId>(
  state: Immutable<ValidState<K>>
): SWUProposal {
  return state.proposal;
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
  > = (state) => Tab.idToDefinition;
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
          getProposal(state).organization?.legalName ||
          state.proposal.anonymousProponentName ||
          DEFAULT_SWU_PROPOSAL_TITLE
      }),
      makePageMetadata("View Sprint With Us Proposal")
    )
  };
}

export const component: PageComponent<RouteParams, SharedState, State, Msg> =
  makeComponent();
