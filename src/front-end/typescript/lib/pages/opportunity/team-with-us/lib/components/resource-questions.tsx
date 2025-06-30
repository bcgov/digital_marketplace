import * as FormField from "front-end/lib/components/form-field";
import * as LongText from "front-end/lib/components/form-field/long-text";
import * as NumberField from "front-end/lib/components/form-field/number";
import {
  component as component_,
  immutable,
  Immutable
} from "front-end/lib/framework";
import Link, { iconLinkSymbol, leftPlacement } from "front-end/lib/views/link";
import React from "react";
import { Col, Row } from "reactstrap";
import {
  CreateTWUResourceQuestionBody,
  CreateTWUResourceQuestionValidationErrors,
  DEFAULT_RESOURCE_QUESTION_AVAILABLE_SCORE,
  DEFAULT_RESOURCE_QUESTION_RESPONSE_WORD_LIMIT,
  TWUResourceQuestion
} from "shared/lib/resources/opportunity/team-with-us";
import { adt, ADT } from "shared/lib/types";
import { invalid, valid } from "shared/lib/validation";
import * as opportunityValidation from "shared/lib/validation/opportunity/team-with-us";

interface Question {
  question: Immutable<LongText.State>;
  guideline: Immutable<LongText.State>;
  wordLimit: Immutable<NumberField.State>;
  score: Immutable<NumberField.State>;
  minimumScore: Immutable<NumberField.State>;
}

export interface State {
  questions: Question[];
}

export type Msg =
  | ADT<"addQuestion">
  | ADT<"deleteQuestion", number>
  | ADT<"questionText", { childMsg: LongText.Msg; qIndex: number }>
  | ADT<"guidelineText", { childMsg: LongText.Msg; qIndex: number }>
  | ADT<"wordLimit", { childMsg: NumberField.Msg; qIndex: number }>
  | ADT<"score", { childMsg: NumberField.Msg; qIndex: number }>
  | ADT<"minimumScore", { childMsg: NumberField.Msg; qIndex: number }>;

export interface Params {
  questions: TWUResourceQuestion[];
}

function resetMinimumScore(
  state: Immutable<State>,
  i: number
): Immutable<State> {
  return state.updateIn(["questions", i, "minimumScore"], (s) => {
    return FormField.setValidate(
      s as Immutable<NumberField.State>,
      (v) => {
        if (v === null) {
          return valid(null);
        }
        return opportunityValidation.validateResourceQuestionMinimumScore(
          v,
          FormField.getValue(state.questions[i].score)
        );
      },
      FormField.getValue(s as Immutable<NumberField.State>) !== null
    );
  });
}

export const init: component_.base.Init<Params, State, Msg> = (params) => {
  const [questions, cmds] = params.questions
    .map((q, index) => createQuestion(index, q))
    .reduce(
      ([accQuestions, accCmds], [q, cs]) => [
        [...accQuestions, q],
        [...accCmds, ...cs]
      ],
      [[], []] as component_.base.InitReturnValue<Question[], Msg>
    );
  return [
    {
      questions
    },
    cmds
  ];
};

