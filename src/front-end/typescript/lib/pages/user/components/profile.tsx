import * as FormField from 'front-end/lib/components/form-field';
import * as ShortText from 'front-end/lib/components/form-field/short-text';
import { ComponentViewProps, immutable, Immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { getString } from 'shared/lib';
import { User } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';
import { validateName } from 'shared/lib/validation/user';

export interface Params {
  existingUser?: User;
}

export interface State {
  name: Immutable<ShortText.State>;
}

export type Msg
  = ADT<'name', ShortText.Msg>;

export interface Values {
  name: string;
  email: string;
}

export function getValues(state: Immutable<State>): Values {
  return {
    name: FormField.getValue(state.name),
    email: FormField.getValue(state.name) // TODO change to email
  };
}

export function setValues(state: Immutable<State>, values: Values): Immutable<State> {
  return state
    .update('name', s => FormField.setValue(s, values.name));
  //TODO email
}

export function isValid(state: Immutable<State>): boolean {
  return FormField.isValid(state.name);
  // TODO email
}

export interface Errors {
  name?: string[];
  email?: string[];
}

export function setErrors(state: Immutable<State>, errors: Errors): Immutable<State> {
  return state
    .update('name', s => FormField.setErrors(s, errors.name || []));
  // TODO email
}

export const init: Init<Params, State> = async ({ existingUser }) => {
  return {
    name: immutable(await ShortText.init({
      errors: [],
      validate: validateName,
      child: {
        type: 'text',
        value: getString(existingUser, 'name'),
        id: 'user-gov-name'
      }
    }))
  };
};

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'name':
      return updateComponentChild({
        state,
        childStatePath: ['name'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('name', value)
      });
  }
};

export interface Props extends ComponentViewProps<State, Msg> {
  disabled?: boolean;
}

export const view: View<Props> = props => {
  const { state, dispatch, disabled } = props;
  return (
    <div>
      <Row>
        <Col xs='12'>
          <ShortText.view
            extraChildProps={{}}
            label='Name'
            required
            disabled={disabled}
            state={state.name}
            dispatch={mapComponentDispatch(dispatch, value => adt('name' as const, value))} />
        </Col>
      </Row>
    </div>
  );
};
