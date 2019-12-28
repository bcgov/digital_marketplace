import { makePageMetadata, updateValid, viewValid } from 'front-end/lib';
import { isSignedIn } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as Checkbox from 'front-end/lib/components/form-field/checkbox';
import * as MenuSidebar from 'front-end/lib/components/sidebar/menu';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, PageComponent, PageInit, replaceRoute, Update, updateComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as UserHelpers from 'front-end/lib/pages/user/lib';
import * as ProfileFormForm from 'front-end/lib/pages/user/lib/components/profile';
import Icon from 'front-end/lib/views/icon';
import Link, { routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { isAdmin, User } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

interface ValidState {
  profileUser: User;
  viewerUser: User;
  profileForm: Immutable<ProfileFormForm.State>;
  adminCheckbox: Immutable<Checkbox.State>;
  editingAdminCheckbox: boolean;
  sidebar: Immutable<MenuSidebar.State>;
}

export type State = Validation<Immutable<ValidState>, null>;

type InnerMsg
  = ADT<'profileForm', ProfileFormForm.Msg>
  | ADT<'adminCheckbox', Checkbox.Msg>
  | ADT<'finishEditingAdminCheckbox', undefined>
  | ADT<'editingAdminCheckbox', undefined>
  | ADT<'sidebar', MenuSidebar.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export interface RouteParams {
  userId: string;
}

const init: PageInit<RouteParams, SharedState, State, Msg> = isSignedIn({

  async success({ routeParams, shared, dispatch }) {
    const viewerUser = shared.sessionUser;
    const profileUserResult = await api.users.readOne(routeParams.userId);
    if (!api.isValid(profileUserResult)) {
      dispatch(replaceRoute(adt('notice', adt('notFound' as const))));
      return invalid(null);
    }
    const profileUser = profileUserResult.value;
    // Viewer is not owner or admin.
    const isOwner = viewerUser.id === profileUser.id;
    const viewerIsAdmin = isAdmin(viewerUser);
    if (!isOwner && !viewerIsAdmin) {
      // TODO redirect;
      return invalid(null);
    }
    return valid(immutable({
      viewerUser,
      profileUser,
      profileForm: immutable(await ProfileFormForm.init({
        existingUser: profileUser
      })),
      editingAdminCheckbox: false,
      adminCheckbox: immutable(await Checkbox.init({
        errors: [],
        child: {
          value: isAdmin(profileUser),
          id: 'user-admin-checkbox'
        }
      })),
      sidebar: immutable(await MenuSidebar.init({
        links: [
          {
            icon: 'user',
            text: 'Profile',
            active: true,
            dest: routeDest(adt('userProfile', { userId: profileUser.id }))
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
    }));
  },

  async fail({ dispatch }) {
    dispatch(replaceRoute(adt('notice', adt('notFound' as const))));
    return invalid(null);
  }

});

const update: Update<State, Msg> = updateValid(({ state, msg }) => {
  switch (msg.tag) {
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
        childStatePath: ['value', 'adminCheckbox'],
        childUpdate: Checkbox.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('adminCheckbox', value)
      });
    case 'profileForm':
      return updateComponentChild({
        state,
        childStatePath: ['value', 'profileForm'],
        childUpdate: ProfileFormForm.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('profileForm', value)
      });
    case 'sidebar':
      return updateComponentChild({
        state,
        childStatePath: ['value', 'sidebar'],
        childUpdate: MenuSidebar.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('sidebar', value)
      });
    default:
      return [state];
  }
});

const view: ComponentView<State, Msg> = viewValid(({ state, dispatch }) => {
  const profileUser = state.profileUser;
  const displayUser: UserHelpers.DisplayUser = UserHelpers.toDisplayUser(state.profileUser);
  return (
    <div>
      <Row className='mb-3 pb-3'>
        <Col xs='12'>
          <h1>{`${profileUser.name}`}</h1>
        </Col>
      </Row>

      <Row>
        <Col xs='12' className='mt-4'>
          <span className='pr-4'><strong>Status</strong></span>
          <span className={`badge ${UserHelpers.getBadgeColor(displayUser.active)}`}>
            {`${UserHelpers.viewStringForUserStatus(profileUser.status)}`}
          </span>
        </Col>

        <Col xs='12' className='my-4'>
          <span className='pr-4'><strong>Account Type</strong></span>
          <span>
            {`${UserHelpers.viewStringForUserType(profileUser.type)}`}
          </span>
        </Col>

        <Col xs='12' className='mb-4'>
          <div className='pb-2'>
            <span className='pr-4'><strong>Permission(s)</strong></span>
            { state.editingAdminCheckbox
              ? (<span>
                  { /* TODO(Jesse): Change to loading-button */ }
                  <Icon
                    name='check'
                    onClick={() => dispatch(adt('finishEditingAdminCheckbox'))}
                  />
                </span>)
              : (<span>
                  { /* TODO(Jesse): Change to loading-button */ }
                  <Icon
                    name='edit'
                    onClick={() => dispatch(adt('editingAdminCheckbox'))}
                  />
                </span>)}
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
          <ProfileFormForm.view
            disabled={true}
            state={state.profileForm}
            dispatch={mapComponentDispatch(dispatch, value => adt('profileForm' as const, value))} />
        </Col>
      </Row>
    </div>
  );
});

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  sidebar: {
    size: 'medium',
    color: 'light',
    view: viewValid(({ state, dispatch }) => {
      return (<MenuSidebar.view
        state={state.sidebar}
        dispatch={mapComponentDispatch(dispatch, msg => adt('sidebar' as const, msg))} />);
    })
  },
  getMetadata() {
    return makePageMetadata('User Profile');
  }
};
