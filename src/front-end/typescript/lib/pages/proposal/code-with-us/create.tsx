import { getContextualActionsValid, getMetadataValid, getModalValid, makePageMetadata, makeStartLoading, makeStopLoading, sidebarValid, updateValid, viewValid } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as SubmitProposalTerms from 'front-end/lib/components/submit-proposal-terms';
import { ComponentView, GlobalComponentMsg, immutable, Immutable, mapComponentDispatch, newRoute, PageComponent, PageInit, replaceRoute, toast, Update, updateComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Form from 'front-end/lib/pages/proposal/code-with-us/lib/components/form';
import * as toasts from 'front-end/lib/pages/proposal/code-with-us/lib/toasts';
import Link, { iconLinkSymbol, leftPlacement, routeDest } from 'front-end/lib/views/link';
import makeInstructionalSidebar from 'front-end/lib/views/sidebar/instructional';
import React from 'react';
import { CWUOpportunity, isCWUOpportunityAcceptingProposals } from 'shared/lib/resources/opportunity/code-with-us';
import { CreateCWUProposalStatus, CWUProposalStatus } from 'shared/lib/resources/proposal/code-with-us';
import { UserType } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';
import { invalid, isInvalid, valid, Validation } from 'shared/lib/validation';

type ModalId
  = 'submit'
  | 'cancel';

export type State = Validation<Immutable<ValidState>, null>;

export interface ValidState {
  showModal: ModalId | null;
  opportunity: CWUOpportunity;
  form: Immutable<Form.State>;
  submitLoading: number;
  saveDraftLoading: number;
  submitTerms: Immutable<SubmitProposalTerms.State>;
}

type InnerMsg
  = ADT<'hideModal'>
  | ADT<'showModal', ModalId>
  | ADT<'form', Form.Msg>
  | ADT<'submitTerms', SubmitProposalTerms.Msg>
  | ADT<'submit'>
  | ADT<'saveDraft'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export interface RouteParams {
  opportunityId: string;
}

const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType({
  userType: [UserType.Vendor],
  async success({ routePath, shared, dispatch, routeParams }) {
    const { opportunityId } = routeParams;
    // Redirect to proposal edit page if the user has already created a proposal for this opportunity.
    const existingProposal = await api.proposals.cwu.getExistingProposalForOpportunity(opportunityId);
    if (existingProposal) {
      dispatch(replaceRoute(adt('proposalCWUEdit' as const, {
        opportunityId,
        proposalId: existingProposal.id
      })));
      return invalid(null);
    }
    // Fetch opportunity and affiliated organizations.
    const opportunityResult = await api.opportunities.cwu.readOne(opportunityId);
    const affiliationsResult = await api.affiliations.readMany();
    // Redirect to 404 page if there is a server error.
    if (!api.isValid(opportunityResult) || !api.isValid(affiliationsResult)) {
      dispatch(replaceRoute(adt('notFound' as const, { path: routePath })));
      return invalid(null);
    }
    const opportunity = opportunityResult.value;
    // If the opportunity is not accepting proposals, redirect to opportunity page.
    if (!isCWUOpportunityAcceptingProposals(opportunity)) {
      dispatch(replaceRoute(adt('opportunityCWUView' as const, { opportunityId })));
      return invalid(null);
    }
    const affiliations = affiliationsResult.value;
    // Everything looks good, so state is valid.
    return valid(immutable({
      showModal: null,
      submitLoading: 0,
      saveDraftLoading: 0,
      opportunity,
      form: immutable(await Form.init({
        viewerUser: shared.sessionUser,
        opportunity,
        affiliations,
        canRemoveExistingAttachments: true //moot
      })),
      submitTerms: immutable(await SubmitProposalTerms.init({
        errors: [],
        child: {
          value: false,
          id: 'create-cwu-proposal-submit-terms'
        }
      }))
    }));
  },
  async fail({ routePath, dispatch }) {
    dispatch(replaceRoute(adt('notFound' as const, { path: routePath })));
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
    case 'showModal':
      return [state.set('showModal', msg.value)];

    case 'hideModal':
      return [hideModal(state)];

    case 'saveDraft':
    case 'submit':
      state = hideModal(state);
      const isSubmit = msg.tag === 'submit';
      return [
        isSubmit ? startSubmitLoading(state) : startSaveDraftLoading(state),
        async (state, dispatch) => {
          state = isSubmit ? stopSubmitLoading(state) : stopSaveDraftLoading(state);
          const result = await Form.persist(state.form, adt('create', (isSubmit ? CWUProposalStatus.Submitted : CWUProposalStatus.Draft) as CreateCWUProposalStatus));
          if (isInvalid(result)) {
            dispatch(toast(adt('error', isSubmit ? toasts.submitted.error : toasts.draftCreated.error)));
            return state.set('form', result.value);
          }
          dispatch(newRoute(adt('proposalCWUEdit' as const, {
            proposalId: result.value[1].id,
            opportunityId: result.value[1].opportunity.id
          })));
          dispatch(toast(adt('success', isSubmit ? toasts.submitted.success : toasts.draftCreated.success)));
          return state.set('form', result.value[0]);
        }
      ];

    case 'submitTerms':
      return updateComponentChild({
        state,
        childStatePath: ['submitTerms'],
        childUpdate: SubmitProposalTerms.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('submitTerms', value)
      });

    case 'form':
      return updateComponentChild({
        state,
        childStatePath: ['form'],
        childUpdate: Form.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('form', value)
      });

    default:
      return [state];
  }
});

const view: ComponentView<State, Msg> = viewValid(({ state, dispatch }) => {
  const isSubmitLoading   = state.submitLoading > 0;
  const isSaveDraftLoading = state.saveDraftLoading > 0;
  const isLoading          = isSubmitLoading || isSaveDraftLoading;
  return (
    <Form.view
      state={state.form}
      dispatch={mapComponentDispatch(dispatch, value => adt('form' as const, value))}
      disabled={isLoading}
    />
  );
});

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,

  sidebar: sidebarValid({
    size: 'large',
    color: 'c-sidebar-instructional-bg',
    view: makeInstructionalSidebar<ValidState, Msg>({
      getTitle: () => 'Create a Code With Us Proposal',
      getDescription: state => (
        <div className='d-flex flex-column nowrap'>
          <Link newTab dest={routeDest(adt('opportunityCWUView', { opportunityId: state.opportunity.id }))} className='mb-3'>{state.opportunity.title}</Link>
          <p className='mb-0'>Use the form provided to create your proposal for this <em>Code With Us</em> opportunity. You can either save a draft of your proposal to complete the form at a later time, or you can complete the form now to submit your proposal immediately.</p>
        </div>
      ),
      getFooter: () => (
        <span>
          Need help? <Link dest={routeDest(adt('content', 'code-with-us-proposal-guide'))}>Read the guide</Link> to learn how to create and manage a <em>Code With Us</em> proposal.
        </span>
      )
    })
  }),

  getModal: getModalValid<ValidState, Msg>(state => {
    const hasAcceptedTerms = SubmitProposalTerms.getCheckbox(state.submitTerms);
    switch (state.showModal) {
      case 'submit':
        return {
          title: 'Review Terms and Conditions',
          body: dispatch => (
            <SubmitProposalTerms.view
              opportunityType='Code With Us'
              action='submitting'
              termsTitle='Digital Marketplace Terms & Conditions'
              termsRoute={adt('content', 'terms-and-conditions')}
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
          title: 'Cancel New Code With Us Proposal?',
          body: () => 'Are you sure you want to cancel? Any information you may have entered will be lost if you do so.',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Yes, I want to cancel',
              color: 'danger',
              msg: newRoute(adt('opportunityCWUView' as const, {
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
    return makePageMetadata(`Create Code With Us Proposal — ${state.opportunity.title}`);
  }, makePageMetadata('Create Code With Us Proposal')),

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
        color: 'c-nav-fg-alt',
        disabled: isLoading,
        onClick: () => dispatch(adt('showModal', 'cancel' as const))
      }
    ]);
  })
};
