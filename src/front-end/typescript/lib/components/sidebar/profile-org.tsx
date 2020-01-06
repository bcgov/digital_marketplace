import * as Tab from 'front-end/lib/pages/user/profile/tab';
import { AvailableIcons } from 'front-end/lib/views/icon';
import { routeDest } from 'front-end/lib/views/link';
import { User, usersAreEquivalent, UserType } from 'shared/lib/resources/user';
import * as MenuSidebar from 'front-end/lib/components/sidebar/menu';
import { adt, Id } from 'shared/lib/types';
import * as LegalTab from 'front-end/lib/pages/user/profile/tab/legal';
import { Route } from 'front-end/lib/app/types';
import { GlobalComponentMsg, Immutable, immutable } from 'front-end/lib/framework';
import * as NotificationsTab from 'front-end/lib/pages/user/profile/tab/notifications';
import * as OrganizationsTab from 'front-end/lib/pages/user/profile/tab/organizations';
import * as ProfileTab from 'front-end/lib/pages/user/profile/tab/profile';

interface Tab<State, InnerMsg> {
  state: State;
  innerMsg: InnerMsg;
}

interface Tabs {
  profile: Tab<ProfileTab.State, ProfileTab.InnerMsg>;
  notifications: Tab<NotificationsTab.State, NotificationsTab.InnerMsg>;
  legal: Tab<LegalTab.State, LegalTab.InnerMsg>;
  organizations: Tab<OrganizationsTab.State, OrganizationsTab.InnerMsg>;
}

export type TabId = keyof Tabs;

export type TabState<K extends TabId> = [K, Immutable<Tabs[K]['state']>];

export type TabMsg<K extends TabId> = GlobalComponentMsg<Tabs[K]['innerMsg'], Route>;

export function parseTabId(raw: any): TabId | undefined {
  switch (raw) {
    case 'profile':
    case 'notifications':
    case 'legal':
    case 'organizations':
      return raw;
    default:
      return undefined;
  }
}

interface TabDefinition<K extends TabId> {
  component: Tab.Component<Tabs[K]['state'], GlobalComponentMsg<Tabs[K]['innerMsg'], Route>>;
  icon: AvailableIcons;
  title: string;
}

export function tabIdToTabDefinition<K extends TabId>(id: K): TabDefinition<K> {
  switch (id) {
    case 'notifications':
      return {
        component: NotificationsTab.component,
        icon: 'bell',
        title: 'Notifications'
      } as TabDefinition<K>;
    case 'legal':
      return {
        component: LegalTab.component,
        icon: 'balance-scale',
        title: 'Accepted Policies, Terms & Agreements'
      } as TabDefinition<K>;
    case 'organizations':
      return {
        component: OrganizationsTab.component,
        icon: 'building',
        title: 'Organizations'
      } as TabDefinition<K>;
    case 'profile':
    default:
      return {
        component: ProfileTab.component,
        icon: 'user',
        title: 'Profile'
      } as TabDefinition<K>;
  }
}

export function makeSidebarLink(tab: TabId, userId: Id, activeTab: TabId): MenuSidebar.SidebarLink {
  const definition = tabIdToTabDefinition(tab);
  return {
    icon: definition.icon,
    text: definition.title,
    active: activeTab === tab,
    dest: routeDest(adt('userProfile', { userId, tab }))
  };
}

export async function makeSidebar(profileUser: User, viewerUser: User, activeTab: TabId): Promise<Immutable<MenuSidebar.State>> {
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

