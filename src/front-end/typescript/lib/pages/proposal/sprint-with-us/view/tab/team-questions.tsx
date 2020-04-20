import { EMPTY_STRING } from 'front-end/config';
import { Route } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, Init, Update, View } from 'front-end/lib/framework';
import ViewTabHeader from 'front-end/lib/pages/proposal/sprint-with-us/lib/views/view-tab-header';
import * as Tab from 'front-end/lib/pages/proposal/sprint-with-us/view/tab';
import Accordion from 'front-end/lib/views/accordion';
import Link, { iconLinkSymbol, rightPlacement, routeDest } from 'front-end/lib/views/link';
import Markdown from 'front-end/lib/views/markdown';
import Separator from 'front-end/lib/views/separator';
import React from 'react';
import { Alert, Col, Row } from 'reactstrap';
import { countWords } from 'shared/lib';
import { hasSWUOpportunityPassedTeamQuestions, SWUOpportunity, SWUTeamQuestion } from 'shared/lib/resources/opportunity/sprint-with-us';
import { SWUProposalTeamQuestionResponse } from 'shared/lib/resources/proposal/sprint-with-us';
import { adt, ADT } from 'shared/lib/types';

export interface State extends Tab.Params {
  openAccordions: Set<number>;
}

export type InnerMsg
  = ADT<'toggleAccordion', number>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

const init: Init<Tab.Params, State> = async params => {
  return {
    ...params,
    openAccordions: new Set()
  };
};

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

function getQuestionByOrder(opp: SWUOpportunity, order: number): SWUTeamQuestion | null {
  for (const q of opp.teamQuestions) {
    if (q.order === order) {
      return q;
    }
  }
  return null;
}

const TeamQuestionResponseView: View<TeamQuestionResponseViewProps> = ({ opportunity, response, index, isOpen, className, toggleAccordion }) => {
  const question = getQuestionByOrder(opportunity, response.order);
  if (!question) { return null; }
  return (
    <Accordion
      className={className}
      toggle={() => toggleAccordion()}
      color='blue-dark'
      title={`Question ${index + 1}`}
      titleClassName='h3 mb-0'
      chevronWidth={1.5}
      chevronHeight={1.5}
      open={isOpen}>
      <p>{question.question}</p>
      <div className='mb-3 small text-secondary d-flex flex-row flex-nowrap'>
        {countWords(response.response)} / {question.wordLimit} word{question.wordLimit === 1 ? '' : 's'}
        <Separator spacing='2' color='secondary' className='d-none d-md-block'>|</Separator>
        {response.score === undefined || response.score === null ? EMPTY_STRING : response.score} / {question.score} point{question.score === 1 ? '' : 's'}
      </div>
      <Alert color='primary' fade={false} className='mb-4'>
        {question.guideline}
      </Alert>
      <Markdown
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
      {show
        ? (<Row>
            <Col xs='12'>
              <Link
                newTab
                color='info'
                className='mt-3'
                dest={routeDest(adt('proposalSWUExportOne', { opportunityId: state.proposal.opportunity.id, proposalId: state.proposal.id }))}
                symbol_={rightPlacement(iconLinkSymbol('file-export'))}>
                Export Team Questions
              </Link>
            </Col>
          </Row>)
        : null}
      <div className='mt-5 pt-5 border-top'>
        <Row>
          <Col xs='12'>
            {show
              ? (
                  <div>
                    <h3 className='mb-4'>Team Questions' Responses</h3>
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

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view
};
