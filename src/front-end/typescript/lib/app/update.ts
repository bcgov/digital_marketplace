import { makeStartLoading, makeStopLoading, UpdateState } from 'front-end/lib';
import { Msg, Route, State } from 'front-end/lib/app/types';
import { Dispatch, Immutable, initAppChildPage, PageModal, Update, updateAppChildPage } from 'front-end/lib/framework';
import { readOneSession } from 'front-end/lib/http/api';
import * as PageListSidebar from 'front-end/lib/pages/list-sidebar';
import * as PageHello from 'front-end/lib/pages/hello';
import * as PageNotice from 'front-end/lib/pages/notice';
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

    case 'list-sidebar':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'hello'],
        childRouteParams: route.value,
        childInit: PageListSidebar.component.init,
        childGetMetadata: PageListSidebar.component.getMetadata,
        childGetModal: PageListSidebar.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageListSidebar' as const, value };
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

    case 'pageListSidebar':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageListSidebar', value }),
        childStatePath: ['pages', 'notice'],
        childUpdate: PageListSidebar.component.update,
        childGetMetadata: PageListSidebar.component.getMetadata,
        childGetModal: PageListSidebar.component.getModal,
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
