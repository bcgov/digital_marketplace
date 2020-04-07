import * as FormField from 'front-end/lib/components/form-field';
import * as LongText from 'front-end/lib/components/form-field/long-text';
import * as NumberField from 'front-end/lib/components/form-field/number';
import { ComponentViewProps, Dispatch, immutable, Immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import Link, { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { CreateSWUTeamQuestionBody, CreateSWUTeamQuestionValidationErrors, SWUTeamQuestion } from 'shared/lib/resources/opportunity/sprint-with-us';
import { adt, ADT } from 'shared/lib/types';
import { invalid } from 'shared/lib/validation';
import * as opportunityValidation from 'shared/lib/validation/opportunity/sprint-with-us';

interface Question {
  question: Immutable<LongText.State>;
  guideline: Immutable<LongText.State>;
  wordLimit: Immutable<NumberField.State>;
  score: Immutable<NumberField.State>;
}

export interface State {
  questions: Question[];
}

export type Msg
  = ADT<'addQuestion'>
  | ADT<'deleteQuestion', number>
  | ADT<'questionText', { childMsg: LongText.Msg; qIndex: number; }>
  | ADT<'guidelineText', { childMsg: LongText.Msg; qIndex: number; }>
  | ADT<'wordLimit', { childMsg: NumberField.Msg; qIndex: number; }>
  | ADT<'score', { childMsg: NumberField.Msg; qIndex: number; }>;

export interface Params {
  questions: SWUTeamQuestion[];
}

export const init: Init<Params, State> = async ({ questions }) => {
  return {
    questions: await Promise.all([...questions]
      .sort((a, b) => {
        if (a.order < b.order) {
          return -1;
        } else if (a.order > b.order) {
          return 1;
        } else {
          return 0;
        }
      })
      .map(q => createQuestion(q)))
  };
};

async function createQuestion(question?: SWUTeamQuestion): Promise<Question> {
  const idNamespace = String(Math.random());
  return {
    question: immutable( await LongText.init({
      errors: [],
      validate: opportunityValidation.validateTeamQuestionQuestion,
      child: {
        value: question?.question || '',
        id: `${idNamespace}-team-questions-question`
      }
    })),
    guideline: immutable( await LongText.init({
      errors: [],
      validate: opportunityValidation.validateTeamQuestionGuideline,
      child: {
        value: question?.guideline || '',
        id: `${idNamespace}-team-questions-response-guidelines`
      }
    })),

    wordLimit: immutable(await NumberField.init({
      errors: [],
      validate: v => {
        if (v === null) { return invalid(['Please enter a valid word limit.']); }
        return opportunityValidation.validateTeamQuestionWordLimit(v);
      },
      child: {
        value: question ? question.wordLimit : null,
        id: `${idNamespace}-team-questions-word-limit`,
        min: 1
      }
    })),

    score: immutable(await NumberField.init({
      errors: [],
      validate: v => {
        if (v === null) { return invalid(['Please enter a valid score.']); }
        return opportunityValidation.validateTeamQuestionScore(v);
      },
      child: {
        value: question ? question.score : null,
        id: `${idNamespace}-team-questions-score`,
        min: 1
      }
    }))

  };
}

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {

    case 'addQuestion': {
      return [ state, async (state) => {
        return state.set('questions', [ ...state.questions, await createQuestion() ]);
      }];
    }

    case 'deleteQuestion': {
      return [ state, async (state) => {
        state.questions.splice(msg.value, 1);
        return state.set('questions', state.questions);
      }];
    }

    case 'questionText': {
      const componentMessage = msg.value.childMsg;
      const qIndex = msg.value.qIndex;
      return updateComponentChild({
        state,
        childStatePath: ['questions', `${qIndex}`, 'question'],
        childUpdate: LongText.update,
        childMsg: componentMessage,
        mapChildMsg: value => adt('questionText', { qIndex, childMsg: value } )
      });
    }

    case 'guidelineText': {
      const componentMessage = msg.value.childMsg;
      const qIndex = msg.value.qIndex;
      return updateComponentChild({
        state,
        childStatePath: ['questions', `${qIndex}`, 'guideline'],
        childUpdate: LongText.update,
        childMsg: componentMessage,
        mapChildMsg: value => adt('guidelineText', { qIndex, childMsg: value } )
      });
    }

    case 'wordLimit': {
      const componentMessage = msg.value.childMsg;
      const qIndex = msg.value.qIndex;
      return updateComponentChild({
        state,
        childStatePath: ['questions', `${qIndex}`, 'wordLimit'],
        childUpdate: NumberField.update,
        childMsg: componentMessage,
        mapChildMsg: value => adt('wordLimit', { qIndex, childMsg: value } )
      });
    }

    case 'score': {
      const componentMessage = msg.value.childMsg;
      const qIndex = msg.value.qIndex;
      return updateComponentChild({
        state,
        childStatePath: ['questions', `${qIndex}`, 'score'],
        childUpdate: NumberField.update,
        childMsg: componentMessage,
        mapChildMsg: value => adt('score', { qIndex, childMsg: value } )
      });
    }

  }
};

export type Values = CreateSWUTeamQuestionBody[];

export function getValues(state: Immutable<State>): Values | null {
  return state.questions.reduce<Values | null>((acc, q, order) => {
    if (!acc) { return acc; }
    const score = FormField.getValue(q.score);
    const wordLimit = FormField.getValue(q.wordLimit);
    if (score === null || wordLimit === null) { return null; }
    acc.push({
      question: FormField.getValue(q.question),
      guideline: FormField.getValue(q.guideline),
      wordLimit,
      score,
      order
    });
    return acc;
  }, []);
}

export type Errors = CreateSWUTeamQuestionValidationErrors[];

export function setErrors(state: Immutable<State>, errors: Errors = []): Immutable<State> {
  return errors.reduce((acc, e) => {
    return state
      .updateIn(['questions', e.order, 'question'], s => FormField.setErrors(s, e.question || []))
      .updateIn(['questions', e.order, 'guideline'], s => FormField.setErrors(s, e.guideline || []))
      .updateIn(['questions', e.order, 'wordLimit'], s => FormField.setErrors(s, e.wordLimit || []))
      .updateIn(['questions', e.order, 'score'], s => FormField.setErrors(s, e.score || []));
  }, state);
}

export function isValid(state: Immutable<State>): boolean {
  if (!state.questions.length) { return false; }
  return state.questions.reduce((acc, q) => {
    return acc
        && FormField.isValid(q.question)
        && FormField.isValid(q.guideline)
        && FormField.isValid(q.wordLimit)
        && FormField.isValid(q.score);
  }, true as boolean);
}

interface QuestionViewProps {
  index: number;
  question: Question;
  disabled?: boolean;
  dispatch: Dispatch<Msg>;
}

const QuestionView: View<QuestionViewProps> = props => {
  const { question, dispatch, index, disabled } = props;
  return (
    <div className='pb-5 mb-5 border-bottom'>
      <div className='d-flex align-items-center mb-4'>
        <h3 className='mb-0'>Question {index + 1}</h3>
        {disabled
          ? null
          : (<Link
              button
              outline
              size='sm'
              color='blue-dark'
              className='ml-4'
              symbol_={leftPlacement(iconLinkSymbol('trash'))}
              onClick={() => dispatch(adt('deleteQuestion', index))}>
                Delete
              </Link>)}
      </div>
      <LongText.view
        extraChildProps={{}}
        label='Question'
        placeholder='Enter your question here.'
        required
        style={{ height: '200px' }}
        disabled={disabled}
        state={question.question}
        dispatch={mapComponentDispatch(dispatch, value => adt('questionText' as const, { childMsg: value, qIndex: index } ))} />
      <LongText.view
        extraChildProps={{}}
        label='Response Guidelines'
        placeholder='Provide some guidance on how proponents can effectively respond to your question.'
        required
        style={{ height: '160px' }}
        disabled={disabled}
        state={question.guideline}
        dispatch={mapComponentDispatch(dispatch, value => adt('guidelineText' as const, { childMsg: value, qIndex: index } )) }
      />
      <Row>
        <Col xs='12' md='6' lg='5'>
          <NumberField.view
            extraChildProps={{
              suffix: 'words'
            }}
            label='Word Limit'
            placeholder='Word Limit'
            required
            disabled={disabled}
            state={question.wordLimit}
            dispatch={mapComponentDispatch(dispatch, value => adt('wordLimit' as const, { childMsg: value, qIndex: index } )) }
          />
          <NumberField.view
            extraChildProps={{
              suffix: 'points'
            }}
            label='Score'
            placeholder='Score'
            required
            disabled={disabled}
            state={question.score}
            dispatch={mapComponentDispatch(dispatch, value => adt('score' as const, { childMsg: value, qIndex: index } )) }
          />
        </Col>
      </Row>
    </div>
  );
};

interface Props extends ComponentViewProps<State, Msg> {
  disabled?: boolean;
}

const AddButton: View<Props> = ({ disabled, dispatch }) => {
  return (
    <Link
      button
      outline
      disabled={disabled}
      size='sm'
      color='primary'
      symbol_={leftPlacement(iconLinkSymbol('plus-circle'))}
      onClick={ () => { dispatch(adt('addQuestion')); } }>
      Add Question
    </Link>
  );
};

export const view: View<Props> = props => {
  const { state, disabled } = props;
  return (
    <div>
      {state.questions.map((file, i) => (
        <QuestionView
          key={`team-questions-question-${i}`}
          index={i}
          disabled={disabled}
          question={state.questions[i]}
          dispatch={props.dispatch}
        />
      ))}
      <AddButton {...props} />
    </div>
  );
};
