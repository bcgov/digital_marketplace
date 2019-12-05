import { makeStartLoading, makeStopLoading, UpdateState } from 'front-end/lib';
import { Msg, Route, State } from 'front-end/lib/app/types';
import { Dispatch, Immutable, initAppChildPage, PageModal, Update, updateAppChildPage } from 'front-end/lib/framework';
import { readOneSession } from 'front-end/lib/http/api';
// Note(Jesse): @add_new_page_location
import * as PageOrgEdit from 'front-end/lib/pages/org/edit';
import * as PageOrgView from 'front-end/lib/pages/org/view';
import * as PageUserEdit from 'front-end/lib/pages/user/edit';
import * as PageUserView from 'front-end/lib/pages/user/view';
import * as PageUserList from 'front-end/lib/pages/user/list';
import * as PageHello from 'front-end/lib/pages/hello';
import * as PageNotice from 'front-end/lib/pages/notice';
import * as PageSignIn from 'front-end/lib/pages/sign-in';
import * as PageSignOut from 'front-end/lib/pages/sign-out';
import { Session } from 'shared/lib/resources/session';
import { Validation } from 'shared/lib/validation';

function setSession(state: Immutable<State>, validated: Validation<Session, null>): Immutable<State> {
return state.set('shared', {
  session: validated.tag === 'valid' ? validated.value : undefined
  });
}

const startTransition: UpdateState<State> = makeStartLoading('transitionLoading');
const stopTransition: UpdateState<State> = makeStopLoading('transitionLoading');

async function initPage(state: Immutable<State>, dispatch: Dispatch<Msg>, route: Route): Promise<Immutable<State>> {
  const defaultPageInitParams = {
    state,
    dispatch,
    getSharedState(state: Immutable<State>) {
      return state.shared;
    },
    setModal(state: Immutable<State>, modal: PageModal<Msg>) {
      state = state.setIn(['modal', 'open'], !!modal);
      return modal
        ? state.setIn(['modal', 'content'], modal)
        : state;
    }
  };

  switch (route.tag) {

    // Note(Jesse): @add_new_page_location

    case 'orgEdit':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'orgEdit'],
        childRouteParams: route.value,
        childInit: PageOrgEdit.component.init,
        childGetMetadata: PageOrgEdit.component.getMetadata,
        childGetModal: PageOrgEdit.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageOrgEdit' as const, value };
        }
      });

    case 'orgView':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'orgView'],
        childRouteParams: route.value,
        childInit: PageOrgView.component.init,
        childGetMetadata: PageOrgView.component.getMetadata,
        childGetModal: PageOrgView.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageOrgView' as const, value };
        }
      });


    case 'userEdit':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'userEdit'],
        childRouteParams: route.value,
        childInit: PageUserEdit.component.init,
        childGetMetadata: PageUserEdit.component.getMetadata,
        childGetModal: PageUserEdit.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageUserEdit' as const, value };
        }
      });

    case 'userView':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'userView'],
        childRouteParams: route.value,
        childInit: PageUserView.component.init,
        childGetMetadata: PageUserView.component.getMetadata,
        childGetModal: PageUserView.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageUserView' as const, value };
        }
      });

    case 'userList':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'userList'],
        childRouteParams: route.value,
        childInit: PageUserList.component.init,
        childGetMetadata: PageUserList.component.getMetadata,
        childGetModal: PageUserList.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageUserList' as const, value };
        }
      });

    case 'hello':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'hello'],
        childRouteParams: route.value,
        childInit: PageHello.component.init,
        childGetMetadata: PageHello.component.getMetadata,
        childGetModal: PageHello.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageHello' as const, value };
        }
      });

    case 'signIn':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'signIn'],
        childRouteParams: route.value,
        childInit: PageSignIn.component.init,
        childGetMetadata: PageSignIn.component.getMetadata,
        childGetModal: PageSignIn.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageSignIn' as const, value };
        }
      });


    case 'signOut':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'signOut'],
        childRouteParams: route.value,
        childInit: PageSignOut.component.init,
        childGetMetadata: PageSignOut.component.getMetadata,
        childGetModal: PageSignOut.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageSignOut' as const, value };
        }
      });

    case 'notice':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'notice'],
        childRouteParams: route.value,
        childInit: PageNotice.component.init,
        childGetMetadata: PageNotice.component.getMetadata,
        childGetModal: PageNotice.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageNotice' as const, value };
        }
      });
  }
}

