import {
  getActionsValid,
  getMetadataValid,
  getModalValid,
  makePageMetadata,
  sidebarValid,
  updateValid,
  viewValid
} from "front-end/lib";
import { isSignedIn } from "front-end/lib/access-control";
import router from "front-end/lib/app/router";
import { SharedState, Route } from "front-end/lib/app/types";
import * as TabbedPage from "front-end/lib/components/sidebar/menu/tabbed-page";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Tab from "front-end/lib/pages/user/profile/tab";
import {
  isAdmin,
  isPublicSectorEmployee,
  isVendor,
  User
} from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";

interface ValidState<K extends Tab.TabId> extends Tab.ParentState<K> {
  profileUser: User | null;
  viewerUser: User;
}

type State_<K extends Tab.TabId> = Validation<Immutable<ValidState<K>>, null>;

export type State = State_<Tab.TabId>;

export type InnerMsg_<K extends Tab.TabId> = Tab.ParentInnerMsg<
  K,
  ADT<
    "onInitResponse",
    [string, RouteParams, api.ResponseValidation<User, string[]>]
  >
>;

export type InnerMsg = InnerMsg_<Tab.TabId>;

export type Msg_<K extends Tab.TabId> = Tab.ParentMsg<K, InnerMsg>;

export type Msg = Msg_<Tab.TabId>;

export interface RouteParams extends Pick<Tab.Params, "invitation"> {
  userId: Id;
  tab?: Tab.TabId;
}

function makeInit<K extends Tab.TabId>(): component_.page.Init<
  RouteParams,
  SharedState,
  State_<K>,
  InnerMsg_<K>,
  Route
> {
  return isSignedIn({
    success({ routePath, routeParams, shared }) {
      const viewerUser = shared.sessionUser;
      return [
        valid(
          immutable({
            profileUser: null,
            tab: null,
            sidebar: null,
            viewerUser
          })
        ) as State_<K>,
        [
          api.users.readOne(routeParams.userId, (response) =>
            adt("onInitResponse", [routePath, routeParams, response])
          ) as component_.Cmd<Msg>
        ]
      ];
    },
    fail({ routeParams, shared }) {
      return [
        invalid(null),
        shared.session
          ? []
          : [
              component_.cmd.dispatch(
                component_.global.replaceRouteMsg(
                  adt("signIn" as const, {
                    redirectOnSuccess: router.routeToUrl(
                      adt("userProfile", { userId: routeParams.userId })
                    )
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
              const [routePath, routeParams, profileUserResponse] = msg.value;
              // If the request failed, then show the "Not Found" page.
              if (!api.isValid(profileUserResponse)) {
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
              const profileUser = profileUserResponse.value;
              const isOwner = state.viewerUser.id === profileUser.id;
              const viewerIsAdmin = isAdmin(state.viewerUser);
              // If the viewer isn't the owner or an admin, then show the "Not Found" page.
              if (!isOwner && !viewerIsAdmin) {
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
              // Set up the visible tab state.
              const currentTabId = routeParams.tab;
              const tabId: Tab.TabId = (() => {
                if (viewerIsAdmin && !isOwner) {
                  // Admins can only view the profile tab of non-owned profiles.
                  return "profile";
                } else if (
                  currentTabId === "organizations" &&
                  isOwner &&
                  isPublicSectorEmployee(state.viewerUser)
                ) {
                  // Public Sector Employees do not have an organizations tab.
                  return "profile";
                } else if (currentTabId === "legal" && !isVendor(profileUser)) {
                  // Non-vendors do not have a legal tab.
                  return "profile";
                } else {
                  return currentTabId || "profile";
                }
              })();
              // Initialize the sidebar.
              const [sidebarState, sidebarCmds] = Tab.makeSidebarState(
                tabId,
                state.viewerUser,
                profileUser
              );
              // Initialize the tab.
              const tabComponent = Tab.idToDefinition(tabId).component;
              const [tabState, tabCmds] = tabComponent.init({
                profileUser,
                viewerUser: state.viewerUser,
                invitation: routeParams.invitation
              });
              // Everything checks out, return valid state.
              return [
                state
                  .set("tab", [tabId as K, immutable(tabState)])
                  .set("sidebar", immutable(sidebarState))
                  .set("profileUser", profileUser),
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
    getModal: getModalValid(TabbedPage.makeGetParentModal(idToDefinition)),
    getActions: getActionsValid(
      TabbedPage.makeGetParentActions(idToDefinition)
    ),
    getMetadata: getMetadataValid(
      TabbedPage.makeGetParentMetadata({
        idToDefinition,
        getTitleSuffix: (state) => state.profileUser?.name || "User Profile"
      }),
      makePageMetadata("User Profile")
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
