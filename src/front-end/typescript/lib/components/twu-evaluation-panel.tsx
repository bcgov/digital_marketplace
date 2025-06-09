import * as FormField from "front-end/lib/components/form-field";
import * as Select from "front-end/lib/components/form-field/select";
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
  CreateTWUEvaluationPanelMemberBody,
  CreateTWUEvaluationPanelMemberValidationErrors,
  TWUEvaluationPanelMember
} from "shared/lib/resources/opportunity/team-with-us";
import { adt, ADT, Id } from "shared/lib/types";
import { invalid, valid } from "shared/lib/validation";
import { MIN_TWU_EVALUATION_PANEL_MEMBERS } from "shared/config";
import { isPublicSectorUserType, User } from "shared/lib/resources/user";

interface EvaluationPanelMember {
  member: Immutable<Select.State>;
  chair: Immutable<Checkbox.State>;
}

export interface State {
  evaluationPanelMembers: EvaluationPanelMember[];
  evaluationPanelChair: Immutable<Select.State>;
  users: ADT<"options", { label: string; value: Id }[]>;
}

export type Msg =
  | ADT<"addMember">
  | ADT<"deleteMember", number>
  | ADT<"member", { childMsg: Select.Msg; epmIndex: number }>
  | ADT<"chair", { childMsg: Checkbox.Msg; epmIndex: number }>
  | ADT<"evaluationPanelChair", Select.Msg>;

export interface Params {
  evaluationPanel: TWUEvaluationPanelMember[];
  users: User[];
}

function makeUserOption(user: Pick<User, "email" | "name" | "id">) {
  const emailLabelText = user.email ? `(${user.email})` : "";
  return {
    label: `${user.name} ${emailLabelText}`.trim(),
    value: user.id
  };
}

