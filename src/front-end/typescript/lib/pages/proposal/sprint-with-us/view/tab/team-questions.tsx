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
import Accordion from 'front-end/lib/views/accordion';
import { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import { ProposalMarkdown } from 'front-end/lib/views/markdown';
import ReportCardList from 'front-end/lib/views/report-card-list';
import Separator from 'front-end/lib/views/separator';
import React from 'react';
import { Alert, Col, Row } from 'reactstrap';
import { countWords } from 'shared/lib';
import { canSWUOpportunityBeScreenedInToCodeChallenge, getQuestionByOrder, hasSWUOpportunityPassedCodeChallenge, hasSWUOpportunityPassedTeamQuestions, SWUOpportunity } from 'shared/lib/resources/opportunity/sprint-with-us';
import { NUM_SCORE_DECIMALS, SWUProposal, SWUProposalStatus, SWUProposalTeamQuestionResponse, UpdateTeamQuestionScoreBody } from 'shared/lib/resources/proposal/sprint-with-us';
import { adt, ADT } from 'shared/lib/types';
import { invalid } from 'shared/lib/validation';
import { validateTeamQuestionScoreScore } from 'shared/lib/validation/proposal/sprint-with-us';

type ModalId = 'enterScore';

export interface State extends Tab.Params {
  showModal: ModalId | null;
  enterScoreLoading: number;
  screenToFromLoading: number;
  openAccordions: Set<number>;
  scores: Array<Immutable<NumberField.State>>;
}

export type InnerMsg
  = ADT<'toggleAccordion', number>
  | ADT<'showModal', ModalId>
  | ADT<'hideModal'>
  | ADT<'submitScore'>
  | ADT<'screenIn'>
  | ADT<'screenOut'>
  | ADT<'scoreMsg', [number, NumberField.Msg]>; //[index, msg]

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

async function initScores(opp: SWUOpportunity, prop: SWUProposal): Promise<Array<Immutable<NumberField.State>>> {
  return await Promise.all((prop.teamQuestionResponses || []).map(async (r, i) => {
    const question = getQuestionByOrder(opp, r.order);
    return immutable(await NumberField.init({
      errors: [],
      validate: v => {
        if (v === null) { return invalid(['Please enter a valid score.']); }
        return validateTeamQuestionScoreScore(v, question?.score || 0);
      },
      child: {
        step: 0.01,
        value: r.score === null || r.score === undefined ? null : r.score,
        id: `swu-proposal-question-score-${i}`
      }
    }));
  }));
}

const init: Init<Tab.Params, State> = async params => {
  return {
    ...params,
    showModal: null,
    screenToFromLoading: 0,
    enterScoreLoading: 0,
    openAccordions: new Set(params.proposal.teamQuestionResponses.map((p, i) => i)),
    scores: await initScores(params.opportunity, params.proposal)
  };
};

const startScreenToFromLoading = makeStartLoading<State>('screenToFromLoading');
const stopScreenToFromLoading = makeStopLoading<State>('screenToFromLoading');
const startEnterScoreLoading = makeStartLoading<State>('enterScoreLoading');
const stopEnterScoreLoading = makeStopLoading<State>('enterScoreLoading');

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'toggleAccordion':
      return [state.update('openAccordions', s => {
        if (s.has(msg.value)) {
          s.delete(msg.value);
        } else {
          s.add(msg.value);
        }
        return s;
      })];
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
          const scores = state.proposal.teamQuestionResponses.reduce((acc, r, i) => {
            if (!acc) { return null; }
            const field = state.scores[i];
            if (!field) { return null; }
            const score = FormField.getValue(field);
            if (score === null) { return null; }
            acc.push({
              order: r.order,
              score
            });
            return acc;
          }, [] as UpdateTeamQuestionScoreBody[] | null);
          if (scores === null) { return state; }
          const result = await api.proposals.swu.update(state.proposal.id, adt('scoreQuestions', scores));
          switch (result.tag) {
            case 'valid':
              dispatch(toast(adt('success', toasts.scored.success('Team Questions'))));
              return state
                .set('scores', await initScores(state.opportunity, result.value))
                .set('showModal', null)
                .set('proposal', result.value);
            case 'invalid': {
              dispatch(toast(adt('error', toasts.scored.error('Team Questions'))));
              let scores = state.scores;
              if (result.value.proposal && result.value.proposal.tag === 'scoreQuestions') {
                scores = result.value.proposal.value.map((e, i) => FormField.setErrors(scores[i], e.score || []));
              }
              return state.set('scores', scores);
            }
            case 'unhandled':
              dispatch(toast(adt('error', toasts.scored.error('Team Questions'))));
              return state;
          }
        }
      ];
    case 'screenIn':
      return [
        startScreenToFromLoading(state).set('showModal', null),
        async (state, dispatch) => {
          state = stopScreenToFromLoading(state);
          const result = await api.proposals.swu.update(state.proposal.id, adt('screenInToCodeChallenge', ''));
          switch (result.tag) {
            case 'valid':
              dispatch(toast(adt('success', toasts.screenedIn.success)));
              return state
                .set('scores', await initScores(state.opportunity, result.value))
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
          const result = await api.proposals.swu.update(state.proposal.id, adt('screenOutFromCodeChallenge', ''));
          switch (result.tag) {
            case 'valid':
              dispatch(toast(adt('success', toasts.screenedOut.success)));
              return state
                .set('scores', await initScores(state.opportunity, result.value))
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
        childStatePath: ['scores', String(msg.value[0])],
        childUpdate: NumberField.update,
        childMsg: msg.value[1],
        mapChildMsg: value => (adt('scoreMsg', [msg.value[0], value]) as Msg)
      });
    default:
      return [state];
  }
};

