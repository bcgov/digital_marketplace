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
import * as api from "front-end/lib/http/api";
import { SharedState, Route } from "front-end/lib/app/types";
import * as TabbedPage from "front-end/lib/components/sidebar/menu/tabbed-page";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as Tab from "front-end/lib/pages/organization/edit/tab";
import Link, { routeDest } from "front-end/lib/views/link";
import React from "react";
import { isAdmin, isVendor, UserType, User } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";
import { AffiliationMember } from "shared/lib/resources/affiliation";
import {
  Organization,
  doesOrganizationMeetSWUQualification
} from "shared/lib/resources/organization";

interface ValidState<K extends Tab.TabId> extends Tab.ParentState<K> {
  viewerUser: User;
}

export type State_<K extends Tab.TabId> = Validation<
  Immutable<ValidState<K>>,
  null
>;

export type State = State_<Tab.TabId>;

export type InnerMsg_<K extends Tab.TabId> = Tab.ParentInnerMsg<
  K,
  ADT<"onInitResponse", [Tab.TabId, Organization, AffiliationMember[]]>
>;

export type InnerMsg = InnerMsg_<Tab.TabId>;

export type Msg_<K extends Tab.TabId> = Tab.ParentMsg<K, InnerMsg>;

export type Msg = Msg_<Tab.TabId>;

export interface RouteParams {
  orgId: Id;
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
    userType: [UserType.Vendor, UserType.Admin],
    success({ routePath, routeParams, shared }) {
      const orgId = routeParams.orgId;
      const viewerUser = shared.sessionUser;
      return [
        valid(
          immutable({
            viewerUser,
            tab: null,
            sidebar: null
          })
        ) as State_<K>,
        [
          component_.cmd.join(
            api.organizations.readOne(orgId, (response) =>
              api.isValid(response) ? response.value : null
            ) as component_.Cmd<Organization | null>,
            api.affiliations.readManyForOrganization(orgId)((response) =>
              api.isValid(response) ? response.value : null
            ) as component_.Cmd<AffiliationMember[] | null>,
            (organization, affiliations) => {
              if (!organization || !affiliations)
                return component_.global.replaceRouteMsg(
                  adt("notFound" as const, { path: routePath })
                );
              return adt("onInitResponse", [
                routeParams.tab || "organization",
                organization,
                affiliations
              ]) as Msg;
            }
          )
        ]
      ];
    },
    fail({ routePath, shared }) {
      return [
        invalid(null),
        [
          component_.cmd.dispatch(
            component_.global.replaceRouteMsg(
              shared.session
                ? adt("notFound" as const, { path: routePath })
                : adt("signIn" as const, {
                    redirectOnSuccess: routePath
                  })
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
              const [tabId, organization, affiliations] = msg.value;
              const swuQualified =
                doesOrganizationMeetSWUQualification(organization);
              // Initialize the sidebar.
              const [sidebarState, sidebarCmds] = Tab.makeSidebarState(
                tabId,
                organization
              );
              // Initialize the tab.
              const tabComponent = Tab.idToDefinition(tabId).component;
              const [tabState, tabCmds] = tabComponent.init({
                organization,
                swuQualified,
                affiliations,
                viewerUser: state.viewerUser
              });
              // Everything checks out, return valid state.
              return [
                state
                  .set("tab", [tabId as K, immutable(tabState)])
                  .set("sidebar", immutable(sidebarState)),
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
                    adt("tab", tabComponent.onInitResponse(null))
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
    getAlerts: getAlertsValid((state) => {
      return component_.page.alerts.merge(
        {
          info: (() => {
            if (
              state.tab &&
              !state.tab[1].swuQualified &&
              state.tab[0] !== "qualification"
            ) {
              if (isVendor(state.tab[1].viewerUser)) {
                return [
                  {
                    text: (
                      <div>
                        This organization is not qualified to apply for{" "}
                        <em>Sprint With Us</em> opportunities. You must{" "}
                        <Link
                          dest={routeDest(
                            adt("orgEdit", {
                              orgId: state.tab[1].organization.id,
                              tab: "qualification" as const
                            })
                          )}>
                          apply to become a Qualified Supplier
                        </Link>
                        .
                      </div>
                    )
                  }
                ];
              } else if (isAdmin(state.tab[1].viewerUser)) {
                return [
                  {
                    text: (
                      <div>
                        This organization is not qualified to apply for{" "}
                        <em>Sprint With Us</em> opportunities.
                      </div>
                    )
                  }
                ];
              }
            }
            return [];
          })()
        },
        TabbedPage.makeGetParentAlerts(
          idToDefinition
        ) as component_.page.Alerts<Msg>
      );
    }),
    getModal: getModalValid(TabbedPage.makeGetParentModal(idToDefinition)),
    getActions: getActionsValid(
      TabbedPage.makeGetParentActions(idToDefinition)
    ),
    getMetadata: getMetadataValid(
      TabbedPage.makeGetParentMetadata({
        idToDefinition,
        getTitleSuffix: (state) => {
          return !state.tab || state.tab[0] === "organization"
            ? "Edit Organization"
            : `${state.tab[1].organization.legalName} — Edit Organization`;
        }
      }),
      makePageMetadata("Edit Organization")
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
