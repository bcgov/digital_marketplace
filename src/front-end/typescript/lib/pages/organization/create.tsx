import { makePageMetadata, makeStartLoading, makeStopLoading, updateValid, viewValid } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import router from 'front-end/lib/app/router';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as MenuSidebar from 'front-end/lib/components/sidebar/menu';
import * as UserSidebar from 'front-end/lib/components/sidebar/profile-org';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, mapGlobalComponentDispatch, newRoute, PageComponent, PageInit, replaceRoute, Update, updateComponentChild, updateGlobalComponentChild } from 'front-end/lib/framework';
import * as OrgForm from 'front-end/lib/pages/organization/components/form';
import FormButtonsContainer from 'front-end/lib/views/form-buttons-container';
import Link, { iconLinkSymbol, leftPlacement, routeDest } from 'front-end/lib/views/link';
import LoadingButton from 'front-end/lib/views/loading-button';
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

const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType({
  userType: [UserType.Vendor],

  async success({ shared }) {
    return valid(immutable({
      submitLoading: 0,
      user: shared.sessionUser,
      orgForm: immutable(await OrgForm.init({})),
      sidebar: await UserSidebar.makeSidebar(shared.sessionUser, shared.sessionUser, 'organizations')
    }));
  },

  async fail({ routeParams, shared, dispatch }) {
    if (!shared.session || !shared.session.user) {
      dispatch(replaceRoute(adt('signIn' as const, {
        redirectOnSuccess: router.routeToUrl(adt('orgCreate', null))
      })));
    } else {
      dispatch(replaceRoute(adt('notice' as const, adt('notFound' as const))));
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
            dispatch(newRoute(adt('orgEdit' as const, {
              orgId: result.value[1].id
            })));
            return state.set('orgForm', result.value[0]);
          case 'invalid':
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
  const isSubmitLoading = state.submitLoading > 0;
  const isValid = OrgForm.isValid(state.orgForm);
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
      <FormButtonsContainer className='mt-4'>
        <LoadingButton
          loading={isSubmitLoading}
          color='primary'
          symbol_={leftPlacement(iconLinkSymbol('plus-circle'))}
          onClick={() => dispatch(adt('submit')) }
          disabled={!isValid || isSubmitLoading}>
          Create Organization
        </LoadingButton>
        <Link dest={routeDest(adt('userProfile', { userId: state.user.id, tab: 'organizations' as const }))} color='secondary' className='px-3'>
          Cancel
        </Link>
      </FormButtonsContainer>
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
    return makePageMetadata('Create Organization');
  }
};
