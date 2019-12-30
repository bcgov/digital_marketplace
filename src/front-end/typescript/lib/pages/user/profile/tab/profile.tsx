import { makeStartLoading, makeStopLoading } from 'front-end/lib';
import { Route } from 'front-end/lib/app/types';
import * as Checkbox from 'front-end/lib/components/form-field/checkbox';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, Update, updateComponentChild, View, ViewElementChildren } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import { userStatusToColor, userStatusToTitleCase, userTypeToTitleCase } from 'front-end/lib/pages/user/lib';
import * as ProfileForm from 'front-end/lib/pages/user/lib/components/profile-form';
import * as Tab from 'front-end/lib/pages/user/profile/tab';
import Badge from 'front-end/lib/views/badge';
import Icon from 'front-end/lib/views/icon';
import Link, { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import LoadingButton from 'front-end/lib/views/loading-button';
import React, { Fragment } from 'react';
import { Col, Row } from 'reactstrap';
import { isAdmin, isPublicSectorEmployee, User } from 'shared/lib/resources/user';
import { adt, ADT, Id } from 'shared/lib/types';

export interface Params {
  profileUser: User;
  viewerUser: User;
}

export interface State extends Params {
  saveChangesLoading: number;
  startEditingFormLoading: number;
  isEditingForm: boolean;
  profileForm: Immutable<ProfileForm.State>;
  adminCheckbox: Immutable<Checkbox.State>; //TODO
  editingAdminCheckbox: boolean; //TODO
}

type InnerMsg
  = ADT<'profileForm', ProfileForm.Msg>
  | ADT<'startEditingForm'>
  | ADT<'cancelEditingForm'>
  | ADT<'saveChanges'>
  | ADT<'adminCheckbox', Checkbox.Msg> //TODO
  | ADT<'finishEditingAdminCheckbox', undefined> //TODO
  | ADT<'editingAdminCheckbox', undefined>; //TODO

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

async function resetProfileForm(user: User): Promise<Immutable<ProfileForm.State>> {
  return immutable(await ProfileForm.init(adt('update', user)));
}

const init: Init<Params, State> = async ({ viewerUser, profileUser }) => {
  return {
    viewerUser,
    profileUser,
    saveChangesLoading: 0,
    startEditingFormLoading: 0,
    isEditingForm: false,
    profileForm: await resetProfileForm(profileUser),
    editingAdminCheckbox: false,
    adminCheckbox: immutable(await Checkbox.init({
      errors: [],
      child: {
        value: isAdmin(profileUser),
        id: 'user-admin-checkbox'
      }
    }))
  };
};

const startSaveChangesLoading = makeStartLoading<State>('saveChangesLoading');
const stopSaveChangesLoading = makeStopLoading<State>('saveChangesLoading');
const startStartEditingFormLoading = makeStartLoading<State>('startEditingFormLoading');
const stopStartEditingFormLoading = makeStopLoading<State>('startEditingFormLoading');

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'profileForm':
      return updateComponentChild({
        state,
        childStatePath: ['profileForm'],
        childUpdate: ProfileForm.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('profileForm', value)
      });
    case 'startEditingForm':
      return [
        startStartEditingFormLoading(state),
        async state => {
          state = stopStartEditingFormLoading(state);
          // Reload the profile user before editing.
          const result = await api.users.readOne(state.profileUser.id);
          if (!api.isValid(result)) { return state; } // Do not allow editing if fetching the user failed.
          state = state
            .set('isEditingForm', true)
            .set('profileUser', result.value)
            .set('profileForm', await resetProfileForm(result.value));
          return state;
        }
      ];
    case 'cancelEditingForm':
      return [
        state,
        async state => {
          return state
            .set('isEditingForm', false)
            .set('profileForm', await resetProfileForm(state.profileUser));
        }
      ];
    case 'saveChanges':
      return [
        startSaveChangesLoading(state),
        async state => {
          state = stopSaveChangesLoading(state);
          const values = ProfileForm.getValues(state.profileForm);
          let avatarImageFile: Id | undefined = state.profileUser.avatarImageFile && state.profileUser.avatarImageFile.id;
          if (values.newAvatarImage) {
            const fileResult = await api.files.create({
              name: values.newAvatarImage.name,
              file: values.newAvatarImage,
              metadata: [adt('any')]
            });
            switch (fileResult.tag) {
              case 'valid':
                avatarImageFile = fileResult.value.id;
                break;
              case 'unhandled':
              case 'invalid':
                return state.update('profileForm', v => ProfileForm.setErrors(v, {
                  newAvatarImage: ['Please select a different avatar image.']
                }));
            }
          }
          const result = await api.users.update(state.profileUser.id, {
            name: values.name,
            email: values.email,
            jobTitle: values.jobTitle,
            avatarImageFile
          });
          switch (result.tag) {
            case 'invalid':
              return state.update('profileForm', v => ProfileForm.setErrors(v, result.value));
            case 'unhandled':
              return state;
            case 'valid':
              return state
                .set('isEditingForm', false)
                .set('profileUser', result.value)
                .set('profileForm', await resetProfileForm(result.value));
          }
        }
      ];
    case 'finishEditingAdminCheckbox':
      return [state.set('editingAdminCheckbox', false),
        async state => {
          const result = await api.users.update(state.profileUser.id, {});  // TODO(Jesse): Serialize form and pass to backend
          if (api.isValid(result)) {
            state.set('profileUser', result.value);
          }
          return state;
        }
      ];
    case 'editingAdminCheckbox':
      return [state.set('editingAdminCheckbox', true)];
    case 'adminCheckbox':
      return updateComponentChild({
        state,
        childStatePath: ['adminCheckbox'],
        childUpdate: Checkbox.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('adminCheckbox', value)
      });
    default:
      return [state];
  }
};

