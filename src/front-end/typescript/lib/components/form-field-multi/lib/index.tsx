import { Immutable, View } from 'front-end/lib/framework';
import Icon from 'front-end/lib/views/icon';
import { cloneDeep, reduce } from 'lodash';
import { default as React, ReactElement } from 'react';
import { Alert, Button, FormGroup, FormText, Label } from 'reactstrap';

export interface Field<Value> {
  value: Value;
  errors: string[];
}

export function makeField<Value>(value: Value, errors: string[] = []): Field<Value> {
  return {
    value,
    errors
  };
}

export interface State<Value> {
  idNamespace: string;
  label?: string;
  description?: string;
  reverseFieldOrderInView?: boolean;
  required: boolean;
  fields: Array<Field<Value>>;
  minFields?: number;
  help?: {
    text: string | ReactElement;
    show: boolean;
  }
}

export type OnChange<Value> = (value: Value) => void;

export function getFieldValues<Value>(state: State<Value>): Value[] {
  return state.fields.map(field => field.value);
}

export function setFieldValues<Value>(state: Immutable<State<Value>>, values: Value[]): Immutable<State<Value>> {
  const fields = values.map((value, i) => {
    return {
      ...makeField(value)
    };
  });
  return state.set('fields', fields);
}

export function setFieldErrors<Value>(state: Immutable<State<Value>>, errors: string[][]): Immutable<State<Value>> {
  const fields = cloneDeep(state.fields);
  fields.forEach((field, i) => field.errors = errors[i] || []);
  return state.set('fields', fields);
}

export function isValid<Value>(state: Immutable<State<Value>>): boolean {
  return reduce(state.fields, (acc: boolean, v: Field<Value>) => {
    return acc && (!v.errors || !v.errors.length);
  }, true);
}

export interface ChildProps<ExtraProps, Value> {
  id: string;
  index: number;
  className: string;
  field: Field<Value>;
  disabled: boolean;
  onChange: OnChange<Value>;
  extraProps: ExtraProps;
  removable: boolean;
  onRemove(): void;
}

export interface AddButtonProps<OnAddParams> {
  text?: string;
  onAdd(params?: OnAddParams): void;
}

export interface Props<OnAddParams, ChildExtraProps, Value> {
  state: State<Value>;
  disabled?: boolean;
  AddButton: View<AddButtonProps<OnAddParams>>;
  addButtonProps: AddButtonProps<OnAddParams>;
  Child: View<ChildProps<ChildExtraProps, Value>>;
  className?: string;
  formGroupClassName?: string;
  labelWrapperClassName?: string;
  labelClassName?: string;
  extraChildProps: ChildExtraProps;
  onChange(index: number): OnChange<Value>;
  onRemove(index: number): () => void;
  toggleHelp?(): void;
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
        className='ml-3 text-hover-dark flex-shrink-0'
        style={{ cursor: 'pointer' }}
        onClick={() => toggleHelp()} />
    );
  } else {
    return null;
  }
};

const ConditionalLabel: View<Props<any, any, any>> = ({ state, labelClassName = '' }) => {
  const { label, required } = state;
  if (label) {
    return (
      <Label className={`mb-0 mr-3 ${required ? 'font-weight-bold' : ''} ${labelClassName}`}>
        <span>
          {label}
          {required ? (<span className='text-info ml-1'>*</span>) : null }
        </span>
      </Label>
    );
  } else {
    return null;
  }
};

export function makeDefaultAddButton(text = 'Add'): View<AddButtonProps<void>> {
  return props => {
    return (
      <Button color='info' size='sm' onClick={() => props.onAdd()}>
        {text}
      </Button>
    );
  };
}

function ConditionalAddButton<OnAddParams>(props: Props<OnAddParams, any, any>) {
  const { AddButton, addButtonProps, disabled = false } = props;
  if (disabled) {
    return null;
  } else {
    return (<AddButton onAdd={addButtonProps.onAdd} />);
  }
}

const ConditionalHelp: View<Props<any, any, any>> = ({ state, disabled = false }) => {
  const { help } = state;
  if (help && help.show && !disabled) {
    return (
      <Alert color='info' className='mt-4'>
        {help.text}
      </Alert>
    );
  } else {
    return null;
  }
}

const ConditionalFieldErrors: View<Field<any>> = ({ errors }) => {
  if (errors.length) {
    const errorElements = errors.map((error, i) => {
      return (<div key={`form-field-multi-conditional-errors-${i}`}>{error}</div>);
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

export function ConditionalRemoveButton<Value>(props: ChildProps<any, Value>) {
  if (props.disabled) {
    return null;
  } else {
    const { removable } = props;
    const className = `${!removable ? 'disabled' : ''} btn btn-sm btn-link text-hover-danger`;
    return (
      <Icon
        name='trash'
        color='secondary'
        width={1.25}
        height={1.25}
        className={className}
        style={{ boxSizing: 'content-box', cursor: 'pointer' }}
        onClick={() => removable && props.onRemove()} />
    );
  }
}

export interface DefaultChildProps<ExtraProps, Value> {
  childProps: ChildProps<ExtraProps, Value>;
  children: ReactElement<any> | Array<ReactElement<any> | null> | string;
}

/**
 * Helper React component to create a "standard"
 * child component.
 */

export function DefaultChild<ExtraProps, Value>(props: DefaultChildProps<ExtraProps, Value>) {
  const { childProps, children } = props;
  return (
    <div className='d-flex align-items-center'>
      {children}
      <ConditionalRemoveButton {...childProps} />
    </div>
  );
}

function Children<OnAddParams, ChildExtraProps, Value>(props: Props<OnAddParams, ChildExtraProps, Value>) {
  const { Child, state, onChange, onRemove, formGroupClassName = '', extraChildProps, disabled = false } = props;
  const { fields, idNamespace, reverseFieldOrderInView = false, minFields = 0 } = state;
  const removable = fields.length > minFields;
  const children = fields.reduce((acc, field, i) => {
    const id = `${idNamespace}-${i}`;
    const invalid = !!field.errors.length;
    const childClassName = invalid ? 'is-invalid' : '';
    const child = (
      <FormGroup key={`form-field-multi-child-${i}`} className={`${formGroupClassName} ${i === fields.length - 1 ? 'mb-0' : ''}`}>
        <Child
          key={`form-field-multi-child-${i}`}
          id={id}
          index={i}
          className={childClassName}
          field={field}
          onChange={onChange(i)}
          onRemove={onRemove(i)}
          extraProps={extraChildProps}
          disabled={disabled}
          removable={removable} />
        <ConditionalFieldErrors {...field} />
      </FormGroup>
    );
    if (reverseFieldOrderInView) {
      acc.unshift(child);
    } else {
      acc.push(child);
    }
    return acc;
  }, [] as Array<ReactElement<any>>);
  return (
    <div>{children}</div>
  );
};

export function view<OnAddParams, ChildExtraProps, Value>(props: Props<OnAddParams, ChildExtraProps, Value>) {
  const { state, labelWrapperClassName = '', className = '' } = props;
  return (
    <FormGroup className={`form-field-${state.idNamespace} ${className}`}>
      <div className={`d-flex flex-wrap align-items-center mb-2 ${labelWrapperClassName}`}>
        <ConditionalLabel {...props} />
        <ConditionalAddButton {...props} />
        <ConditionalHelpToggle {...props} />
      </div>
      {state.description ? (<p className={state.fields.length ? 'mb-4' : 'mb-0'}>{state.description}</p>) : null}
      <ConditionalHelp {...props} />
      <Children {...props} />
    </FormGroup >
  );
}
