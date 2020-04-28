import { SWU_PROPOSAL_EVALUATION_CONTENT_ID } from 'front-end/config';
import { getAlertsValid, getContextualActionsValid, getMetadataValid, getModalValid, makePageMetadata, makeStartLoading, makeStopLoading, sidebarValid, updateValid, viewValid } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as SubmitProposalTerms from 'front-end/lib/components/submit-proposal-terms';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, mapPageModalMsg, newRoute, PageComponent, PageInit, replaceRoute, toast, Update, updateComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Form from 'front-end/lib/pages/proposal/sprint-with-us/lib/components/form';
import * as toasts from 'front-end/lib/pages/proposal/sprint-with-us/lib/toasts';
import Link, { iconLinkSymbol, leftPlacement, routeDest } from 'front-end/lib/views/link';
import makeInstructionalSidebar from 'front-end/lib/views/sidebar/instructional';
import React from 'react';
import { isSWUOpportunityAcceptingProposals, SWUOpportunity } from 'shared/lib/resources/opportunity/sprint-with-us';
import { CreateSWUProposalStatus, SWUProposalStatus } from 'shared/lib/resources/proposal/sprint-with-us';
import { UserType } from 'shared/lib/resources/user';
import { ADT, adt, Id } from 'shared/lib/types';
import { invalid, isInvalid, valid, Validation } from 'shared/lib/validation';

type ModalId
  = 'submit'
  | 'cancel';

interface ValidState {
  showModal: ModalId | null;
  submitLoading: number;
  saveDraftLoading: number;
  opportunity: SWUOpportunity;
  form: Immutable<Form.State>;
  submitTerms: Immutable<SubmitProposalTerms.State>;
}

export type State = Validation<Immutable<ValidState>, null>;

type InnerMsg
  = ADT<'hideModal'>
  | ADT<'showModal', ModalId>
  | ADT<'form', Form.Msg>
  | ADT<'submitTerms', SubmitProposalTerms.Msg>
  | ADT<'submit'>
  | ADT<'saveDraft'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export interface RouteParams {
  opportunityId: Id;
}

const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType<RouteParams, State, Msg>({
  userType: [UserType.Vendor],

  async success({ routeParams, shared, dispatch, routePath }) {
    const { opportunityId } = routeParams;
    // Redirect to proposal edit page if the user has already created a proposal for this opportunity.
    const existingProposal = await api.proposals.swu.getExistingProposalForOpportunity(opportunityId);
    if (existingProposal) {
      dispatch(replaceRoute(adt('proposalSWUEdit' as const, {
        opportunityId,
        proposalId: existingProposal.id
      })));
      return invalid(null);
    }
    const fail = () => {
      dispatch(replaceRoute(adt('notFound' as const, {
        path: routePath
      })));
      return invalid(null);
    };
    const opportunityResult = await api.opportunities.swu.readOne(opportunityId);
    if (!api.isValid(opportunityResult)) { return fail(); }
    const opportunity = opportunityResult.value;
    // If the opportunity is not accepting proposals, redirect to opportunity page.
    if (!isSWUOpportunityAcceptingProposals(opportunity)) {
      dispatch(replaceRoute(adt('opportunitySWUView' as const, { opportunityId })));
      return invalid(null);
    }
    const organizationsResult = await api.organizations.readMany();
    if (!api.isValid(organizationsResult)) { return fail(); }
    const evalContentResult = await api.getMarkdownFile(SWU_PROPOSAL_EVALUATION_CONTENT_ID);
    if (!api.isValid(evalContentResult)) { return fail(); }
    return valid(immutable({
      showModal: null,
      submitLoading: 0,
      saveDraftLoading: 0,
      opportunity: opportunityResult.value,
      form: immutable(await Form.init({
        viewerUser: shared.sessionUser,
        opportunity,
        organizations: organizationsResult.value,
        evaluationContent: evalContentResult.value
      })),
      submitTerms: immutable(await SubmitProposalTerms.init({
        errors: [],
        child: {
          value: false,
          id: 'create-swu-proposal-submit-terms'
        }
      }))
    }));
  },

  async fail({ dispatch, routePath, shared }) {
    dispatch(replaceRoute(adt('notFound' as const, {
      path: routePath
    })));
    return invalid(null);
  }
});

const startSubmitLoading = makeStartLoading<ValidState>('submitLoading');
const stopSubmitLoading = makeStopLoading<ValidState>('submitLoading');
const startSaveDraftLoading = makeStartLoading<ValidState>('saveDraftLoading');
const stopSaveDraftLoading = makeStopLoading<ValidState>('saveDraftLoading');

function hideModal(state: Immutable<ValidState>): Immutable<ValidState> {
  return state
    .set('showModal', null)
    .update('submitTerms', s => SubmitProposalTerms.setCheckbox(s, false));
}

