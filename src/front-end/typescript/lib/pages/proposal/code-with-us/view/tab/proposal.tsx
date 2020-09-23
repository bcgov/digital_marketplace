import { EMPTY_STRING } from 'front-end/config';
import { getContextualActionsValid, getModalValid, makeStartLoading, makeStopLoading, updateValid, viewValid } from 'front-end/lib';
import { Route } from 'front-end/lib/app/types';
import * as FormField from 'front-end/lib/components/form-field';
import * as LongText from 'front-end/lib/components/form-field/long-text';
import * as NumberField from 'front-end/lib/components/form-field/number';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, toast, Update, updateComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Tab from 'front-end/lib/pages/proposal/code-with-us/edit/tab';
import * as Form from 'front-end/lib/pages/proposal/code-with-us/lib/components/form';
import * as toasts from 'front-end/lib/pages/proposal/code-with-us/lib/toasts';
import ViewTabHeader from 'front-end/lib/pages/proposal/code-with-us/lib/views/view-tab-header';
import { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import ReportCardList, { ReportCard } from 'front-end/lib/views/report-card-list';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { formatAmount } from 'shared/lib';
import { CWUOpportunity } from 'shared/lib/resources/opportunity/code-with-us';
import { CWUProposal, CWUProposalStatus, NUM_SCORE_DECIMALS } from 'shared/lib/resources/proposal/code-with-us';
import { User } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';
import { validateDisqualificationReason, validateScore } from 'shared/lib/validation/proposal/code-with-us';

type ModalId
  = 'score'
  | 'disqualify'
  | 'award';

interface ValidState extends Tab.Params {
  scoreLoading: number;
  disqualifyLoading: number;
  awardLoading: number;
  showModal: ModalId | null;
  opportunity: CWUOpportunity;
  form: Immutable<Form.State>;
  score: Immutable<NumberField.State>;
  disqualificationReason: Immutable<LongText.State>;
}

export type State = Validation<Immutable<ValidState>, null>;

export type InnerMsg
  = ADT<'hideModal'>
  | ADT<'showModal', ModalId>
  | ADT<'form', Form.Msg>
  | ADT<'scoreMsg', NumberField.Msg>
  | ADT<'disqualificationReasonMsg', LongText.Msg>
  | ADT<'submitScore'>
  | ADT<'disqualify'>
  | ADT<'award'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

async function initForm(opportunity: CWUOpportunity, proposal: CWUProposal, viewerUser: User): Promise<Immutable<Form.State>> {
  return immutable(await Form.init({
    viewerUser,
    opportunity,
    proposal,
    affiliations: [],
    canRemoveExistingAttachments: false
  }));
}

const init: Init<Tab.Params, State> = async params => {
  const { proposal } = params;
  // Fetch opportunity.
  const opportunityResult = await api.opportunities.cwu.readOne(proposal.opportunity.id);
  // Redirect to 404 page if there is a server error.
  if (!api.isValid(opportunityResult)) {
    return invalid(null);
  }
  const opportunity = opportunityResult.value;
  return valid(immutable({
    ...params,
    showModal: null,
    scoreLoading: 0,
    disqualifyLoading: 0,
    awardLoading: 0,
    opportunity,
    form: await initForm(opportunity, proposal, params.viewerUser),
    score: immutable(await NumberField.init({
      errors: [],
      validate: v => {
        if (v === null) { return invalid(['Please enter a valid score.']); }
        return validateScore(v);
      },
      child: {
        value: proposal.score !== undefined ? proposal.score : null,
        id: 'cwu-proposal-score',
        min: 1,
        max: 100,
        step: 0.01
      }
    })),
    disqualificationReason: immutable(await LongText.init({
      errors: [],
      validate: validateDisqualificationReason,
      child: {
        value: '',
        id: 'cwu-proposal-disqualification-reason'
      }
    }))
  }));
};

const startScoreLoading = makeStartLoading<ValidState>('scoreLoading');
const stopScoreLoading = makeStopLoading<ValidState>('scoreLoading');
const startDisqualifyLoading = makeStartLoading<ValidState>('disqualifyLoading');
const stopDisqualifyLoading = makeStopLoading<ValidState>('disqualifyLoading');
const startAwardLoading = makeStartLoading<ValidState>('awardLoading');
const stopAwardLoading = makeStopLoading<ValidState>('awardLoading');

const update: Update<State, Msg> = updateValid(({ state, msg }) => {
  switch (msg.tag) {
    case 'showModal':
      return [state.set('showModal', msg.value)];
    case 'hideModal':
      if (state.scoreLoading > 0 || state.disqualifyLoading > 0) {
        // Do nothing if the score or disqualify modals are loading.
        return [state];
      }
      return [state.set('showModal', null)];
    case 'form':
      return updateComponentChild({
        state,
        childStatePath: ['form'],
        childUpdate: Form.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('form', value)
      });
    case 'scoreMsg':
      return updateComponentChild({
        state,
        childStatePath: ['score'],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('scoreMsg', value)
      });
    case 'disqualificationReasonMsg':
      return updateComponentChild({
        state,
        childStatePath: ['disqualificationReason'],
        childUpdate: LongText.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('disqualificationReasonMsg', value)
      });
    case 'submitScore':
      return [
        startScoreLoading(state),
        async (state, dispatch) => {
          state = stopScoreLoading(state);
          const score = FormField.getValue(state.score);
          if (score === null) { return state; }
          const result = await api.proposals.cwu.update(state.proposal.id, adt('score', score));
          switch (result.tag) {
            case 'valid':
              dispatch(toast(adt('success', toasts.statusChanged.success(CWUProposalStatus.Evaluated))));
              return state
                .set('form', await initForm(state.opportunity, result.value, state.viewerUser))
                .set('showModal', null)
                .set('proposal', result.value);
            case 'invalid':
              dispatch(toast(adt('error', toasts.statusChanged.error(CWUProposalStatus.Evaluated))));
              return state.update('score', s => {
                if (result.value.proposal?.tag !== 'score') { return s; }
                return FormField.setErrors(s, result.value.proposal.value);
              });
            case 'unhandled':
              dispatch(toast(adt('error', toasts.statusChanged.error(CWUProposalStatus.Evaluated))));
              return state;
          }
        }
      ];
    case 'disqualify':
      return [
        startDisqualifyLoading(state),
        async (state, dispatch) => {
          state = stopDisqualifyLoading(state);
          const reason = FormField.getValue(state.disqualificationReason);
          const result = await api.proposals.cwu.update(state.proposal.id, adt('disqualify', reason));
          switch (result.tag) {
            case 'valid':
              dispatch(toast(adt('success', toasts.statusChanged.success(CWUProposalStatus.Disqualified))));
              return state
                .set('form', await initForm(state.opportunity, result.value, state.viewerUser))
                .set('showModal', null)
                .set('proposal', result.value);
            case 'invalid':
              dispatch(toast(adt('error', toasts.statusChanged.error(CWUProposalStatus.Disqualified))));
              return state.update('disqualificationReason', s => {
                if (result.value.proposal?.tag !== 'disqualify') { return s; }
                return FormField.setErrors(s, result.value.proposal.value);
              });
            case 'unhandled':
              dispatch(toast(adt('error', toasts.statusChanged.error(CWUProposalStatus.Disqualified))));
              return state;
          }
        }
      ];
    case 'award':
      return [
        startAwardLoading(state).set('showModal', null),
        async (state, dispatch) => {
          state = stopAwardLoading(state);
          const result = await api.proposals.cwu.update(state.proposal.id, adt('award', ''));
          if (!api.isValid(result)) {
            dispatch(toast(adt('error', toasts.awarded.error)));
            return state;
          }
          dispatch(toast(adt('success', toasts.awarded.success)));
          return state
            .set('form', await initForm(state.opportunity, result.value, state.viewerUser))
            .set('proposal', result.value);
        }
      ];
    default:
      return [state];
  }
});

const Reporting: ComponentView<ValidState, Msg> = ({ state }) => {
  const proposal = state.proposal;
  const reportCards: ReportCard[] = [
    {
      icon: 'star-full',
      iconColor: 'c-report-card-icon-highlight',
      name: 'Total Score',
      value: proposal.score ? `${proposal.score.toFixed(NUM_SCORE_DECIMALS)}%` : EMPTY_STRING
    },
    {
      icon: 'trophy',
      iconColor: 'c-report-card-icon-highlight',
      name: 'Ranking',
      value: proposal.rank ? formatAmount(proposal.rank, undefined, true) : EMPTY_STRING
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
      <ViewTabHeader proposal={state.proposal} viewerUser={state.viewerUser} />
      <Reporting {...props} />
      <Row className='mt-5'>
        <Col xs='12'>
          <Form.view
            disabled
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
    const isScoreLoading = state.scoreLoading > 0;
    const isDisqualifyLoading = state.disqualifyLoading > 0;
    switch (state.showModal) {
      case 'award':
        return {
          title: 'Award Code With Us Opportunity?',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Award Opportunity',
              icon: 'award',
              color: 'primary',
              button: true,
              msg: adt('award')
            },
            {
              text: 'Cancel',
              color: 'secondary',
              msg: adt('hideModal')
            }
          ],
          body: () => 'Are you sure you want to award this opportunity to this vendor? Once awarded, all of this opportunity\'s subscribers and vendors with submitted proposals will be notified accordingly.'
        };
      case 'score':
        return {
          title: 'Enter Score',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Submit Score',
              icon: 'star-full',
              color: 'primary',
              button: true,
              loading: isScoreLoading,
              disabled: isScoreLoading || !FormField.isValid(state.score),
              msg: adt('submitScore')
            },
            {
              text: 'Cancel',
              color: 'secondary',
              disabled: isScoreLoading,
              msg: adt('hideModal')
            }
          ],
          body: dispatch => (
            <div>
              <p>Provide a total score for the Vendor's Code With Us proposal.</p>
              <NumberField.view
                extraChildProps={{ suffix: '%' }}
                required
                disabled={isScoreLoading}
                label='Total Score'
                placeholder='e.g. 75%'
                help='Enter a score for the proponent’s proposal as a percentage (up to two decimal places).'
                dispatch={mapComponentDispatch(dispatch, v => adt('scoreMsg' as const, v))}
                state={state.score} />
            </div>
          )
        };
      case 'disqualify':
        return {
          title: 'Disqualification Reason',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Disqualify',
              icon: 'user-slash',
              color: 'danger',
              button: true,
              loading: isDisqualifyLoading,
              disabled: isDisqualifyLoading || !FormField.isValid(state.disqualificationReason),
              msg: adt('disqualify')
            },
            {
              text: 'Cancel',
              color: 'secondary',
              disabled: isDisqualifyLoading,
              msg: adt('hideModal')
            }
          ],
          body: dispatch => (
            <div>
              <p>Provide the reason why this Vendor has been disqualified from the Code With Us opportunity.</p>
              <LongText.view
                extraChildProps={{
                  style: { height: '180px' }
                }}
                disabled={isDisqualifyLoading}
                required
                label='Reason'
                placeholder='Reason'
                help='Provide a reason for the disqualification of the proponent. This reason will not be shared with the disqualified proponent and is for record-keeping purposes only.'
                dispatch={mapComponentDispatch(dispatch, v => adt('disqualificationReasonMsg' as const, v))}
                state={state.disqualificationReason} />
            </div>
          )
        };
      case null:
        return null;
    }
  }),

  getContextualActions: getContextualActionsValid(({ state, dispatch }) => {
    const proposal = state.proposal;
    const propStatus = proposal.status;
    switch (propStatus) {
      case CWUProposalStatus.UnderReview:
        return adt('links', [
          {
            children: 'Enter Score',
            symbol_: leftPlacement(iconLinkSymbol('star-full')),
            button: true,
            color: 'primary',
            onClick: () => dispatch(adt('showModal', 'score' as const))
          },
          {
            children: 'Disqualify',
            symbol_: leftPlacement(iconLinkSymbol('user-slash')),
            button: true,
            outline: true,
            color: 'white',
            onClick: () => dispatch(adt('showModal', 'disqualify' as const))
          }
        ]);
      case CWUProposalStatus.Evaluated:
        return adt('dropdown', {
          text: 'Actions',
          loading: false,
          linkGroups: [
            {
              links: [
                {
                  children: 'Award',
                  symbol_: leftPlacement(iconLinkSymbol('award')),
                  onClick: () => dispatch(adt('showModal', 'award' as const))
                },
                {
                  children: 'Edit Score',
                  symbol_: leftPlacement(iconLinkSymbol('star-full')),
                  onClick: () => dispatch(adt('showModal', 'score' as const))
                }
              ]
            },
            {
              links: [
                {
                  children: 'Disqualify',
                  symbol_: leftPlacement(iconLinkSymbol('user-slash')),
                  onClick: () => dispatch(adt('showModal', 'disqualify' as const))
                }
              ]
            }
          ]
        });
      case CWUProposalStatus.NotAwarded:
        return adt('links', [
          {
            children: 'Award',
            symbol_: leftPlacement(iconLinkSymbol('award')),
            button: true,
            color: 'primary',
            onClick: () => dispatch(adt('showModal', 'award' as const))
          }
        ]);
      default:
        return null;
    }
  })
};
