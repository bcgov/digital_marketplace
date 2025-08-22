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
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Tab from "front-end/lib/pages/opportunity/team-with-us/edit/tab";
import {
  DEFAULT_OPPORTUNITY_TITLE,
  TWUOpportunity
} from "shared/lib/resources/opportunity/team-with-us";
import { isAdmin, User, UserType } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";
import { TWUProposalSlim } from "shared/lib/resources/proposal/team-with-us";
import { TWUResourceQuestionResponseEvaluation } from "shared/lib/resources/evaluations/team-with-us/resource-questions";

interface ValidState<K extends Tab.TabId> extends Tab.ParentState<K> {
  opportunity: TWUOpportunity | null;
}

export type State_<K extends Tab.TabId> = Validation<
  Immutable<ValidState<K>>,
  null
>;

export type State = State_<Tab.TabId>;

export type InnerMsg_<K extends Tab.TabId> = Tab.ParentInnerMsg<
  K,
  ADT<
    "onInitResponse",
    [
      string,
      Tab.TabId,
      api.ResponseValidation<TWUOpportunity, string[]>,
      api.ResponseValidation<TWUProposalSlim[], string[]>,
      api.ResponseValidation<TWUResourceQuestionResponseEvaluation[], string[]>,
      User,
      api.ResponseValidation<User[], string[]>
    ]
  >
>;

export type InnerMsg = InnerMsg_<Tab.TabId>;

export type Msg_<K extends Tab.TabId> = Tab.ParentMsg<K, InnerMsg>;

export type Msg = Msg_<Tab.TabId>;

export interface RouteParams {
  opportunityId: Id;
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
    userType: [UserType.Government, UserType.Admin],
    success({ routePath, routeParams, shared }) {
      const tabId = routeParams.tab ?? "summary";
      const [sidebarState, sidebarCmds] = Tab.makeSidebarState(tabId, {
        isOpportunityOwnerOrAdmin: false,
        isEvaluator: false,
        isChair: false
      });
      const tabComponent = Tab.idToDefinition(tabId).component;
      const [tabState, tabCmds] = tabComponent.init({
        viewerUser: shared.sessionUser
      });
      return [
        valid(
          immutable({
            opportunity: null,
            tab: [tabId, immutable(tabState as Tab.Tabs[K]["state"])],
            sidebar: sidebarState
          })
        ) as State_<K>,
        [
          ...component_.cmd.mapMany(
            sidebarCmds,
            (msg) => adt("sidebar", msg) as Msg
          ),
          ...component_.cmd.mapMany(tabCmds, (msg) => adt("tab", msg) as Msg),
          component_.cmd.join4(
            api.opportunities.twu.readOne()(
              routeParams.opportunityId,
              (response) => response
            ),
            Tab.shouldLoadProposalsForTab(tabId)
              ? api.proposals.twu.readMany(routeParams.opportunityId)(
                  (response) => response
                )
              : component_.cmd.dispatch(valid([])),
            Tab.shouldLoadEvaluationsForTab(tabId)
              ? tabId === "consensus"
                ? api.opportunities.twu.resourceQuestions.consensuses.readMany(
                    routeParams.opportunityId
                  )((response) => response)
                : api.opportunities.twu.resourceQuestions.evaluations.readMany(
                    routeParams.opportunityId
                  )((response) => response)
              : component_.cmd.dispatch(valid([])),
            Tab.shouldLoadUsersForTab(tabId)
              ? api.users.readMany()((response) => response)
              : component_.cmd.dispatch(valid([])),
            (opportunity, proposals, evaluations, users) =>
              adt("onInitResponse", [
                routePath,
                tabId,
                opportunity,
                proposals,
                evaluations,
                shared.sessionUser,
                users
              ]) as Msg
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
              const [
                routePath,
                tabId,
                opportunityResponse,
                proposalsResponse,
                evaluationsResponse,
                viewerUser,
                usersResponse
              ] = msg.value;
              // If the opportunity request failed, then show the "Not Found" page.
              // The back-end will return a 404 if the viewer is a Government
              // user and is not the owner.
              // We default invalid proposal responses to an empty list.
              if (!api.isValid(opportunityResponse)) {
                return [
                  state,
                  [
                    component_.cmd.dispatch(
                      component_.global.replaceRouteMsg(
                        adt("notFound" as const, { path: routePath })
                      )
                    )
                  ]
                ];
              }
              const opportunity = opportunityResponse.value;
              const proposals = api.getValidValue(proposalsResponse, []);
              const evaluations = api.getValidValue(evaluationsResponse, []);
              const users = api.getValidValue(usersResponse, []);

              // Tab Permissions
              const evaluationPanelMember = opportunity.evaluationPanel?.find(
                ({ user: eu }) => eu.id === viewerUser.id
              );
              const tabPermissions = {
                isOpportunityOwnerOrAdmin:
                  viewerUser.id === opportunity?.createdBy?.id ||
                  isAdmin(viewerUser),
                isEvaluator: Boolean(evaluationPanelMember?.evaluator),
                isChair: Boolean(evaluationPanelMember?.chair)
              };

              if (!Tab.canGovUserViewTab(tabId, tabPermissions)) {
                return [
                  state,
                  [
                    component_.cmd.dispatch(
                      component_.global.replaceRouteMsg(
                        adt("notFound" as const, { path: routePath })
                      )
                    )
                  ]
                ];
              }

              // Re-initialize sidebar.
              const [sidebarState, sidebarCmds] = Tab.makeSidebarState(
                tabId,
                tabPermissions,
                opportunity
              );
              const tabComponent = Tab.idToDefinition(tabId).component;
              return [
                state
                  .set("opportunity", opportunity)
                  .set("sidebar", immutable(sidebarState)),
                [
                  ...component_.cmd.mapMany(
                    sidebarCmds,
                    (msg) => adt("sidebar", msg) as Msg
                  ),
                  component_.cmd.dispatch(
                    component_.page.mapMsg(
                      tabComponent.onInitResponse([
                        opportunity,
                        proposals,
                        evaluations,
                        users
                      ]),
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
          state.opportunity?.title || DEFAULT_OPPORTUNITY_TITLE
      }),
      makePageMetadata("Edit Team With Us Opportunity")
    ),
    getSidebarOpenCallback: (state) => {
      console.log("Edit page getSidebarOpenCallback called with state:", state);

      // Handle Validation type - only work with valid state
      if (state.tag !== "valid") {
        console.log("State is invalid, cannot get sidebar callback");
        return undefined;
      }

      const validState = state.value;
      if (!validState.tab) {
        console.log("No active tab in state");
        return undefined;
      }

      const tabId = validState.tab[0];
      const tabState = validState.tab[1];
      const tabDefinition = Tab.idToDefinition(tabId);
      const tabComponent = tabDefinition.component;

      console.log("Active tab:", tabId, "Component:", tabComponent);

      // Check if the tab component has the getSidebarOpenCallback method
      if (tabComponent.getSidebarOpenCallback) {
        console.log("Tab component has getSidebarOpenCallback, calling it");
        // Convert Immutable to regular object for the callback
        return tabComponent.getSidebarOpenCallback(tabState.toJS() as any);
      } else {
        console.log("Tab component does NOT have getSidebarOpenCallback");
        return undefined;
      }
    }
  };
}

export const component: component_.page.Component<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = makeComponent();
