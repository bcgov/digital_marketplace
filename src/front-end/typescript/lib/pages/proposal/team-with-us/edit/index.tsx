import {
  getAlertsValid,
  getActionsValid,
  getMetadataValid,
  getModalValid,
  makePageMetadata,
  sidebarValid,
  updateValid,
  viewValid
} from "front-end/lib";
import { isUserType } from "front-end/lib/access-control";
import { SharedState, Route } from "front-end/lib/app/types";
import * as TabbedPage from "front-end/lib/components/sidebar/menu/tabbed-page";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Tab from "front-end/lib/pages/proposal/team-with-us/edit/tab";
import {
  DEFAULT_TWU_PROPOSAL_TITLE,
  TWUProposal
} from "shared/lib/resources/proposal/team-with-us";
import { UserType, User } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";
import { TWUOpportunity } from "shared/lib/resources/opportunity/team-with-us";

interface ValidState<K extends Tab.TabId> extends Tab.ParentState<K> {
  proposal: TWUProposal | null;
}

export type State_<K extends Tab.TabId> = Validation<
  Immutable<ValidState<K>>,
  null
>;

export type State = State_<Tab.TabId>;

export type InnerMsg_<K extends Tab.TabId> = Tab.ParentInnerMsg<
  K,
  ADT<"onInitResponse", [User, RouteParams, TWUProposal, TWUOpportunity]>
>;

export type InnerMsg = InnerMsg_<Tab.TabId>;

export type Msg_<K extends Tab.TabId> = Tab.ParentMsg<K, InnerMsg>;

export type Msg = Msg_<Tab.TabId>;

export interface RouteParams {
  opportunityId: Id;
  proposalId: Id;
  tab?: Tab.TabId;
}

function makeInit<K extends Tab.TabId>(): component_.page.Init<
  RouteParams,
  SharedState,
  State_<K>,
  InnerMsg_<K>,
  Route
> {
  return isUserType({
    userType: [UserType.Vendor],
    success({ routePath, routeParams, shared }) {
      const { opportunityId, proposalId } = routeParams;
      return [
        valid(
          immutable({
            proposal: null,
            tab: null,
            sidebar: null
          })
        ) as State_<K>,
        [
          component_.cmd.join(
            api.proposals.twu.readOne<TWUProposal | null>(opportunityId)(
              proposalId,
              (response) => (api.isValid(response) ? response.value : null)
            ),
            api.opportunities.twu.readOne<TWUOpportunity | null>()(
              opportunityId,
              (response) => (api.isValid(response) ? response.value : null)
            ),
            (proposal, opportunity) => {
              if (!proposal || !opportunity)
                return component_.global.replaceRouteMsg(
                  adt("notFound" as const, { path: routePath })
                );
              return adt("onInitResponse", [
                shared.sessionUser,
                routeParams,
                proposal,
                opportunity
              ]) as Msg;
            }
          )
        ]
      ];
    },
    fail({ routePath }) {
      return [
        invalid(null),
        [
          component_.cmd.dispatch(
            component_.global.replaceRouteMsg(
              adt("notFound" as const, { path: routePath })
            )
          )
        ]
      ];
    }
  });
}

function getProposal<K extends Tab.TabId>(
  state: Immutable<ValidState<K>>
): TWUProposal | null {
  const tab = state.tab;
  if (!tab) return state.proposal;
  if (tab[0] === "proposal") {
    return tab[1].proposal;
  } else if (tab[0] === "scoresheet") {
    return tab[1].proposal;
  } else {
    return state.proposal;
  }
}

function makeComponent<K extends Tab.TabId>(): component_.page.Component<
  RouteParams,
  SharedState,
  State_<K>,
  InnerMsg_<K>,
  Route
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
        idToDefinition,
        extraUpdate: ({ state, msg }) => {
          switch (msg.tag) {
            case "onInitResponse": {
              const [viewerUser, routeParams, proposal, opportunity] =
                msg.value;
              // Set up the visible tab state.
              const tabId = routeParams.tab || "proposal";
              // Initialize the sidebar.
              const [sidebarState, sidebarCmds] = Tab.makeSidebarState(
                tabId,
                proposal
              );
              // Initialize the tab.
              const tabComponent = Tab.idToDefinition(tabId).component;
              const [tabState, tabCmds] = tabComponent.init({
                viewerUser,
                proposal,
                opportunity
              });
              // Everything checks out, return valid state.
              return [
                state
                  .set("tab", [
                    tabId as K,
                    immutable<Tab.Tabs[K]["state"]>(tabState)
                  ])
                  .set("sidebar", immutable(sidebarState))
                  .set("proposal", proposal),
                [
                  ...component_.cmd.mapMany(
                    sidebarCmds,
                    (msg) => adt("sidebar", msg) as Msg
                  ),
                  ...component_.cmd.mapMany(
                    tabCmds,
                    (msg) => adt("tab", msg) as Msg
                  ),
                  component_.cmd.dispatch(
                    component_.page.mapMsg(
                      tabComponent.onInitResponse(null),
                      (msg) => adt("tab", msg)
                    ) as Msg
                  )
                ]
              ];
            }
            default:
              return [state, []];
          }
        }
      })
    ),
    view: viewValid(TabbedPage.makeParentView(idToDefinition)),
    sidebar: sidebarValid(TabbedPage.makeParentSidebar()),
    getAlerts: getAlertsValid(TabbedPage.makeGetParentAlerts(idToDefinition)),
    getModal: getModalValid(TabbedPage.makeGetParentModal(idToDefinition)),
    getActions: getActionsValid(
      TabbedPage.makeGetParentActions(idToDefinition)
    ),
    getMetadata: getMetadataValid(
      TabbedPage.makeGetParentMetadata({
        idToDefinition,
        getTitleSuffix: (state) =>
          getProposal(state)?.organization?.legalName ||
          state.proposal?.anonymousProponentName ||
          DEFAULT_TWU_PROPOSAL_TITLE
      }),
      makePageMetadata("Edit Team With Us Proposal")
    )
  };
}

export const component: component_.page.Component<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = makeComponent();