export const init: component_.base.Init<Params, State, Msg> = (params) => {
  const userOptions = adt(
    "options" as const,
    params.users
      .filter(({ type }) => isPublicSectorUserType(type))
      .map((user) => makeUserOption(user))
  );
  const [evaluationPanelMembers, cmds] = params.evaluationPanel
    .filter(({ evaluator }) => evaluator)
    .map((epm, index) => createEvaluationPanelMember(index, userOptions, epm))
    .reduce(
      ([accEvaluationPanelMembers, accCmds], [q, cs]) => [
        [...accEvaluationPanelMembers, q],
        [...accCmds, ...cs]
      ],
      [[], []] as component_.base.InitReturnValue<EvaluationPanelMember[], Msg>
    );

  if (evaluationPanelMembers.length < MIN_TWU_EVALUATION_PANEL_MEMBERS) {
    const emptyPanelMember = createEvaluationPanelMember(
      evaluationPanelMembers.length,
      userOptions
    );
    evaluationPanelMembers.push(emptyPanelMember[0]);
    cmds.push(...emptyPanelMember[1]);
  }

  const chairUser = params.evaluationPanel.find(({ chair }) => chair)?.user;
  const [evaluationPanelChairState, evaluationPanelChairCmds] = Select.init({
    errors: [],
    validate: (option) => {
      if (!option) {
        return invalid(["Please select a panel chair."]);
      }
      return valid(option);
    },
    child: {
      id: "twu-opportunity-evaluation-panel-chair",
      value: chairUser ? makeUserOption(chairUser) : null,
      options: userOptions
    }
  });

  return [
    {
      evaluationPanelMembers,
      evaluationPanelChair: immutable(evaluationPanelChairState),
      users: userOptions
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
  userOptions: State["users"],
  evaluationPanelMember?: TWUEvaluationPanelMember
): component_.base.InitReturnValue<EvaluationPanelMember, Msg> {
  const idNamespace = String(Math.random());
  const evaluationPanelMemberUser = evaluationPanelMember?.user;
  const [memberState, memberCmds] = Select.init({
    errors: [],
    validate: (option) => {
      if (!option) {
        return invalid(["Please select a panel member."]);
      }
      return valid(option);
    },
    child: {
      id: `${idNamespace}-twu-opportunity-evaluation-panel-member`,
      value: evaluationPanelMemberUser
        ? makeUserOption(evaluationPanelMemberUser)
        : null,
      options: userOptions
    }
  });
  const [chairState, chairCmds] = Checkbox.init({
    errors: [],
    child: {
      value: Boolean(evaluationPanelMember?.chair),
      id: `${idNamespace}-twu-opportunity-evaluation-panel-member-is-chair`
    }
  });
  return [
    {
      member: immutable(memberState),
      chair: immutable(chairState)
    },
    [
      ...component_.cmd.mapMany(
        memberCmds,
        (childMsg) => adt("member", { childMsg, epmIndex }) as Msg
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
        state.evaluationPanelMembers.length,
        state.users
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

    case "member": {
      const componentMessage = msg.value.childMsg;
      const epmIndex = msg.value.epmIndex;
      return component_.base.updateChild({
        state,
        childStatePath: ["evaluationPanelMembers", `${epmIndex}`, "member"],
        childUpdate: Select.update,
        childMsg: componentMessage,
        mapChildMsg: (value) => adt("member", { epmIndex, childMsg: value }),
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
                    state.evaluationPanelMembers[epmIndex].member
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
                    state.evaluationPanelMembers[epmIndex].member
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
        childUpdate: Select.update,
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

export type Values = CreateTWUEvaluationPanelMemberBody[];

export function getValues(state: Immutable<State>): Values {
  const values = state.evaluationPanelMembers.reduce<Values>(
    (acc, epm, order) => {
      if (!acc) {
        return acc;
      }
      acc.push({
        user: Select.getValue(epm.member),
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
          user: Select.getValue(state.evaluationPanelChair),
          chair: true,
          evaluator: false,
          order: state.evaluationPanelMembers.length
        }
      ]
    : values;
}

export type Errors = CreateTWUEvaluationPanelMemberValidationErrors[];

export function setErrors(
  state: Immutable<State>,
  errors: Errors = []
): Immutable<State> {
  let chairErrors: CreateTWUEvaluationPanelMemberValidationErrors | undefined;
  if (errors.length !== state.evaluationPanelMembers.length) {
    chairErrors = errors.pop();
  }
  return errors
    .reduce((acc, e, i) => {
      return acc
        .updateIn(["evaluationPanelMembers", i, "member"], (s) =>
          FormField.setErrors(s as Immutable<Select.State>, e.user || [])
        )
        .updateIn(["evaluationPanelMembers", i, "chair"], (s) =>
          FormField.setErrors(s as Immutable<Checkbox.State>, e.chair || [])
        );
    }, state)
    .update("evaluationPanelChair", (s) =>
      FormField.setErrors(s as Immutable<Select.State>, chairErrors?.user || [])
    );
}

export function validate(state: Immutable<State>): Immutable<State> {
  return state.evaluationPanelMembers
    .reduce((acc, _, i) => {
      return acc
        .updateIn(["evaluationPanelMembers", i, "member"], (s) =>
          FormField.validate(s as Immutable<Select.State>)
        )
        .updateIn(["evaluationPanelMembers", i, "chair"], (s) =>
          FormField.validate(s as Immutable<Checkbox.State>)
        );
    }, state)
    .update("evaluationPanelChair", (s) =>
      FormField.validate(s as Immutable<Select.State>)
    );
}

export function isValid(state: Immutable<State>): boolean {
  if (!state.evaluationPanelMembers.length) {
    return false;
  }
  return state.evaluationPanelMembers.reduce((acc, epm) => {
    return acc && FormField.isValid(epm.member) && FormField.isValid(epm.chair);
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
          <Select.view
            extraChildProps={{}}
            label="Panel Member"
            placeholder="Panel Member"
            required
            disabled={disabled}
            state={evaluationPanelMember.member}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("member" as const, { childMsg: value, epmIndex: index })
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
    state.evaluationPanelMembers.length > MIN_TWU_EVALUATION_PANEL_MEMBERS;

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
          <Select.view
            extraChildProps={{}}
            label="Chair"
            placeholder="Chair"
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
