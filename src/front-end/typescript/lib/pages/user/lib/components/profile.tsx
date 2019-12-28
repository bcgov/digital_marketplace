import * as FormField from 'front-end/lib/components/form-field';
import * as ShortText from 'front-end/lib/components/form-field/short-text';
import { ComponentViewProps, immutable, Immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import * as UserHelpers from 'front-end/lib/pages/user/lib';
import { userAvatarPath } from 'front-end/lib/pages/user/lib';
import Link from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { getString} from 'shared/lib';
import { parseUserStatus, User, UserStatus } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';
import { adt, ADT } from 'shared/lib/types';
import { ErrorTypeFrom } from 'shared/lib/validation/index';
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

export type Errors = ErrorTypeFrom<State>;

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

export const view: View<Props> = props => {
  const { state, dispatch, disabled } = props;
  return (
    <div>
      <Row>
        <Col xs='12'>
          <Row>
            <Col xs='12' className='mb-3 d-flex align-items-center flex-nowrap'>
              <img
                style={{
                  width: '5rem',
                  height: '5rem',
                  objectFit: 'cover'
                }}
                src={userAvatarPath(state.existingUser)} />
              <div className='ml-3 d-flex flex-column align-items-start flex-nowrap'>
                <div className='mb-2'><strong>Profile Picture</strong></div>
                <Link button outline size='sm' color='primary'>Choose Image</Link>
              </div>
            </Col>
          </Row>

          {UserHelpers.isPublic(state.existingUser)
            ? (<ShortText.view
                extraChildProps={{} /* TODO(Jesse): How do we add the ? helptext icon to this element? */ }
                label='IDIR'
                disabled={true}
                state={state.idpUsername}
                dispatch={mapComponentDispatch(dispatch, value => adt('idpUsername' as const, value))} />)
            : null}

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

          <Link button
            onClick={() => {}}>
            Deactivate Account
        </Link>
        </Col>
      </Row>
    </div>
  );
};
