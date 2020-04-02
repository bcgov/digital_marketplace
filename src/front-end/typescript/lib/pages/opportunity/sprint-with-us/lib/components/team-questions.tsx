import * as LongText from 'front-end/lib/components/form-field/long-text';
import * as NumberField from 'front-end/lib/components/form-field/number';
import { ComponentViewProps, Dispatch, immutable, Immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import Link, { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { adt, ADT } from 'shared/lib/types';

interface Question {
  question: Immutable<LongText.State>;
  responseGuideline: Immutable<LongText.State>;
  wordLimit: Immutable<NumberField.State>;
  score: Immutable<NumberField.State>;
}

export interface State {
  questions: Question[];
}

export type Msg =
  ADT<'addQuestion'>                                                          |
  ADT<'deleteQuestion', number>                                               |
  ADT<'questionText',  { childMsg: LongText.Msg; qIndex: number; } >          |
  ADT<'responseGuidelineText',  { childMsg: LongText.Msg; qIndex: number; } > |
  ADT<'wordLimit',  { childMsg: NumberField.Msg; qIndex: number; } >          |
  ADT<'score',  { childMsg: NumberField.Msg; qIndex: number; } >
  ;

export type Params = {};

export const init: Init<Params, State> = async params => {
  return {
    ...params,
    questions: []
  };
};

async function defaultQuestion(): Promise<Question> {
  return {
    question: immutable( await LongText.init({
      errors: [],
      child: {
        value: '',
        id: 'team-questions-question'
      }
    })),
    responseGuideline: immutable( await LongText.init({
      errors: [],
      child: {
        value: '',
        id: 'team-questions-response-guidelines'
      }
    })),

    wordLimit: immutable(await NumberField.init({
      errors: [],
      child: {
        value: 300,
        id: 'team-questions-word-limit',
        min: 1
      }
    })),

    score: immutable(await NumberField.init({
      errors: [],
      child: {
        value: 5,
        id: 'team-questions-score',
        min: 1
      }
    }))

  };
}

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {

    case 'addQuestion': {
      return [ state, async (state) => {
        return state.set('questions', [ ...state.questions, await defaultQuestion() ]);
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

    case 'responseGuidelineText': {
      const componentMessage = msg.value.childMsg;
      const qIndex = msg.value.qIndex;
      return updateComponentChild({
        state,
        childStatePath: ['questions', `${qIndex}`, 'responseGuideline'],
        childUpdate: LongText.update,
        childMsg: componentMessage,
        mapChildMsg: value => adt('responseGuidelineText', { qIndex, childMsg: value } )
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
        placeholder='Provide some guidance on how a Vendor can effectively respond to your question.'
        required
        style={{ height: '160px' }}
        disabled={disabled}
        state={question.responseGuideline}
        dispatch={mapComponentDispatch(dispatch, value => adt('responseGuidelineText' as const, { childMsg: value, qIndex: index } )) }
      />
      <Row>
        <Col xs='12' md='6' lg='5'>
          <NumberField.view
            extraChildProps={{
              suffix: 'words'
            }}
            label='Word Limit'
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
