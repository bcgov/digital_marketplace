import * as FormField from "front-end/lib/components/form-field";
import * as ShortText from "front-end/lib/components/form-field/short-text";
import * as Checkbox from "front-end/lib/components/form-field/checkbox";
import {
  component as component_,
  immutable,
  Immutable
} from "front-end/lib/framework";
import Link, { iconLinkSymbol, leftPlacement } from "front-end/lib/views/link";
import React from "react";
import { Col, Row } from "reactstrap";
import {
  CreateSWUEvaluationPanelMemberBody,
  CreateSWUEvaluationPanelMemberValidationErrors,
  SWUEvaluationPanelMember
} from "shared/lib/resources/opportunity/sprint-with-us";
import { adt, ADT } from "shared/lib/types";
import { validateEmail } from "shared/lib/validation";
import { MIN_SWU_EVALUATION_PANEL_MEMBERS } from "shared/config";

interface EvaluationPanelMember {
  email: Immutable<ShortText.State>;
  chair: Immutable<Checkbox.State>;
}

export interface State {
  evaluationPanelMembers: EvaluationPanelMember[];
  evaluationPanelChair: Immutable<ShortText.State>;
}

export type Msg =
  | ADT<"addMember">
  | ADT<"deleteMember", number>
  | ADT<"email", { childMsg: ShortText.Msg; epmIndex: number }>
  | ADT<"chair", { childMsg: Checkbox.Msg; epmIndex: number }>
  | ADT<"evaluationPanelChair", ShortText.Msg>;

export interface Params {
  evaluationPanel: SWUEvaluationPanelMember[];
}

export const init: component_.base.Init<Params, State, Msg> = (params) => {
  const [evaluationPanelMembers, cmds] = params.evaluationPanel
    .filter(({ evaluator }) => evaluator)
    .map((epm, index) => createEvaluationPanelMember(index, epm))
    .reduce(
      ([accEvaluationPanelMembers, accCmds], [q, cs]) => [
        [...accEvaluationPanelMembers, q],
        [...accCmds, ...cs]
      ],
      [[], []] as component_.base.InitReturnValue<EvaluationPanelMember[], Msg>
    );

  if (evaluationPanelMembers.length < MIN_SWU_EVALUATION_PANEL_MEMBERS) {
    const emptyPanelMember = createEvaluationPanelMember(
      evaluationPanelMembers.length
    );
    evaluationPanelMembers.push(emptyPanelMember[0]);
    cmds.push(...emptyPanelMember[1]);
  }

  const [evaluationPanelChairState, evaluationPanelChairCmds] = ShortText.init({
    errors: [],
    validate: validateEmail,
    child: {
      id: "swu-opportunity-evaluation-panel-chair",
      type: "email",
      value: params.evaluationPanel.find(({ chair }) => chair)?.user.email ?? ""
    }
  });

  return [
    {
      evaluationPanelMembers,
      evaluationPanelChair: immutable(evaluationPanelChairState)
    },
    [
      ...cmds,
      ...component_.cmd.mapMany(
        evaluationPanelChairCmds,
        (msg) => adt("evaluationPanelChair", msg) as Msg
      )
    ]
  ];
};

function createEvaluationPanelMember(
  epmIndex: number,
  evaluationPanelMember?: SWUEvaluationPanelMember
): component_.base.InitReturnValue<EvaluationPanelMember, Msg> {
  const idNamespace = String(Math.random());
  const [emailState, emailCmds] = ShortText.init({
    errors: [],
    validate: validateEmail,
    child: {
      id: `${idNamespace}-swu-opportunity-evaluation-panel-member`,
      type: "email",
      value: evaluationPanelMember?.user.email ?? ""
    }
  });
  const [chairState, chairCmds] = Checkbox.init({
    errors: [],
    child: {
      value: Boolean(evaluationPanelMember?.chair),
      id: `${idNamespace}-swu-opportunity-evaluation-panel-member-is-chair`
    }
  });
  return [
    {
      email: immutable(emailState),
      chair: immutable(chairState)
    },
    [
      ...component_.cmd.mapMany(
        emailCmds,
        (childMsg) => adt("email", { childMsg, epmIndex }) as Msg
      ),
      ...component_.cmd.mapMany(
        chairCmds,
        (childMsg) => adt("chair", { childMsg, epmIndex }) as Msg
      )
    ]
  ];
}