const update: Update<State, Msg> = updateValid(({ state, msg }) => {
  switch (msg.tag) {
    case 'saveDraft':
    case 'submit':
      state = hideModal(state);
      const isSubmit = msg.tag === 'submit';
      return [
        isSubmit ? startSubmitLoading(state) : startSaveDraftLoading(state),
        async (state, dispatch) => {
          state = isSubmit ? stopSubmitLoading(state) : stopSaveDraftLoading(state);
          const result = await Form.persist(state.form, adt('create', (isSubmit ? SWUProposalStatus.Submitted : SWUProposalStatus.Draft) as CreateSWUProposalStatus));
          if (isInvalid(result)) {
            dispatch(toast(adt('error', isSubmit ? toasts.submitted.error : toasts.draftCreated.error)));
            return state.set('form', result.value);
          }
          dispatch(newRoute(adt('proposalSWUEdit' as const, {
            proposalId: result.value[1].id,
            opportunityId: result.value[1].opportunity.id
          })));
          dispatch(toast(adt('success', isSubmit ? toasts.submitted.success : toasts.draftCreated.success)));
          return state.set('form', result.value[0]);
        }
      ];

    case 'showModal':
      return [state.set('showModal', msg.value)];

    case 'hideModal':
      return [hideModal(state)];

    case 'form':
      return updateComponentChild({
        state,
        childStatePath: ['form'],
        childUpdate: Form.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('form', value)
      });

    case 'submitTerms':
      return updateComponentChild({
        state,
        childStatePath: ['submitTerms'],
        childUpdate: SubmitProposalTerms.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('submitTerms', value)
      });

    default:
      return [state];
  }
});

const view: ComponentView<State, Msg> = viewValid(({ state, dispatch }) => {
  return (
    <Form.view
      state={state.form}
      dispatch={mapComponentDispatch(dispatch, v => adt('form' as const, v))} />
  );
});

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,

  sidebar: sidebarValid({
    size: 'large',
    color: 'blue-light',
    view: makeInstructionalSidebar<ValidState, Msg>({
      getTitle: () => 'Create a Sprint With Us Proposal',
      getDescription: state => (
        <div className='d-flex flex-column nowrap'>
          <Link newTab dest={routeDest(adt('opportunitySWUView', { opportunityId: state.opportunity.id }))} className='mb-3'>{state.opportunity.title}</Link>
          <span>Introductory text placeholder. Can provide brief instructions on how to create and manage an opportunity (e.g. save draft verion).</span>
        </div>
      ),
      getFooter: () => (
        <span>
          Need help? <Link dest={routeDest(adt('content', 'sprint-with-us-proposal-guide'))}>Read the guide</Link> to learn how to create and manage a SWU proposal.
        </span>
      )
    })
  }),

  getAlerts: getAlertsValid<ValidState, Msg>(state => {
    return Form.getAlerts(state.form);
  }),

  getContextualActions: getContextualActionsValid( ({state, dispatch}) => {
    const isSubmitLoading   = state.submitLoading > 0;
    const isSaveDraftLoading = state.saveDraftLoading > 0;
    const isLoading          = isSubmitLoading || isSaveDraftLoading;
    const isValid            = () => Form.isValid(state.form);
    return adt('links', [
      {
        children: 'Submit',
        symbol_: leftPlacement(iconLinkSymbol('paper-plane')),
        button: true,
        loading: isSubmitLoading,
        disabled: isLoading || !isValid(),
        color: 'primary',
        onClick: () => dispatch(adt('showModal', 'submit' as const))
      },
      {
        children: 'Save Draft',
        symbol_: leftPlacement(iconLinkSymbol('save')),
        loading: isSaveDraftLoading,
        disabled: isLoading,
        button: true,
        color: 'success',
        onClick: () => dispatch(adt('saveDraft'))
      },
      {
        children: 'Cancel',
        color: 'white',
        disabled: isLoading,
        onClick: () => dispatch(adt('showModal', 'cancel' as const))
      }
    ]);
  }),

  getModal: getModalValid(state => {
    const formModal = mapPageModalMsg(Form.getModal(state.form), msg => adt('form', msg) as Msg);
    if (formModal !== null) { return formModal; }
    const hasAcceptedTerms = SubmitProposalTerms.getCheckbox(state.submitTerms);
    switch (state.showModal) {
      case 'submit':
        return {
          title: 'Review Terms and Conditions',
          body: dispatch => (
            <SubmitProposalTerms.view
              opportunityType='Sprint With Us'
              action='submitting'
              termsTitle='Sprint With Us Terms & Conditions'
              termsRoute={adt('content', 'sprint-with-us-proposal-terms-and-conditions')}
              state={state.submitTerms}
              dispatch={mapComponentDispatch(dispatch, msg => adt('submitTerms', msg) as Msg)} />
          ),
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Submit Proposal',
              icon: 'paper-plane',
              color: 'primary',
              msg: adt('submit'),
              button: true,
              disabled: !hasAcceptedTerms
            },
            {
              text: 'Cancel',
              color: 'secondary',
              msg: adt('hideModal')
            }
          ]
        };
      case 'cancel':
        return {
          title: 'Cancel New Sprint With Us Proposal?',
          body: () => 'Are you sure you want to cancel? Any information you may have entered will be lost if you do so.',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Yes, I want to cancel',
              color: 'danger',
              msg: newRoute(adt('opportunitySWUView' as const, {
                opportunityId: state.opportunity.id
              })),
              button: true
            },
            {
              text: 'Go Back',
              color: 'secondary',
              msg: adt('hideModal')
            }
          ]
        };
      case null:
        return null;
    }
  }),

  getMetadata: getMetadataValid(state => {
    return makePageMetadata(`Create Sprint With Us Proposal — ${state.opportunity.title}`);
  }, makePageMetadata('Create Sprint With Us Proposal'))
};
