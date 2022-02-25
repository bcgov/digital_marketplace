import { EMPTY_STRING } from 'front-end/config';
import { makeStartLoading, makeStopLoading } from 'front-end/lib';
import { Route } from 'front-end/lib/app/types';
import * as FormField from 'front-end/lib/components/form-field';
import * as NumberField from 'front-end/lib/components/form-field/number';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, PageContextualActions, toast, Update, updateComponentChild, View } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as toasts from 'front-end/lib/pages/proposal/sprint-with-us/lib/toasts';
import ViewTabHeader from 'front-end/lib/pages/proposal/sprint-with-us/lib/views/view-tab-header';
import * as Tab from 'front-end/lib/pages/proposal/sprint-with-us/view/tab';
import Link, { externalDest, iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import ReportCardList from 'front-end/lib/views/report-card-list';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { canSWUOpportunityBeScreenedInToTeamScenario, hasSWUOpportunityPassedCodeChallenge, hasSWUOpportunityPassedTeamScenario } from 'shared/lib/resources/opportunity/sprint-with-us';
import { isSWUProposalInCodeChallenge, NUM_SCORE_DECIMALS, SWUProposal, SWUProposalStatus, swuProposalTeamMembers } from 'shared/lib/resources/proposal/sprint-with-us';
import { gitHubProfileLink } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';
import { invalid } from 'shared/lib/validation';
import { validateCodeChallengeScore } from 'shared/lib/validation/proposal/sprint-with-us';

type ModalId = 'enterScore';

export interface State extends Tab.Params {
  showModal: ModalId | null;
  enterScoreLoading: number;
  screenToFromLoading: number;
  score: Immutable<NumberField.State>;
}

export type InnerMsg
  = ADT<'showModal', ModalId>
  | ADT<'hideModal'>
  | ADT<'submitScore'>
  | ADT<'screenIn'>
  | ADT<'screenOut'>
  | ADT<'scoreMsg', NumberField.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

async function initScore(p: SWUProposal): Promise<Immutable<NumberField.State>> {
  return immutable(await NumberField.init({
    errors: [],
    validate: v => {
      if (v === null) { return invalid(['Please enter a valid score.']); }
      return validateCodeChallengeScore(v);
    },
    child: {
      step: 0.01,
      value: p.challengeScore === null || p.challengeScore === undefined ? null : p.challengeScore,
      id: 'swu-proposal-code-challenge-score'
    }
  }));
}

const init: Init<Tab.Params, State> = async params => {
  return {
    ...params,
    showModal: null,
    screenToFromLoading: 0,
    enterScoreLoading: 0,
    score: await initScore(params.proposal)
  };
};

const startScreenToFromLoading = makeStartLoading<State>('screenToFromLoading');
const stopScreenToFromLoading = makeStopLoading<State>('screenToFromLoading');
const startEnterScoreLoading = makeStartLoading<State>('enterScoreLoading');
const stopEnterScoreLoading = makeStopLoading<State>('enterScoreLoading');

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'showModal':
      return [state.set('showModal', msg.value)];
    case 'hideModal':
      if (state.enterScoreLoading > 0) { return [state]; }
      return [state.set('showModal', null)];
    case 'submitScore':
      return [
        startEnterScoreLoading(state),
        async (state, dispatch) => {
          state = stopEnterScoreLoading(state);
          const score = FormField.getValue(state.score);
          if (score === null) { return state; }
          const result = await api.proposals.swu.update(state.proposal.id, adt('scoreCodeChallenge', score));
          switch (result.tag) {
            case 'valid':
              dispatch(toast(adt('success', toasts.scored.success('Code Challenge'))));
              return state
                .set('score', await initScore(result.value))
                .set('showModal', null)
                .set('proposal', result.value);
            case 'invalid': {
              dispatch(toast(adt('error', toasts.scored.error('Code Challenge'))));
              let score = state.score;
              if (result.value.proposal && result.value.proposal.tag === 'scoreCodeChallenge') {
                score = FormField.setErrors(score, result.value.proposal.value);
              }
              return state.set('score', score);
            }
            case 'unhandled':
              dispatch(toast(adt('error', toasts.scored.error('Code Challenge'))));
              return state;
          }
        }
      ];
    case 'screenIn':
      return [
        startScreenToFromLoading(state).set('showModal', null),
        async (state, dispatch) => {
          state = stopScreenToFromLoading(state);
          const result = await api.proposals.swu.update(state.proposal.id, adt('screenInToTeamScenario', ''));
          switch (result.tag) {
            case 'valid':
              dispatch(toast(adt('success', toasts.screenedIn.success)));
              return state
                .set('score', await initScore(result.value))
                .set('proposal', result.value);
            case 'invalid':
            case 'unhandled':
              return state;
          }
        }
      ];
    case 'screenOut':
      return [
        startScreenToFromLoading(state).set('showModal', null),
        async (state, dispatch) => {
          state = stopScreenToFromLoading(state);
          const result = await api.proposals.swu.update(state.proposal.id, adt('screenOutFromTeamScenario', ''));
          switch (result.tag) {
            case 'valid':
              dispatch(toast(adt('success', toasts.screenedOut.success)));
              return state
                .set('score', await initScore(result.value))
                .set('proposal', result.value);
            case 'invalid':
            case 'unhandled':
              return state;
          }
        }
      ];
    case 'scoreMsg':
      return updateComponentChild({
        state,
        childStatePath: ['score'],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: value => (adt('scoreMsg', value) as Msg)
      });
    default:
      return [state];
  }
};