function createQuestion(
  qIndex: number,
  question?: TWUResourceQuestion
): component_.base.InitReturnValue<Question, Msg> {
  const idNamespace = String(Math.random());
  const [questionState, questionCmds] = LongText.init({
    errors: [],
    validate: opportunityValidation.validateResourceQuestionQuestion,
    child: {
      value: question?.question || "",
      id: `${idNamespace}-resource-questions-question`
    }
  });
  const [guidelineState, guidelineCmds] = LongText.init({
    errors: [],
    validate: opportunityValidation.validateResourceQuestionGuideline,
    child: {
      value: question?.guideline || "",
      id: `${idNamespace}-resource-questions-response-guidelines`
    }
  });
  const [wordLimitState, wordLimitCmds] = NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return invalid(["Please enter a valid word limit."]);
      }
      return opportunityValidation.validateResourceQuestionWordLimit(v);
    },
    child: {
      value: question
        ? question.wordLimit
        : DEFAULT_RESOURCE_QUESTION_RESPONSE_WORD_LIMIT,
      id: `${idNamespace}-resource-questions-word-limit`,
      min: 1
    }
  });
  const [scoreState, scoreCmds] = NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return invalid(["Please enter a valid score."]);
      }
      return opportunityValidation.validateResourceQuestionScore(v);
    },
    child: {
      value: question
        ? question.score
        : DEFAULT_RESOURCE_QUESTION_AVAILABLE_SCORE,
      id: `${idNamespace}-resource-questions-score`,
      min: 1
    }
  });
  const [minimumScoreState, minimumScoreCmds] = NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return valid(null);
      }
      return opportunityValidation.validateResourceQuestionMinimumScore(
        v,
        question?.score
      );
    },
    child: {
      value: question?.minimumScore || null,
      id: `${idNamespace}-minimum-resource-questions-score`,
      min: 0
    }
  });
  return [
    {
      question: immutable(questionState),
      guideline: immutable(guidelineState),
      wordLimit: immutable(wordLimitState),
      score: immutable(scoreState),
      minimumScore: immutable(minimumScoreState)
    },
    [
      ...component_.cmd.mapMany(
        questionCmds,
        (childMsg) => adt("questionText", { childMsg, qIndex }) as Msg
      ),
      ...component_.cmd.mapMany(
        guidelineCmds,
        (childMsg) => adt("guidelineText", { childMsg, qIndex }) as Msg
      ),
      ...component_.cmd.mapMany(
        wordLimitCmds,
        (childMsg) => adt("wordLimit", { childMsg, qIndex }) as Msg
      ),
      ...component_.cmd.mapMany(
        scoreCmds,
        (childMsg) => adt("score", { childMsg, qIndex }) as Msg
      ),
      ...component_.cmd.mapMany(
        minimumScoreCmds,
        (childMsg) => adt("minimumScore", { childMsg, qIndex }) as Msg
      )
    ]
  ];
}

export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "addQuestion": {
      const [question, cmds] = createQuestion(state.questions.length);
      return [state.set("questions", [...state.questions, question]), cmds];
    }

    case "deleteQuestion": {
      return [
        state.set(
          "questions",
          state.questions.reduce((acc, q, index) => {
            return index === msg.value ? acc : [...acc, q];
          }, [] as Question[])
        ),
        []
      ];
    }

    case "questionText": {
      const componentMessage = msg.value.childMsg;
      const qIndex = msg.value.qIndex;
      return component_.base.updateChild({
        state,
        childStatePath: ["questions", `${qIndex}`, "question"],
        childUpdate: LongText.update,
        childMsg: componentMessage,
        mapChildMsg: (value) => adt("questionText", { qIndex, childMsg: value })
      });
    }

    case "guidelineText": {
      const componentMessage = msg.value.childMsg;
      const qIndex = msg.value.qIndex;
      return component_.base.updateChild({
        state,
        childStatePath: ["questions", `${qIndex}`, "guideline"],
        childUpdate: LongText.update,
        childMsg: componentMessage,
        mapChildMsg: (value) =>
          adt("guidelineText", { qIndex, childMsg: value })
      });
    }

    case "wordLimit": {
      const componentMessage = msg.value.childMsg;
      const qIndex = msg.value.qIndex;
      return component_.base.updateChild({
        state,
        childStatePath: ["questions", `${qIndex}`, "wordLimit"],
        childUpdate: NumberField.update,
        childMsg: componentMessage,
        mapChildMsg: (value) => adt("wordLimit", { qIndex, childMsg: value })
      });
    }

    case "score": {
      const componentMessage = msg.value.childMsg;
      const qIndex = msg.value.qIndex;
      return component_.base.updateChild({
        state,
        childStatePath: ["questions", `${qIndex}`, "score"],
        childUpdate: NumberField.update,
        childMsg: componentMessage,
        mapChildMsg: (value) => adt("score", { qIndex, childMsg: value }),
        updateAfter: (state) => [resetMinimumScore(state, qIndex), []]
      });
    }

    case "minimumScore": {
      const componentMessage = msg.value.childMsg;
      const qIndex = msg.value.qIndex;
      return component_.base.updateChild({
        state,
        childStatePath: ["questions", `${qIndex}`, "minimumScore"],
        childUpdate: NumberField.update,
        childMsg: componentMessage,
        mapChildMsg: (value) =>
          adt("minimumScore", { qIndex, childMsg: value }),
        updateAfter: (state) => [resetMinimumScore(state, qIndex), []]
      });
    }
  }
};

