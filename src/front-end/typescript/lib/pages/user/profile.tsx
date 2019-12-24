import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as Checkbox from 'front-end/lib/components/form-field/checkbox';
import * as MenuSidebar from 'front-end/lib/components/sidebar/menu';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild } from 'front-end/lib/framework';
import { UserApi } from 'front-end/lib/http/api';
import * as GovProfileForm from 'front-end/lib/pages/user/components/profile';
import * as UserHelpers from 'front-end/lib/pages/user/helpers';
import Icon from 'front-end/lib/views/icon';
import Link, { routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { emptyUser, User } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';
import { isValid } from 'shared/lib/validation';

export interface State {
  user: User;
  govProfile: Immutable<GovProfileForm.State>;
  adminCheckbox: Immutable<Checkbox.State>;
  editingAdminCheckbox: boolean;
  sidebar: Immutable<MenuSidebar.State>;
}

type InnerMsg
  = ADT<'govProfile', GovProfileForm.Msg>
  | ADT<'adminCheckbox', Checkbox.Msg>
  | ADT<'finishEditingAdminCheckbox', undefined>
  | ADT<'editingAdminCheckbox', undefined>
  | ADT<'sidebar', MenuSidebar.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export interface RouteParams {
  userId: string;
}

const init: PageInit<RouteParams, SharedState, State, Msg> = async (params) => {
  const result = await UserApi.readOne(params.routeParams.userId);
  let user = emptyUser();
  if ( isValid(result) ) {
    user = result.value;
  }

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
    })),
    sidebar: immutable(await MenuSidebar.init({
      links: [
        {
          icon: 'user',
          text: 'Profile',
          active: true,
          dest: routeDest(adt('userProfile', {userId: user.id}))
        },
        {
          icon: 'bell',
          text: 'Notifications',
          active: false,
          dest: routeDest(adt('landing', null))
        },
        {
          icon: 'balance-scale',
          text: 'Accepted Policies, Terms & Agreements',
          active: false,
          dest: routeDest(adt('landing', null))
        }
      ]
    }))
  });
};

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'finishEditingAdminCheckbox':
      return [state.set('editingAdminCheckbox', false),
        async state => {
          const result = await UserApi.update(state.user.id, {});  // TODO(Jesse): Serialize form and pass to backend
          if (isValid(result)) {
            state.set('user', result.value);
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
    case 'govProfile':
      return updateComponentChild({
        state,
        childStatePath: ['govProfile'],
        childUpdate: GovProfileForm.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('govProfile', value)
      });
    case 'sidebar':
      return updateComponentChild({
        state,
        childStatePath: ['sidebar'],
        childUpdate: MenuSidebar.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('sidebar', value)
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

          <div className='pb-2'>
            <span className='pr-4'><strong>Permission(s)</strong></span>
            { state.editingAdminCheckbox ?
              <span>
                { /* TODO(Jesse): Change to loading-button */ }
                <Icon
                  name='check'
                  onClick={() => dispatch(adt('finishEditingAdminCheckbox'))}
                />
              </span>
            :
              <span>
                { /* TODO(Jesse): Change to loading-button */ }
                <Icon
                  name='edit'
                  onClick={() => dispatch(adt('editingAdminCheckbox'))}
                />
              </span>
            }
          </div>

            <Checkbox.view
              extraChildProps={{inlineLabel: 'Admin'}}
              label=''
              disabled={!state.editingAdminCheckbox}
              state={state.adminCheckbox}
              dispatch={mapComponentDispatch(dispatch, value => adt('adminCheckbox' as const, value))} />

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
            disabled={true}
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
    view({ state, dispatch }) {
      return (<MenuSidebar.view
        state={state.sidebar}
        dispatch={mapComponentDispatch(dispatch, msg => adt('sidebar' as const, msg))} />);
    }
  },
  getMetadata() {
    return makePageMetadata('User Profile');
  }
};