export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "addMember": {
      const [evaluationPanelMember, cmds] = createEvaluationPanelMember(
        state.evaluationPanelMembers.length
      );
      return [
        state.set("evaluationPanelMembers", [
          ...state.evaluationPanelMembers,
          evaluationPanelMember
        ]),
        cmds
      ];
    }

    case "deleteMember": {
      return [
        state.set(
          "evaluationPanelMembers",
          state.evaluationPanelMembers.reduce((acc, q, index) => {
            return index === msg.value ? acc : [...acc, q];
          }, [] as EvaluationPanelMember[])
        ),
        []
      ];
    }

    case "email": {
      const componentMessage = msg.value.childMsg;
      const epmIndex = msg.value.epmIndex;
      return component_.base.updateChild({
        state,
        childStatePath: ["evaluationPanelMembers", `${epmIndex}`, "email"],
        childUpdate: ShortText.update,
        childMsg: componentMessage,
        mapChildMsg: (value) => adt("email", { epmIndex, childMsg: value }),
        updateAfter: (state) => {
          return [
            // Keep chair in sync with evaluator chair
            state.update("evaluationPanelChair", (s) => {
              if (
                FormField.getValue(state.evaluationPanelMembers[epmIndex].chair)
              ) {
                return FormField.setValue(
                  s,
                  FormField.getValue(
                    state.evaluationPanelMembers[epmIndex].email
                  )
                );
              }
              return s;
            }),
            []
          ];
        }
      });
    }

    case "chair": {
      const componentMessage = msg.value.childMsg;
      const epmIndex = msg.value.epmIndex;
      return component_.base.updateChild({
        state,
        childStatePath: ["evaluationPanelMembers", `${epmIndex}`, "chair"],
        childUpdate: Checkbox.update,
        childMsg: componentMessage,
        mapChildMsg: (value) => adt("chair", { epmIndex, childMsg: value }),
        updateAfter: (state) => {
          return [
            // Remove chair from other panel members
            state
              .update("evaluationPanelMembers", (s) =>
                s.map((epm, i) => ({
                  ...epm,
                  chair: FormField.setValue(
                    state.evaluationPanelMembers[i].chair,
                    i === epmIndex
                  )
                }))
              )
              // Keep chair in sync with evaluator chair
              .update("evaluationPanelChair", (s) =>
                FormField.setValue(
                  s,
                  FormField.getValue(
                    state.evaluationPanelMembers[epmIndex].email
                  )
                )
              ),
            []
          ];
        }
      });
    }

    case "evaluationPanelChair":
      return component_.base.updateChild({
        state,
        childStatePath: ["evaluationPanelChair"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("evaluationPanelChair", value),
        updateAfter: (state) => {
          return [
            // Remove chair from other panel members
            state.update("evaluationPanelMembers", (s) =>
              s.map((epm, i) => ({
                ...epm,
                chair: FormField.setValue(
                  state.evaluationPanelMembers[i].chair,
                  false
                )
              }))
            ),
            []
          ];
        }
      });
  }
};

export type Values = CreateSWUEvaluationPanelMemberBody[];

export function getValues(state: Immutable<State>): Values {
  const values = state.evaluationPanelMembers.reduce<Values>(
    (acc, epm, order) => {
      if (!acc) {
        return acc;
      }
      acc.push({
        email: FormField.getValue(epm.email),
        chair: FormField.getValue(epm.chair),
        evaluator: true,
        order
      });
      return acc;
    },
    []
  );

  return !values.some((evaluationPanelMember) => evaluationPanelMember.chair)
    ? [
        ...values,
        {
          email: FormField.getValue(state.evaluationPanelChair),
          chair: true,
          evaluator: false,
          order: state.evaluationPanelMembers.length
        }
      ]
    : values;
}

export type Errors = CreateSWUEvaluationPanelMemberValidationErrors[];

export function setErrors(
  state: Immutable<State>,
  errors: Errors = []
): Immutable<State> {
  let chairErrors: CreateSWUEvaluationPanelMemberValidationErrors | undefined;
  if (errors.length !== state.evaluationPanelMembers.length) {
    chairErrors = errors.pop();
  }
  return errors
    .reduce((acc, e, i) => {
      return acc
        .updateIn(["evaluationPanelMembers", i, "email"], (s) =>
          FormField.setErrors(s as Immutable<ShortText.State>, e.email || [])
        )
        .updateIn(["evaluationPanelMembers", i, "chair"], (s) =>
          FormField.setErrors(s as Immutable<Checkbox.State>, e.chair || [])
        );
    }, state)
    .update("evaluationPanelChair", (s) =>
      FormField.setErrors(
        s as Immutable<ShortText.State>,
        chairErrors?.email || []
      )
    );
}