export type Values = CreateTWUResourceQuestionBody[];

export function getValues(state: Immutable<State>): Values {
  return state.questions.reduce<Values>((acc, q, order) => {
    if (!acc) {
      return acc;
    }
    const score = FormField.getValue(q.score) || 0;
    const wordLimit = FormField.getValue(q.wordLimit) || 0;
    acc.push({
      question: FormField.getValue(q.question),
      guideline: FormField.getValue(q.guideline),
      wordLimit,
      score,
      order,
      minimumScore: FormField.getValue(q.minimumScore)
    });
    return acc;
  }, []);
}

export type Errors = CreateTWUResourceQuestionValidationErrors[];

export function setErrors(
  state: Immutable<State>,
  errors: Errors = []
): Immutable<State> {
  return errors.reduce((acc, e, i) => {
    return acc
      .updateIn(["questions", i, "question"], (s) =>
        FormField.setErrors(s as Immutable<LongText.State>, e.question || [])
      )
      .updateIn(["questions", i, "guideline"], (s) =>
        FormField.setErrors(s as Immutable<LongText.State>, e.guideline || [])
      )
      .updateIn(["questions", i, "wordLimit"], (s) =>
        FormField.setErrors(
          s as Immutable<NumberField.State>,
          e.wordLimit || []
        )
      )
      .updateIn(["questions", i, "score"], (s) =>
        FormField.setErrors(s as Immutable<NumberField.State>, e.score || [])
      )
      .updateIn(["questions", i, "minimumScore"], (s) =>
        FormField.setErrors(
          s as Immutable<NumberField.State>,
          e.minimumScore || []
        )
      );
  }, state);
}

export function validate(state: Immutable<State>): Immutable<State> {
  return state.questions.reduce((acc, q, i) => {
    return acc
      .updateIn(["questions", i, "question"], (s) =>
        FormField.validate(s as Immutable<LongText.State>)
      )
      .updateIn(["questions", i, "guideline"], (s) =>
        FormField.validate(s as Immutable<LongText.State>)
      )
      .updateIn(["questions", i, "wordLimit"], (s) =>
        FormField.validate(s as Immutable<NumberField.State>)
      )
      .updateIn(["questions", i, "score"], (s) =>
        FormField.validate(s as Immutable<NumberField.State>)
      )
      .updateIn(["questions", i, "minimumScore"], (s) =>
        FormField.validate(s as Immutable<NumberField.State>)
      );
  }, state);
}

export function isValid(state: Immutable<State>): boolean {
  if (!state.questions.length) {
    return false;
  }
  return state.questions.reduce((acc, q) => {
    return (
      acc &&
      FormField.isValid(q.question) &&
      FormField.isValid(q.guideline) &&
      FormField.isValid(q.wordLimit) &&
      FormField.isValid(q.score) &&
      FormField.isValid(q.minimumScore)
    );
  }, true as boolean);
}

interface QuestionViewProps {
  index: number;
  question: Question;
  disabled?: boolean;
  dispatch: component_.base.Dispatch<Msg>;
}