interface ViewDetailProps {
  name: string;
  children: ViewElementChildren;
  className?: string;
}

const ViewDetail: View<ViewDetailProps> = ({ className = '', name, children }) => {
  return (
    <div className={`d-flex flex-row flex-nowrap align-items-start ${className}`}>
      <b>{name}:</b>
      <div className='ml-3'>{children}</div>
    </div>
  );
};

const ViewPermissionsAsGovernment: ComponentView<State, Msg> = ({ state }) => {
  const profileUser = state.profileUser;
  if (!isAdmin(profileUser)) { return null; }
  return (
    <ViewDetail name='Permission(s)'>
      <Badge
        pill
        text={userStatusToTitleCase(profileUser.status)}
        color={userStatusToColor(profileUser.status)} />
    </ViewDetail>
  );
};

const ViewPermissionsAsAdmin: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <ViewDetail name='Permission(s)'>
      <div className='d-flex align-items-center'>
        <Checkbox.view
          extraChildProps={{inlineLabel: 'Admin'}}
          className='mb-0 mr-3'
          disabled={!state.editingAdminCheckbox}
          state={state.adminCheckbox}
          dispatch={mapComponentDispatch(dispatch, value => adt('adminCheckbox' as const, value))} />
        {state.editingAdminCheckbox
          ? (<Icon
               name='check'
               color='success'
               hover
               onClick={() => dispatch(adt('finishEditingAdminCheckbox'))} />)
          : (<Icon
               name='edit'
               color='primary'
               hover
               style={{ cursor: 'pointer' }}
               onClick={() => dispatch(adt('editingAdminCheckbox'))} />)}
      </div>
    </ViewDetail>
  );
};

const ViewPermissions: ComponentView<State, Msg> = props => {
  const { state } = props;
  const profileUser = state.profileUser;
  const isOwner = profileUser.id === state.viewerUser.id;
  const isPSE = isPublicSectorEmployee(profileUser);
  if (isPSE && isOwner) {
    return (<div className='mt-3'><ViewPermissionsAsGovernment {...props} /></div>);
  } else if (isPSE && !isOwner) {
    return (<div className='mt-3'><ViewPermissionsAsAdmin {...props} /></div>);
  } else {
    return null;
  }
};

const ViewDetails: ComponentView<State, Msg> = props => {
  const profileUser = props.state.profileUser;
  return (
    <Row>
      <Col xs='12' className='mb-3'>
        <div className='pb-5 mb-5 border-bottom'>
          {isAdmin(props.state.viewerUser)
            ? (<ViewDetail name='Status' className='mb-3'>
                <Badge
                  text={userStatusToTitleCase(profileUser.status)}
                  color={userStatusToColor(profileUser.status)} />
              </ViewDetail>)
            : null}
          <ViewDetail name='Account Type'>
            {userTypeToTitleCase(profileUser.type)}
          </ViewDetail>
          <ViewPermissions {...props} />
        </div>
      </Col>
    </Row>
  );
};

const ViewDeactivateAccount: ComponentView<State, Msg> = ({ state }) => {
  // Admins can't deactivate their own accounts
  if (isAdmin(state.profileUser) && state.profileUser.id === state.viewerUser.id) { return null; }
  return (
    <Row>
      <Col xs='12'>
        <div className='mt-5 pt-5 border-top'>
          <h3>Deactivate Account</h3>
          <p>Deactivating your account means that you will no longer have access to the Digital Marketplace.</p>
          <Link
            button
            symbol_={leftPlacement(iconLinkSymbol('user-minus'))}
            className='mt-3'
            color='danger'>
            Deactivate Account
          </Link>
        </div>
      </Col>
    </Row>
  );
};

const view: ComponentView<State, Msg> = props => {
  const { state, dispatch } = props;
  const profileUser = state.profileUser;
  const isSaveChangesLoading = state.saveChangesLoading > 0;
  const isStartEditingFormLoading = state.startEditingFormLoading > 0;
  const isEditingForm = state.isEditingForm;
  const isDisabled = !isEditingForm || isSaveChangesLoading || isStartEditingFormLoading;
  const isValid = ProfileForm.isValid(state.profileForm);
  return (
    <div>
      <Row className='mb-3 pb-3'>
        <Col xs='12'>
          <h1>{profileUser.name}</h1>
        </Col>
    </Row>
    <ViewDetails {...props} />
    <ProfileForm.view
      disabled={isDisabled}
      state={state.profileForm}
      dispatch={mapComponentDispatch(dispatch, value => adt('profileForm' as const, value))} />
    <Row className='mt-4'>
      <Col xs='12' className='d-flex flex-row flex-md-row-reverse align-items-center'>
        {isEditingForm
          ? (<Fragment>
              <LoadingButton
                disabled={!isValid || isDisabled}
                onClick={() => dispatch(adt('saveChanges'))}
                loading={isSaveChangesLoading}
                symbol_={leftPlacement(iconLinkSymbol('user-check'))}
                color='primary'>
                Save Changes
              </LoadingButton>
              <Link
                disabled={isDisabled}
                onClick={() => dispatch(adt('cancelEditingForm'))}
                color='secondary'
                className='mx-3'>
                Cancel
              </Link>
            </Fragment>)
          : (<LoadingButton
              onClick={() => dispatch(adt('startEditingForm'))}
              loading={isStartEditingFormLoading}
              symbol_={leftPlacement(iconLinkSymbol('user-edit'))}
              color='primary'>
              Edit Profile
            </LoadingButton>)}
      </Col>
    </Row>
    <ViewDeactivateAccount {...props} />
  </div>
  );
};

export const component: Tab.Component<Params, State, Msg> = {
  init,
  update,
  view
};
