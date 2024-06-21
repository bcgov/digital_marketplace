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
}

export type Msg =
  | ADT<"addMember">
  | ADT<"deleteMember", number>
  | ADT<"email", { childMsg: ShortText.Msg; epmIndex: number }>
  | ADT<"chair", { childMsg: Checkbox.Msg; epmIndex: number }>;

export interface Params {
  evaluationPanel: SWUEvaluationPanelMember[];
}

export const init: component_.base.Init<Params, State, Msg> = (params) => {
  const [evaluationPanelMembers, cmds] = params.evaluationPanel
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

  return [
    {
      evaluationPanelMembers
    },
    cmds
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
        mapChildMsg: (value) => adt("email", { epmIndex, childMsg: value })
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
        mapChildMsg: (value) => adt("chair", { epmIndex, childMsg: value })
      });
    }
  }
};

export type Values = CreateSWUEvaluationPanelMemberBody[];

export function getValues(state: Immutable<State>): Values {
  return state.evaluationPanelMembers.reduce<Values>((acc, epm, order) => {
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
  }, []);
}

export type Errors = CreateSWUEvaluationPanelMemberValidationErrors[];

export function setErrors(
  state: Immutable<State>,
  errors: Errors = []
): Immutable<State> {
  return errors.reduce((acc, e, i) => {
    return acc
      .updateIn(["evaluationPanelMembers", i, "email"], (s) =>
        FormField.setErrors(s as Immutable<ShortText.State>, e.email || [])
      )
      .updateIn(["evaluationPanelMembers", i, "chair"], (s) =>
        FormField.setErrors(s as Immutable<Checkbox.State>, e.chair || [])
      );
  }, state);
}

export function validate(state: Immutable<State>): Immutable<State> {
  return state.evaluationPanelMembers.reduce((acc, _, i) => {
    return acc
      .updateIn(["evaluationPanelMembers", i, "email"], (s) =>
        FormField.validate(s as Immutable<ShortText.State>)
      )
      .updateIn(["evaluationPanelMembers", i, "chair"], (s) =>
        FormField.validate(s as Immutable<Checkbox.State>)
      );
  }, state);
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
            help="Enter your question in the field provided below."
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
              placeholder="Provide some guidance on how proponents can effectively respond to your question."
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
        <div className={state.evaluationPanelMembers.length ? "mt-3" : ""}>
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
  const { state, disabled } = props;
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
          dispatch={props.dispatch}
          removable={removable}
        />
      ))}
      <AddButton {...props} />
    </div>
  );
};
