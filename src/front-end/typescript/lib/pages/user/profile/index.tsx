import { makePageMetadata, updateValid, viewValid } from 'front-end/lib';
import { isSignedIn } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as MenuSidebar from 'front-end/lib/components/sidebar/menu';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, PageComponent, PageInit, replaceRoute, Update, updateComponentChild, updateGlobalComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Tab from 'front-end/lib/pages/user/profile/tab';
import * as ProfileTab from 'front-end/lib/pages/user/profile/tab/profile';
import { AvailableIcons } from 'front-end/lib/views/icon';
import { routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { isAdmin, User, usersAreEquivalent, UserType } from 'shared/lib/resources/user';
import { adt, ADT, Id } from 'shared/lib/types';
import { invalid, isValid, valid, Validation } from 'shared/lib/validation';

type TabState
  = ADT<'profile', Immutable<ProfileTab.State>>
  | ADT<'notifications', Immutable<ProfileTab.State>>
  | ADT<'legal', Immutable<ProfileTab.State>>
  | ADT<'organizations', Immutable<ProfileTab.State>>;

type TabMsg
  = ADT<'profile', ProfileTab.Msg>
  | ADT<'notifications', ProfileTab.Msg>
  | ADT<'legal', ProfileTab.Msg>
  | ADT<'organizations', ProfileTab.Msg>;

type TabId = 'profile' | 'notifications' | 'legal' | 'organizations';

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

function tabIdToTitleCase(id: TabId): string {
  switch (id) {
    case 'profile': return 'Profile';
    case 'notifications': return 'Notifications';
    case 'legal': return 'Accepted Agreements';
    case 'organizations': return 'Organizations';
  }
}

async function tabIdToTabState(id: TabId, params: Tab.Params): Promise<TabState> {
  switch (id) {
    case 'profile':
      return adt('profile', immutable(await ProfileTab.component.init(params)));
    case 'notifications':
      return adt('profile', immutable(await ProfileTab.component.init(params)));
    case 'legal':
      return adt('profile', immutable(await ProfileTab.component.init(params)));
    case 'organizations':
      return adt('profile', immutable(await ProfileTab.component.init(params)));
  }
}

function tabIdToIcon(tab: TabId): AvailableIcons {
  switch (tab) {
    case 'profile': return 'user';
    case 'notifications': return 'bell';
    case 'legal': return 'balance-scale';
    case 'organizations': return 'building';
  }
}

function makeSidebarLink(tab: TabId, userId: Id, activeTab: TabId): MenuSidebar.SidebarLink {
  return {
    icon: tabIdToIcon(tab),
    text: tabIdToTitleCase(tab),
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

interface ValidState {
  profileUser: User;
  viewerUser: User;
  tab: TabState;
  sidebar: Immutable<MenuSidebar.State>;
}

export type State = Validation<Immutable<ValidState>, null>;

type InnerMsg
  = ADT<'tab', TabMsg>
  | ADT<'sidebar', MenuSidebar.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export interface RouteParams {
  userId: string;
  tab?: TabId;
}

const init: PageInit<RouteParams, SharedState, State, Msg> = isSignedIn({

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
    const tab = await tabIdToTabState(routeParams.tab || 'profile', { profileUser, viewerUser });
    // Everything checks out, return valid state.
    return valid(immutable({
      viewerUser,
      profileUser,
      tab,
      sidebar: await makeSidebar(profileUser, viewerUser, tab.tag)
    }));
  },

  async fail({ dispatch }) {
    // Viewer isn't signed in, so show "Not Found" page.
    dispatch(replaceRoute(adt('notice' as const, adt('notFound' as const))));
    return invalid(null);
  }

});

const update: Update<State, Msg> = updateValid(({ state, msg }) => {
  switch (msg.tag) {
    case 'tab':
      return (() => {
        switch (state.tab.tag) {
          case 'profile':
            return updateGlobalComponentChild({
              state,
              childStatePath: ['tab', 'value'],
              childUpdate: ProfileTab.component.update,
              childMsg: msg.value.value,
              mapChildMsg: value => adt('tab' as const, adt('profile' as const, value))
            });
          case 'notifications':
            return updateGlobalComponentChild({
              state,
              childStatePath: ['tab', 'value'],
              childUpdate: ProfileTab.component.update,
              childMsg: msg.value.value,
              mapChildMsg: value => adt('tab' as const, adt('notifications' as const, value))
            });
          case 'legal':
            return updateGlobalComponentChild({
              state,
              childStatePath: ['tab', 'value'],
              childUpdate: ProfileTab.component.update,
              childMsg: msg.value.value,
              mapChildMsg: value => adt('tab' as const, adt('legal' as const, value))
            });
          case 'organizations':
            return updateGlobalComponentChild({
              state,
              childStatePath: ['tab', 'value'],
              childUpdate: ProfileTab.component.update,
              childMsg: msg.value.value,
              mapChildMsg: value => adt('tab' as const, adt('organizations' as const, value))
            });
        }
      })();
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

const ViewTab: ComponentView<ValidState, Msg> = ({ state, dispatch }) => {
  const tab = state.tab;
  switch (tab.tag) {
    case 'profile':
      return (<ProfileTab.component.view
        state={tab.value}
        dispatch={mapComponentDispatch(dispatch, v => adt('tab' as const, adt('profile' as const, v)))} />);
    case 'notifications':
      return (<ProfileTab.component.view
        state={tab.value}
        dispatch={mapComponentDispatch(dispatch, v => adt('tab' as const, adt('notifications' as const, v)))} />);
    case 'legal':
      return (<ProfileTab.component.view
        state={tab.value}
        dispatch={mapComponentDispatch(dispatch, v => adt('tab' as const, adt('legal' as const, v)))} />);
    case 'organizations':
      return (<ProfileTab.component.view
        state={tab.value}
        dispatch={mapComponentDispatch(dispatch, v => adt('tab' as const, adt('organizations' as const, v)))} />);
  }
};

const view: ComponentView<State, Msg> = viewValid(props => (<ViewTab {...props} />));

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  sidebar: {
    size: 'medium',
    color: 'light',
    isEmpty(state) {
      if (state.tag !== 'valid') { return false; }
      return !state.value.sidebar.links.length;
    },
    view: viewValid(({ state, dispatch }) => {
      return (<MenuSidebar.view
        state={state.sidebar}
        dispatch={mapComponentDispatch(dispatch, msg => adt('sidebar' as const, msg))} />);
    })
  },
  //TODO getModal
  //TODO getAlerts
  getMetadata(state) {
    if (isValid(state)) {
      return makePageMetadata(`${tabIdToTitleCase(state.value.tab.tag)} — ${state.value.profileUser.name}`);
    } else {
      return makePageMetadata('Profile');
    }
  }
};
