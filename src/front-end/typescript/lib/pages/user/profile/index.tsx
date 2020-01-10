import { getModalValid, makePageMetadata, updateValid, viewValid, withValid } from 'front-end/lib';
import { isSignedIn } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as MenuSidebar from 'front-end/lib/components/sidebar/menu';
import * as UserSidebar from 'front-end/lib/components/sidebar/profile-org';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, mapPageModalMsg, PageComponent, PageInit, replaceRoute, Update, updateComponentChild, updateGlobalComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import React from 'react';
import { isAdmin, User } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';
import { invalid, isValid, valid, Validation } from 'shared/lib/validation';

interface ValidState<K extends UserSidebar.TabId> {
  profileUser: User;
  viewerUser: User;
  tab: UserSidebar.TabState<K>;
  sidebar: Immutable<MenuSidebar.State>;
}

type State_<K extends UserSidebar.TabId> = Validation<Immutable<ValidState<K>>, null>;

export type State = State_<UserSidebar.TabId>;

type InnerMsg<K extends UserSidebar.TabId>
  = ADT<'tab', UserSidebar.TabMsg<K>>
  | ADT<'sidebar', MenuSidebar.Msg>;

type Msg_<K extends UserSidebar.TabId> = GlobalComponentMsg<InnerMsg<K>, Route>;

export type Msg = Msg_<UserSidebar.TabId>;

export interface RouteParams {
  userId: string;
  tab?: UserSidebar.TabId;
}

function makeInit<K extends UserSidebar.TabId>(): PageInit<RouteParams, SharedState, State_<K>, Msg_<K>> {
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
      const tabState = immutable(await UserSidebar.tabIdToTabDefinition(tabId).component.init({ profileUser, viewerUser }));
      // Everything checks out, return valid state.
      return valid(immutable({
        viewerUser,
        profileUser,
        tab: [tabId, tabState],
        sidebar: await UserSidebar.makeSidebar(profileUser, viewerUser, tabId)
      }));
    },

    async fail({ dispatch }) {
      // Viewer isn't signed in, so show "Not Found" page.
      dispatch(replaceRoute(adt('notice' as const, adt('notFound' as const))));
      return invalid(null);
    }

  });
}

function makeUpdate<K extends UserSidebar.TabId>(): Update<State_<K>, Msg_<K>> {
  return updateValid(({ state, msg }) => {
    switch (msg.tag) {
      case 'tab':
        const tabId = state.tab[0];
        const definition = UserSidebar.tabIdToTabDefinition(tabId);
        return updateGlobalComponentChild({
          state,
          childStatePath: ['tab', '1'],
          childUpdate: definition.component.update,
          childMsg: msg.value,
          mapChildMsg: value => adt('tab' as const, value as UserSidebar.TabMsg<K>)
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

function makeView<K extends UserSidebar.TabId>(): ComponentView<State_<K>, Msg_<K>> {
  return viewValid(({ state, dispatch }) => {
    const [tabId, tabState] = state.tab;
    const definition = UserSidebar.tabIdToTabDefinition(tabId);
    return (
      <definition.component.view
        dispatch={mapComponentDispatch(dispatch, v => adt('tab' as const, v))}
        state={tabState} />
    );
  });
}

function makeComponent<K extends UserSidebar.TabId>(): PageComponent<RouteParams, SharedState, State_<K>, Msg_<K>> {
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
      const definition = UserSidebar.tabIdToTabDefinition(tabId);
      if (!definition.component.getModal) { return null; }
      return mapPageModalMsg(
        definition.component.getModal(state.tab[1]),
        v => adt('tab', v)
      );
    }),
    //TODO getAlerts
    getMetadata(state) {
      if (isValid(state)) {
        return makePageMetadata(`${UserSidebar.tabIdToTabDefinition(state.value.tab[0]).title} — ${state.value.profileUser.name}`);
      } else {
        return makePageMetadata('Profile');
      }
    }
  };
}

export const component: PageComponent<RouteParams, SharedState, State, Msg> = makeComponent();
