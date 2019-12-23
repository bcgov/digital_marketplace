import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as MenuSidebar from 'front-end/lib/components/sidebar/menu';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild } from 'front-end/lib/framework';
import * as OrgForm from 'front-end/lib/pages/organization/components/form';
import Link, { routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
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

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => ({
  govProfile: immutable(await OrgForm.init({
  })),
  sidebar: immutable(await MenuSidebar.init({
    links: [
      {
        icon: 'user',
        text: 'Profile',
        active: true,
        dest: routeDest(adt('userProfile', {userId: '1'}))
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

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'govProfile':
      return updateComponentChild({
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

      <Row className='my-3 py-3'>
        <Col xs='2'>
        </Col>
        <Col xs='10'>
          <div className='pb-3'><strong>Logo (Optional)</strong></div>
          <Link button className='btn-secondary'>Choose Image</Link>
        </Col>
      </Row>

      <Row>
        <Col xs='12'>
          <OrgForm.view
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
    return makePageMetadata('Create Organization');
  }
};
