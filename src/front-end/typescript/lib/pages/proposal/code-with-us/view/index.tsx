import { getAlertsValid, getBreadcrumbsValid, getContextualActionsValid, getMetadataValid, getModalValid, makePageMetadata, sidebarValid, updateValid, viewValid } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import { SharedState } from 'front-end/lib/app/types';
import * as TabbedPage from 'front-end/lib/components/sidebar/menu/tabbed-page';
import { immutable, Immutable, newRoute, PageComponent, PageInit, replaceRoute } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Tab from 'front-end/lib/pages/proposal/code-with-us/view/tab';
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
    userType: [UserType.Government, UserType.Admin],

    async success({ routeParams, shared, dispatch }) {
      // Get the proposal.
      const proposalResult = await api.proposals.cwu.readOne(routeParams.opportunityId, routeParams.proposalId);
      // If the request failed, then show the "Not Found" page.
      // The back-end will return a 404 if the viewer is a Government
      // user and is not the associated opportunity owner.
      if (!api.isValid(proposalResult)) {
        dispatch(replaceRoute(adt('notice' as const, adt('notFound' as const))));
        return invalid(null);
      }
      const proposal = proposalResult.value;
      // Set up the visible tab state.
      const tabId = routeParams.tab || 'proposal';
      const tabState = immutable(await Tab.idToDefinition(tabId).component.init({
        proposal,
        viewerUser: shared.sessionUser
      }));
      // Everything checks out, return valid state.
      return valid(immutable({
        proposal,
        tab: [tabId, tabState],
        sidebar: await Tab.makeSidebarState(proposal.id, proposal.opportunity.id, tabId)
      })) as State_<K>;
    },

    async fail({ dispatch }) {
      dispatch(replaceRoute(adt('notice' as const, adt('notFound' as const))));
      return invalid(null);
    }
  });
}

function makeComponent<K extends Tab.TabId>(): PageComponent<RouteParams, SharedState, State_<K>, Msg_<K>> {
  return {
    init: makeInit(),
    update: updateValid(TabbedPage.makeParentUpdate({
      extraUpdate: ({ state }) => [state],
      idToDefinition: Tab.idToDefinition
    })),
    view: viewValid(TabbedPage.makeParentView(Tab.idToDefinition)),
    sidebar: sidebarValid(TabbedPage.makeParentSidebar()),
    getAlerts: getAlertsValid(TabbedPage.makeGetParentAlerts(Tab.idToDefinition)),
    getModal: getModalValid(TabbedPage.makeGetParentModal(Tab.idToDefinition)),
    getContextualActions: getContextualActionsValid(TabbedPage.makeGetParentContextualActions(Tab.idToDefinition)),
    getMetadata: getMetadataValid(TabbedPage.makeGetParentMetadata({
      idToDefinition: Tab.idToDefinition,
      getTitleSuffix: state => getCWUProponentName(state.proposal) || DEFAULT_CWU_PROPOSAL_TITLE
    }), makePageMetadata('View Code With Us Proposal')),
    getBreadcrumbs: getBreadcrumbsValid((state) => {
      return [
        { text: 'All Proposals', onClickMsg: newRoute(adt('opportunityCWUEdit' as const, { opportunityId: state.proposal.opportunity.id })) },
        { text: `Vendor Proposal — ${getCWUProponentName(state.proposal)}` }
      ];
    })
  };
}

export const component: PageComponent<RouteParams, SharedState, State, Msg> = makeComponent();
