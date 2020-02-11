import * as MenuSidebar from 'front-end/lib/components/sidebar/menu';
import * as TabbedPage from 'front-end/lib/components/sidebar/menu/tabbed-page';
import { immutable, Immutable } from 'front-end/lib/framework';
import * as LegalTab from 'front-end/lib/pages/user/profile/tab/legal';
import * as NotificationsTab from 'front-end/lib/pages/user/profile/tab/notifications';
import * as OrganizationsTab from 'front-end/lib/pages/user/profile/tab/organizations';
import * as ProfileTab from 'front-end/lib/pages/user/profile/tab/profile';
import { routeDest } from 'front-end/lib/views/link';
import { User, usersAreEquivalent, UserType } from 'shared/lib/resources/user';
import { adt, Id } from 'shared/lib/types';

// Parent page types & functions.

export type ParentState<K extends TabId> = TabbedPage.ParentState<Tabs, K>;

export type ParentMsg<K extends TabId, InnerMsg> = TabbedPage.ParentMsg<Tabs, K, InnerMsg>;

// Tab component types & functions.

export interface Params {
  profileUser: User;
  viewerUser: User;
}

export type Component<State, Msg> = TabbedPage.TabComponent<Params, State, Msg>;

export interface Tabs {
  profile: TabbedPage.Tab<Params, ProfileTab.State, ProfileTab.InnerMsg>;
  notifications: TabbedPage.Tab<Params, NotificationsTab.State, NotificationsTab.InnerMsg>;
  legal: TabbedPage.Tab<Params, LegalTab.State, LegalTab.InnerMsg>;
  organizations: TabbedPage.Tab<Params, OrganizationsTab.State, OrganizationsTab.InnerMsg>;
}

export type TabId = TabbedPage.TabId<Tabs>;

export type TabState<K extends TabId> = TabbedPage.TabState<Tabs, K>;

export type TabMsg<K extends TabId> = TabbedPage.TabMsg<Tabs, K>;

export const parseTabId: TabbedPage.ParseTabId<Tabs> = raw => {
  switch (raw) {
    case 'profile':
    case 'notifications':
    case 'legal':
    case 'organizations':
      return raw;
    default:
      return null;
  }
};

export function idToDefinition<K extends TabId>(id: K): TabbedPage.TabDefinition<Tabs, K> {
  switch (id) {
    case 'notifications':
      return {
        component: NotificationsTab.component,
        icon: 'bell',
        title: 'Notifications'
      } as TabbedPage.TabDefinition<Tabs, K>;
    case 'legal':
      return {
        component: LegalTab.component,
        icon: 'balance-scale',
        title: 'Accepted Policies, Terms & Agreements'
      } as TabbedPage.TabDefinition<Tabs, K>;
    case 'organizations':
      return {
        component: OrganizationsTab.component,
        icon: 'building',
        title: 'Organizations'
      } as TabbedPage.TabDefinition<Tabs, K>;
    case 'profile':
    default:
      return {
        component: ProfileTab.component,
        icon: 'user',
        title: 'Profile'
      } as TabbedPage.TabDefinition<Tabs, K>;
  }
}

export function makeSidebarLink(tab: TabId, userId: Id, activeTab: TabId): MenuSidebar.SidebarLink {
  const { icon, title } = idToDefinition(tab);
  return {
    icon,
    text: title,
    active: activeTab === tab,
    dest: routeDest(adt('userProfile', { userId, tab }))
  };
}

export async function makeSidebarState(profileUser: User, viewerUser: User, activeTab: TabId): Promise<Immutable<MenuSidebar.State>> {
  const links = (() => {
    switch (viewerUser.type) {
      case UserType.Admin:
        if (usersAreEquivalent(profileUser, viewerUser)) {
          return [
            makeSidebarLink('profile', profileUser.id, activeTab),
            makeSidebarLink('notifications', profileUser.id, activeTab),
            makeSidebarLink('legal', profileUser.id, activeTab)
          ];
        } else {
          return [];
        }
      case UserType.Government:
        return [
          makeSidebarLink('profile', profileUser.id, activeTab),
          makeSidebarLink('notifications', profileUser.id, activeTab),
          makeSidebarLink('legal', profileUser.id, activeTab)
        ];
      case UserType.Vendor:
        return [
          makeSidebarLink('profile', profileUser.id, activeTab),
          makeSidebarLink('organizations', profileUser.id, activeTab),
          makeSidebarLink('notifications', profileUser.id, activeTab),
          makeSidebarLink('legal', profileUser.id, activeTab)
        ];
    }
  })();
  return immutable(await MenuSidebar.init({ links }));
}
