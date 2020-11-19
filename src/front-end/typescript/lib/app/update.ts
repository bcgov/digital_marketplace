import { TOAST_AUTO_DISMISS_DURATION } from 'front-end/config';
import { makeStartLoading, makeStopLoading } from 'front-end/lib';
import router from 'front-end/lib/app/router';
import { isAllowedRouteForUsersWithUnacceptedTerms, Msg, Route, State } from 'front-end/lib/app/types';
import * as Nav from 'front-end/lib/app/view/nav';
import { Dispatch, Immutable, initAppChildPage, newRoute, PageModal, Update, updateAppChildPage, updateComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as PageContent from 'front-end/lib/pages/content';
import * as PageDashboard from 'front-end/lib/pages/dashboard';
import * as PageLanding from 'front-end/lib/pages/landing';
import * as PageLearnMoreCWU from 'front-end/lib/pages/learn-more/code-with-us';
import * as PageLearnMoreSWU from 'front-end/lib/pages/learn-more/sprint-with-us';
import * as PageNotFound from 'front-end/lib/pages/not-found';
import * as PageNotice from 'front-end/lib/pages/notice';
import * as PageOpportunityCWUCreate from 'front-end/lib/pages/opportunity/code-with-us/create';
import * as PageOpportunityCWUEdit from 'front-end/lib/pages/opportunity/code-with-us/edit';
import * as PageOpportunityCWUView from 'front-end/lib/pages/opportunity/code-with-us/view';
import * as PageOpportunityCreate from 'front-end/lib/pages/opportunity/create';
import * as PageOpportunities from 'front-end/lib/pages/opportunity/list';
import * as PageOpportunitySWUCreate from 'front-end/lib/pages/opportunity/sprint-with-us/create';
import * as PageOpportunitySWUEdit from 'front-end/lib/pages/opportunity/sprint-with-us/edit';
import * as PageOpportunitySWUView from 'front-end/lib/pages/opportunity/sprint-with-us/view';
import * as PageOrgCreate from 'front-end/lib/pages/organization/create';
import * as PageOrgEdit from 'front-end/lib/pages/organization/edit';
import * as PageOrgList from 'front-end/lib/pages/organization/list';
import * as PageOrgSWUTerms from 'front-end/lib/pages/organization/sprint-with-us-terms';
import * as PageProposalCWUCreate from 'front-end/lib/pages/proposal/code-with-us/create';
import * as PageProposalCWUEdit from 'front-end/lib/pages/proposal/code-with-us/edit';
import * as PageProposalCWUExportAll from 'front-end/lib/pages/proposal/code-with-us/export/all';
import * as PageProposalCWUExportOne from 'front-end/lib/pages/proposal/code-with-us/export/one';
import * as PageProposalCWUView from 'front-end/lib/pages/proposal/code-with-us/view';
import * as PageProposalList from 'front-end/lib/pages/proposal/list';
import * as PageProposalSWUCreate from 'front-end/lib/pages/proposal/sprint-with-us/create';
import * as PageProposalSWUEdit from 'front-end/lib/pages/proposal/sprint-with-us/edit';
import * as PageProposalSWUExportAll from 'front-end/lib/pages/proposal/sprint-with-us/export/all';
import * as PageProposalSWUExportOne from 'front-end/lib/pages/proposal/sprint-with-us/export/one';
import * as PageProposalSWUView from 'front-end/lib/pages/proposal/sprint-with-us/view';
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
    session: validated.tag === 'valid' ? validated.value : null
  });
}

const startTransition = makeStartLoading<State>('transitionLoading');
const stopTransition = makeStopLoading<State>('transitionLoading');