const QuestionView: component_.base.View<QuestionViewProps> = (props) => {
  const { question, dispatch, index, disabled } = props;
  return (
    <div className={index > 0 ? "pt-5 mt-5 border-top" : ""}>
      <Row>
        <Col xs="12">
          <div className="d-flex align-items-center mb-4">
            <h3 className="mb-0">Question {index + 1}</h3>
            {disabled ? null : (
              <Link
                button
                outline
                size="sm"
                color="info"
                className="ms-4"
                symbol_={leftPlacement(iconLinkSymbol("trash"))}
                onClick={() => dispatch(adt("deleteQuestion", index))}>
                Delete
              </Link>
            )}
          </div>
        </Col>
      </Row>
      <Row>
        <Col xs="12">
          <LongText.view
            label="Question"
            placeholder="Enter your question here."
            help="Enter your question in the field provided below."
            required
            extraChildProps={{
              style: { height: "200px" }
            }}
            disabled={disabled}
            state={question.question}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("questionText" as const, { childMsg: value, qIndex: index })
            )}
          />
        </Col>
      </Row>
      <Row>
        <Col xs="12">
          <LongText.view
            label="Response Guidelines"
            placeholder="Provide some guidance on how proponents can effectively respond to your question."
            help="Provide some guidance on how proponents can effectively respond to your question."
            required
            extraChildProps={{
              style: { height: "160px" }
            }}
            disabled={disabled}
            state={question.guideline}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("guidelineText" as const, { childMsg: value, qIndex: index })
            )}
          />
        </Col>
      </Row>
      <Row>
        <Col xs="12" md="6" lg="5">
          <NumberField.view
            extraChildProps={{
              suffix: "words"
            }}
            label="Response Word Limit"
            placeholder="Word Limit"
            required
            disabled={disabled}
            state={question.wordLimit}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("wordLimit" as const, { childMsg: value, qIndex: index })
            )}
          />
        </Col>
      </Row>
      <Row>
        <Col xs="12" md="6" lg="5">
          <NumberField.view
            extraChildProps={{
              suffix: "points"
            }}
            label="Score"
            placeholder="Score"
            required
            disabled={disabled}
            state={question.score}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("score" as const, { childMsg: value, qIndex: index })
            )}
          />
        </Col>
      </Row>
      <Row>
        <Col xs="12" md="6" lg="5">
          <NumberField.view
            extraChildProps={{
              suffix: "points"
            }}
            label="Minimum Score"
            placeholder="Minimum Score"
            help="Please enter a number between zero and score entered above. Proponents scoring below this value will be disqualified."
            className="mb-0"
            disabled={disabled}
            state={question.minimumScore}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("minimumScore" as const, { childMsg: value, qIndex: index })
            )}
          />
        </Col>
      </Row>
    </div>
  );
};

interface Props extends component_.base.ComponentViewProps<State, Msg> {
  disabled?: boolean;
}

const AddButton: component_.base.View<Props> = ({
  state,
  disabled,
  dispatch
}) => {
  if (disabled) {
    return null;
  }
  return (
    <Row>
      <Col xs="12">
        <div className={state.questions.length ? "mt-5 pt-5 border-top" : ""}>
          <Link
            button
            outline
            disabled={disabled}
            size="sm"
            color="primary"
            symbol_={leftPlacement(iconLinkSymbol("plus-circle"))}
            onClick={() => {
              dispatch(adt("addQuestion"));
            }}>
            Add Question
          </Link>
        </div>
      </Col>
    </Row>
  );
};

export const view: component_.base.View<Props> = (props) => {
  const { state, disabled } = props;
  return (
    <div>
      {state.questions.map((question, i) => (
        <QuestionView
          key={`resource-questions-question-${i}`}
          index={i}
          disabled={disabled}
          question={question}
          dispatch={props.dispatch}
        />
      ))}
      <AddButton {...props} />
    </div>
  );
};
