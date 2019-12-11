import { FORM_FIELD_DEBOUNCE_DURATION } from 'front-end/config';
import { ComponentViewProps, Dispatch, immutable, Immutable, Init, mapComponentDispatch, Update, updateComponentChild, View, ViewElement, ViewElementChildren } from 'front-end/lib/framework';
import * as framework from 'front-end/lib/framework';
import Icon from 'front-end/lib/views/icon';
import { debounce } from 'lodash';
import React, { CSSProperties } from 'react';
import { Alert, FormGroup, FormText, Label } from 'reactstrap';
import { ADT } from 'shared/lib/types';
import { getInvalidValue, getValidValue, Validation } from 'shared/lib/validation';

export interface ChildStateBase<Value> {
  value: Value;
  id: string;
}

export type ChildParamsBase<Value> = ChildStateBase<Value>;

// Allows child components to trigger state validation.
export type ChildMsg<InnerChildMsg> = InnerChildMsg | ADT<'@validate'>;

export interface ChildProps<Value, ChildState extends ChildStateBase<Value>, InnerChildMsg> {
  state: Immutable<ChildState>;
  className?: string;
  validityClassName: string;
  disabled?: boolean;
  placeholder?: string;
  dispatch: Dispatch<ChildMsg<InnerChildMsg>>;
  onChange(value: Value): void;
}

export type ChildView<Value, ChildState extends ChildStateBase<Value>, InnerChildMsg> = View<ChildProps<Value, ChildState, InnerChildMsg>>;

type ChildComponent<Value, ChildParams extends ChildParamsBase<Value>, ChildState extends ChildStateBase<Value>, InnerChildMsg> = framework.Component<ChildParams, ChildState, ChildMsg<InnerChildMsg>, ChildProps<Value, ChildState, InnerChildMsg>>;

export interface State<Value, ChildState extends ChildStateBase<Value>> {
  errors: string[];
  showHelp: boolean;
  child: Immutable<ChildState>;
  validate?(value: Value): Validation<Value>;
}

export interface Params<Value, ChildParams extends ChildParamsBase<Value>> {
  errors: string[];
  child: ChildParams;
  validate?(value: Value): Validation<Value>;
}

export type Msg<InnerChildMsg>
  = ADT<'toggleHelp'>
  | ADT<'validate'>
  | ADT<'child', ChildMsg<InnerChildMsg>>;

function makeInit<Value, ChildParams extends ChildParamsBase<Value>, ChildState extends ChildStateBase<Value>, InnerChildMsg>(childInit: ChildComponent<Value, ChildParams, ChildState, InnerChildMsg>['init']): Init<Params<Value, ChildParams>, State<Value, ChildState>> {
  return async params => ({
    id: params.child.id,
    errors: params.errors,
    showHelp: false,
    child: immutable(await childInit(params.child)),
    validate: params.validate
  });
}

function validate<Value, ChildState extends ChildStateBase<Value>>(state: Immutable<State<Value, ChildState>>): Immutable<State<Value, ChildState>> {
  return state.validate
    ? validateAndSetValue(state, getValue(state), state.validate)
    : state;
}

function makeUpdate<Value, ChildParams extends ChildParamsBase<Value>, ChildState extends ChildStateBase<Value>, InnerChildMsg>(childUpdate: ChildComponent<Value, ChildParams, ChildState, InnerChildMsg>['update']): Update<State<Value, ChildState>, Msg<InnerChildMsg>> {
  return ({ state, msg }) => {
    switch (msg.tag) {
      case 'toggleHelp':
        return [
          state.update('showHelp', v => !v)
        ];
      case 'validate':
        return [state, async state => validate(state)];
      case 'child':
        const result = updateComponentChild({
          state,
          mapChildMsg: value => ({ tag: 'child', value } as const),
          childStatePath: ['child'],
          childUpdate,
          childMsg: msg.value
        });
        return [
          result[0],
          async (state, dispatch) => {
            if (msg.value && (msg.value as ADT<'@validate'>).tag === '@validate') {
              dispatch({ tag: 'validate', value: undefined });
            }
            if (result[1]) {
              return await result[1](state, dispatch);
            } else {
              return null;
            }
          }
        ];
      default:
        return [state];
    }
  };
}

interface ViewProps<Value, ChildState extends ChildStateBase<Value>, InnerChildMsg> extends ComponentViewProps<State<Value, ChildState>, Msg<InnerChildMsg>> {
  className?: string;
  labelClassName?: string;
  style?: CSSProperties;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  help?: ViewElementChildren;
}

function ConditionalHelpToggle<Value, ChildState extends ChildStateBase<Value>, InnerChildMsg>(props: ViewProps<Value, ChildState, InnerChildMsg>): ViewElement<ViewProps<Value, ChildState, InnerChildMsg>> {
  const { dispatch, disabled, help } = props;
  if (help && !disabled) {
    return (
      <Icon
        name='question-circle'
        color='secondary'
        width={1}
        height={1}
        className='mt-n1 ml-2 text-hover-dark flex-shrink-0 d-inline'
        style={{ cursor: 'pointer' }}
        onClick={e => {
          dispatch({ tag: 'toggleHelp', value: undefined });
          e.preventDefault();
        }} />
    );
  } else {
    return null;
  }
}