async function initPage(state: Immutable<State>, dispatch: Dispatch<Msg>, route: Route): Promise<Immutable<State>> {
  const defaultPageInitParams = {
    state,
    dispatch,
    routePath: router.routeToUrl(route),
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

    case 'orgSWUTerms':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'orgSWUTerms'],
        childRouteParams: route.value,
        childInit: PageOrgSWUTerms.component.init,
        childGetMetadata: PageOrgSWUTerms.component.getMetadata,
        childGetModal: PageOrgSWUTerms.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageOrgSWUTerms' as const, value };
        }
      });

    case 'proposalSWUEdit':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'proposalSWUEdit'],
        childRouteParams: route.value,
        childInit: PageProposalSWUEdit.component.init,
        childGetMetadata: PageProposalSWUEdit.component.getMetadata,
        childGetModal: PageProposalSWUEdit.component.getModal,
        mapChildMsg(value) {
          return {tag: 'pageProposalSWUEdit' as const, value};
        }
      });
    case 'proposalSWUCreate':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'proposalSWUCreate'],
        childRouteParams: route.value,
        childInit: PageProposalSWUCreate.component.init,
        childGetMetadata: PageProposalSWUCreate.component.getMetadata,
        childGetModal: PageProposalSWUCreate.component.getModal,
        mapChildMsg(value) {
          return {tag: 'pageProposalSWUCreate' as const, value};
        }
      });
    case 'proposalSWUView':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'proposalSWUView'],
        childRouteParams: route.value,
        childInit: PageProposalSWUView.component.init,
        childGetMetadata: PageProposalSWUView.component.getMetadata,
        childGetModal: PageProposalSWUView.component.getModal,
        mapChildMsg(value) {
          return {tag: 'pageProposalSWUView' as const, value};
        }
      });

    case 'opportunitySWUEdit':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'opportunitySWUEdit'],
        childRouteParams: route.value,
        childInit: PageOpportunitySWUEdit.component.init,
        childGetMetadata: PageOpportunitySWUEdit.component.getMetadata,
        childGetModal: PageOpportunitySWUEdit.component.getModal,
        mapChildMsg(value) {
          return {tag: 'pageOpportunitySWUEdit' as const, value};
        }
      });
    case 'opportunitySWUCreate':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'opportunitySWUCreate'],
        childRouteParams: route.value,
        childInit: PageOpportunitySWUCreate.component.init,
        childGetMetadata: PageOpportunitySWUCreate.component.getMetadata,
        childGetModal: PageOpportunitySWUCreate.component.getModal,
        mapChildMsg(value) {
          return {tag: 'pageOpportunitySWUCreate' as const, value};
        }
      });
    case 'opportunitySWUView':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'opportunitySWUView'],
        childRouteParams: route.value,
        childInit: PageOpportunitySWUView.component.init,
        childGetMetadata: PageOpportunitySWUView.component.getMetadata,
        childGetModal: PageOpportunitySWUView.component.getModal,
        mapChildMsg(value) {
          return {tag: 'pageOpportunitySWUView' as const, value};
        }
      });

    case 'opportunityCWUCreate':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'opportunityCWUCreate'],
        childRouteParams: route.value,
        childInit: PageOpportunityCWUCreate.component.init,
        childGetMetadata: PageOpportunityCWUCreate.component.getMetadata,
        childGetModal: PageOpportunityCWUCreate.component.getModal,
        mapChildMsg(value) {
          return {tag: 'pageOpportunityCWUCreate' as const, value};
        }
      });
    case 'opportunityCWUEdit':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'opportunityCWUEdit'],
        childRouteParams: route.value,
        childInit: PageOpportunityCWUEdit.component.init,
        childGetMetadata: PageOpportunityCWUEdit.component.getMetadata,
        childGetModal: PageOpportunityCWUEdit.component.getModal,
        mapChildMsg(value) {
          return {tag: 'pageOpportunityCWUEdit' as const, value};
        }
      });
    case 'opportunityCWUView':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'opportunityCWUView'],
        childRouteParams: route.value,
        childInit: PageOpportunityCWUView.component.init,
        childGetMetadata: PageOpportunityCWUView.component.getMetadata,
        childGetModal: PageOpportunityCWUView.component.getModal,
        mapChildMsg(value) {
          return {tag: 'pageOpportunityCWUView' as const, value};
        }
      });

    case 'proposalCWUCreate':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'proposalCWUCreate'],
        childRouteParams: route.value,
        childInit: PageProposalCWUCreate.component.init,
        childGetMetadata: PageProposalCWUCreate.component.getMetadata,
        childGetModal: PageProposalCWUCreate.component.getModal,
        mapChildMsg(value) {
          return {tag: 'pageProposalCWUCreate' as const, value};
        }
      });
    case 'proposalCWUEdit':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'proposalCWUEdit'],
        childRouteParams: route.value,
        childInit: PageProposalCWUEdit.component.init,
        childGetMetadata: PageProposalCWUEdit.component.getMetadata,
        childGetModal: PageProposalCWUEdit.component.getModal,
        mapChildMsg(value) {
          return {tag: 'pageProposalCWUEdit' as const, value};
        }
      });
    case 'proposalCWUView':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'proposalCWUView'],
        childRouteParams: route.value,
        childInit: PageProposalCWUView.component.init,
        childGetMetadata: PageProposalCWUView.component.getMetadata,
        childGetModal: PageProposalCWUView.component.getModal,
        mapChildMsg(value) {
          return {tag: 'pageProposalCWUView' as const, value};
        }
      });
    case 'proposalCWUExportOne':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'proposalCWUExportOne'],
        childRouteParams: route.value,
        childInit: PageProposalCWUExportOne.component.init,
        childGetMetadata: PageProposalCWUExportOne.component.getMetadata,
        childGetModal: PageProposalCWUExportOne.component.getModal,
        mapChildMsg(value) {
          return {tag: 'pageProposalCWUExportOne' as const, value};
        }
      });
    case 'proposalCWUExportAll':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'proposalCWUExportAll'],
        childRouteParams: route.value,
        childInit: PageProposalCWUExportAll.component.init,
        childGetMetadata: PageProposalCWUExportAll.component.getMetadata,
        childGetModal: PageProposalCWUExportAll.component.getModal,
        mapChildMsg(value) {
          return {tag: 'pageProposalCWUExportAll' as const, value};
        }
      });
    case 'proposalSWUExportOne':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'proposalSWUExportOne'],
        childRouteParams: route.value,
        childInit: PageProposalSWUExportOne.component.init,
        childGetMetadata: PageProposalSWUExportOne.component.getMetadata,
        childGetModal: PageProposalSWUExportOne.component.getModal,
        mapChildMsg(value) {
          return {tag: 'pageProposalSWUExportOne' as const, value};
        }
      });
    case 'proposalSWUExportAll':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'proposalSWUExportAll'],
        childRouteParams: route.value,
        childInit: PageProposalSWUExportAll.component.init,
        childGetMetadata: PageProposalSWUExportAll.component.getMetadata,
        childGetModal: PageProposalSWUExportAll.component.getModal,
        mapChildMsg(value) {
          return {tag: 'pageProposalSWUExportAll' as const, value};
        }
      });
    case 'proposalList':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'proposalList'],
        childRouteParams: route.value,
        childInit: PageProposalList.component.init,
        childGetMetadata: PageProposalList.component.getMetadata,
        childGetModal: PageProposalList.component.getModal,
        mapChildMsg(value) {
          return {tag: 'pageProposalList' as const, value};
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

    case 'dashboard':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'dashboard'],
        childRouteParams: route.value,
        childInit: PageDashboard.component.init,
        childGetMetadata: PageDashboard.component.getMetadata,
        childGetModal: PageDashboard.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageDashboard' as const, value };
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

    case 'opportunityCreate':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'opportunityCreate'],
        childRouteParams: route.value,
        childInit: PageOpportunityCreate.component.init,
        childGetMetadata: PageOpportunityCreate.component.getMetadata,
        childGetModal: PageOpportunityCreate.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageOpportunityCreate' as const, value };
        }
      });

    case 'learnMoreCWU':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'learnMoreCWU'],
        childRouteParams: route.value,
        childInit: PageLearnMoreCWU.component.init,
        childGetMetadata: PageLearnMoreCWU.component.getMetadata,
        childGetModal: PageLearnMoreCWU.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageLearnMoreCWU' as const, value };
        }
      });

    case 'learnMoreSWU':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'learnMoreSWU'],
        childRouteParams: route.value,
        childInit: PageLearnMoreSWU.component.init,
        childGetMetadata: PageLearnMoreSWU.component.getMetadata,
        childGetModal: PageLearnMoreSWU.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageLearnMoreSWU' as const, value };
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

    case 'notFound':
      return await initAppChildPage({
        ...defaultPageInitParams,
        childStatePath: ['pages', 'notFound'],
        childRouteParams: route.value,
        childInit: PageNotFound.component.init,
        childGetMetadata: PageNotFound.component.getMetadata,
        childGetModal: PageNotFound.component.getModal,
        mapChildMsg(value) {
          return { tag: 'pageNotFound' as const, value };
        }
      });
  }
}

