import { SWU_PROPOSAL_EVALUATION_CONTENT_ID } from 'front-end/config';
import { getAlertsValid, getContextualActionsValid, getModalValid, makeStartLoading, makeStopLoading, updateValid, viewValid } from 'front-end/lib';
import { Route } from 'front-end/lib/app/types';
import * as SubmitProposalTerms from 'front-end/lib/components/submit-proposal-terms';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, mapPageModalMsg, PageContextualActions, replaceRoute, toast, Update, updateComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Tab from 'front-end/lib/pages/proposal/sprint-with-us/edit/tab';
import * as Form from 'front-end/lib/pages/proposal/sprint-with-us/lib/components/form';
import * as toasts from 'front-end/lib/pages/proposal/sprint-with-us/lib/toasts';
import EditTabHeader from 'front-end/lib/pages/proposal/sprint-with-us/lib/views/edit-tab-header';
import { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import ReportCardList, { ReportCard } from 'front-end/lib/views/report-card-list';
import { compact } from 'lodash';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { formatAmount, formatDateAtTime } from 'shared/lib';
import { isSWUOpportunityAcceptingProposals } from 'shared/lib/resources/opportunity/sprint-with-us';
import { OrganizationSlim } from 'shared/lib/resources/organization';
import { SWUProposal, swuProposalNumTeamMembers, SWUProposalStatus, swuProposalTotalProposedCost } from 'shared/lib/resources/proposal/sprint-with-us';
import { adt, ADT } from 'shared/lib/types';
import { invalid, isInvalid, valid, Validation } from 'shared/lib/validation';

type ModalId = 'submit' | 'submitChanges' | 'saveChangesAndSubmit' | 'withdrawBeforeDeadline' | 'withdrawAfterDeadline' | 'delete';

interface ValidState extends Tab.Params {
  organizations: OrganizationSlim[];
  evaluationContent: string;
  isEditing: boolean;
  startEditingLoading: number;
  saveChangesLoading: number;
  saveChangesAndSubmitLoading: number;
  submitLoading: number;
  withdrawLoading: number;
  deleteLoading: number;
  showModal: ModalId | null;
  form: Immutable<Form.State>;
  submitTerms: Immutable<SubmitProposalTerms.State>;
}

function isLoading(state: Immutable<ValidState>): boolean {
  return state.startEditingLoading > 0    ||
    state.saveChangesLoading > 0          ||
    state.saveChangesAndSubmitLoading > 0 ||
    state.submitLoading > 0               ||
    state.withdrawLoading > 0             ||
    state.deleteLoading > 0;
}

export type State = Validation<Immutable<ValidState>, null>;

export type InnerMsg
  = ADT<'hideModal'>
  | ADT<'showModal', ModalId>
  | ADT<'form', Form.Msg>
  | ADT<'submitTerms', SubmitProposalTerms.Msg>
  | ADT<'startEditing'>
  | ADT<'cancelEditing'>
  | ADT<'saveChanges'>
  | ADT<'saveChangesAndSubmit'>
  | ADT<'submit'>
  | ADT<'withdraw'>
  | ADT<'delete'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

const init: Init<Tab.Params, State> = async params => {
  const { opportunity, proposal, viewerUser } = params;
  const organizationsResult = await api.organizations.readMany();
  if (!api.isValid(organizationsResult)) { return invalid(null); }
  const evalContentResult = await api.getMarkdownFile(SWU_PROPOSAL_EVALUATION_CONTENT_ID);
  if (!api.isValid(evalContentResult)) { return invalid(null); }
  const organizations = organizationsResult.value;
  const evaluationContent = evalContentResult.value;
  return valid(immutable({
    ...params,
    organizations,
    evaluationContent,
    isEditing: false,
    startEditingLoading: 0,
    saveChangesLoading: 0,
    saveChangesAndSubmitLoading: 0,
    submitLoading: 0,
    withdrawLoading: 0,
    deleteLoading: 0,
    showModal: null,
    form: immutable(await Form.init({
      viewerUser,
      opportunity,
      proposal,
      organizations,
      evaluationContent
    })),
    submitTerms: immutable(await SubmitProposalTerms.init({
      errors: [],
      child: {
        value: false,
        id: 'edit-swu-proposal-submit-terms'
      }
    }))
  }));
};

const startStartEditingLoading = makeStartLoading<ValidState>('startEditingLoading');
const stopStartEditingLoading = makeStopLoading<ValidState>('startEditingLoading');
const startSaveChangesLoading = makeStartLoading<ValidState>('saveChangesLoading');
const stopSaveChangesLoading = makeStopLoading<ValidState>('saveChangesLoading');
const startSaveChangesAndSubmitLoading = makeStartLoading<ValidState>('saveChangesAndSubmitLoading');
const stopSaveChangesAndSubmitLoading = makeStopLoading<ValidState>('saveChangesAndSubmitLoading');
const startSubmitLoading = makeStartLoading<ValidState>('submitLoading');
const stopSubmitLoading = makeStopLoading<ValidState>('submitLoading');
const startWithdrawLoading = makeStartLoading<ValidState>('withdrawLoading');
const stopWithdrawLoading = makeStopLoading<ValidState>('withdrawLoading');
const startDeleteLoading = makeStartLoading<ValidState>('deleteLoading');
const stopDeleteLoading = makeStopLoading<ValidState>('deleteLoading');

async function resetProposal(state: Immutable<ValidState>, proposal: SWUProposal, validate = false): Promise<Immutable<ValidState>> {
  state = state
    .set('proposal', proposal)
    .set('form', immutable(await Form.init({
      viewerUser: state.viewerUser,
      opportunity: state.opportunity,
      proposal: state.proposal,
      organizations: state.organizations,
      evaluationContent: state.evaluationContent,
      activeTab: Form.getActiveTab(state.form)
    })));
  if (validate) {
    state = state.update('form', s => Form.validate(s));
  }
  return state;
}

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
    case 'form':
      return updateComponentChild({
        state,
        childStatePath: ['form'],
        childUpdate: Form.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('form', value)
      });
    case 'submitTerms':
      return updateComponentChild({
        state,
        childStatePath: ['submitTerms'],
        childUpdate: SubmitProposalTerms.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('submitTerms', value)
      });
    case 'startEditing':
      return [
        startStartEditingLoading(state),
        async state => {
          state = stopStartEditingLoading(state);
          const proposalResult = await api.proposals.swu.readOne(state.proposal.opportunity.id, state.proposal.id);
          if (!api.isValid(proposalResult)) { return state; }
          state = await resetProposal(state, proposalResult.value, proposalResult.value.status === SWUProposalStatus.Draft);
          state = state.set('isEditing', true);
          return state;
        }
      ];
    case 'cancelEditing':
      return [
        state.set('isEditing', false),
        async state => await resetProposal(state, state.proposal)
      ];
    case 'saveChanges':
      state = hideModal(state);
      return [
        startSaveChangesLoading(state),
        async (state, dispatch) => {
          state = stopSaveChangesLoading(state);
          const result = await Form.persist(state.form, adt('update', state.proposal.id));
          const isSave = state.proposal.status === SWUProposalStatus.Draft || state.proposal.status === SWUProposalStatus.Withdrawn;
          if (isInvalid(result)) {
            dispatch(toast(adt('error', isSave ? toasts.changesSaved.error : toasts.changesSubmitted.error)));
            return state.set('form', result.value);
          }
          dispatch(toast(adt('success', isSave ? toasts.changesSaved.success : toasts.changesSubmitted.success)));
          return (await resetProposal(state, result.value[1]))
            .set('isEditing', false);
        }
      ];
    case 'saveChangesAndSubmit':
      state = hideModal(state);
      return [
        startSaveChangesAndSubmitLoading(state),
        async (state, dispatch) => {
          state = stopSaveChangesAndSubmitLoading(state);
          const saveResult = await Form.persist(state.form, adt('update', state.proposal.id));
          if (isInvalid(saveResult)) {
            return state.set('form', saveResult.value);
          }
          const submitResult = await api.proposals.swu.update(state.proposal.id, adt('submit', ''));
          if (!api.isValid(submitResult)) {
            dispatch(toast(adt('error', toasts.submitted.error)));
            return state;
          }
          dispatch(toast(adt('success', toasts.submitted.success)));
          state = state.set('isEditing', false);
          return await resetProposal(state, submitResult.value);
        }
      ];
    case 'submit':
      state = hideModal(state);
      return [
        startSubmitLoading(state),
        async (state, dispatch) => {
          state = stopSubmitLoading(state);
          const result = await api.proposals.swu.update(state.proposal.id, adt('submit', ''));
          if (!api.isValid(result)) {
            dispatch(toast(adt('error', toasts.submitted.error)));
            return state;
          }
          dispatch(toast(adt('success', toasts.submitted.success)));
          return await resetProposal(state, result.value);
        }
      ];
    case 'withdraw':
      state = hideModal(state);
      return [
        startWithdrawLoading(state),
        async (state, dispatch) => {
          state = stopWithdrawLoading(state);
          const result = await api.proposals.swu.update(state.proposal.id, adt('withdraw', ''));
          if (!api.isValid(result)) {
            dispatch(toast(adt('error', toasts.statusChanged.error(SWUProposalStatus.Withdrawn))));
            return state;
          }
          dispatch(toast(adt('success', toasts.statusChanged.success(SWUProposalStatus.Withdrawn))));
          return await resetProposal(state, result.value);
        }
      ];
    case 'delete':
      state = hideModal(state);
      return [
        startDeleteLoading(state),
        async (state, dispatch) => {
          const result = await api.proposals.swu.delete(state.proposal.id);
          if (!api.isValid(result)) {
            dispatch(toast(adt('error', toasts.deleted.error)));
            return stopDeleteLoading(state);
          }
          dispatch(toast(adt('success', toasts.deleted.success)));
          dispatch(replaceRoute(adt('opportunitySWUView' as const, {
            opportunityId: state.opportunity.id
          })));
          return state;
        }
      ];
    default:
      return [state];
  }
});

