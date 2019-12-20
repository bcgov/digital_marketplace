import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as Checkbox from 'front-end/lib/components/form-field/checkbox';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild } from 'front-end/lib/framework';
import * as GovProfileForm from 'front-end/lib/pages/user/components/profile';
import * as UserHelpers from 'front-end/lib/pages/user/helpers';
import Icon from 'front-end/lib/views/icon';
import Link from 'front-end/lib/views/link';
import makeSidebar from 'front-end/lib/views/sidebar/menu';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { readOneUser, User } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';

export interface State {
  user: User;
  govProfile: Immutable<GovProfileForm.State>;
  adminCheckbox: Immutable<Checkbox.State>;
  editingAdminCheckbox: boolean;
}

type InnerMsg
  = ADT<'govProfile', GovProfileForm.Msg>
  | ADT<'adminCheckbox', Checkbox.Msg>
  | ADT<'finishEditingAdminCheckbox', undefined>
  | ADT<'editingAdminCheckbox', undefined>
  ;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

type ActiveTab
  = 'profile'
  | 'legal'
  | 'organizations';

export interface RouteParams {
  userId: string;
  activeTab?: ActiveTab;
}

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => {
  const user: User = await readOneUser('1');
  const displayUser: UserHelpers.DisplayUser = UserHelpers.toDisplayUser(user);

  return ({
    editingAdminCheckbox: false,
    adminCheckbox: immutable(await Checkbox.init({
      errors: [],
      child: {
        value: displayUser.admin,
        id: 'user-admin-checkbox'
      }
    })),
    user,
    govProfile: immutable(await GovProfileForm.init({
      existingUser: user
    }))
  });
};

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'finishEditingAdminCheckbox':
      return [state.set('editingAdminCheckbox', false)];
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
    case 'govProfile':
      return updateComponentChild({
        state,
        childStatePath: ['govProfile'],
        childUpdate: GovProfileForm.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('govProfile', value)
      });
    default:
      return [state];
  }
};

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  const displayUser: UserHelpers.DisplayUser = UserHelpers.toDisplayUser(state.user);
  return (
    <div>
      <Row className='mb-3 pb-3'>
        <Col xs='12'>
          <h1>{`${state.user.name}`}</h1>
        </Col>
      </Row>
      <Row>
        <Col xs='12' className='mt-4'>
          <span className='pr-4'><strong>Status</strong></span>
          <span className={`badge ${UserHelpers.getBadgeColor(displayUser.active)}`}>
            {`${UserHelpers.viewStringForUserStatus(state.user.status)}`}
          </span>
        </Col>

        <Col xs='12' className='my-4'>
          <span className='pr-4'><strong>Account Type</strong></span>
          <span>
            {`${UserHelpers.viewStringForUserType(state.user.type)}`}
          </span>
        </Col>

        <Col xs='12' className='mb-4'>

          <Checkbox.view
            className='d-inline'
            extraChildProps={{inlineLabel: ''}}
            label='Permission(s)'
            disabled={!state.editingAdminCheckbox}
            state={state.adminCheckbox}
            dispatch={mapComponentDispatch(dispatch, value => adt('adminCheckbox' as const, value))} />

          { state.editingAdminCheckbox ?
            <Icon
              name='check'
              onClick={() => dispatch(adt('finishEditingAdminCheckbox'))}
            />
          :
            <Icon
              name='paperclip'
              onClick={() => dispatch(adt('editingAdminCheckbox'))}
            />
          }

        </Col>

      </Row>

      <Row className='border-top my-3 py-3'>

        <Col xs='2'>
        </Col>
        <Col xs='10'>
          <div className='pb-3'><strong>Profile Picture</strong></div>
          <Link button className='btn-secondary'>Choose Image</Link>
        </Col>

      </Row>

      <Row>
        <Col xs='12'>
          <GovProfileForm.view
            state={state.govProfile}
            dispatch={mapComponentDispatch(dispatch, value => adt('govProfile' as const, value))} />
        </Col>
      </Row>

    </div>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  sidebar: {
    size: 'medium',
    color: 'light',
    view: makeSidebar<State, Msg>(
    [
      {
        target: '',
        icon: 'paperclip',
        text: 'Profile',
        active: true,
        route: { tag: 'userProfile', value: {userId: '1'}} as Route
      },
      {
        target: '',
        icon: 'paperclip',
        text: 'Notifications',
        active: false,
        route: { tag: 'landing' } as Route
      },
      {
        target: '',
        icon: 'paperclip',
        text: 'Accepted Policies, Terms & Agreements',
        active: false,
        route: { tag: 'landing' } as Route
      }
    ])
  },
  getMetadata() {
    return makePageMetadata('User Profile');
  }
};
