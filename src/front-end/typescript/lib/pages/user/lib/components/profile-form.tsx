import * as FormField from 'front-end/lib/components/form-field';
import * as ShortText from 'front-end/lib/components/form-field/short-text';
import { ComponentViewProps, immutable, Immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import { userAvatarPath, userToKeyClockIdentityProviderTitleCase } from 'front-end/lib/pages/user/lib';
import FileButton from 'front-end/lib/views/file-button';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { getString} from 'shared/lib';
import { SUPPORTED_IMAGE_EXTENSIONS } from 'shared/lib/resources/file';
import { isPublicSectorUserType, User, UserType } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';
import { ErrorTypeFrom, mapValid } from 'shared/lib/validation';
import { validateEmail, validateJobTitle, validateName } from 'shared/lib/validation/user';

type FormType
  = ADT<'create', UserType>
  | ADT<'update', User>;

function formTypeToUserType(v: FormType): UserType {
  switch (v.tag) {
    case 'create': return v.value;
    case 'update': return v.value.type;
  }
}

function formTypeToUser(v: FormType): User | undefined {
  switch (v.tag) {
    case 'create': return undefined;
    case 'update': return v.value;
  }
}

export type Params = FormType;

export interface State {
  formType: FormType;
  name: Immutable<ShortText.State>;
  email: Immutable<ShortText.State>;
  jobTitle: Immutable<ShortText.State>;
  idpUsername: Immutable<ShortText.State>;
  newAvatarImage: { file: File; path: string; errors: string[]; } | null;
}

export type Msg
  = ADT<'jobTitle',       ShortText.Msg>
  | ADT<'email',          ShortText.Msg>
  | ADT<'name',           ShortText.Msg>
  | ADT<'onChangeAvatar', File>
  | ADT<'idpUsername',    ShortText.Msg>;

export interface Values {
  name: string;
  email: string;
  jobTitle: string;
  newAvatarImage?: File;
}

export type Errors = ErrorTypeFrom<State>;

export function getValues(state: Immutable<State>): Values {
  return {
    name: FormField.getValue(state.name),
    email: FormField.getValue(state.email),
    jobTitle: FormField.getValue(state.jobTitle),
    newAvatarImage: state.newAvatarImage ? state.newAvatarImage.file : undefined
  };
}

export function setValues(state: Immutable<State>, values: Omit<Values, 'newAvatarImage'>): Immutable<State> {
  return state
    .update('name', s => FormField.setValue(s, values.name))
    .update('email', s => FormField.setValue(s, values.email))
    .update('jobTitle', s => FormField.setValue(s, values.jobTitle))
    .set('newAvatarImage', null);
}

export function isValid(state: Immutable<State>): boolean {
  return !!state.name.child.value
      && !!state.email.child.value
      && (!state.newAvatarImage || !state.newAvatarImage.errors.length)
      && FormField.isValid(state.name)
      && FormField.isValid(state.email)
      && FormField.isValid(state.jobTitle);
}

export function setErrors(state: Immutable<State>, errors: Errors): Immutable<State> {
  return state
    .update('name', s => FormField.setErrors(s, errors.name || []))
    .update('email', s => FormField.setErrors(s, errors.email || []))
    .update('jobTitle', s => FormField.setErrors(s, errors.jobTitle || []))
    .update('newAvatarImage', v => v && ({ ...v, errors: errors.newAvatarImage || [] }));
}

export const init: Init<Params, State> = async formType => {
  const existingUser = formTypeToUser(formType);
  return {
    formType,
    newAvatarImage: null,
    newAvatarImageErrors: [],
    idpUsername: immutable(await ShortText.init({
      errors: [],
      child: {
        type: 'text',
        value: getString(existingUser, 'idpUsername'),
        id: 'user-profile-idir-username'
      }
    })),
    email: immutable(await ShortText.init({
      errors: [],
      validate: validateEmail,
      child: {
        type: 'text',
        value: getString(existingUser, 'email'),
        id: 'user-profile-email'
      }
    })),
    name: immutable(await ShortText.init({
      errors: [],
      validate: validateName,
      child: {
        type: 'text',
        value: getString(existingUser, 'name'),
        id: 'user-profile-name'
      }
    })),
    jobTitle: immutable(await ShortText.init({
      errors: [],
      validate: v => mapValid(validateJobTitle(v), w => w || ''),
      child: {
        type: 'text',
        value: getString(existingUser, 'jobTitle'),
        id: 'user-profile-job-title'
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
    case 'onChangeAvatar':
      return [state.set('newAvatarImage', {
        file: msg.value,
        path: URL.createObjectURL(msg.value),
        errors: []
      })];
  }
};

export interface Props extends ComponentViewProps<State, Msg> {
  disabled?: boolean;
}

export const view: View<Props> = props => {
  const { state, dispatch, disabled } = props;
  const formType = state.formType;
  const existingUser = formTypeToUser(formType);
  return (
    <div>
      <Row>
        <Col xs='12'>
          <Row>
            <Col xs='12' className='mb-4 d-flex align-items-center flex-nowrap'>
              <img
                className='rounded-circle'
                style={{
                  width: '5rem',
                  height: '5rem',
                  objectFit: 'cover'
                }}
                src={state.newAvatarImage ? state.newAvatarImage.path : userAvatarPath(existingUser)} />
              <div className='ml-3 d-flex flex-column align-items-start flex-nowrap'>
                <div className='mb-2'><b>Profile Picture (Optional)</b></div>
                <FileButton
                  outline
                  size='sm'
                  style={{
                    visibility: disabled ? 'hidden' : undefined,
                    pointerEvents: disabled ? 'none' : undefined
                  }}
                  onChange={file => dispatch(adt('onChangeAvatar', file))}
                  accept={SUPPORTED_IMAGE_EXTENSIONS}
                  color='primary'>
                  Choose Image
                </FileButton>
                {state.newAvatarImage && state.newAvatarImage.errors.length
                  ? (<div className='mt-2 small text-danger'>{state.newAvatarImage.errors.map((e, i) => (<div key={`profile-avatar-error-${i}`}>{e}</div>))}</div>)
                  : null}
              </div>
            </Col>
          </Row>

          {formType.tag === 'update'
            ? (<ShortText.view
                extraChildProps={{}}
                help='TODO'
                label={userToKeyClockIdentityProviderTitleCase(formType.value)}
                disabled
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

          {isPublicSectorUserType(formTypeToUserType(formType))
            ? (<ShortText.view
                extraChildProps={{}}
                label='Job Title'
                required
                disabled={disabled}
                state={state.jobTitle}
                dispatch={mapComponentDispatch(dispatch, value => adt('jobTitle' as const, value))} />)
            : null}

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
