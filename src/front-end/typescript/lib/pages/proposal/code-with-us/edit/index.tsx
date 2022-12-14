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
import * as Tab from "front-end/lib/pages/proposal/code-with-us/edit/tab";
import {
  CWUProposal,
  DEFAULT_CWU_PROPOSAL_TITLE,
  getCWUProponentName
} from "shared/lib/resources/proposal/code-with-us";
import { UserType } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";
import { CWUOpportunity } from "shared/lib/resources/opportunity/code-with-us";
import { AffiliationSlim } from "shared/lib/resources/affiliation";

interface ValidState<K extends Tab.TabId> extends Tab.ParentState<K> {
  proposal: CWUProposal | null;
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
      api.ResponseValidation<CWUProposal, string[]>,
      api.ResponseValidation<CWUOpportunity, string[]>,
      api.ResponseValidation<AffiliationSlim[], string[]>
    ]
  >
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
      const { opportunityId, proposalId, tab } = routeParams;
      const tabId = tab || "proposal";
      const [sidebarState, sidebarCmds] = Tab.makeSidebarState(
        tabId,
        proposalId,
        opportunityId
      );
      const tabComponent = Tab.idToDefinition(tabId).component;
      const [tabState, tabCmds] = tabComponent.init({
        viewerUser: shared.sessionUser
      });
      return [
        valid(
          immutable({
            proposal: null,
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
          component_.cmd.join3(
            api.proposals.cwu.readOne(opportunityId)(
              proposalId,
              (response) => response
            ),
            api.proposals.cwu.readOne(opportunityId)(
              proposalId,
              (response) => response
            ),
            api.affiliations.readMany((response) => response),
            (proposalResponse, opportunityResponse, affiliationsResponse) =>
              adt("onInitResponse", [
                routePath,
                tabId,
                proposalResponse,
                opportunityResponse,
                affiliationsResponse
              ])
          ) as component_.Cmd<Msg>
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
                proposalResponse,
                opportunityResponse,
                affiliationsResponse
              ] = msg.value;
              // If the proposal request failed, then show the "Not Found" page.
              if (
                !api.isValid(proposalResponse) ||
                !api.isValid(opportunityResponse) ||
                !api.isValid(affiliationsResponse)
              ) {
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
              const proposal = proposalResponse.value;
              const opportunity = opportunityResponse.value;
              const affiliations = affiliationsResponse.value;
              const [sidebarState, sidebarCmds] = Tab.makeSidebarState(
                tabId,
                proposal.id,
                opportunity.id
              );
              const tabComponent = Tab.idToDefinition(tabId).component;
              return [
                state
                  .set("proposal", proposal)
                  .set("sidebar", immutable(sidebarState)),
                [
                  ...component_.cmd.mapMany(
                    sidebarCmds,
                    (msg) => adt("sidebar", msg) as Msg
                  ),
                  component_.cmd.dispatch(
                    component_.page.mapMsg(
                      tabComponent.onInitResponse([
                        proposal,
                        opportunity,
                        affiliations
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
          (state.proposal && getCWUProponentName(state.proposal)) ||
          DEFAULT_CWU_PROPOSAL_TITLE
      }),
      makePageMetadata("Edit Code With Us Proposal")
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
