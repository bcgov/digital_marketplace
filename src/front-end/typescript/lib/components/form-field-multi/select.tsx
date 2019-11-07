import { Route } from 'front-end/lib/app/types';
import * as FormFieldMulti from 'front-end/lib/components/form-field-multi/lib';
import { Component, ComponentViewProps, GlobalComponentMsg, immutable, Immutable, Init, Update, View } from 'front-end/lib/framework';
import { default as Select, Option, Props as SelectProps, Value } from 'front-end/lib/views/form-field/lib/select';
import { default as SelectCreatable } from 'front-end/lib/views/form-field/lib/select-creatable';
import { cloneDeep, find } from 'lodash';
import React from 'react';
import { ADT } from 'shared/lib/types';

// TODO support option groups if required.
export { Option, Value } from 'front-end/lib/views/form-field/lib/select';

export const DEFAULT_SELECT_MULTI_FIELDS = [{
  value: undefined,
  errors: []
}];

export interface State {
  options: Option[];
  placeholder: string;
  formFieldMulti: Immutable<FormFieldMulti.State<Value>>;
  isCreatable?: boolean;
  autoFocus?: boolean;
}

export function getValues(state: Immutable<State>): Value[] {
  return FormFieldMulti.getFieldValues(state.formFieldMulti);
};

export function getValuesAsStrings(state: Immutable<State>): string[] {
  // Convert undefined values into empty strings.
  return getValues(state).map(v => v ? v.value : '');
};

export function setValues(state: Immutable<State>, values: Array<string | undefined>): Immutable<State> {
  return state.set(
    'formFieldMulti',
    FormFieldMulti.setFieldValues(state.formFieldMulti, values.map(v => {
      const found: Option | undefined = find(state.options, { value: v });
      if (state.isCreatable && !found && v) {
        return { value: v, label: v };
      } else {
        return found;
      }
    }))
  );
};

export function setErrors(state: Immutable<State>, errors: string[][]): Immutable<State> {
  return state.set(
    'formFieldMulti',
    FormFieldMulti.setFieldErrors(state.formFieldMulti, errors)
  );
};

export function isValid(state: Immutable<State>): boolean {
  // Ensure each field doesn't have errors,
  // and each field has a value.
  return FormFieldMulti.isValid(state.formFieldMulti) && getValues(state).reduce((acc: boolean, value: Value) => acc && !!value, true);
};

type InnerMsg
  = ADT<'add'>
  | ADT<'remove', number>
  | ADT<'change', { index: number, value: Value }>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export interface Params extends Omit<State, 'formFieldMulti'> {
  formFieldMulti: FormFieldMulti.State<Value>;
}

type ExtraChildProps = Pick<State, 'options' | 'placeholder' | 'isCreatable' | 'autoFocus'>;

export const init: Init<Params, State> = async params => {
  return {
    ...params,
    formFieldMulti: immutable(params.formFieldMulti)
  };
};

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'add':
      let addFields = state.formFieldMulti.fields;
      addFields = addFields.concat(FormFieldMulti.makeField(undefined));
      return [state.setIn(['formFieldMulti', 'fields'], addFields)];
    case 'remove':
      let removeFields = state.formFieldMulti.fields;
      removeFields = removeFields.filter((field, i) => i !== msg.value);
      return [state.setIn(['formFieldMulti', 'fields'], removeFields)];
    case 'change':
      const changeFields = cloneDeep(state.formFieldMulti.fields);
      changeFields.forEach((field, i) => {
        if (i === msg.value.index) {
          field.value = msg.value.value;
        }
      });
      return [state.setIn(['formFieldMulti', 'fields'], changeFields)];
    default:
      return [state];
  }
};

const Child: View<FormFieldMulti.ChildProps<ExtraChildProps, Value>> = props => {
  const { id, className, field, onChange, extraProps, disabled = false } = props;
  const selectProps: SelectProps = {
    name: id,
    id,
    placeholder: extraProps.placeholder,
    value: field.value,
    disabled,
    autoFocus: extraProps.autoFocus,
    options: { tag: 'options', value: extraProps.options },
    className,
    onChange
  };
  return (
    <FormFieldMulti.DefaultChild childProps={props}>
      {extraProps.isCreatable ? (<SelectCreatable {...selectProps} />) : (<Select {...selectProps} />)}
    </FormFieldMulti.DefaultChild>
  );
};

const AddButton: View<FormFieldMulti.AddButtonProps<void>> = FormFieldMulti.makeDefaultAddButton();

interface Props extends ComponentViewProps<State, Msg> {
  disabled?: boolean;
  labelClassName?: string;
  labelWrapperClassName?: string;
  formGroupClassName?: string;
  className?: string;
}

export const view: View<Props> = ({ state, dispatch, disabled = false, labelClassName, labelWrapperClassName, formGroupClassName, className }) => {
  const onChange = (index: number): FormFieldMulti.OnChange<Value> => value => {
    dispatch({
      tag: 'change',
      value: { index, value }
    });
  };
  const onAdd = () => dispatch({ tag: 'add', value: undefined });
  const onRemove = (index: number) => () => dispatch({ tag: 'remove', value: index });
  const formFieldProps: FormFieldMulti.Props<void, ExtraChildProps, Value> = {
    state: state.formFieldMulti,
    disabled,
    AddButton,
    addButtonProps: { onAdd },
    Child,
    onChange,
    onRemove,
    extraChildProps: {
      options: state.options,
      placeholder: state.placeholder,
      isCreatable: state.isCreatable,
      autoFocus: state.autoFocus
    },
    labelClassName,
    labelWrapperClassName,
    formGroupClassName,
    className
  };
  return (
    <FormFieldMulti.view {...formFieldProps} />
  );
}

export const component: Component<Params, State, Msg> = {
  init,
  update,
  view
};
