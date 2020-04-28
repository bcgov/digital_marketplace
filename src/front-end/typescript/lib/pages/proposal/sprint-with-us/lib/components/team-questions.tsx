import * as FormField from 'front-end/lib/components/form-field';
import * as RichMarkdownEditor from 'front-end/lib/components/form-field/rich-markdown-editor';
import { ComponentViewProps, Dispatch, immutable, Immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import Accordion from 'front-end/lib/views/accordion';
import Separator from 'front-end/lib/views/separator';
import { find } from 'lodash';
import React from 'react';
import { Alert, Col, Row } from 'reactstrap';
import { SWUTeamQuestion } from 'shared/lib/resources/opportunity/sprint-with-us';
import { CreateSWUProposalTeamQuestionResponseBody, CreateSWUProposalTeamQuestionResponseValidationErrors, SWUProposalTeamQuestionResponse } from 'shared/lib/resources/proposal/sprint-with-us';
import { adt, ADT } from 'shared/lib/types';
import * as proposalValidation from 'shared/lib/validation/proposal/sprint-with-us';

interface ResponseState {
  isAccordianOpen: boolean;
  question: SWUTeamQuestion;
  response: Immutable<RichMarkdownEditor.State>;
}

export interface State {
  responses: ResponseState[];
}

export type Msg
  = ADT<'toggleAccordion', number>
  | ADT<'response', [number, RichMarkdownEditor.Msg]>;

export interface Params {
  questions: SWUTeamQuestion[];
  responses: SWUProposalTeamQuestionResponse[];
}

export const init: Init<Params, State> = async ({ questions, responses }) => {
  return {
    responses: await Promise.all([...questions]
      .sort((a, b) => {
        if (a.order < b.order) {
          return -1;
        } else if (a.order > b.order) {
          return 1;
        } else {
          return 0;
        }
      })
      .map(async question => ({
        isAccordianOpen: false,
        question,
        response: immutable(await RichMarkdownEditor.init({
          errors: [],
          validate: v => proposalValidation.validateSWUProposalTeamQuestionResponseResponse(v, question.wordLimit),
          child: {
            value: find(responses, { order: question.order })?.response || '',
            id: `swu-proposal-team-question-response-${question.order}`,
            wordLimit: question.wordLimit
          }
        }))
      })))
  };
};

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'toggleAccordion':
      return [state.update('responses', rs => rs.map((r, i) => {
        return i === msg.value
          ? { ...r, isAccordianOpen: !r.isAccordianOpen }
          : r;
      }))];

    case 'response':
      return updateComponentChild({
        state,
        childStatePath: ['responses', String(msg.value[0]), 'response'],
        childUpdate: RichMarkdownEditor.update,
        childMsg: msg.value[1],
        mapChildMsg: value => adt('response', [msg.value[0], value]) as Msg
      });
  }
};

export type Values = CreateSWUProposalTeamQuestionResponseBody[];

export function getValues(state: Immutable<State>): Values {
  return state.responses.map(r => ({
    response: FormField.getValue(r.response),
    order: r.question.order
  }));
}

export type Errors = CreateSWUProposalTeamQuestionResponseValidationErrors[];

export function setErrors(state: Immutable<State>, errors: Errors = []): Immutable<State> {
  return errors.reduce((acc, e, i) => {
    return state
      .updateIn(['responses', i, 'response'], s => FormField.setErrors(s, e.response || []));
  }, state);
}

function isResponseValid(response: ResponseState): boolean {
  return FormField.isValid(response.response);
}

export function isValid(state: Immutable<State>): boolean {
  return state.responses.reduce((acc, r) => {
    return acc && isResponseValid(r);
  }, true as boolean);
}

interface ResponseViewProps {
  index: number;
  response: ResponseState;
  disabled?: boolean;
  dispatch: Dispatch<Msg>;
}

const ResponseView: View<ResponseViewProps> = props => {
  const { response, dispatch, index, disabled } = props;
  const isValid = isResponseValid(response);
  const title = `Question ${index + 1}`;
  return (
    <Accordion
      className={''}
      toggle={() => dispatch(adt('toggleAccordion', index))}
      color='info'
      title={title}
      titleClassName='h3 mb-0'
      icon={isValid ? undefined : 'exclamation-circle'}
      iconColor={isValid ? undefined : 'warning'}
      iconWidth={2}
      iconHeight={2}
      chevronWidth={1.5}
      chevronHeight={1.5}
      open={response.isAccordianOpen}>
      <p style={{ whiteSpace: 'pre-line' }}>{response.question.question}</p>
      <div className='mb-3 small text-secondary d-flex flex-row flex-nowrap'>
        {response.question.wordLimit} word limit
        <Separator spacing='2' color='secondary' className='d-none d-md-block'>|</Separator>
        Scored out of {response.question.score}
      </div>
      <Alert color='primary' fade={false} className='mb-4'>
        <div style={{ whiteSpace: 'pre-line' }}>
          {response.question.guideline}
        </div>
      </Alert>
      <RichMarkdownEditor.view
        extraChildProps={{}}
        required
        label={`${title} Response`}
        placeholder={`${title} Response`}
        help={`Provide your response to this question. You may use Markdown to write your response, however please do not include any images or links, as they will be redacted. Please ensure to stay within the question's response word limit.`}
        style={{ height: '50vh', minHeight: '400px' }}
        className='mb-0'
        disabled={disabled}
        state={response.response}
        dispatch={mapComponentDispatch(dispatch, value => adt('response', [index, value]) as Msg)} />
    </Accordion>
  );
};

interface Props extends ComponentViewProps<State, Msg> {
  disabled?: boolean;
}

export const view: View<Props> = props => {
  const { state, disabled } = props;
  return (
    <div>
      {state.responses.map((response, i) => (
        <Row key={`swu-proposal-team-question-response-${i}`}>
          <Col xs='12' className={i < state.responses.length - 1 ? 'mb-4' : ''}>
            <ResponseView
              index={i}
              disabled={disabled}
              response={response}
              dispatch={props.dispatch}
            />
          </Col>
        </Row>
      ))}
    </div>
  );
};
