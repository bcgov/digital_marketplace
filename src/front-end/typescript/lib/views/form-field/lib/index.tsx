import { Immutable, View } from 'front-end/lib/framework';
import Icon from 'front-end/lib/views/icon';
import React, { ReactElement } from 'react';
import { Alert, FormGroup, FormText, Label } from 'reactstrap';
import { getInvalidValue, getValidValue, Validation } from 'shared/lib/validators';

export interface State<Value> {
  value: Value;
  id: string;
  required: boolean;
  errors: string[];
  label?: string;
  help?: {
    text: string | ReactElement;
    show: boolean;
  }
}

export type OnChange<Value> = (value: Value) => void;

export interface ChildProps<State, ExtraProps, Value> {
  state: State;
  disabled: boolean;
  className: string;
  extraProps: ExtraProps;
  onChange(value: Value): void;
}

export interface Props<ChildState extends State<Value>, ChildExtraProps, Value> {
  state: ChildState;
  disabled?: boolean;
  Child: View<ChildProps<ChildState, ChildExtraProps, Value>>;
  labelClassName?: string;
  className?: string;
  extraProps: ChildExtraProps;
  toggleHelp?(): void;
  onChange(value: Value): void;
}

const ConditionalHelpToggle: View<Props<any, any, any>> = ({ state, toggleHelp, disabled = false }) => {
  const { help } = state;
  if (help && toggleHelp && !disabled) {
    return (
      <Icon
        name='question-circle'
        color='secondary'
        width={1}
        height={1}
        className='mt-n1 ml-2 text-hover-dark flex-shrink-0 d-inline'
        style={{ cursor: 'pointer' }}
        onClick={e => { toggleHelp(); e.preventDefault(); }} />
    );
  } else {
    return null;
  }
};

const ConditionalLabel: View<Props<any, any, any>> = (props) => {
  const { id, label, required } = props.state;
  const className = `${required ? 'font-weight-bold' : ''} ${props.labelClassName || ''}`;
  if (label) {
    return (
      <Label for={id} className={className}>
        <span>
          {label}
          {required ? (<span className='text-info ml-1'>*</span>) : null }
          <ConditionalHelpToggle {...props} />
        </span>
      </Label>
    );
  } else {
    return null;
  }
};

const ConditionalHelp: View<Props<any, any, any>> = ({ state, disabled }) => {
  const { help } = state;
  if (help && help.show && !disabled) {
    return (
      <Alert color='info' style={{ whiteSpace: 'pre-line' }}>
        {help.text}
      </Alert>
    );
  } else {
    return null;
  }
}

const ConditionalErrors: View<State<any>> = ({ errors }) => {
  if (errors.length) {
    const errorElements = errors.map((error, i) => {
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

export function view<ChildState extends State<Value>, ChildExtraProps, Value>(props: Props<ChildState, ChildExtraProps, Value>) {
  const { state, disabled = false, Child, onChange, extraProps, className = '' } = props;
  const invalid = !!state.errors.length;
  const childClassName = invalid ? 'is-invalid' : '';
  return (
    <FormGroup className={`form-field-${state.id} ${className}`}>
      <ConditionalLabel {...props} />
      <ConditionalHelp {...props} />
      <Child state={state} onChange={onChange} className={childClassName} extraProps={extraProps} disabled={disabled} />
      <ConditionalErrors {...state} />
    </FormGroup>
  );
};

export function validateAndUpdateField<State>(state: Immutable<State>, key: string, value: string, validate: (value: string) => Validation<string>): Immutable<State> {
  const validation = validate(value);
  return state
    .setIn([key, 'value'], value)
    .setIn([key, 'errors'], getInvalidValue(validation, []));
}

export function updateField<State>(state: Immutable<State>, key: string, value: string): Immutable<State> {
  return state.setIn([key, 'value'], value);
}

export function validateField<State>(state: Immutable<State>, key: string, validate: (value: string) => Validation<string>): Immutable<State> {
  const value = state.getIn([key, 'value']) || '';
  const validation = validate(value);
  return state
    .setIn([key, 'value'], getValidValue(validation, value))
    .setIn([key, 'errors'], getInvalidValue(validation, []));
}
