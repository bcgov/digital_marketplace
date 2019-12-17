import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild } from 'front-end/lib/framework';
import * as OrgForm from 'front-end/lib/pages/organization/components/form';
import Link from 'front-end/lib/views/link';
import makeSidebar from 'front-end/lib/views/sidebar/menu';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { GetAllOrganizations, Organization } from 'shared/lib/resources/organization';
import { adt, ADT } from 'shared/lib/types';

export interface State {
  organization: Organization;
  govProfile: Immutable<OrgForm.State>;
}

type InnerMsg
  = ADT<'govProfile', OrgForm.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export interface RouteParams {
  orgId: string;
}

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => ({
  organization: GetAllOrganizations()[0],
  govProfile: immutable(await OrgForm.init({organization: GetAllOrganizations()[0]}))
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
    default:
      return [state];
  }
};

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <div>

      <Row className='mb-3 pb-3'>
        <Col xs='12'>
          <h1>Edit {state.organization.legalName}</h1>
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
    view: makeSidebar<State, Msg>(
    [
      {
        target: '',
        icon: 'paperclip',
        text: 'Profile',
        active: false,
        route: { tag: 'userProfile', value: {userId: '1'}} as Route
      },
      {
        target: '',
        icon: 'paperclip',
        text: 'Organizations',
        active: true,
        route: { tag: 'landing' } as Route
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
    return makePageMetadata('Create Organization');
  }
};