const update: Update<State, Msg> = ({ state, msg }) => {
  const defaultPageUpdateParams = {
    state,
    setModal(state: Immutable<State>, modal: PageModal<Msg> | null) {
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
      const incomingRoute = msg.value.route;
      const preserveScrollPosition = msg.value.preserveScrollPosition;
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
          // Scroll to top if not a popstate event.
          const html = document.documentElement;
          if (!preserveScrollPosition && html.scrollTo) { html.scrollTo(0, 0); }
          return state;
        }
      ];

    case '@reload':
      return [state, async (state, dispatch) => {
        dispatch(adt('@incomingRoute', {
          route: state.activeRoute,
          preserveScrollPosition: true
        }));
        return state;
      }];

    case '@toast':
      return [state, async (state, dispatch) => {
        state = state.update('toasts', ts => ts.concat([{
          ...msg.value,
          timestamp: Date.now()
        }]));
        setTimeout(() => dispatch(adt('dismissLapsedToasts')), TOAST_AUTO_DISMISS_DURATION + 1);
        return state;
      }];

    case 'dismissToast':
      return [state.update('toasts', ts => ts.filter((t, i) => i !== msg.value))];

    case 'dismissLapsedToasts': {
      const now = Date.now();
      // Auto-dismiss toasts
      return [state.update('toasts', ts => ts.filter(({ timestamp }) => timestamp + TOAST_AUTO_DISMISS_DURATION > now))];
    }

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

    case 'pageOrgSWUTerms':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageOrgSWUTerms', value }),
        childStatePath: ['pages', 'orgSWUTerms'],
        childUpdate: PageOrgSWUTerms.component.update,
        childGetMetadata: PageOrgSWUTerms.component.getMetadata,
        childGetModal: PageOrgSWUTerms.component.getModal,
        childMsg: msg.value
      });

    case 'pageProposalSWUCreate':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageProposalSWUCreate' as const, value}),
        childStatePath: ['pages', 'proposalSWUCreate'],
        childUpdate: PageProposalSWUCreate.component.update,
        childGetMetadata: PageProposalSWUCreate.component.getMetadata,
        childGetModal: PageProposalSWUCreate.component.getModal,
        childMsg: msg.value
      });
    case 'pageProposalSWUEdit':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageProposalSWUEdit' as const, value}),
        childStatePath: ['pages', 'proposalSWUEdit'],
        childUpdate: PageProposalSWUEdit.component.update,
        childGetMetadata: PageProposalSWUEdit.component.getMetadata,
        childGetModal: PageProposalSWUEdit.component.getModal,
        childMsg: msg.value
      });
    case 'pageProposalSWUView':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageProposalSWUView' as const, value}),
        childStatePath: ['pages', 'proposalSWUView'],
        childUpdate: PageProposalSWUView.component.update,
        childGetMetadata: PageProposalSWUView.component.getMetadata,
        childGetModal: PageProposalSWUView.component.getModal,
        childMsg: msg.value
      });

    case 'pageOpportunitySWUEdit':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageOpportunitySWUEdit' as const, value}),
        childStatePath: ['pages', 'opportunitySWUEdit'],
        childUpdate: PageOpportunitySWUEdit.component.update,
        childGetMetadata: PageOpportunitySWUEdit.component.getMetadata,
        childGetModal: PageOpportunitySWUEdit.component.getModal,
        childMsg: msg.value
      });
    case 'pageOpportunitySWUCreate':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageOpportunitySWUCreate' as const, value}),
        childStatePath: ['pages', 'opportunitySWUCreate'],
        childUpdate: PageOpportunitySWUCreate.component.update,
        childGetMetadata: PageOpportunitySWUCreate.component.getMetadata,
        childGetModal: PageOpportunitySWUCreate.component.getModal,
        childMsg: msg.value
      });
    case 'pageOpportunitySWUView':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageOpportunitySWUView' as const, value}),
        childStatePath: ['pages', 'opportunitySWUView'],
        childUpdate: PageOpportunitySWUView.component.update,
        childGetMetadata: PageOpportunitySWUView.component.getMetadata,
        childGetModal: PageOpportunitySWUView.component.getModal,
        childMsg: msg.value
      });

    case 'pageOpportunityCWUCreate':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageOpportunityCWUCreate' as const, value}),
        childStatePath: ['pages', 'opportunityCWUCreate'],
        childUpdate: PageOpportunityCWUCreate.component.update,
        childGetMetadata: PageOpportunityCWUCreate.component.getMetadata,
        childGetModal: PageOpportunityCWUCreate.component.getModal,
        childMsg: msg.value
      });
    case 'pageOpportunityCWUEdit':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageOpportunityCWUEdit' as const, value}),
        childStatePath: ['pages', 'opportunityCWUEdit'],
        childUpdate: PageOpportunityCWUEdit.component.update,
        childGetMetadata: PageOpportunityCWUEdit.component.getMetadata,
        childGetModal: PageOpportunityCWUEdit.component.getModal,
        childMsg: msg.value
      });
    case 'pageOpportunityCWUView':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageOpportunityCWUView' as const, value}),
        childStatePath: ['pages', 'opportunityCWUView'],
        childUpdate: PageOpportunityCWUView.component.update,
        childGetMetadata: PageOpportunityCWUView.component.getMetadata,
        childGetModal: PageOpportunityCWUView.component.getModal,
        childMsg: msg.value
      });

    case 'pageProposalCWUCreate':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageProposalCWUCreate' as const, value}),
        childStatePath: ['pages', 'proposalCWUCreate'],
        childUpdate: PageProposalCWUCreate.component.update,
        childGetMetadata: PageProposalCWUCreate.component.getMetadata,
        childGetModal: PageProposalCWUCreate.component.getModal,
        childMsg: msg.value
      });
    case 'pageProposalCWUEdit':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageProposalCWUEdit' as const, value}),
        childStatePath: ['pages', 'proposalCWUEdit'],
        childUpdate: PageProposalCWUEdit.component.update,
        childGetMetadata: PageProposalCWUEdit.component.getMetadata,
        childGetModal: PageProposalCWUEdit.component.getModal,
        childMsg: msg.value
      });
    case 'pageProposalCWUView':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageProposalCWUView' as const, value}),
        childStatePath: ['pages', 'proposalCWUView'],
        childUpdate: PageProposalCWUView.component.update,
        childGetMetadata: PageProposalCWUView.component.getMetadata,
        childGetModal: PageProposalCWUView.component.getModal,
        childMsg: msg.value
      });

    case 'pageProposalCWUExportOne':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageProposalCWUExportOne' as const, value}),
        childStatePath: ['pages', 'proposalCWUExportOne'],
        childUpdate: PageProposalCWUExportOne.component.update,
        childGetMetadata: PageProposalCWUExportOne.component.getMetadata,
        childGetModal: PageProposalCWUExportOne.component.getModal,
        childMsg: msg.value
      });
    case 'pageProposalCWUExportAll':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageProposalCWUExportAll' as const, value}),
        childStatePath: ['pages', 'proposalCWUExportAll'],
        childUpdate: PageProposalCWUExportAll.component.update,
        childGetMetadata: PageProposalCWUExportAll.component.getMetadata,
        childGetModal: PageProposalCWUExportAll.component.getModal,
        childMsg: msg.value
      });
    case 'pageProposalSWUExportOne':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageProposalSWUExportOne' as const, value}),
        childStatePath: ['pages', 'proposalSWUExportOne'],
        childUpdate: PageProposalSWUExportOne.component.update,
        childGetMetadata: PageProposalSWUExportOne.component.getMetadata,
        childGetModal: PageProposalSWUExportOne.component.getModal,
        childMsg: msg.value
      });
    case 'pageProposalSWUExportAll':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageProposalSWUExportAll' as const, value}),
        childStatePath: ['pages', 'proposalSWUExportAll'],
        childUpdate: PageProposalSWUExportAll.component.update,
        childGetMetadata: PageProposalSWUExportAll.component.getMetadata,
        childGetModal: PageProposalSWUExportAll.component.getModal,
        childMsg: msg.value
      });
    case 'pageProposalList':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageProposalList' as const, value}),
        childStatePath: ['pages', 'proposalList'],
        childUpdate: PageProposalList.component.update,
        childGetMetadata: PageProposalList.component.getMetadata,
        childGetModal: PageProposalList.component.getModal,
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

    case 'pageDashboard':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageDashboard', value }),
        childStatePath: ['pages', 'dashboard'],
        childUpdate: PageDashboard.component.update,
        childGetMetadata: PageDashboard.component.getMetadata,
        childGetModal: PageDashboard.component.getModal,
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

    case 'pageOpportunityCreate':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageOpportunityCreate', value }),
        childStatePath: ['pages', 'opportunityCreate'],
        childUpdate: PageOpportunityCreate.component.update,
        childGetMetadata: PageOpportunityCreate.component.getMetadata,
        childGetModal: PageOpportunityCreate.component.getModal,
        childMsg: msg.value
      });

    case 'pageLearnMoreCWU':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageLearnMoreCWU', value }),
        childStatePath: ['pages', 'learnMoreCWU'],
        childUpdate: PageLearnMoreCWU.component.update,
        childGetMetadata: PageLearnMoreCWU.component.getMetadata,
        childGetModal: PageLearnMoreCWU.component.getModal,
        childMsg: msg.value
      });

    case 'pageLearnMoreSWU':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageLearnMoreSWU', value }),
        childStatePath: ['pages', 'learnMoreSWU'],
        childUpdate: PageLearnMoreSWU.component.update,
        childGetMetadata: PageLearnMoreSWU.component.getMetadata,
        childGetModal: PageLearnMoreSWU.component.getModal,
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

    case 'pageNotFound':
      return updateAppChildPage({
        ...defaultPageUpdateParams,
        mapChildMsg: value => ({ tag: 'pageNotFound', value }),
        childStatePath: ['pages', 'notFound'],
        childUpdate: PageNotFound.component.update,
        childGetMetadata: PageNotFound.component.getMetadata,
        childGetModal: PageNotFound.component.getModal,
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
