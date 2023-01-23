import * as MenuSidebar from "front-end/lib/components/sidebar/menu";
import * as TabbedPage from "front-end/lib/components/sidebar/menu/tabbed-page";
import { component } from "front-end/lib/framework";
import * as CapabilitiesTab from "front-end/lib/pages/user/profile/tab/capabilities";
import * as LegalTab from "front-end/lib/pages/user/profile/tab/legal";
import * as NotificationsTab from "front-end/lib/pages/user/profile/tab/notifications";
import * as OrganizationsTab from "front-end/lib/pages/user/profile/tab/organizations";
import * as ProfileTab from "front-end/lib/pages/user/profile/tab/profile";
import { routeDest } from "front-end/lib/views/link";
import { User, usersAreEquivalent, UserType } from "shared/lib/resources/user";
import { adt, Id } from "shared/lib/types";

// Parent page types & functions.

export type ParentState<K extends TabId> = TabbedPage.ParentState<Tabs, K>;

export type ParentInnerMsg<
  K extends TabId,
  InnerMsg
> = TabbedPage.ParentInnerMsg<Tabs, K, InnerMsg>;

export type ParentMsg<K extends TabId, InnerMsg> = TabbedPage.ParentMsg<
  Tabs,
  K,
  InnerMsg
>;

// Tab component types & functions.

export type InvitationResponseParam = "approve" | "reject";

export function parseInvitationResponseParam(
  raw: string
): InvitationResponseParam | null {
  switch (raw) {
    case "approve":
    case "reject":
      return raw;
    default:
      return null;
  }
}

export interface Params {
  profileUser: User;
  viewerUser: User;
  invitation?: {
    affiliationId: Id;
    response: InvitationResponseParam;
  };
  unsubscribe?: true;
}

export type InitResponse = null;

export type Component<State, Msg> = TabbedPage.TabComponent<
  Params,
  State,
  Msg,
  InitResponse
>;

export interface Tabs {
  profile: TabbedPage.Tab<
    Params,
    ProfileTab.State,
    ProfileTab.InnerMsg,
    InitResponse
  >;
  capabilities: TabbedPage.Tab<
    Params,
    CapabilitiesTab.State,
    CapabilitiesTab.InnerMsg,
    InitResponse
  >;
  notifications: TabbedPage.Tab<
    Params,
    NotificationsTab.State,
    NotificationsTab.InnerMsg,
    InitResponse
  >;
  legal: TabbedPage.Tab<
    Params,
    LegalTab.State,
    LegalTab.InnerMsg,
    InitResponse
  >;
  organizations: TabbedPage.Tab<
    Params,
    OrganizationsTab.State,
    OrganizationsTab.InnerMsg,
    InitResponse
  >;
}

export type TabId = TabbedPage.TabId<Tabs>;

export type TabState<K extends TabId> = TabbedPage.TabState<Tabs, K>;

export type TabMsg<K extends TabId> = TabbedPage.TabMsg<Tabs, K>;

export const parseTabId: TabbedPage.ParseTabId<Tabs> = (raw) => {
  switch (raw) {
    case "profile":
    case "capabilities":
    case "notifications":
    case "legal":
    case "organizations":
      return raw;
    default:
      return null;
  }
};

export function idToDefinition<K extends TabId>(
  id: K
): TabbedPage.TabDefinition<Tabs, K> {
  switch (id) {
    case "notifications":
      return {
        component: NotificationsTab.component,
        icon: "bell",
        title: "Notifications"
      } as TabbedPage.TabDefinition<Tabs, K>;
    case "legal":
      return {
        component: LegalTab.component,
        icon: "balance-scale",
        title: "Policies, Terms & Agreements"
      } as TabbedPage.TabDefinition<Tabs, K>;
    case "organizations":
      return {
        component: OrganizationsTab.component,
        icon: "building",
        title: "Organizations"
      } as TabbedPage.TabDefinition<Tabs, K>;

    case "capabilities":
      return {
        component: CapabilitiesTab.component,
        icon: "toolbox",
        title: "Capabilities"
      } as TabbedPage.TabDefinition<Tabs, K>;

    case "profile":
    default:
      return {
        component: ProfileTab.component,
        icon: "user",
        title: "Profile"
      } as TabbedPage.TabDefinition<Tabs, K>;
  }
}

export function makeSidebarLink(
  tab: TabId,
  userId: Id,
  activeTab: TabId
): MenuSidebar.SidebarItem {
  const { icon, title } = idToDefinition(tab);
  return adt("link", {
    icon,
    text: title,
    active: activeTab === tab,
    dest: routeDest(adt("userProfile", { userId, tab }))
  });
}

export function makeSidebarState(
  activeTab: TabId,
  viewerUser: User,
  profileUser: User
): component.base.InitReturnValue<MenuSidebar.State, MenuSidebar.Msg> {
  const items = (() => {
    switch (viewerUser.type) {
      case UserType.Admin:
        if (usersAreEquivalent(profileUser, viewerUser)) {
          return [
            makeSidebarLink("profile", profileUser.id, activeTab),
            makeSidebarLink("notifications", profileUser.id, activeTab)
          ];
        } else {
          return [];
        }
      case UserType.Government:
        return [
          makeSidebarLink("profile", profileUser.id, activeTab),
          makeSidebarLink("notifications", profileUser.id, activeTab)
        ];
      case UserType.Vendor:
        return [
          makeSidebarLink("profile", profileUser.id, activeTab),
          makeSidebarLink("capabilities", profileUser.id, activeTab),
          makeSidebarLink("organizations", profileUser.id, activeTab),
          makeSidebarLink("notifications", profileUser.id, activeTab),
          makeSidebarLink("legal", profileUser.id, activeTab)
        ];
    }
  })();
  return MenuSidebar.init({ items });
}
