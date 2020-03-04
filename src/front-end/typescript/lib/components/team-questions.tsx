import * as ShortText from 'front-end/lib/components/form-field/short-text';
import { ComponentViewProps, Dispatch, immutable, Immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import Link, { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import React from 'react';
import { adt, ADT } from 'shared/lib/types';

interface Question {
  question: Immutable<ShortText.State>;
  responseGuideline: string;
  wordLimit: number;
  score: number;
}

export interface State {
  questions: Question[];
}

export type Msg =
  ADT<'addQuestion'> |
  ADT<'questionText',  { textMessage: ShortText.Msg; qIndex: number; } >
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
    question: immutable( await ShortText.init({
      errors: [],
      child: {
        type: 'text',
        value: '',
        id: 'cwu-proposal-individual-legalName'
      }
    })),
    responseGuideline: '',
    wordLimit: 300,
    score: 5
  };
}

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'addQuestion': {
      return [ state, async (state) => {
        return state.set('questions', [ ...state.questions, await defaultQuestion() ]);

      }];
    }
    case 'questionText': {
      const componentMessage = msg.value.textMessage;
      const qIndex = msg.value.qIndex;
      // const questionState = state.questions[qIndex];
      return updateComponentChild({
        state,
        childStatePath: ['questions', `${qIndex}`, 'question'],
        childUpdate: ShortText.update,
        childMsg: componentMessage,
        mapChildMsg: value => adt('questionText', { qIndex, textMessage: value } )
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
    <div>
      <h2>Question {qIndex + 1}</h2>
      <ShortText.view
        extraChildProps={{}}
        label='Question'
        required
        state={state.question}
        dispatch={mapComponentDispatch(dispatch, value => adt('questionText' as const, { textMessage: value, qIndex } )) }
      />
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
      className={`mb-5`}
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
    </div>);
};
