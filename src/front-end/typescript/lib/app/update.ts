import { makeStartLoading, makeStopLoading } from 'front-end/lib';
import { isAllowedRouteForUsersWithUnacceptedTerms, Msg, Route, State } from 'front-end/lib/app/types';
import * as Nav from 'front-end/lib/app/view/nav';
import { Dispatch, Immutable, initAppChildPage, newRoute, PageModal, Update, updateAppChildPage, updateComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as PageContent from 'front-end/lib/pages/content';
import * as PageLanding from 'front-end/lib/pages/landing';
import * as PageNotice from 'front-end/lib/pages/notice';
import * as PageOpportunities from 'front-end/lib/pages/opportunities';
import * as PageOrgCreate from 'front-end/lib/pages/organization/create';
import * as PageOrgEdit from 'front-end/lib/pages/organization/edit';
import * as PageOrgList from 'front-end/lib/pages/organization/list';
import * as PageSignIn from 'front-end/lib/pages/sign-in';
import * as PageSignOut from 'front-end/lib/pages/sign-out';
import * as PageSignUpStepOne from 'front-end/lib/pages/sign-up/step-one';
import * as PageSignUpStepTwo from 'front-end/lib/pages/sign-up/step-two';
import * as PageUserList from 'front-end/lib/pages/user/list';
import * as PageUserProfile from 'front-end/lib/pages/user/profile';
import { CURRENT_SESSION_ID, hasAcceptedTermsOrIsAnonymous, Session } from 'shared/lib/resources/session';
import { adt, ADT, adtCurried } from 'shared/lib/types';

function setSession(state: Immutable<State>, validated: api.ResponseValidation<Session, string[]>): Immutable<State> {
return state.set('shared', {
  session: validated.tag === 'valid' ? validated.value : undefined
  });
}

const startTransition = makeStartLoading<State>('transitionLoading');
const stopTransition = makeStopLoading<State>('transitionLoading');

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

    case 'orgCreate':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'orgCreate'],
        childRouteParams: route.value,
        childInit: PageOrgCreate.component.init,
        childGetMetadata: PageOrgCreate.component.getMetadata,
        childGetModal: PageOrgCreate.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageOrgCreate' as const, value };
        }
      });

    case 'orgList':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'orgList'],
        childRouteParams: route.value,
        childInit: PageOrgList.component.init,
        childGetMetadata: PageOrgList.component.getMetadata,
        childGetModal: PageOrgList.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageOrgList' as const, value };
        }
      });

    case 'userProfile':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'userProfile'],
        childRouteParams: route.value,
        childInit: PageUserProfile.component.init,
        childGetMetadata: PageUserProfile.component.getMetadata,
        childGetModal: PageUserProfile.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageUserProfile' as const, value };
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

    case 'landing':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'landing'],
        childRouteParams: route.value,
        childInit: PageLanding.component.init,
        childGetMetadata: PageLanding.component.getMetadata,
        childGetModal: PageLanding.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageLanding' as const, value };
        }
      });

    case 'opportunities':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'opportunities'],
        childRouteParams: route.value,
        childInit: PageOpportunities.component.init,
        childGetMetadata: PageOpportunities.component.getMetadata,
        childGetModal: PageOpportunities.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageOpportunities' as const, value };
        }
      });

    case 'content':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'content'],
        childRouteParams: route.value,
        childInit: PageContent.component.init,
        childGetMetadata: PageContent.component.getMetadata,
        childGetModal: PageContent.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageContent' as const, value };
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

    case 'signUpStepOne':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'signUpStepOne'],
        childRouteParams: route.value,
        childInit: PageSignUpStepOne.component.init,
        childGetMetadata: PageSignUpStepOne.component.getMetadata,
        childGetModal: PageSignUpStepOne.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageSignUpStepOne' as const, value };
        }
      });

    case 'signUpStepTwo':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'signUpStepTwo'],
        childRouteParams: route.value,
        childInit: PageSignUpStepTwo.component.init,
        childGetMetadata: PageSignUpStepTwo.component.getMetadata,
        childGetModal: PageSignUpStepTwo.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageSignUpStepTwo' as const, value };
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

  console.log(msg);
  switch (msg.tag) {

    case 'noop':
      return [state];

    case '@incomingRoute':
      const incomingRoute: Route = msg.value;
      return [
        startTransition(state),
        async (state, dispatch) => {
          state = stopTransition(state);
          // Refresh the front-end's view of the current session.
          state = setSession(state, await api.sessions.readOne(CURRENT_SESSION_ID));
          // Override the incoming route if the user has not accepted terms.
          if (!hasAcceptedTermsOrIsAnonymous(state.shared.session) && !isAllowedRouteForUsersWithUnacceptedTerms(incomingRoute)) {
            dispatch(newRoute(adt('signUpStepTwo' as const, null)));
            return state;
          }
          // Unset the previous page's state.
          state = state.setIn(['pages', state.activeRoute.tag], undefined);
          state = state
            .set('activeRoute', incomingRoute)
            // We switch this flag to true so the view function knows to display the page.
            .set('ready', true);
          // Set the new active pages' state.
          state = await initPage(state, dispatch, incomingRoute);
          // Refresh the front-end's view of the current session again
          // if the user has been signed out.
          if (incomingRoute.tag === 'signOut') {
            state = setSession(state, await api.sessions.readOne(CURRENT_SESSION_ID));
          }
          const html = document.documentElement;
          if (html.scrollTo) { html.scrollTo(0, 0); }
          return state;
        }
      ];

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

    case 'nav':
      return updateComponentChild({
        state,
        childStatePath: ['nav'],
        childUpdate: Nav.update,
        childMsg: msg.value,
        mapChildMsg: adtCurried<ADT<'nav', Nav.Msg>>('nav')
      });

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

    case 'pageOrgCreate':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageOrgCreate', value }),
        childStatePath: ['pages', 'orgCreate'],
        childUpdate: PageOrgCreate.component.update,
        childGetMetadata: PageOrgCreate.component.getMetadata,
        childGetModal: PageOrgCreate.component.getModal,
        childMsg: msg.value
      });

    case 'pageOrgList':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageOrgList', value }),
        childStatePath: ['pages', 'orgList'],
        childUpdate: PageOrgList.component.update,
        childGetMetadata: PageOrgList.component.getMetadata,
        childGetModal: PageOrgList.component.getModal,
        childMsg: msg.value
      });

    case 'pageUserProfile':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageUserProfile', value }),
        childStatePath: ['pages', 'userProfile'],
        childUpdate: PageUserProfile.component.update,
        childGetMetadata: PageUserProfile.component.getMetadata,
        childGetModal: PageUserProfile.component.getModal,
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

    case 'pageSignUpStepOne':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageSignUpStepOne', value }),
        childStatePath: ['pages', 'signUpStepOne'],
        childUpdate: PageSignUpStepOne.component.update,
        childGetMetadata: PageSignUpStepOne.component.getMetadata,
        childGetModal: PageSignUpStepOne.component.getModal,
        childMsg: msg.value
      });

    case 'pageSignUpStepTwo':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageSignUpStepTwo', value }),
        childStatePath: ['pages', 'signUpStepTwo'],
        childUpdate: PageSignUpStepTwo.component.update,
        childGetMetadata: PageSignUpStepTwo.component.getMetadata,
        childGetModal: PageSignUpStepTwo.component.getModal,
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

    case 'pageLanding':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageLanding', value }),
        childStatePath: ['pages', 'landing'],
        childUpdate: PageLanding.component.update,
        childGetMetadata: PageLanding.component.getMetadata,
        childGetModal: PageLanding.component.getModal,
        childMsg: msg.value
      });

    case 'pageOpportunities':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageOpportunities', value }),
        childStatePath: ['pages', 'opportunities'],
        childUpdate: PageOpportunities.component.update,
        childGetMetadata: PageOpportunities.component.getMetadata,
        childGetModal: PageOpportunities.component.getModal,
        childMsg: msg.value
      });

    case 'pageContent':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageContent', value }),
        childStatePath: ['pages', 'content'],
        childUpdate: PageContent.component.update,
        childGetMetadata: PageContent.component.getMetadata,
        childGetModal: PageContent.component.getModal,
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