const Participants: View<Pick<State, 'proposal'>> = ({ proposal }) => {
  const participants = swuProposalTeamMembers(proposal, true);
  return (
    <div>
      <h4 className='mb-4'>Participants</h4>
      <div className='table-responsive'>
        <table className='table-hover'>
          <thead>
            <tr>
              <th style={{ width: '100%' }}>Name</th>
              <th className='text-nowrap' style={{ width: '0px' }}>GitHub Profile</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p, i) => {
              const username = p.idpUsername;
              return (
                <tr key={`participant-${i}`}>
                  <td>{p.member.name}</td>
                  <td className='text-nowrap'>
                    {username
                      ? (<Link dest={externalDest(gitHubProfileLink(username))} newTab>{username}</Link>)
                      : EMPTY_STRING}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <div>
      <ViewTabHeader proposal={state.proposal} viewerUser={state.viewerUser} />
        {state.proposal.challengeScore !== null && state.proposal.challengeScore !== undefined
          ? (<Row className='mt-5'>
              <Col xs='12'>
                <ReportCardList
                  reportCards={[{
                    icon: 'star-full',
                    iconColor: 'c-report-card-icon-highlight',
                    name: 'Code Challenge Score',
                    value: `${String(state.proposal.challengeScore.toFixed(NUM_SCORE_DECIMALS))}%`
                  }]} />
              </Col>
            </Row>)
          : null}
          <Row className='mt-5'>
            <Col xs='12'>
              <div className='pt-5 border-top'>
                {hasSWUOpportunityPassedCodeChallenge(state.opportunity) && isSWUProposalInCodeChallenge(state.proposal)
                  ? (<Participants proposal={state.proposal} />)
                  : 'If this proposal is screened into the Code Challenge, it can be scored once the opportunity has reached the Code Challenge too.'}
              </div>
            </Col>
          </Row>
    </div>
  );
};

function isValid(state: Immutable<State>): boolean {
  return FormField.isValid(state.score);
}

export const component: Tab.Component<State,  Msg> = {
  init,
  update,
  view,

  getModal: state => {
    const isEnterScoreLoading = state.enterScoreLoading > 0;
    const valid = isValid(state);
    switch (state.showModal) {
      case 'enterScore':
        return {
          title: 'Enter Score',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Submit Score',
              icon: 'star-full',
              color: 'primary',
              button: true,
              loading: isEnterScoreLoading,
              disabled: isEnterScoreLoading || !valid,
              msg: adt('submitScore')
            },
            {
              text: 'Cancel',
              color: 'secondary',
              disabled: isEnterScoreLoading,
              msg: adt('hideModal')
            }
          ],
          body: dispatch => (
            <div>
              <p>Provide a score for the proponent{'\''}s Code Challenge.</p>
              <NumberField.view
                extraChildProps={{ suffix: '%' }}
                required
                disabled={isEnterScoreLoading}
                label='Code Challenge Score'
                placeholder='Code Challenge Score'
                help={`Enter the score of this proponent's submission for the Code Challenge stage of the evaluation process as a percentage (up to two decimal places).`}
                dispatch={mapComponentDispatch(dispatch, v => adt('scoreMsg' as const, v))}
                state={state.score} />
            </div>
          )
        };
      case null:
        return null;
    }
  },

  getContextualActions: ({ state, dispatch }) => {
    if (!hasSWUOpportunityPassedCodeChallenge(state.opportunity)) { return null; }
    const proposal = state.proposal;
    const propStatus = proposal.status;
    const isScreenToFromLoading = state.screenToFromLoading > 0;
    switch (propStatus) {
      case SWUProposalStatus.UnderReviewCodeChallenge:
        return adt('links', [
          {
            children: 'Enter Score',
            symbol_: leftPlacement(iconLinkSymbol('star-full')),
            button: true,
            color: 'primary',
            onClick: () => dispatch(adt('showModal', 'enterScore' as const))
          }
        ]);
      case SWUProposalStatus.EvaluatedCodeChallenge:
        return adt('links', [
          ...(canSWUOpportunityBeScreenedInToTeamScenario(state.opportunity)
            ? [{
                children: 'Screen In',
                symbol_: leftPlacement(iconLinkSymbol('stars')),
                loading: isScreenToFromLoading,
                disabled: isScreenToFromLoading,
                button: true,
                color: 'primary',
                onClick: () => dispatch(adt('screenIn' as const))
              }]
            : []),
          {
            children: 'Edit Score',
            symbol_: leftPlacement(iconLinkSymbol('star-full')),
            disabled: isScreenToFromLoading,
            button: true,
            color: 'info',
            onClick: () => dispatch(adt('showModal', 'enterScore' as const))
          }
        ]) as PageContextualActions;
      case SWUProposalStatus.UnderReviewTeamScenario:
        if (hasSWUOpportunityPassedTeamScenario(state.opportunity)) {
          return null;
        }
        return adt('links', [
          {
            children: 'Screen Out',
            symbol_: leftPlacement(iconLinkSymbol('ban')),
            loading: isScreenToFromLoading,
            disabled: isScreenToFromLoading,
            button: true,
            color: 'danger',
            onClick: () => dispatch(adt('screenOut' as const))
          }
        ]);
      default:
        return null;
    }
  }
};
