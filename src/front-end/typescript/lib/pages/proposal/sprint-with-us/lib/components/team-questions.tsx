import * as FormField from "front-end/lib/components/form-field";
import * as RichMarkdownEditor from "front-end/lib/components/form-field/rich-markdown-editor";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import Accordion from "front-end/lib/views/accordion";
import Separator from "front-end/lib/views/separator";
import { find } from "lodash";
import React from "react";
import { Alert, Col, Row } from "reactstrap";
import { SWUTeamQuestion } from "shared/lib/resources/opportunity/sprint-with-us";
import {
  CreateSWUProposalTeamQuestionResponseBody,
  CreateSWUProposalTeamQuestionResponseValidationErrors,
  SWUProposalTeamQuestionResponse
} from "shared/lib/resources/proposal/sprint-with-us";
import { adt, ADT } from "shared/lib/types";
import * as proposalValidation from "shared/lib/validation/proposal/sprint-with-us";

interface ResponseState {
  isAccordianOpen: boolean;
  question: SWUTeamQuestion;
  response: Immutable<RichMarkdownEditor.State>;
}

export interface State {
  responses: ResponseState[];
}

export type Msg =
  | ADT<"toggleAccordion", number>
  | ADT<"response", [number, RichMarkdownEditor.Msg]>;

export interface Params {
  questions: SWUTeamQuestion[];
  responses: SWUProposalTeamQuestionResponse[];
}

export const init: component_.base.Init<Params, State, Msg> = ({
  questions,
  responses
}) => {
  const responseInits = questions.map((question, i) => {
    const [responseState, responseCmds] = RichMarkdownEditor.init({
      errors: [],
      validate: (v) =>
        proposalValidation.validateSWUProposalTeamQuestionResponseResponse(
          v,
          question.wordLimit
        ),
      child: {
        value: find(responses, { order: question.order })?.response || "",
        id: `swu-proposal-team-question-response-${question.order}`,
        wordLimit: question.wordLimit
      }
    });
    return [
      {
        isAccordianOpen: false,
        question,
        response: immutable(responseState)
      },
      component_.cmd.mapMany(
        responseCmds,
        (msg) => adt("response", [i, msg]) as Msg
      )
    ] as [ResponseState, component_.Cmd<Msg>[]];
  });
  return [
    {
      responses: responseInits.map((ri) => ri[0])
    },
    responseInits.reduce(
      (acc, ri) => [...acc, ...ri[1]],
      [] as component_.Cmd<Msg>[]
    )
  ];
};

export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "toggleAccordion":
      return [
        state.update("responses", (rs) =>
          rs.map((r, i) => {
            return i === msg.value
              ? { ...r, isAccordianOpen: !r.isAccordianOpen }
              : r;
          })
        ),
        []
      ];

    case "response":
      return component_.base.updateChild({
        state,
        childStatePath: ["responses", String(msg.value[0]), "response"],
        childUpdate: RichMarkdownEditor.update,
        childMsg: msg.value[1],
        mapChildMsg: (value) => adt("response", [msg.value[0], value]) as Msg
      });
  }
};

export type Values = CreateSWUProposalTeamQuestionResponseBody[];

export function getValues(state: Immutable<State>): Values {
  return state.responses.map((r) => ({
    response: FormField.getValue(r.response),
    order: r.question.order
  }));
}

export type Errors = CreateSWUProposalTeamQuestionResponseValidationErrors[];

export function setErrors(
  state: Immutable<State>,
  errors: Errors = []
): Immutable<State> {
  return errors.reduce((acc, e, i) => {
    return acc.updateIn(["responses", i, "response"], (s) =>
      FormField.setErrors(
        s as Immutable<RichMarkdownEditor.State>,
        e.response || []
      )
    );
  }, state);
}

export function validate(state: Immutable<State>): Immutable<State> {
  return state.responses.reduce((acc, r, i) => {
    return acc.updateIn(["responses", i, "response"], (s) =>
      FormField.validate(s as Immutable<RichMarkdownEditor.State>)
    );
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
  expandAccordions?: boolean;
  dispatch: component_.base.Dispatch<Msg>;
}

const ResponseView: component_.base.View<ResponseViewProps> = (props) => {
  const { response, dispatch, index, disabled, expandAccordions } = props;
  const isValid = isResponseValid(response);
  const title = `Question ${index + 1}`;

  // If expandAccordions is true, override isAccordianOpen
  const isOpen = expandAccordions === true ? true : response.isAccordianOpen;

  return (
    <Accordion
      className={""}
      toggle={() => dispatch(adt("toggleAccordion", index))}
      color="info"
      title={title}
      titleClassName="h3 mb-0"
      icon={isValid ? undefined : "exclamation-circle"}
      iconColor={isValid ? undefined : "warning"}
      iconWidth={2}
      iconHeight={2}
      chevronWidth={1.5}
      chevronHeight={1.5}
      open={isOpen}>
      <p style={{ whiteSpace: "pre-line" }}>{response.question.question}</p>
      <div className="mb-3 small text-secondary d-flex flex-column flex-md-row flex-nowrap">
        <div className="mb-2 mb-md-0">
          {response.question.wordLimit} word limit
        </div>
        <Separator spacing="2" color="secondary" className="d-none d-md-block">
          |
        </Separator>
        <div>Scored out of {response.question.score}</div>
      </div>
      <Alert color="primary" fade={false} className="mb-4">
        <div style={{ whiteSpace: "pre-line" }}>
          {response.question.guideline}
        </div>
      </Alert>
      <RichMarkdownEditor.view
        required
        label={`${title} Response`}
        placeholder={`${title} Response`}
        help={`Provide your response to this question. You may use Markdown to write your response, however please do not include any images or links, as they will be redacted. Please ensure to stay within the question's response word limit.`}
        extraChildProps={{
          style: { height: "50vh", minHeight: "400px" }
        }}
        className="mb-0"
        disabled={disabled}
        state={response.response}
        dispatch={component_.base.mapDispatch(
          dispatch,
          (value) => adt("response", [index, value]) as Msg
        )}
      />
    </Accordion>
  );
};

interface Props extends component_.base.ComponentViewProps<State, Msg> {
  disabled?: boolean;
  expandAccordions?: boolean;
}

export const view: component_.base.View<Props> = (props) => {
  const { state, disabled, expandAccordions } = props;
  return (
    <div>
      {state.responses.map((response, i) => (
        <Row key={`swu-proposal-team-question-response-${i}`}>
          <Col xs="12" className={i < state.responses.length - 1 ? "mb-4" : ""}>
            <ResponseView
              index={i}
              disabled={disabled}
              response={response}
              dispatch={props.dispatch}
              expandAccordions={expandAccordions}
            />
          </Col>
        </Row>
      ))}
    </div>
  );
};
