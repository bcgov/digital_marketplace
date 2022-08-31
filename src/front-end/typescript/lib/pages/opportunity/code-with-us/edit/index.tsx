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
import * as Tab from "front-end/lib/pages/opportunity/code-with-us/edit/tab";
import {
  CWUOpportunity,
  DEFAULT_OPPORTUNITY_TITLE
} from "shared/lib/resources/opportunity/code-with-us";
import { UserType } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";
import { CWUProposalSlim } from "shared/lib/resources/proposal/code-with-us";

interface ValidState<K extends Tab.TabId> extends Tab.ParentState<K> {
  opportunity: CWUOpportunity | null;
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
      api.ResponseValidation<CWUOpportunity, string[]>,
      api.ResponseValidation<CWUProposalSlim[], string[]>
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
      const tabId = routeParams.tab || "summary";
      const [sidebarState, sidebarCmds] = Tab.makeSidebarState(tabId);
      const tabComponent = Tab.idToDefinition(tabId).component;
      const [tabState, tabCmds] = tabComponent.init({
        viewerUser: shared.sessionUser
      });
      return [
        valid(
          immutable({
            opportunity: null,
            tab: [tabId, immutable(tabState)],
            sidebar: sidebarState
          })
        ) as State_<K>,
        [
          ...component_.cmd.mapMany(
            sidebarCmds,
            (msg) => adt("sidebar", msg) as Msg
          ),
          ...component_.cmd.mapMany(tabCmds, (msg) => adt("tab", msg) as Msg),
          component_.cmd.join(
            api.opportunities.cwu.readOne(
              routeParams.opportunityId,
              (response) => response
            ),
            tabId === "proposals"
              ? api.proposals.cwu.readMany(routeParams.opportunityId)(
                  (response) => response
                )
              : component_.cmd.dispatch(valid([])),
            (opportunity, proposals) =>
              adt("onInitResponse", [
                routePath,
                tabId,
                opportunity,
                proposals
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
              const [routePath, tabId, opportunityResponse, proposalsResponse] =
                msg.value;
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
              // Re-initialize sidebar.
              const [sidebarState, sidebarCmds] = Tab.makeSidebarState(
                tabId,
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
                    adt(
                      "tab",
                      tabComponent.onInitResponse([opportunity, proposals])
                    )
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
      makePageMetadata("Edit Code With Us Opportunity")
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
