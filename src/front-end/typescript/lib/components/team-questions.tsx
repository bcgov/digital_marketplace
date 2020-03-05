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
  qIndex: number;
  state: Question;
  dispatch: Dispatch<Msg>;
}

const QuestionView: View<QuestionViewProps> = props => {
  const { state, dispatch, qIndex } = props;
  return (
    <div className='py-4 border-bottom'>
      <Row className='pb-3'>
        <Col>
          <span className='h3 pr-3'>Question {qIndex + 1}</span>
          <Link
            button
            outline
            size='sm'
            color='blue-dark'
            symbol_={leftPlacement(iconLinkSymbol('trash'))}
            onClick={() => dispatch(adt('deleteQuestion', qIndex))}
          >
            Delete
          </Link>
        </Col>
      </Row>
      <LongText.view
        extraChildProps={{}}
        label='Question'
        required
        state={state.question}
        dispatch={mapComponentDispatch(dispatch, value => adt('questionText' as const, { childMsg: value, qIndex } )) }
      />

      <LongText.view
        extraChildProps={{}}
        label='Response Guidelines'
        required
        state={state.responseGuideline}
        dispatch={mapComponentDispatch(dispatch, value => adt('responseGuidelineText' as const, { childMsg: value, qIndex } )) }
      />

    <Row>
      <Col md='3'>
        <NumberField.view
          extraChildProps={{
            suffix: 'words'
          }}
          label='Word Limit'
          required
          state={state.wordLimit}
          dispatch={mapComponentDispatch(dispatch, value => adt('wordLimit' as const, { childMsg: value, qIndex } )) }
        />
      </Col>
    </Row>

    <Row>
      <Col md='3'>
        <NumberField.view
          extraChildProps={{
            suffix: 'pt(s)'
          }}
          label='Score'
          required
          state={state.score}
          dispatch={mapComponentDispatch(dispatch, value => adt('score' as const, { childMsg: value, qIndex } )) }
        />
      </Col>
    </Row>

    </div>
  );
};

interface Props extends ComponentViewProps<State, Msg> {}

const AddButton: View<Props> = ({ dispatch }) => {
  return (

    <Link
      button
      outline
      size='sm'
      color='primary'
      className={`mt-5 mb-2`}
      symbol_={leftPlacement(iconLinkSymbol('plus-circle'))}
      onClick={ () => { dispatch(adt('addQuestion')); } }
    >
      Add Question
    </Link>
  );
};

export const view: View<Props> = props => {
  const state = props.state;
  return (
    <div>
      { state.questions.map((file, i) => (
          <QuestionView
            key={i}
            qIndex={i}
            state={state.questions[i]}
            dispatch={props.dispatch}
          />
        ))
      }
      <AddButton {...props} />
    </div>
  );
};
