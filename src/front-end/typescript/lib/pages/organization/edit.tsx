import { makePageMetadata, makeStartLoading, makeStopLoading } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as MenuSidebar from 'front-end/lib/components/sidebar/menu';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild } from 'front-end/lib/framework';
import * as OrgForm from 'front-end/lib/pages/organization/components/form';
import Link, { iconLinkSymbol, leftPlacement, routeDest } from 'front-end/lib/views/link';
import LoadingButton from 'front-end/lib/views/loading-button';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { request } from 'shared/lib/http';
import * as OrgResource from 'shared/lib/resources/organization';
import { adt, ADT } from 'shared/lib/types';
import { ClientHttpMethod } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

export interface State {
  isEditing: boolean;
  editingLoading: number;
  submitLoading: number;
  organization: OrgResource.Organization;
  govProfile: Immutable<OrgForm.State>;
  submitErrors?: string[];
  sidebar: Immutable<MenuSidebar.State>;
}

type InnerMsg
  = ADT<'govProfile', OrgForm.Msg>
  | ADT<'startEditing'>
  | ADT<'cancelEditing'>
  | ADT<'submit'>
  | ADT<'sidebar', MenuSidebar.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export interface RouteParams {
  orgId: string;
}

const init: PageInit<RouteParams, SharedState, State, Msg> = async (params) => {
  const organization: OrgResource.Organization = await OrgResource.readOneOrganization(params.routeParams.orgId);
  return ({
    isEditing: false,
    editingLoading: 0,
    submitLoading: 0,
    organization,
    govProfile: immutable(await OrgForm.init({organization})),
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
};

export async function createOrganization(org: OrgResource.CreateRequestBody): Promise<Validation<OrgResource.Organization, null>> {
  const response = await request(ClientHttpMethod.Post, 'api/organizations', org);
  switch (response.status) {
    case 200:
      return valid(response.data as OrgResource.Organization); // TODO(Jesse): Does this actually pass the result back?
    default:
      return invalid(null);
  }
}

export async function updateOrganization(org: OrgResource.UpdateRequestBody): Promise<Validation<OrgResource.Organization, null>> {
  const response = await request(ClientHttpMethod.Put, 'api/organizations', org);
  switch (response.status) {
    case 200:
      return valid(response.data as OrgResource.Organization); // TODO(Jesse): Does this actually pass the result back?
    default:
      return invalid(null);
  }
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
        const resp = await createOrganization(OrgForm.getValues(state.govProfile));
        if (resp) {
          state = state.set('isEditing', false);
        } else {
          state = state.set('submitErrors', ['Unexpected error updating organization data']);
        }

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
  const isEditing = state.isEditing;
  const isEditingLoading = state.editingLoading > 0;
  const isSubmitLoading = state.submitLoading > 0;
  const isLoading = isEditingLoading || isSubmitLoading;
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
            <LoadingButton loading={isLoading} size='sm' color='primary' symbol_={leftPlacement(iconLinkSymbol('edit'))} onClick={() => dispatch(adt('startEditing'))}>
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
          <LoadingButton loading={isLoading}
            color='primary'
            symbol_={leftPlacement(iconLinkSymbol('plus-circle'))}
            onClick={() => dispatch(adt('submit'))}
          >
            Save
          </LoadingButton>
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