const Reporting: ComponentView<ValidState, Msg> = ({ state }) => {
  const proposal = state.proposal;
  const numTeamMembers = swuProposalNumTeamMembers(proposal);
  const totalProposedCost = swuProposalTotalProposedCost(proposal);
  const reportCards: Array<ReportCard | null> = [
    {
      icon: 'alarm-clock',
      name: 'Proposals Due',
      value: formatDateAtTime(proposal.opportunity.proposalDeadline, true)
    },
    {
      icon: 'users',
      name: `Team Member${numTeamMembers === 1 ? '' : 's'}`,
      value: String(numTeamMembers)
    },
    {
      icon: 'badge-dollar',
      name: 'Proposed Cost',
      value: formatAmount(totalProposedCost, '$')
    }
  ];
  return (
    <Row className='mt-5'>
      <Col xs='12'>
        <ReportCardList reportCards={reportCards} />
      </Col>
    </Row>
  );
};

const view: ComponentView<State, Msg> = viewValid(props => {
  const { state, dispatch } = props;
  return (
    <div>
      <EditTabHeader proposal={state.proposal} viewerUser={state.viewerUser} />
      <Reporting {...props} />
      <Row className='mt-5'>
        <Col xs='12'>
          <Form.view
            disabled={!state.isEditing || isLoading(state)}
            state={state.form}
            dispatch={mapComponentDispatch(dispatch, v => adt('form' as const, v))} />
        </Col>
      </Row>
    </div>
  );
});

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view,

  getAlerts: getAlertsValid<ValidState, Msg>(state => {
    return Form.getAlerts(state.form);
  }),

  getModal: getModalValid<ValidState, Msg>(state => {
    const formModal = mapPageModalMsg(Form.getModal(state.form), msg => adt('form', msg) as Msg);
    if (formModal !== null) { return formModal; }
    const hasAcceptedTerms = SubmitProposalTerms.getCheckbox(state.submitTerms);
    switch (state.showModal) {
      case 'submit':
      case 'saveChangesAndSubmit':
        return {
          title: 'Review Terms and Conditions',
          body: dispatch => (
            <SubmitProposalTerms.view
              opportunityType='Sprint With Us'
              action='submitting'
              termsTitle='Sprint With Us Terms & Conditions'
              termsRoute={adt('content', 'sprint-with-us-terms-and-conditions')}
              state={state.submitTerms}
              dispatch={mapComponentDispatch(dispatch, msg => adt('submitTerms', msg) as Msg)} />
          ),
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Submit Proposal',
              icon: 'paper-plane',
              color: 'primary',
              msg: state.showModal === 'submit' ? adt('submit') : adt('saveChangesAndSubmit'),
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
      case 'submitChanges':
        return {
          title: 'Review Terms and Conditions',
          body: dispatch => (
            <SubmitProposalTerms.view
              opportunityType='Sprint With Us'
              action='submitting changes to'
              termsTitle='Sprint With Us Terms & Conditions'
              termsRoute={adt('content', 'sprint-with-us-terms-and-conditions')}
              state={state.submitTerms}
              dispatch={mapComponentDispatch(dispatch, msg => adt('submitTerms', msg) as Msg)} />
          ),
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Submit Changes',
              icon: 'paper-plane',
              color: 'primary',
              msg: adt('saveChanges'),
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
      case 'withdrawBeforeDeadline':
        return {
          title: 'Withdraw Sprint With Us Proposal?',
          body: () => 'Are you sure you want to withdraw your Sprint With Us proposal? You will still be able to resubmit your proposal prior to the opportunity\'s proposal deadline.',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Withdraw Proposal',
              icon: 'ban',
              color: 'danger',
              msg: adt('withdraw'),
              button: true
            },
            {
              text: 'Cancel',
              color: 'secondary',
              msg: adt('hideModal')
            }
          ]
        };
      case 'withdrawAfterDeadline':
        return {
          title: 'Withdraw Sprint With Us Proposal?',
          body: () => 'Are you sure you want to withdraw your Sprint With Us proposal? You will no longer be considered for this opportunity.',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Withdraw Proposal',
              icon: 'ban',
              color: 'danger',
              msg: adt('withdraw'),
              button: true
            },
            {
              text: 'Cancel',
              color: 'secondary',
              msg: adt('hideModal')
            }
          ]
        };
      case 'delete':
        return {
          title: 'Delete Sprint With Us Proposal?',
          body: () => 'Are you sure you want to delete your Sprint With Us proposal? You will not be able to recover the proposal once it has been deleted.',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Delete Proposal',
              icon: 'trash',
              color: 'danger',
              msg: adt('delete'),
              button: true
            },
            {
              text: 'Cancel',
              color: 'secondary',
              msg: adt('hideModal')
            }
          ]
        };
      case null: return null;
    }
  }),

  getContextualActions: getContextualActionsValid(({ state, dispatch }) => {
    const proposal = state.proposal;
    const propStatus = proposal.status;
    const isStartEditingLoading = state.startEditingLoading > 0;
    const isSaveChangesLoading = state.saveChangesLoading > 0;
    const isSaveChangesAndSubmitLoading = state.saveChangesAndSubmitLoading > 0;
    const isSubmitLoading = state.submitLoading > 0;
    const isWithdrawLoading = state.withdrawLoading > 0;
    const isDeleteLoading = state.deleteLoading > 0;
    const isValid = () => Form.isValid(state.form);
    const disabled = isLoading(state);
    const isDraft = propStatus === SWUProposalStatus.Draft;
    const isWithdrawn = propStatus === SWUProposalStatus.Withdrawn;
    const isAcceptingProposals = isSWUOpportunityAcceptingProposals(state.opportunity);
    if (state.isEditing) {
      const separateSubmitButton = (isDraft || isWithdrawn) && isAcceptingProposals;
      return adt('links', compact([
        // Submit Changes
        separateSubmitButton
          ? {
              children: 'Submit Proposal',
              symbol_: leftPlacement(iconLinkSymbol('paper-plane')),
              button: true,
              loading: isSaveChangesAndSubmitLoading,
              disabled: disabled || !isValid(),
              color: 'primary',
              onClick: () => dispatch(adt('showModal', 'saveChangesAndSubmit' as const))
            }
          : null,
        // Save Changes
        {
          children: separateSubmitButton ? 'Save Changes' : 'Submit Changes',
          disabled: disabled || (() => {
            if (isDraft) {
              // No validation required, always possible to save a draft.
              return false;
            } else {
              return !isValid();
            }
          })(),
          onClick: () => dispatch(separateSubmitButton ? adt('saveChanges') : adt('showModal', 'submitChanges' as const)),
          button: true,
          loading: isSaveChangesLoading,
          symbol_: leftPlacement(iconLinkSymbol(separateSubmitButton ? 'save' : 'paper-plane')),
          color: separateSubmitButton ? 'success' : 'primary'
        },
        // Cancel
        {
          children: 'Cancel',
          disabled,
          onClick: () => dispatch(adt('cancelEditing')),
          color: 'white'
        }
      ])) as PageContextualActions;
    }
    switch (propStatus) {
      case SWUProposalStatus.Draft:
        if (isAcceptingProposals) {
          return adt('dropdown', {
            text: 'Actions',
            loading: isSubmitLoading || isStartEditingLoading || isDeleteLoading,
            linkGroups: [
              {
                links: [
                  {
                    children: 'Submit',
                    symbol_: leftPlacement(iconLinkSymbol('paper-plane')),
                    disabled: !isValid(),
                    onClick: () => dispatch(adt('showModal', 'submit' as const))
                  },
                  {
                    children: 'Edit',
                    symbol_: leftPlacement(iconLinkSymbol('edit')),
                    onClick: () => dispatch(adt('startEditing'))
                  }
                ]
              },
              {
                links: [
                  {
                    children: 'Delete',
                    symbol_: leftPlacement(iconLinkSymbol('trash')),
                    onClick: () => dispatch(adt('showModal', 'delete' as const))
                  }
                ]
              }
            ]
          });
        } else {
          return adt('links', [
            {
              button: true,
              outline: true,
              color: 'white',
              children: 'Delete',
              symbol_: leftPlacement(iconLinkSymbol('trash')),
              onClick: () => dispatch(adt('showModal', 'delete' as const))
            }
          ]);
        }
      case SWUProposalStatus.Submitted:
        return adt('links', [
          ...(isAcceptingProposals
            ? [{
                children: 'Edit',
                symbol_: leftPlacement(iconLinkSymbol('edit')),
                button: true,
                color: 'primary',
                disabled,
                loading: isStartEditingLoading,
                onClick: () => dispatch(adt('startEditing'))
              }]
            : []),
          {
            children: 'Withdraw',
            symbol_: leftPlacement(iconLinkSymbol('ban')),
            button: true,
            outline: true,
            color: 'white',
            disabled,
            loading: isWithdrawLoading,
            onClick: () => dispatch(adt('showModal', isAcceptingProposals ? 'withdrawBeforeDeadline' as const : 'withdrawAfterDeadline' as const))
          }
        ]) as PageContextualActions;
      case SWUProposalStatus.UnderReviewTeamQuestions:
      case SWUProposalStatus.UnderReviewCodeChallenge:
      case SWUProposalStatus.UnderReviewTeamScenario:
      case SWUProposalStatus.EvaluatedTeamQuestions:
      case SWUProposalStatus.EvaluatedCodeChallenge:
      case SWUProposalStatus.EvaluatedTeamScenario:
      case SWUProposalStatus.Awarded:
        return adt('links', [
          {
            children: 'Withdraw',
            symbol_: leftPlacement(iconLinkSymbol('ban')),
            button: true,
            outline: true,
            color: 'white',
            disabled,
            loading: isWithdrawLoading,
            onClick: () => dispatch(adt('showModal', 'withdrawAfterDeadline' as const))
          }
        ]);
      case SWUProposalStatus.Withdrawn:
        if (isAcceptingProposals) {
          return adt('links', [
            {
              children: 'Submit',
              symbol_: leftPlacement(iconLinkSymbol('paper-plane')),
              loading: isSubmitLoading,
              disabled,
              button: true,
              color: 'primary',
              onClick: () => dispatch(adt('showModal', 'submit' as const))
            },
            {
              children: 'Edit',
              symbol_: leftPlacement(iconLinkSymbol('edit')),
              button: true,
              color: 'info',
              disabled,
              loading: isStartEditingLoading,
              onClick: () => dispatch(adt('startEditing'))
            }
          ]);
        } else {
          return null;
        }
      default:
        return null;
    }
  })
};
