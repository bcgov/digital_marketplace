import { getModalValid, makePageMetadata, updateValid, viewValid, withValid } from 'front-end/lib';
import { isSignedIn } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as MenuSidebar from 'front-end/lib/components/sidebar/menu';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, mapPageModalMsg, PageComponent, PageInit, replaceRoute, Update, updateComponentChild, updateGlobalComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Tab from 'front-end/lib/pages/user/profile/tab';
import * as LegalTab from 'front-end/lib/pages/user/profile/tab/legal';
import * as NotificationsTab from 'front-end/lib/pages/user/profile/tab/notifications';
import * as OrganizationsTab from 'front-end/lib/pages/user/profile/tab/organizations';
import * as ProfileTab from 'front-end/lib/pages/user/profile/tab/profile';
import { AvailableIcons } from 'front-end/lib/views/icon';
import { routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { isAdmin, User, usersAreEquivalent, UserType } from 'shared/lib/resources/user';
import { adt, ADT, Id } from 'shared/lib/types';
import { invalid, isValid, valid, Validation } from 'shared/lib/validation';

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

type TabId = keyof Tabs;

type TabState<K extends TabId> = [K, Immutable<Tabs[K]['state']>];

type TabMsg<K extends TabId> = GlobalComponentMsg<Tabs[K]['innerMsg'], Route>;

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

function tabIdToTabDefinition<K extends TabId>(id: K): TabDefinition<K> {
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

function makeSidebarLink(tab: TabId, userId: Id, activeTab: TabId): MenuSidebar.SidebarLink {
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

interface ValidState<K extends TabId> {
  profileUser: User;
  viewerUser: User;
  tab: TabState<K>;
  sidebar: Immutable<MenuSidebar.State>;
}

type State_<K extends TabId> = Validation<Immutable<ValidState<K>>, null>;

export type State = State_<TabId>;

type InnerMsg<K extends TabId>
  = ADT<'tab', TabMsg<K>>
  | ADT<'sidebar', MenuSidebar.Msg>;

type Msg_<K extends TabId> = GlobalComponentMsg<InnerMsg<K>, Route>;

export type Msg = Msg_<TabId>;

export interface RouteParams {
  userId: string;
  tab?: TabId;
}

function makeInit<K extends TabId>(): PageInit<RouteParams, SharedState, State_<K>, Msg_<K>> {
  return isSignedIn({

    async success({ routeParams, shared, dispatch }) {
      const viewerUser = shared.sessionUser;
      const profileUserResult = await api.users.readOne(routeParams.userId);
      // If the request failed, then show the "Not Found" page.
      if (!api.isValid(profileUserResult)) {
        dispatch(replaceRoute(adt('notice' as const, adt('notFound' as const))));
        return invalid(null);
      }
      const profileUser = profileUserResult.value;
      const isOwner = viewerUser.id === profileUser.id;
      const viewerIsAdmin = isAdmin(viewerUser);
      // If the viewer isn't the owner or an admin, then show the "Not Found" page.
      if (!isOwner && !viewerIsAdmin) {
        dispatch(replaceRoute(adt('notice' as const, adt('notFound' as const))));
        return invalid(null);
      }
      // Set up the visible tab state.
      // Admins can only view the profile tab of non-owned profiles.
      const tabId = viewerIsAdmin && !isOwner
        ? 'profile'
        : (routeParams.tab || 'profile');
      const tabState = immutable(await tabIdToTabDefinition(tabId).component.init({ profileUser, viewerUser }));
      // Everything checks out, return valid state.
      return valid(immutable({
        viewerUser,
        profileUser,
        tab: [tabId, tabState],
        sidebar: await makeSidebar(profileUser, viewerUser, tabId)
      }));
    },

    async fail({ dispatch }) {
      // Viewer isn't signed in, so show "Not Found" page.
      dispatch(replaceRoute(adt('notice' as const, adt('notFound' as const))));
      return invalid(null);
    }

  });
}

function makeUpdate<K extends TabId>(): Update<State_<K>, Msg_<K>> {
  return updateValid(({ state, msg }) => {
    switch (msg.tag) {
      case 'tab':
        const tabId = state.tab[0];
        const definition = tabIdToTabDefinition(tabId);
        return updateGlobalComponentChild({
          state,
          childStatePath: ['tab', '1'],
          childUpdate: definition.component.update,
          childMsg: msg.value,
          mapChildMsg: value => adt('tab' as const, value as TabMsg<K>)
        });
      case 'sidebar':
        return updateComponentChild({
          state,
          childStatePath: ['sidebar'],
          childUpdate: MenuSidebar.update,
          childMsg: msg.value,
          mapChildMsg: value => adt('sidebar', value)
        });
      default:
        return [state];
    }
  });
}

function makeView<K extends TabId>(): ComponentView<State_<K>, Msg_<K>> {
  return viewValid(({ state, dispatch }) => {
    const [tabId, tabState] = state.tab;
    const definition = tabIdToTabDefinition(tabId);
    return (
      <definition.component.view
        dispatch={mapComponentDispatch(dispatch, v => adt('tab' as const, v))}
        state={tabState} />
    );
  });
}

function makeComponent<K extends TabId>(): PageComponent<RouteParams, SharedState, State_<K>, Msg_<K>> {
  return {
    init: makeInit(),
    update: makeUpdate(),
    view: makeView(),
    sidebar: {
      size: 'medium',
      color: 'light',
      isEmptyOnMobile: withValid(state => {
        return !state.sidebar.links.length;
      }, false),
      view: viewValid(({ state, dispatch }) => {
        return (<MenuSidebar.view
          state={state.sidebar}
          dispatch={mapComponentDispatch(dispatch, msg => adt('sidebar' as const, msg))} />);
      })
    },
    getModal: getModalValid(state => {
      const tabId = state.tab[0];
      const definition = tabIdToTabDefinition(tabId);
      if (!definition.component.getModal) { return null; }
      return mapPageModalMsg(
        definition.component.getModal(state.tab[1]),
        v => adt('tab', v)
      );
    }),
    //TODO getAlerts
    getMetadata(state) {
      if (isValid(state)) {
        return makePageMetadata(`${tabIdToTabDefinition(state.value.tab[0]).title} — ${state.value.profileUser.name}`);
      } else {
        return makePageMetadata('Profile');
      }
    }
  };
}

export const component: PageComponent<RouteParams, SharedState, State, Msg> = makeComponent();