const update: Update<State, Msg> = ({ state, msg }) => {
  const defaultPageUpdateParams = {
    state,
    setModal(state: Immutable<State>, modal: PageModal<Msg>) {
      state = state.setIn(['modal', 'open'], !!modal);
      return modal
        ? state.setIn(['modal', 'content'], modal)
        : state;
    }
  };

  switch (msg.tag) {

    case 'noop':
      return [state];

    case '@incomingRoute':
      const incomingRoute: Route = msg.value;
      return [
        startTransition(state),
        async (state, dispatch) => {
          state = stopTransition(state);
          // Unset the previous page's state.
          state = state.setIn(['pages', state.activeRoute.tag], undefined);
          // Refresh the front-end's view of the current session.
          state = setSession(state, await readOneSession());
          state = state
            .set('activeRoute', incomingRoute)
            // We switch this flag to true so the view function knows to display the page.
            .set('ready', true);
          // Set the new active page's state.
          state = await initPage(state, dispatch, incomingRoute);
          // Refresh the front-end's view of the current session again
          // if the user has been signed out.
          if (incomingRoute.tag === 'signOut') {
            state = setSession(state, await readOneSession());
          }
          const html = document.documentElement;
          if (html.scrollTo) { html.scrollTo(0, 0); }
          return state;
        }
      ];

    case 'toggleIsNavOpen':
      return [state.set('isNavOpen', msg.value === undefined ? !state.isNavOpen : msg.value)];

    case 'closeModal':
      return [
        state,
        async (state, dispatch) => {
          // Trigger the modal's onCloseMsg to ensure state is "clean"
          // in case the user closes the modal using the "Esc" key,
          // "X" icon or by clicking the page backdrop.
          const [newState, asyncState] = update({ state, msg: state.modal.content.onCloseMsg });
          state = asyncState
            ? await asyncState(newState, dispatch) || newState
            : newState;
          return state.setIn(['modal', 'open'], false);
        }
      ];

    // Note(Jesse): @add_new_page_location

    case 'pageOrgEdit':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageOrgEdit', value }),
        childStatePath: ['pages', 'orgEdit'],
        childUpdate: PageOrgEdit.component.update,
        childGetMetadata: PageOrgEdit.component.getMetadata,
        childGetModal: PageOrgEdit.component.getModal,
        childMsg: msg.value
      });

    case 'pageOrgView':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageOrgView', value }),
        childStatePath: ['pages', 'orgView'],
        childUpdate: PageOrgView.component.update,
        childGetMetadata: PageOrgView.component.getMetadata,
        childGetModal: PageOrgView.component.getModal,
        childMsg: msg.value
      });

    case 'pageUserEdit':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageUserEdit', value }),
        childStatePath: ['pages', 'userEdit'],
        childUpdate: PageUserEdit.component.update,
        childGetMetadata: PageUserEdit.component.getMetadata,
        childGetModal: PageUserEdit.component.getModal,
        childMsg: msg.value
      });

    case 'pageUserView':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageUserView', value }),
        childStatePath: ['pages', 'userView'],
        childUpdate: PageUserView.component.update,
        childGetMetadata: PageUserView.component.getMetadata,
        childGetModal: PageUserView.component.getModal,
        childMsg: msg.value
      });

    case 'pageUserList':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageUserList', value }),
        childStatePath: ['pages', 'userList'],
        childUpdate: PageUserList.component.update,
        childGetMetadata: PageUserList.component.getMetadata,
        childGetModal: PageUserList.component.getModal,
        childMsg: msg.value
      });

    case 'pageSignOut':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageSignOut', value }),
        childStatePath: ['pages', 'signOut'],
        childUpdate: PageSignOut.component.update,
        childGetMetadata: PageSignOut.component.getMetadata,
        childGetModal: PageSignOut.component.getModal,
        childMsg: msg.value
      });

    case 'pageSignIn':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageSignIn', value }),
        childStatePath: ['pages', 'signIn'],
        childUpdate: PageSignOut.component.update,
        childGetMetadata: PageSignOut.component.getMetadata,
        childGetModal: PageSignOut.component.getModal,
        childMsg: msg.value
      });

    case 'pageHello':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageHello', value }),
        childStatePath: ['pages', 'hello'],
        childUpdate: PageHello.component.update,
        childGetMetadata: PageHello.component.getMetadata,
        childGetModal: PageHello.component.getModal,
        childMsg: msg.value
      });

    case 'pageNotice':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageNotice', value }),
        childStatePath: ['pages', 'notice'],
        childUpdate: PageNotice.component.update,
        childGetMetadata: PageNotice.component.getMetadata,
        childGetModal: PageNotice.component.getModal,
        childMsg: msg.value
      });

    // Handle these framework Msgs so we get compile-time guarantees
    // that all of our possible Msgs have been handled.
    case '@newUrl':
    case '@replaceUrl':
    case '@newRoute':
    case '@replaceRoute':
      return [state];
  }
};

export default update;
