import { makeStartLoading, makeStopLoading } from 'front-end/lib';
import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as MenuSidebar from 'front-end/lib/components/sidebar/menu';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild, updateGlobalComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as OrgForm from 'front-end/lib/pages/organization/components/form';
import Link, { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import { routeDest } from 'front-end/lib/views/link';
import LoadingButton from 'front-end/lib/views/loading-button';
import React from 'react';
import { Col, Row } from 'reactstrap';
import * as OrgResource from 'shared/lib/resources/organization';
import { adt, ADT } from 'shared/lib/types';

export interface State {
  organization: OrgResource.Organization;
  orgForm: Immutable<OrgForm.State>;
  submitErrors?: string[];
  sidebar: Immutable<MenuSidebar.State>;
  isEditing: boolean;
  editingLoading: number;
}

type InnerMsg
  = ADT<'orgForm', OrgForm.Msg>
  | ADT<'startEditing'>
  | ADT<'finishEditing', OrgResource.Organization>
  | ADT<'sidebar', MenuSidebar.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export interface RouteParams {
  orgId: string;
}

const init: PageInit<RouteParams, SharedState, State, Msg> = async params => {
  const defaultState = {
    isEditing: false,
    editingLoading: 0,
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
  };

  const result = await api.organizations.readOne(params.routeParams.orgId);
  if (api.isValid(result)) {
    return ({
      ...defaultState,
      organization: result.value,
      orgForm: immutable(await OrgForm.init({organization: result.value }))
    });
  } else {
    return ({
      ...defaultState,
      organization: OrgResource.Empty(),
      orgForm: immutable(await OrgForm.init({}))
    });
  }
};

const startEditingLoading = makeStartLoading<State>('editingLoading');
const stopEditingLoading = makeStopLoading<State>('editingLoading');

const update: Update<State, Msg> = ({ state, msg }) => {
  console.log(msg);
  switch (msg.tag) {
    case 'startEditing':
    return [
      startEditingLoading(state),
      async state => {
        const result = await api.organizations.readOne(state.organization.id);
        if (api.isValid(result)) {
          state = state.set('organization', result.value);
          state = state.set('isEditing', true);
          state = state.set('orgForm', OrgForm.setValues(state.orgForm, result.value) );
          state = stopEditingLoading(state);
        } else {
          // TODO(Jesse): Handle errors
        }
        return state;
      }
    ];
    case 'finishEditing': {
      return [ state, async state => {
        state = state.set('organization', msg.value );
        state = state.set('orgForm', OrgForm.setValues(state.orgForm, msg.value) );
        state = state.set('isEditing', false);
        return state;
      }];
    }
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
    default:
      return [state];
  }
};

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  const isLoading = state.editingLoading > 0;
  return (
    <div>
      <Row>
        <Row className='mb-3 pb-3'>
          <Col xs='12' className='d-flex flex-nowrap align-items-center'>
            <h1>Edit {state.organization.legalName}</h1>
            <div className='ml-3'>
            {
              state.isEditing
              ?
              <Link button size='sm' color='secondary' onClick={() => dispatch(adt('finishEditing', state.organization))}>
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

        <Col xs='12'>
          <OrgForm.view
            state={state.orgForm}
            disabled={!state.isEditing}
            dispatch={mapComponentDispatch(dispatch, value => adt('orgForm' as const, value))}
            submitHook={(org: OrgResource.Organization) => { dispatch(adt('finishEditing', org)); }}
          />
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
