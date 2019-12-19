import { makePageMetadata, makeStartLoading, makeStopLoading } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild } from 'front-end/lib/framework';
import * as OrgForm from 'front-end/lib/pages/organization/components/form';
import Icon from 'front-end/lib/views/icon';
import Link, { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import LoadingButton from 'front-end/lib/views/loading-button';
import makeSidebar from 'front-end/lib/views/sidebar/menu';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { prefixRequest } from 'shared/lib/http';
import * as OrgResource from 'shared/lib/resources/organization';
import { adt, ADT } from 'shared/lib/types';
import { ClientHttpMethod } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

export const apiRequest = prefixRequest('api');

export interface State {
  isEditing: boolean;
  editingLoading: number;
  organization: OrgResource.Organization;
  govProfile: Immutable<OrgForm.State>;
}

type InnerMsg
  = ADT<'govProfile', OrgForm.Msg>
  | ADT<'startEditing'>
  | ADT<'cancelEditing'>
  | ADT<'submit'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export interface RouteParams {
  orgId: string;
}

const init: PageInit<RouteParams, SharedState, State, Msg> = async (params) => ({
  isEditing: false,
  editingLoading: 0,
  organization: await OrgResource.readOneOrganization(params.routeParams.orgId),
  govProfile: immutable(await OrgForm.init({organization: await OrgResource.readOneOrganization(params.routeParams.orgId)}))
});

export async function createOrganization(org: OrgResource.CreateRequestBody): Promise<Validation<OrgResource.Organization, null>> {
    const response = await apiRequest(ClientHttpMethod.Post, 'organizations', org);
    switch (response.status) {
      case 200:
        return valid(response.data as OrgResource.Organization); // TODO(Jesse): Does this actually pass the result back?
      default:
        return invalid(null);
    }
}

export async function updateOrganization(org: OrgResource.UpdateRequestBody): Promise<Validation<OrgResource.Organization, null>> {
    const response = await apiRequest(ClientHttpMethod.Put, 'organizations', org);
    switch (response.status) {
      case 200:
        return valid(response.data as OrgResource.Organization); // TODO(Jesse): Does this actually pass the result back?
      default:
        return invalid(null);
    }
}

export function getCreateParams(org: OrgForm.Values): OrgResource.CreateRequestBody {
  return {
    ...org
  };
}

export function getUpdateParams(id: string, org: OrgForm.Values): OrgResource.UpdateRequestBody {
  return {
    id,
    ...org
  };
}

const startEditingLoading = makeStartLoading<State>('editingLoading');
const stopEditingLoading = makeStopLoading<State>('editingLoading');

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'startEditing':
    return [
      startEditingLoading(state),
      async state => {
        state = state.set('isEditing', true);
        state = stopEditingLoading(state);
        state.set('organization', await OrgResource.readOneOrganization(state.organization.id) );
        return state;
      }
    ];
    case 'cancelEditing':
    return [
      state.set('govProfile', OrgForm.setValues(state.govProfile, state.organization))
           .set('isEditing', false)
      ];
    case 'submit':
      return [state, async (state, dispatch) => {
        createOrganization(getCreateParams(OrgForm.getValues(state.govProfile)));
        state = state.set('isEditing', false);
        return state;
      }];
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
  const isEditing = state.isEditing;
  const isEditingLoading = state.editingLoading > 0;
  const isLoading = isEditingLoading;
  const isDisabled = !isEditing || isLoading;
  return (
    <div>

      <Row className='mb-3 pb-3'>
        <Col xs='12' className='d-flex flex-nowrap align-items-center'>
          <h1>Edit {state.organization.legalName}</h1>
          <div className='ml-3'>
          {
            isEditing
            ?
            <Link button size='sm' color='secondary' onClick={() => dispatch(adt('cancelEditing'))}>
              Discard Changes
            </Link>
            :
            <LoadingButton loading={isLoading} size='sm' color='primary' symbol_={leftPlacement(iconLinkSymbol('paperclip'))} onClick={() => dispatch(adt('startEditing'))}>
              Edit Organization
            </LoadingButton>
          }
          </div>
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
            disabled={isDisabled}
            state={state.govProfile}
            dispatch={mapComponentDispatch(dispatch, value => adt('govProfile' as const, value))} />
        </Col>
      </Row>

      <Row>
        <Col className='d-flex justify-content-end pt-5'>
          <Link button className='mr-3'>Cancel</Link>
          <Link button onClick={() => dispatch(adt('submit'))} className='btn-secondary'>
            <Icon name='plus'></Icon>
            <span className='pl-2'>Save</span>
          </Link>
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
