import { getAlertsValid, getContextualActionsValid, getModalValid, makePageMetadata, makeStartLoading, makeStopLoading, updateValid, viewValid } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, emptyPageAlerts, GlobalComponentMsg, immutable, Immutable, mapComponentDispatch, newRoute, PageComponent, PageInit, replaceRoute, Update, updateComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Form from 'front-end/lib/pages/proposal/code-with-us/lib/components/form';
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
  showErrorAlert: 'submit' | 'save' | null;
  submitLoading: number;
  saveDraftLoading: number;
}

type InnerMsg
  = ADT<'hideModal'>
  | ADT<'showModal', ModalId>
  | ADT<'dismissErrorAlert'>
  | ADT<'form', Form.Msg>
  | ADT<'submit'>
  | ADT<'saveDraft'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export interface RouteParams {
  opportunityId: string;
}

const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType({
  userType: [UserType.Vendor],
  async success({ dispatch, routeParams }) {
    const { opportunityId } = routeParams;
    // Redirect to proposal edit page if the user has already created a proposal for this opportunity.
    const proposalsResult = await api.proposals.cwu.readMany(opportunityId);
    if (api.isValid(proposalsResult) && proposalsResult.value.length) {
      const existingProposal = proposalsResult.value[0];
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
      dispatch(replaceRoute(adt('notice' as const, adt('notFound' as const))));
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
      showErrorAlert: null,
      opportunity,
      form: immutable(await Form.init({
        opportunity,
        affiliations
      }))
    }));
  },
  async fail({ dispatch }) {
    dispatch(replaceRoute(adt('notice' as const, adt('notFound' as const))));
    return invalid(null);
  }
});

const startSubmitLoading = makeStartLoading<ValidState>('submitLoading');
const stopSubmitLoading = makeStopLoading<ValidState>('submitLoading');
const startSaveDraftLoading = makeStartLoading<ValidState>('saveDraftLoading');
const stopSaveDraftLoading = makeStopLoading<ValidState>('saveDraftLoading');

const update: Update<State, Msg> = updateValid(({ state, msg }) => {
  switch (msg.tag) {
    case 'showModal':
      return [state.set('showModal', msg.value)];

    case 'hideModal':
      return [state.set('showModal', null)];

    case 'dismissErrorAlert':
      return [state.set('showErrorAlert', null)];

    case 'saveDraft':
    case 'submit':
      state = state.set('showModal', null);
      const isSubmit = msg.tag === 'submit';
      return [
        isSubmit ? startSubmitLoading(state) : startSaveDraftLoading(state),
        async (state, dispatch) => {
          state = isSubmit ? stopSubmitLoading(state) : stopSaveDraftLoading(state);
          const result = await Form.persist(state.form, adt('create', (isSubmit ? CWUProposalStatus.Submitted : CWUProposalStatus.Draft) as CreateCWUProposalStatus));
          if (isInvalid(result)) {
            return state.set('form', result.value);
          }
          dispatch(newRoute(adt('proposalCWUEdit' as const, {
            proposalId: result.value[1].id,
            opportunityId: result.value[1].opportunity.id
          })));
          return state.set('form', result.value[0]);
        }
      ];

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

  sidebar: {
    size: 'large',
    color: 'blue-light',
    view: makeInstructionalSidebar<State, Msg>({
      getTitle: () => 'Create a Code With Us Proposal',
      getDescription: () => 'Intruductory text placeholder.  Can provide brief instructions on how to create and manage an opportunity (e.g. save draft verion).',
      getFooter: () => (
        <span>
          Need help? <Link dest={routeDest(adt('content', 'code-with-us-proposal-guide'))}>Read the guide</Link> for creating and managing a CWU proposal
        </span>
      )
    })
  },

  getModal: getModalValid<ValidState, Msg>(state => {
    switch (state.showModal) {
      case 'submit':
        return {
          title: 'Review Terms and Conditions',
          body: () => 'Please ensure you have reviewed the Digital Marketplace Terms and Conditions prior to submitting your proposal for this Code With Us opportunity.',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Submit Proposal',
              icon: 'paper-plane',
              color: 'primary',
              msg: adt('submit'),
              button: true
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

  getMetadata() {
    return makePageMetadata('Create Proposal');
  },

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

  getAlerts: getAlertsValid(state => ({
    ...emptyPageAlerts(),
    errors: state.showErrorAlert
    ? [{
        text: `We were unable to ${state.showErrorAlert} your proposal. Please fix the errors in the form below and try again.`,
        dismissMsg: adt('dismissErrorAlert')
      }]
      : []
  }))

};