function ConditionalLabel<Value, ChildState extends ChildStateBase<Value>, InnerChildMsg>(props: ViewProps<Value, ChildState, InnerChildMsg>): ViewElement<ViewProps<Value, ChildState, InnerChildMsg>> {
  const { state, label, required, labelClassName } = props;
  const className = `${required ? 'font-weight-bold' : ''} ${labelClassName || ''}`;
  if (label) {
    return (
      <Label for={state.child.id} className={className}>
        <span>
          {label}
          {required ? (<span className='text-info ml-1'>*</span>) : null}
          <ConditionalHelpToggle {...props} />
        </span>
      </Label>
    );
  } else {
    return null;
  }
}

function ConditionalHelp<Value, ChildState extends ChildStateBase<Value>, InnerChildMsg>(props: ViewProps<Value, ChildState, InnerChildMsg>): ViewElement<ViewProps<Value, ChildState, InnerChildMsg>> {
  const { state, help, disabled } = props;
  if (help && state.showHelp && !disabled) {
    return (
      <Alert color='info' style={{ whiteSpace: 'pre-line' }}>
        {help}
      </Alert>
    );
  } else {
    return null;
  }
}

function ConditionalErrors<Value, ChildState extends ChildStateBase<Value>, InnerChildMsg>(props: ViewProps<Value, ChildState, InnerChildMsg>): ViewElement<ViewProps<Value, ChildState, InnerChildMsg>> {
  const { state } = props;
  if (state.errors.length) {
    const errorElements = state.errors.map((error, i) => {
      return (<div key={`form-field-conditional-errors-${i}`}>{error}</div>);
    });
    return (
      <FormText color='danger'>
        {errorElements}
      </FormText>
    );
  } else {
    return null;
  }
}

function makeView<Value, ChildParams extends ChildParamsBase<Value>, ChildState extends ChildStateBase<Value>, InnerChildMsg>(ChildView: ChildComponent<Value, ChildParams, ChildState, InnerChildMsg>['view']): View<ViewProps<Value, ChildState, InnerChildMsg>> {
  const debouncedValidate = debounce((dispatch: Dispatch<Msg<InnerChildMsg>>) => dispatch({
    tag: 'validate',
    value: undefined
  }), FORM_FIELD_DEBOUNCE_DURATION);
  return props => {
    const { state, dispatch, style } = props;
    const invalid = !!state.errors.length;
    const childClassName = 'flex-grow-1 align-self-stretch';
    const validityClassName = invalid ? 'is-invalid' : '';
    return (
      <FormGroup className={`form-field-${state.child.id} d-flex flex-column ${props.className || ''}`} style={style}>
        <ConditionalLabel {...props} />
        <ConditionalHelp {...props} />
        <ChildView
          state={state.child}
          className={childClassName}
          validityClassName={validityClassName}
          disabled={props.disabled}
          placeholder={props.placeholder}
          dispatch={mapComponentDispatch(dispatch, value => ({ tag: 'child' as const, value }))}
          onChange={() => debouncedValidate(dispatch)} />
        <ConditionalErrors {...props} />
      </FormGroup>
    );
  };
}

export type Component<Value, ChildParams extends ChildParamsBase<Value>, ChildState extends ChildStateBase<Value>, InnerChildMsg> = framework.Component<Params<Value, ChildParams>, State<Value, ChildState>, Msg<InnerChildMsg>, ViewProps<Value, ChildState, InnerChildMsg>>;

export function makeComponent<Value, ChildParams extends ChildParamsBase<Value>, ChildState extends ChildStateBase<Value>, InnerChildMsg>(params: ChildComponent<Value, ChildParams, ChildState, InnerChildMsg>): Component<Value, ChildParams, ChildState, InnerChildMsg> {
  return {
    init: makeInit(params.init),
    update: makeUpdate(params.update),
    view: makeView(params.view)
  };
}

export function getValue<Value, ChildState extends ChildStateBase<Value>>(state: Immutable<State<Value, ChildState>>): Value {
  return state.child.value;
}

export function setValue<Value, ChildState extends ChildStateBase<Value>>(state: Immutable<State<Value, ChildState>>, value: Value): Immutable<State<Value, ChildState>> {
  return state.updateIn('child', child => child.set('value', value));
}

export function setErrors<Value, ChildState extends ChildStateBase<Value>>(state: Immutable<State<Value, ChildState>>, errors: string[]): Immutable<State<Value, ChildState>> {
  return state.set('errors', errors);
}

export function validateAndSetValue<Value, ChildState extends ChildStateBase<Value>>(state: Immutable<State<Value, ChildState>>, value: Value, validate: (value: Value) => Validation<Value>): Immutable<State<Value, ChildState>> {
  const validation = validate(value);
  return setErrors(state, getInvalidValue(validation, []))
    // Use setIn because the compiler can't reconcile ChildState['value'] and Value
    .update('child', child => child.setIn(['value'], getValidValue(validation, value)));
}

export function isValid<Value, ChildState extends ChildStateBase<Value>>(state: Immutable<State<Value, ChildState>>): boolean {
  return !state.errors.length;
}
