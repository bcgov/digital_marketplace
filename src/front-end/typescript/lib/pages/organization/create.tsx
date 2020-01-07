import { makePageMetadata } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as MenuSidebar from 'front-end/lib/components/sidebar/menu';
import * as UserSidebar from 'front-end/lib/components/sidebar/profile-org';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, mapGlobalComponentDispatch, PageComponent, PageInit, replaceRoute, Update, updateComponentChild, updateGlobalComponentChild } from 'front-end/lib/framework';
import * as OrgForm from 'front-end/lib/pages/organization/components/form';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { UserType } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';

export interface State {
  govProfile: Immutable<OrgForm.State>;
  sidebar: Immutable<MenuSidebar.State>;
}

type InnerMsg
  = ADT<'govProfile', OrgForm.Msg>
  | ADT<'sidebar', MenuSidebar.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

async function baseState(): Promise<State> {
  return {
    govProfile: immutable(await OrgForm.init({})),
    sidebar: immutable(await MenuSidebar.init({ links: [] }))
  };
}

const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType({
  userType: [UserType.Vendor],

  async success({ shared }) {
    return {
      ...(await baseState()),
      sidebar: await UserSidebar.makeSidebar(shared.sessionUser, shared.sessionUser, 'organizations')
    };
  },

  async fail({ dispatch }) {
    dispatch(replaceRoute(adt('notice' as const, adt('notFound' as const))));
    return await baseState();
  }

});

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'govProfile':
      return updateGlobalComponentChild({
        state,
        childStatePath: ['govProfile'],
        childUpdate: OrgForm.update,
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
  return (
    <div>

      <Row className='mb-3 pb-3'>
        <Col xs='12'>
          <h1>Create  Organization</h1>
        </Col>
      </Row>

      <Row>
        <Col xs='12'>
          <OrgForm.view
            state={state.govProfile}
            disabled={false}
            dispatch={mapGlobalComponentDispatch(dispatch, value => adt('govProfile' as const, value))} />
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
    return makePageMetadata('Create Organization');
  }
};
