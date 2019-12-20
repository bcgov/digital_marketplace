import * as FormField from 'front-end/lib/components/form-field';
import * as ShortText from 'front-end/lib/components/form-field/short-text';
import { ComponentViewProps, immutable, Immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { getString} from 'shared/lib';
import { parseUserStatus, User, UserStatus, UserType } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';
import { adt, ADT } from 'shared/lib/types';
import { validateEmail, validateName } from 'shared/lib/validation/user';

export interface Params {
  existingUser?: User;
}

export interface State extends Params {
  name: Immutable<ShortText.State>;
  email: Immutable<ShortText.State>;
  jobTitle: Immutable<ShortText.State>;
  userStatus: Immutable<ShortText.State>;
  idpUsername: Immutable<ShortText.State>;
}

export type Msg =
  ADT<'jobTitle',     ShortText.Msg> |
  ADT<'email',        ShortText.Msg> |
  ADT<'userStatus',   ShortText.Msg> |
  ADT<'name',         ShortText.Msg> |
  ADT<'idpUsername',  ShortText.Msg>
  ;

export interface Values {
    id: Id;
    status: UserStatus;
    name: string;
    email: string;
    avatarImageFile: string;
    idpUsername: string;
}

export function getValues(state: Immutable<State>): Values {
  return {
    id: FormField.getValue(state.name),
    status: parseUserStatus(FormField.getValue(state.userStatus)) || UserStatus.Active, // TODO(Jesse): This seems a bit janky..
    name: FormField.getValue(state.name),
    email: FormField.getValue(state.email),
    avatarImageFile: FormField.getValue(state.name),
    idpUsername: FormField.getValue(state.idpUsername)
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
    existingUser,
    idpUsername: immutable(await ShortText.init({
      errors: [],
      child: {
        type: 'text',
        value: getString(existingUser, 'idpUsername'),
        id: 'user-gov-idir-username'
      }
    })),
    jobTitle: immutable(await ShortText.init({
      errors: [],
      validate: validateName,
      child: {
        type: 'text',
        value: getString(existingUser, 'jobTitle'),
        id: 'user-gov-job-title'
      }
    })),
    email: immutable(await ShortText.init({
      errors: [],
      validate: validateEmail,
      child: {
        type: 'text',
        value: getString(existingUser, 'email'),
        id: 'user-gov-email'
      }
    })),
    name: immutable(await ShortText.init({
      errors: [],
      validate: validateName,
      child: {
        type: 'text',
        value: getString(existingUser, 'name'),
        id: 'user-gov-name'
      }
    })),
    userStatus: immutable(await ShortText.init({
      errors: [],
      validate: validateName,
      child: {
        type: 'text',
        value: getString(existingUser, 'userStatus'),
        id: 'user-gov-user-status'
      }
    }))
  };
};

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'idpUsername':
      return updateComponentChild({
        state,
        childStatePath: ['idpUsername'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('idpUsername', value)
      });
    case 'jobTitle':
      return updateComponentChild({
        state,
        childStatePath: ['jobTitle'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('jobTitle', value)
      });
    case 'email':
      return updateComponentChild({
        state,
        childStatePath: ['email'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('email', value)
      });
    case 'name':
      return updateComponentChild({
        state,
        childStatePath: ['name'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('name', value)
      });
    case 'userStatus':
      return updateComponentChild({
        state,
        childStatePath: ['userStatus'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('userStatus', value)
      });
  }
};

export interface Props extends ComponentViewProps<State, Msg> {
  disabled?: boolean;
}

function isPublic(user: User | undefined): boolean {
  const result = (user !== undefined) && (user.type === UserType.Government || user.type === UserType.Admin);
  return result;
}

export const view: View<Props> = props => {
  const { state, dispatch, disabled } = props;
  return (
    <div>
      <Row>
        <Col xs='12'>

          { isPublic(state.existingUser) ?
            <ShortText.view
              extraChildProps={{} /* TODO(Jesse): How do we add the ? helptext icon to this element? */ }
              label='IDIR'
              disabled={true}
              state={state.idpUsername}
              dispatch={mapComponentDispatch(dispatch, value => adt('idpUsername' as const, value))} />
          :
            null
          }

          <ShortText.view
            extraChildProps={{}}
            label='Name'
            required
            disabled={disabled}
            state={state.name}
            dispatch={mapComponentDispatch(dispatch, value => adt('name' as const, value))} />

          <ShortText.view
            extraChildProps={{}}
            label='Job Title'
            required
            disabled={disabled}
            state={state.jobTitle}
            dispatch={mapComponentDispatch(dispatch, value => adt('jobTitle' as const, value))} />

          <ShortText.view
            extraChildProps={{}}
            label='Email Address'
            required
            disabled={disabled}
            state={state.email}
            dispatch={mapComponentDispatch(dispatch, value => adt('email' as const, value))} />

        </Col>
      </Row>
    </div>
  );
};
