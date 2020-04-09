import { getAlertsValid, getContextualActionsValid, getMetadataValid, getModalValid, makePageMetadata, sidebarValid, updateValid, viewValid } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import { SharedState } from 'front-end/lib/app/types';
import * as TabbedPage from 'front-end/lib/components/sidebar/menu/tabbed-page';
import { immutable, Immutable, PageComponent, PageInit, replaceRoute } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Tab from 'front-end/lib/pages/proposal/code-with-us/edit/tab';
import { CWUProposal, DEFAULT_CWU_PROPOSAL_TITLE, getCWUProponentName } from 'shared/lib/resources/proposal/code-with-us';
import { UserType } from 'shared/lib/resources/user';
import { adt, ADT, Id } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

interface ValidState<K extends Tab.TabId> extends Tab.ParentState<K> {
  proposal: CWUProposal;
}

export type State_<K extends Tab.TabId> = Validation<Immutable<ValidState<K>>, null>;

export type State = State_<Tab.TabId>;

export type Msg_<K extends Tab.TabId> = Tab.ParentMsg<K, ADT<'noop'>>;

export type Msg = Msg_<Tab.TabId>;

export interface RouteParams {
  opportunityId: Id;
  proposalId: Id;
  tab?: Tab.TabId;
}

function makeInit<K extends Tab.TabId>(): PageInit<RouteParams, SharedState, State_<K>, Msg_<K>> {
  return isUserType({
    userType: [UserType.Vendor],

    async success({ routePath, routeParams, shared, dispatch }) {
      // Get the proposal.
      const proposalResult = await api.proposals.cwu.readOne(routeParams.opportunityId, routeParams.proposalId);
      // If the request failed, then show the "Not Found" page.
      if (!api.isValid(proposalResult)) {
        dispatch(replaceRoute(adt('notFound' as const, { path: routePath })));
        return invalid(null);
      }
      const viewerUser = shared.sessionUser;
      const proposal = proposalResult.value;
      // Set up the visible tab state.
      const tabId = routeParams.tab || 'proposal';
      const tabState = immutable(await Tab.idToDefinition(tabId).component.init({
        proposal,
        viewerUser
      }));
      // Everything checks out, return valid state.
      return valid(immutable({
        proposal,
        tab: [tabId, tabState],
        sidebar: await Tab.makeSidebarState(proposal.id, proposal.opportunity.id, tabId)
      })) as State_<K>;
    },

    async fail({ routePath, dispatch }) {
      dispatch(replaceRoute(adt('notFound' as const, { path: routePath })));
      return invalid(null);
    }
  });
}

function makeComponent<K extends Tab.TabId>(): PageComponent<RouteParams, SharedState, State_<K>, Msg_<K>> {
  const idToDefinition: TabbedPage.IdToDefinitionWithState<Tab.Tabs, K, ValidState<K>> = () => Tab.idToDefinition;
  return {
    init: makeInit(),
    update: updateValid(TabbedPage.makeParentUpdate({
      extraUpdate: ({ state }) => [state],
      idToDefinition
    })),
    view: viewValid(TabbedPage.makeParentView(idToDefinition)),
    sidebar: sidebarValid(TabbedPage.makeParentSidebar()),
    getAlerts: getAlertsValid(TabbedPage.makeGetParentAlerts(idToDefinition)),
    getModal: getModalValid(TabbedPage.makeGetParentModal(idToDefinition)),
    getContextualActions: getContextualActionsValid(TabbedPage.makeGetParentContextualActions(idToDefinition)),
    getMetadata: getMetadataValid(TabbedPage.makeGetParentMetadata({
      idToDefinition,
      getTitleSuffix: state => getCWUProponentName(state.proposal) || DEFAULT_CWU_PROPOSAL_TITLE
    }), makePageMetadata('Edit Code With Us Proposal'))
  };
}

export const component: PageComponent<RouteParams, SharedState, State, Msg> = makeComponent();
