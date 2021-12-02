import { getContextualActionsValid, makePageMetadata, makeStartLoading, makeStopLoading, updateValid, viewValid } from 'front-end/typescript/lib';
import { isUserType } from 'front-end/typescript/lib/access-control';
import { Route, SharedState } from 'front-end/typescript/lib/app/types';
import * as MenuSidebar from 'front-end/typescript/lib/components/sidebar/menu';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, mapGlobalComponentDispatch, newRoute, PageComponent, PageInit, replaceRoute, toast, Update, updateComponentChild, updateGlobalComponentChild } from 'front-end/typescript/lib/framework';
import * as OrgForm from 'front-end/typescript/lib/pages/organization/lib/components/form';
import * as toasts from 'front-end/typescript/lib/pages/organization/lib/toasts';
import { makeSidebarState } from 'front-end/typescript/lib/pages/user/profile/tab';
import { iconLinkSymbol, leftPlacement, routeDest } from 'front-end/typescript/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { User, UserType } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

interface ValidState {
  submitLoading: number;
  user: User;
  orgForm: Immutable<OrgForm.State>;
  sidebar: Immutable<MenuSidebar.State>;
}

export type State = Validation<Immutable<ValidState>, null>;

type InnerMsg
  = ADT<'orgForm', OrgForm.Msg>
  | ADT<'sidebar', MenuSidebar.Msg>
  | ADT<'submit'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType<RouteParams, State, Msg>({
  userType: [UserType.Vendor],

  async success({ shared }) {
    return valid(immutable({
      submitLoading: 0,
      user: shared.sessionUser,
      orgForm: immutable(await OrgForm.init({})),
      sidebar: await makeSidebarState(shared.sessionUser, shared.sessionUser, 'organizations')
    }));
  },

  async fail({ routePath, routeParams, shared, dispatch }) {
    if (!shared.session) {
      dispatch(replaceRoute(adt('signIn' as const, {
        redirectOnSuccess: routePath
      })));
    } else {
      dispatch(replaceRoute(adt('notFound' as const, { path: routePath })));
    }
    return invalid(null);
  }

});

const startSubmitLoading = makeStartLoading<ValidState>('submitLoading');
const stopSubmitLoading = makeStopLoading<ValidState>('submitLoading');

const update: Update<State, Msg> = updateValid(({ state, msg }) => {
  switch (msg.tag) {
    case 'orgForm':
      return updateGlobalComponentChild({
        state,
        childStatePath: ['orgForm'],
        childUpdate: OrgForm.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('orgForm', value)
      });
    case 'sidebar':
      return updateComponentChild({
        state,
        childStatePath: ['sidebar'],
        childUpdate: MenuSidebar.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('sidebar', value)
      });
    case 'submit':
      state = startSubmitLoading(state);
      return [
      state,
      async (state, dispatch) => {
        const result = await OrgForm.persist(adt('create', state.orgForm));
        switch (result.tag) {
          case 'valid':
            dispatch(toast(adt('success', toasts.created.success)));
            dispatch(newRoute(adt('orgEdit' as const, {
              orgId: result.value[1].id
            })));
            return state.set('orgForm', result.value[0]);
          case 'invalid':
            dispatch(toast(adt('error', toasts.created.error)));
            return stopSubmitLoading(state)
              .set('orgForm', result.value);
        }
      }
    ];
    default:
      return [state];
  }
});

const view: ComponentView<State, Msg> = viewValid(({ state, dispatch }) => {
  return (
    <div>
      <Row>
        <Col className='mb-5' xs='12'>
          <h2>Create  Organization</h2>
        </Col>
      </Row>
      <Row>
        <Col xs='12'>
          <OrgForm.view
            state={state.orgForm}
            disabled={false}
            dispatch={mapGlobalComponentDispatch(dispatch, value => adt('orgForm' as const, value))} />
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
  getContextualActions: getContextualActionsValid(({ state, dispatch }) => {
    const isSubmitLoading = state.submitLoading > 0;
    const isValid = OrgForm.isValid(state.orgForm);
    return adt('links', [
      {
        children: 'Create Organization',
        onClick: () => dispatch(adt('submit')),
        button: true,
        loading: isSubmitLoading,
        disabled: !isValid || isSubmitLoading,
        symbol_: leftPlacement(iconLinkSymbol('plus-circle')),
        color: 'primary'
      },
      {
        children: 'Cancel',
        color: 'c-nav-fg-alt',
        dest: routeDest(adt('userProfile', {
          userId: state.user.id,
          tab: 'organizations' as const
        }))
      }
    ]);
  }),
  getMetadata() {
    return makePageMetadata('Create Organization');
  }
};