interface TeamQuestionResponseViewProps {
  opportunity: SWUOpportunity;
  response: SWUProposalTeamQuestionResponse;
  index: number;
  isOpen: boolean;
  className?: string;
  toggleAccordion(): void;
}

const TeamQuestionResponseView: View<TeamQuestionResponseViewProps> = ({ opportunity, response, index, isOpen, className, toggleAccordion }) => {
  const question = getQuestionByOrder(opportunity, response.order);
  if (!question) { return null; }
  return (
    <Accordion
      className={className}
      toggle={() => toggleAccordion()}
      color='info'
      title={`Question ${index + 1}`}
      titleClassName='h3 mb-0'
      chevronWidth={1.5}
      chevronHeight={1.5}
      open={isOpen}>
      <p style={{ whiteSpace: 'pre-line' }}>
        {question.question}
      </p>
      <div className='mb-3 small text-secondary d-flex flex-column flex-sm-row flex-nowrap'>
        <div className='mb-2 mb-sm-0'>{countWords(response.response)} / {question.wordLimit} word{question.wordLimit === 1 ? '' : 's'}</div>
        <Separator spacing='2' color='secondary' className='d-none d-sm-block'>|</Separator>
        <div>
          {response.score === undefined || response.score === null
            ? `Unscored (${question.score} point${question.score === 1 ? '' : 's'} available)`
            : `${response.score} / ${question.score} point${question.score === 1 ? '' : 's'}`}
        </div>
      </div>
      <Alert color='primary' fade={false} className='mb-4'>
        <div style={{ whiteSpace: 'pre-line' }}>
          {question.guideline}
        </div>
      </Alert>
      <ProposalMarkdown
        box
        source={response.response || EMPTY_STRING} />
    </Accordion>
  );
};

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  const show = hasSWUOpportunityPassedTeamQuestions(state.opportunity);
  return (
    <div>
      <ViewTabHeader proposal={state.proposal} viewerUser={state.viewerUser} />
      {state.proposal.questionsScore !== null && state.proposal.questionsScore !== undefined
        ? (<Row className='mt-5'>
            <Col xs='12'>
              <ReportCardList
                reportCards={[{
                  icon: 'star-full',
                  iconColor: 'c-report-card-icon-highlight',
                  name: 'Team Questions Score',
                  value: `${String(state.proposal.questionsScore.toFixed(NUM_SCORE_DECIMALS))}%`
                }]} />
            </Col>
          </Row>)
        : null}
      <div className='mt-5 pt-5 border-top'>
        <Row>
          <Col xs='12'>
            {show
              ? (
                  <div>
                    <h3 className='mb-4'>Team Questions{'\''} Responses</h3>
                    {state.proposal.teamQuestionResponses.map((r, i, rs) => (
                      <TeamQuestionResponseView
                        key={`swu-proposal-team-question-response-${i}`}
                        className={i < rs.length - 1 ? 'mb-4' : ''}
                        opportunity={state.opportunity}
                        isOpen={state.openAccordions.has(i)}
                        toggleAccordion={() => dispatch(adt('toggleAccordion', i))}
                        index={i}
                        response={r} />
                    ))}
                  </div>
                )
              : 'This proposal\'s team questions will be available once the opportunity closes.'}
          </Col>
        </Row>
      </div>
    </div>
  );
};

function isValid(state: Immutable<State>): boolean {
  return state.scores.reduce((acc, s) => acc && FormField.isValid(s), true as boolean);
}

export const component: Tab.Component<State, Msg> = {
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
              <p>Provide a score for each team question response submitted by the proponent.</p>
              {state.scores.map((s, i) => {
                return (<NumberField.view
                  key={`swu-proposal-question-score-field-${i}`}
                  extraChildProps={{ suffix: 'point(s)' }}
                  required
                  disabled={isEnterScoreLoading}
                  label={`Question ${i + 1} Score`}
                  placeholder='Score'
                  dispatch={mapComponentDispatch(dispatch, v => adt('scoreMsg' as const, [i, v]) as Msg)}
                  state={s} />);
              })}
            </div>
          )
        };
      case null:
        return null;
    }
  },

  getContextualActions: ({ state, dispatch }) => {
    const proposal = state.proposal;
    const propStatus = proposal.status;
    const isScreenToFromLoading = state.screenToFromLoading > 0;
    switch (propStatus) {
      case SWUProposalStatus.UnderReviewTeamQuestions:
        return adt('links', [
          {
            children: 'Enter Score',
            symbol_: leftPlacement(iconLinkSymbol('star-full')),
            button: true,
            color: 'primary',
            onClick: () => dispatch(adt('showModal', 'enterScore' as const))
          }
        ]);
      case SWUProposalStatus.EvaluatedTeamQuestions:
        return adt('links', [
          ...(canSWUOpportunityBeScreenedInToCodeChallenge(state.opportunity)
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
      case SWUProposalStatus.UnderReviewCodeChallenge:
        if (hasSWUOpportunityPassedCodeChallenge(state.opportunity)) {
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
