import { FORM_FIELD_DEBOUNCE_DURATION } from "front-end/config";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import Icon, { AvailableIcons } from "front-end/lib/views/icon";
import { debounce, get } from "lodash";
import React, { CSSProperties } from "react";
import { Alert, FormGroup, FormText, Label } from "reactstrap";
import { adt, ADT } from "shared/lib/types";
import {
  getInvalidValue,
  getValidValue,
  isValid as isValidValidation,
  Validation
} from "shared/lib/validation";

export interface ChildStateBase<Value> {
  value: Value;
  id: string;
}

export type ChildParamsBase<Value> = ChildStateBase<Value>;

// Allows child components to trigger state validation.
export type ChildMsg<InnerChildMsg> = InnerChildMsg | ADT<"@validate">;

export type OnChange<Value> = (value: Value) => void;

export interface ChildProps<
  Value,
  ChildState extends ChildStateBase<Value>,
  InnerChildMsg
> {
  state: Immutable<ChildState>;
  dispatch: component_.base.Dispatch<ChildMsg<InnerChildMsg>>;
  validityClassName: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: OnChange<Value>;
}

export type ChildComponent<
  Value,
  ChildParams extends ChildParamsBase<Value>,
  ChildState extends ChildStateBase<Value>,
  InnerChildMsg,
  ExtraChildProps = unknown
> = component_.base.Component<
  ChildParams,
  ChildState,
  ChildMsg<InnerChildMsg>,
  ChildProps<Value, ChildState, InnerChildMsg> & ExtraChildProps
>;

export type Validate<Value> = (value: Value) => Validation<Value>;

export interface State<Value, ChildState extends ChildStateBase<Value>> {
  errors: string[];
  showHelp: boolean;
  child: Immutable<ChildState>;
  validate: Validate<Value> | null;
}

export interface Params<Value, ChildParams extends ChildParamsBase<Value>> {
  errors: string[];
  child: ChildParams;
  validate?: Validate<Value>;
}

export type Msg<InnerChildMsg> =
  | ADT<"toggleHelp">
  | ADT<"validate">
  | ADT<"child", ChildMsg<InnerChildMsg>>;

export interface ViewProps<
  Value,
  ChildState extends ChildStateBase<Value>,
  InnerChildMsg,
  ExtraChildProps = unknown
> extends component_.base.ComponentViewProps<
    State<Value, ChildState>,
    Msg<InnerChildMsg>
  > {
  extraChildProps: ExtraChildProps;
  className?: string;
  labelClassName?: string;
  style?: CSSProperties;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  label?: string | component_.base.ViewElementChildren;
  help?: component_.base.ViewElementChildren;
  hint?: component_.base.ViewElementChildren;
  action?: {
    icon: AvailableIcons;
    onClick(): void;
  };
}

export type Component<
  Value,
  ChildParams extends ChildParamsBase<Value>,
  ChildState extends ChildStateBase<Value>,
  InnerChildMsg,
  ExtraChildProps = unknown
> = component_.base.Component<
  Params<Value, ChildParams>,
  State<Value, ChildState>,
  Msg<InnerChildMsg>,
  ViewProps<Value, ChildState, InnerChildMsg, ExtraChildProps>
>;

function makeInit<
  Value,
  ChildParams extends ChildParamsBase<Value>,
  ChildState extends ChildStateBase<Value>,
  InnerChildMsg,
  ExtraChildProps
>(
  childInit: ChildComponent<
    Value,
    ChildParams,
    ChildState,
    InnerChildMsg,
    ExtraChildProps
  >["init"]
): Component<
  Value,
  ChildParams,
  ChildState,
  InnerChildMsg,
  ExtraChildProps
>["init"] {
  return (params) => {
    const [childState, childCmds] = childInit(params.child);
    return [
      {
        id: params.child.id,
        errors: params.errors,
        showHelp: false,
        child: immutable(childState),
        validate: params.validate || null
      },
      childCmds.map((c) =>
        component_.cmd.map(c, (childMsg) => adt("child", childMsg))
      )
    ];
  };
}

function makeUpdate<
  Value,
  ChildParams extends ChildParamsBase<Value>,
  ChildState extends ChildStateBase<Value>,
  InnerChildMsg,
  ExtraChildProps
>(
  childUpdate: ChildComponent<
    Value,
    ChildParams,
    ChildState,
    InnerChildMsg,
    ExtraChildProps
  >["update"]
): Component<
  Value,
  ChildParams,
  ChildState,
  InnerChildMsg,
  ExtraChildProps
