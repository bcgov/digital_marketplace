import { ComponentViewProps, Init, Update, View } from 'front-end/lib/framework';
import Link, { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import React from 'react';
import { adt, ADT } from 'shared/lib/types';

interface Question {
  question: string;
  responseGuideline: string;
  wordLimit: number;
  score: number;
}

export interface State {
  questions: Question[];
  questionCount: number;
}

export type Msg
  = ADT<'addQuestion'>;

export type Params = {};

export const init: Init<Params, State> = async params => {
  return {
    ...params,
    questions: [],
    questionCount: 0
  };
};

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'addQuestion':
      return [state.set('questionCount', state.questionCount+1)];
  }
};

interface QuestionViewProps {
};

const QuestionView: View<QuestionViewProps> = props => {
  return (
    <div>
      Question View!
    </div>
  );
};

interface Props extends ComponentViewProps<State, Msg> {
  disabled?: boolean;
  className?: string;
  addButtonClassName?: string;
}

const AddButton: View<Props> = ({ addButtonClassName = '', dispatch, disabled }) => {
  if (disabled) { return null; }
  return (
    <Link
      button
      outline
      size='sm'
      color='primary'
      className={`mb-5 ${addButtonClassName}`}
      symbol_={leftPlacement(iconLinkSymbol('plus-circle'))}
      disabled={disabled}
      onClick={ () => { dispatch(adt('addQuestion')) } }
    >
      Add Question
    </Link>
  );
};

export const view: View<Props> = props => {

  return (
    <div>
      { props.state.questions.map((file, i) => ( <QuestionView />)) }
      <AddButton {...props} />
    </div>);
};