export function validate(state: Immutable<State>): Immutable<State> {
  return state.evaluationPanelMembers
    .reduce((acc, _, i) => {
      return acc
        .updateIn(["evaluationPanelMembers", i, "email"], (s) =>
          FormField.validate(s as Immutable<ShortText.State>)
        )
        .updateIn(["evaluationPanelMembers", i, "chair"], (s) =>
          FormField.validate(s as Immutable<Checkbox.State>)
        );
    }, state)
    .update("evaluationPanelChair", (s) =>
      FormField.validate(s as Immutable<ShortText.State>)
    );
}

export function isValid(state: Immutable<State>): boolean {
  if (!state.evaluationPanelMembers.length) {
    return false;
  }
  return state.evaluationPanelMembers.reduce((acc, epm) => {
    return acc && FormField.isValid(epm.email) && FormField.isValid(epm.chair);
  }, true as boolean);
}

interface EvalationPanelMemberViewProps {
  index: number;
  evaluationPanelMember: EvaluationPanelMember;
  disabled?: boolean;
  dispatch: component_.base.Dispatch<Msg>;
  removable: boolean;
}

const EvalationPanelMemberView: component_.base.View<
  EvalationPanelMemberViewProps
> = (props) => {
  const { evaluationPanelMember, dispatch, index, disabled, removable } = props;
  return (
    <div className={index > 0 ? "pt-5 mt-4 border-top" : ""}>
      <Row>
        <Col xs="12">
          <div className="mb-4">
            <h3 className="mb-0">Evaluator {index + 1}</h3>
          </div>
        </Col>
      </Row>
      <Row>
        <Col xs="12">
          <ShortText.view
            extraChildProps={{}}
            label="Email"
            placeholder="Email"
            required
            disabled={disabled}
            state={evaluationPanelMember.email}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("email" as const, { childMsg: value, epmIndex: index })
            )}
          />
        </Col>
      </Row>
      <Row>
        <Col xs="12">
          <div className="d-flex align-items-center justify-content-between">
            <Checkbox.view
              required
              extraChildProps={{
                inlineLabel: "Panel Chair"
              }}
              disabled={disabled}
              state={evaluationPanelMember.chair}
              dispatch={component_.base.mapDispatch(dispatch, (value) =>
                adt("chair" as const, { childMsg: value, epmIndex: index })
              )}
            />
            {disabled || !removable ? null : (
              <Link
                color="primary"
                className="mb-3"
                symbol_={leftPlacement(iconLinkSymbol("trash"))}
                onClick={() => dispatch(adt("deleteMember", index))}>
                Remove this evaluator
              </Link>
            )}
          </div>
        </Col>
      </Row>
    </div>
  );
};

interface Props extends component_.base.ComponentViewProps<State, Msg> {
  disabled?: boolean;
}

const AddButton: component_.base.View<Props> = ({
  // state,
  disabled,
  dispatch
}) => {
  if (disabled) {
    return null;
  }
  return (
    <Row>
      <Col xs="12">
        <div className="mt-3 mb-5">
          <Link
            disabled={disabled}
            color="primary"
            symbol_={leftPlacement(iconLinkSymbol("plus-circle"))}
            onClick={() => {
              dispatch(adt("addMember"));
            }}>
            Add an evaluator
          </Link>
        </div>
      </Col>
    </Row>
  );
};

export const view: component_.base.View<Props> = (props) => {
  const { state, disabled, dispatch } = props;
  const removable =
    state.evaluationPanelMembers.length > MIN_SWU_EVALUATION_PANEL_MEMBERS;

  return (
    <div>
      {state.evaluationPanelMembers.map((evaluationPanelMember, i) => (
        <EvalationPanelMemberView
          key={`evaluation-panel-members-member-${i}`}
          index={i}
          disabled={disabled}
          evaluationPanelMember={evaluationPanelMember}
          dispatch={dispatch}
          removable={removable}
        />
      ))}
      <AddButton {...props} />
      <Row>
        <Col xs="12">
          <div className="mb-4">
            <h3 className="mb-0">Panel Chair</h3>
          </div>
        </Col>
      </Row>
      <Row>
        <Col xs="12">
          <ShortText.view
            extraChildProps={{}}
            label="Email"
            placeholder="Email"
            required
            disabled={disabled}
            state={state.evaluationPanelChair}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("evaluationPanelChair" as const, value)
            )}
          />
        </Col>
      </Row>
    </div>
  );
};
