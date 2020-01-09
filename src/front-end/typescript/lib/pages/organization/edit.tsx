import { makeStartLoading, makeStopLoading } from 'front-end/lib';
import { User } from 'shared/lib/resources/user';
import * as UserSidebar from 'front-end/lib/components/sidebar/profile-org';
import { UserType } from 'shared/lib/resources/user';
import { isUserType } from 'front-end/lib/access-control';
import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as MenuSidebar from 'front-end/lib/components/sidebar/menu';
import { replaceRoute, ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild, updateGlobalComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as OrgForm from 'front-end/lib/pages/organization/components/form';
import Link, { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
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
  userCanDeactivate: boolean;
  editingLoading: number;
}

type InnerMsg
  = ADT<'orgForm', OrgForm.Msg>
  | ADT<'startEditing'>
  | ADT<'finishEditing', OrgResource.Organization>
  | ADT<'deactivate', OrgResource.Organization>
  | ADT<'sidebar', MenuSidebar.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export interface RouteParams {
  orgId: string;
}

async function defaultState(): Promise<State> {
  return {
    isEditing: false,
    userCanDeactivate: false,
    editingLoading: 0,
    sidebar: immutable(await MenuSidebar.init({ links: [] })),
    submitErrors: [],
    organization: OrgResource.Empty(),
    orgForm: immutable(await OrgForm.init({}))
  };
};

function userOwnsOrg(user: User, org: OrgResource.Organization): boolean {
  // FIXME: The backend doesn't vend the owner of the org, which we need in
  // order to figure out if the current user is allowed to edit it.
  //
  // @org-needs-owner-information
  //
  // const result: boolean = (org.owner && org.owner.id === user.id);
  // return result;

  return true;
}

const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType({
  userType: [UserType.Vendor, UserType.Admin],

  async success({dispatch, routeParams, shared}) {
    const result = await api.organizations.readOne(routeParams.orgId);

    if (api.isValid(result) && userOwnsOrg(shared.sessionUser, result.value)) {
      return {
        ...(await defaultState()),
        sidebar: shared.sessionUser.type === UserType.Vendor
                  ? await UserSidebar.makeSidebar(shared.sessionUser, shared.sessionUser, 'organizations')
                  : immutable(await MenuSidebar.init({ links: [] })),
        userCanDeactivate: true,
        organization: result.value,
        orgForm: immutable(await OrgForm.init({organization: result.value }))
      };
    } else {
      dispatch(replaceRoute(adt('notice' as const, adt('notFound' as const))));
      return ({
        ...(await defaultState()),
      });
    }

  },
  async fail({dispatch}) {
    dispatch(replaceRoute(adt('notice' as const, adt('notFound' as const))));
    return defaultState();
  }
});

const startEditingLoading = makeStartLoading<State>('editingLoading');
const stopEditingLoading = makeStopLoading<State>('editingLoading');

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'deactivate':
    return [state, async (state) => {
      const result = await api.organizations.delete(state.organization.id)
      if (api.isValid(result)) {
        state = state.set('organization', result.value);
        state = state.set('isEditing', false);
        state = state.set('orgForm', OrgForm.setValues(state.orgForm, result.value) );
      }
      return state;
    }]
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
      <Row className='pb-5'>
        <Row className='mb-3 pb-3'>
          <Col xs='12' className='d-flex flex-nowrap align-items-center'>
            <h1>{state.organization.legalName}</h1>
            <div className='ml-3'>
            {
              state.isEditing
              ?
              <Link button size='sm' color='secondary' onClick={() => dispatch(adt('finishEditing', state.organization))}>
                Discard Changes
              </Link>
              :
                state.organization.active
                ?
                <LoadingButton loading={isLoading} size='sm' color='primary' symbol_={leftPlacement(iconLinkSymbol('edit'))} onClick={() => dispatch(adt('startEditing'))}>
                  Edit Organization
                </LoadingButton>
                :
                <span>(Deactivated)</span>

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

      {

        state.organization.active && state.userCanDeactivate
        ?
        <div>
          <Row className='pt-5 border-top'>
            <h4>Deactivate Organization</h4>
            <p>Deactivating this organization means that it will no longer be available for <i>Sprint With Us</i> opportunities</p>
          </Row>

          <Row>
            <LoadingButton loading={isLoading} color='danger' symbol_={leftPlacement(iconLinkSymbol('minus-circle'))} onClick={() => dispatch(adt('deactivate', state.organization))}>
              Deactivate Organization
            </LoadingButton>
          </Row>
        </div>
        : undefined
      }

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
    return makePageMetadata('Edit Organization');
  }
};
