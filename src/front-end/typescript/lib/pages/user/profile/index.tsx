import { getContextualActionsValid, getMetadataValid, getModalValid, makePageMetadata, sidebarValid, updateValid, viewValid } from 'front-end/lib';
import { isSignedIn } from 'front-end/lib/access-control';
import router from 'front-end/lib/app/router';
import { SharedState } from 'front-end/lib/app/types';
import * as TabbedPage from 'front-end/lib/components/sidebar/menu/tabbed-page';
import { Immutable, immutable, PageComponent, PageInit, replaceRoute } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Tab from 'front-end/lib/pages/user/profile/tab';
import { isAdmin, isPublicSectorEmployee, User } from 'shared/lib/resources/user';
import { adt, ADT, Id } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

interface ValidState<K extends Tab.TabId> extends Tab.ParentState<K> {
  profileUser: User;
  viewerUser: User;
}

type State_<K extends Tab.TabId> = Validation<Immutable<ValidState<K>>, null>;

export type State = State_<Tab.TabId>;

export type Msg_<K extends Tab.TabId> = Tab.ParentMsg<K, ADT<'noop'>>;

export type Msg = Msg_<Tab.TabId>;

export interface RouteParams extends Pick<Tab.Params, 'invitation'> {
  userId: Id;
  tab?: Tab.TabId;
}

function makeInit<K extends Tab.TabId>(): PageInit<RouteParams, SharedState, State_<K>, Msg_<K>> {
  return isSignedIn({

    async success({ routePath, routeParams, shared, dispatch }) {
      const viewerUser = shared.sessionUser;
      const profileUserResult = await api.users.readOne(routeParams.userId);
      // If the request failed, then show the "Not Found" page.
      if (!api.isValid(profileUserResult)) {
        dispatch(replaceRoute(adt('notFound' as const, { path: routePath })));
        return invalid(null);
      }
      const profileUser = profileUserResult.value;
      const isOwner = viewerUser.id === profileUser.id;
      const viewerIsAdmin = isAdmin(viewerUser);
      // If the viewer isn't the owner or an admin, then show the "Not Found" page.
      if (!isOwner && !viewerIsAdmin) {
        dispatch(replaceRoute(adt('notFound' as const, { path: routePath })));
        return invalid(null);
      }
      // Set up the visible tab state.
      const tabId = (() => {
        if (viewerIsAdmin && !isOwner) {
          // Admins can only view the profile tab of non-owned profiles.
          return 'profile';
        } else if (routeParams.tab === 'organizations' && isOwner && isPublicSectorEmployee(viewerUser)) {
          // Public Sector Employees do not have an organizations tab.
          return 'profile';
        } else {
          // Fallback to 'profile' tab.
          return routeParams.tab || 'profile';
        }
      })();
      const tabState = immutable(await Tab.idToDefinition(tabId).component.init({
        profileUser,
        viewerUser,
        invitation: routeParams.invitation
      }));
      // Everything checks out, return valid state.
      return valid(immutable({
        viewerUser,
        profileUser,
        tab: [tabId, tabState],
        sidebar: await Tab.makeSidebarState(profileUser, viewerUser, tabId)
      })) as State_<K>;
    },

    async fail({ routeParams, dispatch, shared }) {
      if (!shared.session) {
        dispatch(replaceRoute(adt('signIn' as const, {
          redirectOnSuccess: router.routeToUrl(adt('userProfile', { userId: routeParams.userId }))
        })));
      }
      return invalid(null);
    }
  });
}

function makeComponent<K extends Tab.TabId>(): PageComponent<RouteParams, SharedState, State_<K>, Msg_<K>> {
  const idToDefinition: TabbedPage.IdToDefinitionWithState<Tab.Tabs, K, ValidState<K>> = () => Tab.idToDefinition;
  return {
    init: makeInit(),
    update: updateValid(TabbedPage.makeParentUpdate({
      extraUpdate: ({ state }) => [state],
      idToDefinition
    })),
    view: viewValid(TabbedPage.makeParentView(idToDefinition)),
    sidebar: sidebarValid(TabbedPage.makeParentSidebar()),
    getModal: getModalValid(TabbedPage.makeGetParentModal(idToDefinition)),
    getContextualActions: getContextualActionsValid(TabbedPage.makeGetParentContextualActions(idToDefinition)),
    getMetadata: getMetadataValid(TabbedPage.makeGetParentMetadata({
      idToDefinition,
      getTitleSuffix: state => state.profileUser.name
    }), makePageMetadata('User Profile'))
  };
}

export const component: PageComponent<RouteParams, SharedState, State, Msg> = makeComponent();