>["update"] {
  return ({ state, msg }) => {
    switch (msg.tag) {
      case "toggleHelp":
        return [state.update("showHelp", (v: boolean) => !v), []];
      case "validate":
        return [validate(state), []];
      case "child":
        return component_.base.updateChild({
          state,
          mapChildMsg: (value) => adt("child" as const, value),
          childStatePath: ["child"],
          childUpdate,
          childMsg: msg.value,
          updateAfter: (state) => {
            if (get(msg, ["value", "tag"]) === "@validate") {
              return [
                state,
                [component_.cmd.dispatch<Msg<InnerChildMsg>>(adt("validate"))]
              ];
            } else {
              return [state, []];
            }
          }
        });
      default:
        return [state, []];
    }
  };
}

function ConditionalHelpToggle<
  Value,
  ChildState extends ChildStateBase<Value>,
  InnerChildMsg
>(
  props: ViewProps<Value, ChildState, InnerChildMsg>
): component_.base.ViewElement<ViewProps<Value, ChildState, InnerChildMsg>> {
  const { dispatch, help } = props;
  if (help) {
    return (
      <Icon
        hover
        name="question-circle"
        color="info"
        width={1}
        height={1}
        className="mt-n1 ms-2 flex-shrink-0 d-inline"
        onClick={(e) => {
          dispatch(adt("toggleHelp"));
          e.preventDefault();
        }}
      />
    );
  } else {
    return null;
  }
}

export const ViewRequiredAsterisk: component_.base.View<
  Record<string, never>
> = () => {
  return <span className="fw-bold text-c-form-field-required ms-1">*</span>;
};

export function ConditionalLabel<
  Value,
  ChildState extends ChildStateBase<Value>,
  InnerChildMsg
>(
  props: ViewProps<Value, ChildState, InnerChildMsg>
): component_.base.ViewElement<ViewProps<Value, ChildState, InnerChildMsg>> {
  const { state, label, required, disabled, labelClassName, action } = props;
  const className = `fw-bold d-flex flex-nowrap align-items-end ${
    labelClassName || ""
  }`;
  if (label) {
    return (
      <Label for={state.child.id} className={className}>
        <div className="flex-grow-1 flex-shrink-0">
          {label}
          {required && !disabled ? <ViewRequiredAsterisk /> : null}
          <ConditionalHelpToggle {...props} />
        </div>
        {action && !disabled ? (
          <div className="flex-shrink-0 ms-0">
            <Icon
              name={action.icon}
              color="info"
              hover
              onClick={action.onClick}
            />
          </div>
        ) : null}
      </Label>
    );
  } else {
    return null;
  }
}

function ConditionalHelp<
  Value,
  ChildState extends ChildStateBase<Value>,
  InnerChildMsg
>(
  props: ViewProps<Value, ChildState, InnerChildMsg>
): component_.base.ViewElement<ViewProps<Value, ChildState, InnerChildMsg>> {
  const { state, help } = props;
  if (help && state.showHelp) {
    return (
      <Alert color="info" style={{ whiteSpace: "pre-line" }}>
        {help}
      </Alert>
    );
  } else {
    return null;
  }
}

function ConditionalHint<
  Value,
  ChildState extends ChildStateBase<Value>,
  InnerChildMsg
>(
  props: ViewProps<Value, ChildState, InnerChildMsg>
): component_.base.ViewElement<ViewProps<Value, ChildState, InnerChildMsg>> {
  if (props.hint) {
    return <FormText color="secondary">{props.hint}</FormText>;
  } else {
    return null;
  }
}

function ConditionalErrors<
  Value,
  ChildState extends ChildStateBase<Value>,
  InnerChildMsg
>(
  props: ViewProps<Value, ChildState, InnerChildMsg>
): component_.base.ViewElement<ViewProps<Value, ChildState, InnerChildMsg>> {
  const { state } = props;
  if (state.errors.length) {
    const errorElements = state.errors.map((error, i) => {
      return <div key={`form-field-conditional-errors-${i}`}>{error}</div>;
    });
    return <FormText color="danger">{errorElements}</FormText>;
  } else {
    return null;
  }
}

function makeView<
  Value,
  ChildParams extends ChildParamsBase<Value>,
  ChildState extends ChildStateBase<Value>,
  InnerChildMsg,
  ExtraChildProps
