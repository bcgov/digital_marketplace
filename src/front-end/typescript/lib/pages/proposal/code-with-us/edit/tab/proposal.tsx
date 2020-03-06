import { EMPTY_STRING } from 'front-end/config';
import { getContextualActionsValid, getModalValid, makeStartLoading, makeStopLoading, updateValid, viewValid } from 'front-end/lib';
import { Route } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, PageContextualActions, replaceRoute, Update, updateComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Tab from 'front-end/lib/pages/proposal/code-with-us/edit/tab';
import * as Form from 'front-end/lib/pages/proposal/code-with-us/lib/components/form';
import EditTabHeader from 'front-end/lib/pages/proposal/code-with-us/lib/views/edit-tab-header';
import { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import ReportCardList, { ReportCard } from 'front-end/lib/views/report-card-list';
import { compact } from 'lodash';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { formatAmount, formatDate } from 'shared/lib';
import { AffiliationSlim } from 'shared/lib/resources/affiliation';
import { CWUOpportunity } from 'shared/lib/resources/opportunity/code-with-us';
import { CWUProposal, CWUProposalStatus } from 'shared/lib/resources/proposal/code-with-us';
import { adt, ADT } from 'shared/lib/types';
import { invalid, isInvalid, valid, Validation } from 'shared/lib/validation';

type ModalId = 'score' | 'disqualify';

interface ValidState extends Tab.Params {
  opportunity: CWUOpportunity;
  affiliations: AffiliationSlim[];
  isEditing: boolean;
  startEditingLoading: number;
  saveChangesLoading: number;
  saveChangesAndSubmitLoading: number;
  submitLoading: number;
  withdrawLoading: number;
  deleteLoading: number;
  showModal: ModalId | null;
  form: Immutable<Form.State>;
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
  | ADT<'startEditing'>
  | ADT<'cancelEditing'>
  | ADT<'saveChanges'>
  | ADT<'saveChangesAndSubmit'>
  | ADT<'submit'>
  | ADT<'withdraw'>
  | ADT<'delete'>
  | ADT<'noop'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

async function initForm(opportunity: CWUOpportunity, affiliations: AffiliationSlim[], proposal: CWUProposal, activeTab?: Form.TabId): Promise<Immutable<Form.State>> {
  return immutable(await Form.init({
    opportunity,
    proposal,
    affiliations,
    activeTab
  }));
}

const init: Init<Tab.Params, State> = async params => {
  const { proposal } = params;
  // Fetch opportunity and affiliations.
  const opportunityResult = await api.opportunities.cwu.readOne(proposal.opportunity.id);
  const affiliationsResult = await api.affiliations.readMany();
  // Redirect to 404 page if there is a server error.
  if (!api.isValid(opportunityResult) || !api.isValid(affiliationsResult)) {
    return invalid(null);
  }
  const opportunity = opportunityResult.value;
  const affiliations = affiliationsResult.value;
  return valid(immutable({
    ...params,
    opportunity,
    affiliations,
    isEditing: false,
    startEditingLoading: 0,
    saveChangesLoading: 0,
    saveChangesAndSubmitLoading: 0,
    submitLoading: 0,
    withdrawLoading: 0,
    deleteLoading: 0,
    showModal: null,
    form: await initForm(opportunity, affiliations, proposal)
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

async function resetProposal(state: Immutable<ValidState>, proposal: CWUProposal): Promise<Immutable<ValidState>> {
  return state
    .set('form', await initForm(state.opportunity, state.affiliations, proposal, state.form.activeTab))
    .set('proposal', proposal);
}

const update: Update<State, Msg> = updateValid(({ state, msg }) => {
  switch (msg.tag) {
    case 'showModal':
      return [state.set('showModal', msg.value)];
    case 'hideModal':
      return [state.set('showModal', null)];
    case 'form':
      return updateComponentChild({
        state,
        childStatePath: ['form'],
        childUpdate: Form.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('form', value)
      });
    case 'startEditing':
      return [
        startStartEditingLoading(state),
        async state => {
          state = stopStartEditingLoading(state);
          const proposalResult = await api.proposals.cwu.readOne(state.proposal.opportunity.id, state.proposal.id);
          const affiliationsResult = await api.affiliations.readMany();
          if (!api.isValid(proposalResult) || !api.isValid(affiliationsResult)) { return state; }
          state = state
            .set('isEditing', true)
            .set('form', await initForm(state.opportunity, affiliationsResult.value, proposalResult.value, state.form.activeTab))
            .set('proposal', proposalResult.value);
          return state;
        }
      ];
    case 'cancelEditing':
      return [
        state.set('isEditing', false),
        async state => {
          return state.set('form', await initForm(state.opportunity, state.affiliations, state.proposal, state.form.activeTab));
        }
      ];
    case 'saveChanges':
      return [
        startSaveChangesLoading(state),
        async state => {
          state = stopSaveChangesLoading(state);
          const result = await Form.persist(state.form, adt('update', state.proposal.id));
          if (isInvalid(result)) {
            return state.set('form', result.value);
          }
          return (await resetProposal(state, result.value[1]))
            .set('isEditing', false);
        }
      ];
    case 'saveChangesAndSubmit':
      return [
        startSaveChangesAndSubmitLoading(state),
        async state => {
          state = stopSaveChangesAndSubmitLoading(state);
          const saveResult = await Form.persist(state.form, adt('update', state.proposal.id));
          if (isInvalid(saveResult)) {
            return state.set('form', saveResult.value);
          }
          const submitResult = await api.proposals.cwu.update(state.proposal.id, adt('submit', ''));
          if (!api.isValid(submitResult)) {
            return state;
          }
          state = state.set('isEditing', false);
          return await resetProposal(state, submitResult.value);
        }
      ];
    case 'submit':
      return [
        startSubmitLoading(state),
        async state => {
          state = stopSubmitLoading(state);
          const result = await api.proposals.cwu.update(state.proposal.id, adt('submit', ''));
          if (!api.isValid(result)) {
            return state;
          }
          return await resetProposal(state, result.value);
        }
      ];
    case 'withdraw':
      return [
        startWithdrawLoading(state),
        async state => {
          state = stopWithdrawLoading(state);
          const result = await api.proposals.cwu.update(state.proposal.id, adt('withdraw', ''));
          if (!api.isValid(result)) {
            return state;
          }
          return await resetProposal(state, result.value);
        }
      ];
    case 'delete':
      return [
        startDeleteLoading(state),
        async (state, dispatch) => {
          const result = await api.proposals.cwu.delete(state.proposal.id);
          if (!api.isValid(result)) {
            return stopDeleteLoading(state);
          }
          //TODO redirect to proposals list when ready
          dispatch(replaceRoute(adt('opportunities' as const, null)));
          return state;
        }
      ];
    default:
      return [state];
  }
});

const Reporting: ComponentView<ValidState, Msg> = ({ state }) => {
  const proposal = state.proposal;
  const showScoreAndRanking
     = proposal.status === CWUProposalStatus.Awarded
    || proposal.status === CWUProposalStatus.NotAwarded;
  const reportCards: Array<ReportCard | null> = [
    {
      icon: 'alarm-clock',
      name: 'Proposals Due',
      value: formatDate(proposal.opportunity.proposalDeadline)
    },
    showScoreAndRanking
      ? {
          icon: 'star-full',
          iconColor: 'yellow',
          name: 'Total Score',
          value: proposal.score ? `${proposal.score}%` : EMPTY_STRING
        }
      : null,
    showScoreAndRanking
      ? {
          icon: 'trophy',
          iconColor: 'yellow',
          name: 'Ranking',
          value: proposal.rank ? formatAmount(proposal.rank, undefined, true) : EMPTY_STRING
        }
      : null
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

  getModal: getModalValid<ValidState, Msg>(state => {
    switch (state.showModal) {
      default: return null;
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
    const isDraft = propStatus === CWUProposalStatus.Draft;
    if (state.isEditing) {
      return adt('links', compact([
        // Submit Changes
        isDraft
          ? {
              children: 'Submit Changes',
              symbol_: leftPlacement(iconLinkSymbol('paper-plane')),
              button: true,
              loading: isSaveChangesAndSubmitLoading,
              disabled: disabled || !isValid(),
              color: 'primary',
              onClick: () => dispatch(adt('saveChangesAndSubmit'))
            }
          : null,
        // Save Changes
        {
          children: isDraft ? 'Save Changes' : 'Submit Changes',
          disabled: disabled || (() => {
            if (isDraft) {
              // No validation required, always possible to save a draft.
              return false;
            } else {
              return !isValid();
            }
          })(),
          onClick: () => dispatch(adt('saveChanges')),
          button: true,
          loading: isSaveChangesLoading,
          symbol_: leftPlacement(iconLinkSymbol(isDraft ? 'save' : 'paper-plane')),
          color: isDraft ? 'success' : 'primary'
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
      case CWUProposalStatus.Draft:
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
                  onClick: () => dispatch(adt('submit'))
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
                  symbol_: leftPlacement(iconLinkSymbol('user-slash')),
                  onClick: () => dispatch(adt('delete'))
                }
              ]
            }
          ]
        });
      case CWUProposalStatus.Submitted:
        return adt('links', [
          {
            children: 'Edit',
            symbol_: leftPlacement(iconLinkSymbol('edit')),
            button: true,
            color: 'primary',
            disabled,
            loading: isStartEditingLoading,
            onClick: () => dispatch(adt('startEditing'))
          },
          {
            children: 'Withdraw',
            symbol_: leftPlacement(iconLinkSymbol('ban')),
            button: true,
            outline: true,
            color: 'white',
            disabled,
            loading: isWithdrawLoading,
            onClick: () => dispatch(adt('withdraw'))
          }
        ]);
      case CWUProposalStatus.UnderReview:
      case CWUProposalStatus.Evaluated:
      case CWUProposalStatus.Awarded:
        return adt('links', [
          {
            children: 'Withdraw',
            symbol_: leftPlacement(iconLinkSymbol('ban')),
            button: true,
            outline: true,
            color: 'white',
            disabled,
            loading: isWithdrawLoading,
            onClick: () => dispatch(adt('withdraw'))
          }
        ]);
      default:
        return null;
    }
  })
};
