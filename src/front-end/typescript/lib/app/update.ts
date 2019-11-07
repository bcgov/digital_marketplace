import { makeStartLoading, makeStopLoading, UpdateState } from 'front-end/lib';
import { Msg, Route, State } from 'front-end/lib/app/types';
import { Dispatch, Immutable, initAppChildPage, PageModal, Update, updateAppChildPage } from 'front-end/lib/framework';
import { readOneSession } from 'front-end/lib/http/api';
import * as PageAuthorCreate from 'front-end/lib/pages/author/create';
import * as PageAuthorList from 'front-end/lib/pages/author/list';
import * as PageBookCreate from 'front-end/lib/pages/book/create';
import * as PageBookList from 'front-end/lib/pages/book/list';
import * as PageGenreList from 'front-end/lib/pages/genre/list';
import * as PageLibrarianSignIn from 'front-end/lib/pages/librarian-sign-in';
import * as PageNotice from 'front-end/lib/pages/notice';
import * as PageSignOut from 'front-end/lib/pages/sign-out';
import { Session } from 'shared/lib/types';
import { ValidOrInvalid } from 'shared/lib/validators';

function setSession(state: Immutable<State>, validated: ValidOrInvalid<Session, null>): Immutable<State> {
return state.set('shared', {
  session: validated.tag === 'valid' ? validated.value : undefined
  });
};

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

    case 'bookCreate':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'bookCreate'],
        childRouteParams: route.value,
        childInit: PageBookCreate.component.init,
        childGetMetadata: PageBookCreate.component.getMetadata,
        childGetModal: PageBookCreate.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageBookCreate' as const, value };
        }
      });

    case 'bookList':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'bookList'],
        childRouteParams: route.value,
        childInit: PageBookList.component.init,
        childGetMetadata: PageBookList.component.getMetadata,
        childGetModal: PageBookList.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageBookList' as const, value };
        }
      });

    case 'genreList':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'genreList'],
        childRouteParams: route.value,
        childInit: PageGenreList.component.init,
        childGetMetadata: PageGenreList.component.getMetadata,
        childGetModal: PageGenreList.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageGenreList' as const, value };
        }
      });

    case 'authorCreate':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'authorCreate'],
        childRouteParams: route.value,
        childInit: PageAuthorCreate.component.init,
        childGetMetadata: PageAuthorCreate.component.getMetadata,
        childGetModal: PageAuthorCreate.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageAuthorCreate' as const, value };
        }
      });

    case 'authorList':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'authorList'],
        childRouteParams: route.value,
        childInit: PageAuthorList.component.init,
        childGetMetadata: PageAuthorList.component.getMetadata,
        childGetModal: PageAuthorList.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageAuthorList' as const, value };
        }
      });

    case 'librarianSignIn':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'librarianSignIn'],
        childRouteParams: route.value,
        childInit: PageLibrarianSignIn.component.init,
        childGetMetadata: PageLibrarianSignIn.component.getMetadata,
        childGetModal: PageLibrarianSignIn.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageLibrarianSignIn' as const, value };
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

    case 'pageBookCreate':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageBookCreate', value }),
        childStatePath: ['pages', 'bookCreate'],
        childUpdate: PageBookCreate.component.update,
        childGetMetadata: PageBookCreate.component.getMetadata,
        childGetModal: PageBookCreate.component.getModal,
        childMsg: msg.value
      });

    case 'pageBookList':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageBookList', value }),
        childStatePath: ['pages', 'bookList'],
        childUpdate: PageBookList.component.update,
        childGetMetadata: PageBookList.component.getMetadata,
        childGetModal: PageBookList.component.getModal,
        childMsg: msg.value
      });

    case 'pageGenreList':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageGenreList', value }),
        childStatePath: ['pages', 'genreList'],
        childUpdate: PageGenreList.component.update,
        childGetMetadata: PageGenreList.component.getMetadata,
        childGetModal: PageGenreList.component.getModal,
        childMsg: msg.value
      });

    case 'pageAuthorCreate':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageAuthorCreate', value }),
        childStatePath: ['pages', 'authorCreate'],
        childUpdate: PageAuthorCreate.component.update,
        childGetMetadata: PageAuthorCreate.component.getMetadata,
        childGetModal: PageAuthorCreate.component.getModal,
        childMsg: msg.value
      });

    case 'pageAuthorList':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageAuthorList', value }),
        childStatePath: ['pages', 'authorList'],
        childUpdate: PageAuthorList.component.update,
        childGetMetadata: PageAuthorList.component.getMetadata,
        childGetModal: PageAuthorList.component.getModal,
        childMsg: msg.value
      });

    case 'pageLibrarianSignIn':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageLibrarianSignIn', value }),
        childStatePath: ['pages', 'librarianSignIn'],
        childUpdate: PageLibrarianSignIn.component.update,
        childGetMetadata: PageLibrarianSignIn.component.getMetadata,
        childGetModal: PageLibrarianSignIn.component.getModal,
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