>(
  ChildView: ChildComponent<
    Value,
    ChildParams,
    ChildState,
    InnerChildMsg,
    ExtraChildProps
  >["view"]
): Component<
  Value,
  ChildParams,
  ChildState,
  InnerChildMsg,
  ExtraChildProps
>["view"] {
  const debouncedValidate = debounce(
    (dispatch: component_.base.Dispatch<Msg<InnerChildMsg>>) =>
      dispatch(adt("validate")),
    FORM_FIELD_DEBOUNCE_DURATION
  );
  return function FormWrapper(props) {
    const { state, dispatch, style, extraChildProps } = props;
    const invalid = !!state.errors.length;
    const childClassName = "flex-grow-1 align-self-stretch";
    const validityClassName = invalid ? "is-invalid" : "";
    return (
      <FormGroup
        className={`form-field-${state.child.id} d-flex flex-column ${
          props.className || ""
        }`}
        style={style}>
        <ConditionalLabel {...props} />
        <ConditionalHelp {...props} />
        <ChildView
          {...extraChildProps}
          state={state.child}
          className={childClassName}
          validityClassName={validityClassName}
          disabled={props.disabled}
          placeholder={props.placeholder}
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("child" as const, value)
          )}
          onChange={() => debouncedValidate(dispatch)}
        />
        <ConditionalHint {...props} />
        <ConditionalErrors {...props} />
      </FormGroup>
    );
  };
}

export function makeComponent<
  Value,
  ChildParams extends ChildParamsBase<Value>,
  ChildState extends ChildStateBase<Value>,
  InnerChildMsg,
  ExtraChildProps = unknown
>(
  params: ChildComponent<
    Value,
    ChildParams,
    ChildState,
    InnerChildMsg,
    ExtraChildProps
  >
): Component<Value, ChildParams, ChildState, InnerChildMsg, ExtraChildProps> {
  return {
    init: makeInit(params.init),
    update: makeUpdate(params.update),
    //Need to type cast here because the compiler's inference is failing.
    view: makeView(params.view) as Component<
      Value,
      ChildParams,
      ChildState,
      InnerChildMsg,
      ExtraChildProps
    >["view"]
  };
}

export function getValue<Value, ChildState extends ChildStateBase<Value>>(
  state: Immutable<State<Value, ChildState>>
): Value {
  return state.child.value;
}

export function setValue<Value, ChildState extends ChildStateBase<Value>>(
  state: Immutable<State<Value, ChildState>>,
  value: Value
): Immutable<State<Value, ChildState>> {
  return state.update("child", (child) => child.set("value", value));
}

export function updateValue<Value, ChildState extends ChildStateBase<Value>>(
  state: Immutable<State<Value, ChildState>>,
  fn: (_: Value) => Value
): Immutable<State<Value, ChildState>> {
  const value = getValue(state);
  return setValue(state, fn(value));
}

export function validate<Value, ChildState extends ChildStateBase<Value>>(
  state: Immutable<State<Value, ChildState>>
): Immutable<State<Value, ChildState>> {
  return state.validate
    ? validateAndSetValue(state, getValue(state), state.validate)
    : state;
}

export function setValidate<Value, ChildState extends ChildStateBase<Value>>(
  state: Immutable<State<Value, ChildState>>,
  validateFn: Exclude<State<Value, ChildState>["validate"], null>,
  runValidation = false
): Immutable<State<Value, ChildState>> {
  state = state.set("validate", validateFn);
  return runValidation ? validate(state) : state;
}

export function setErrors<Value, ChildState extends ChildStateBase<Value>>(
  state: Immutable<State<Value, ChildState>>,
  errors: string[]
): Immutable<State<Value, ChildState>> {
  return state.set("errors", errors);
}

export function validateAndSetValue<
  Value,
  ChildState extends ChildStateBase<Value>
>(
  state: Immutable<State<Value, ChildState>>,
  value: Value,
  validate: (value: Value) => Validation<Value>
): Immutable<State<Value, ChildState>> {
  const validation = validate(value);
  return (
    setErrors(state, getInvalidValue(validation, []))
      // Use setIn because the compiler can't reconcile ChildState['value'] and Value
      .update("child", (child) =>
        child.setIn(["value"], getValidValue(validation, value))
      )
  );
}

export function isValid<Value, ChildState extends ChildStateBase<Value>>(
  state: Immutable<State<Value, ChildState>>
): boolean {
  return state.validate
    ? isValidValidation(state.validate(getValue(state))) && !state.errors.length
    : !state.errors.length;
}
