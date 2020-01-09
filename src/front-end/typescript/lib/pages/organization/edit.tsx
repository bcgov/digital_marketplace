import { makeStartLoading, makeStopLoading } from 'front-end/lib';
import { makePageMetadata } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as MenuSidebar from 'front-end/lib/components/sidebar/menu';
import * as UserSidebar from 'front-end/lib/components/sidebar/profile-org';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, PageComponent, PageInit, replaceRoute, Update, updateComponentChild, updateGlobalComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as OrgForm from 'front-end/lib/pages/organization/components/form';
import { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import LoadingButton from 'front-end/lib/views/loading-button';
import React from 'react';
import { Col, Row } from 'reactstrap';
import * as OrgResource from 'shared/lib/resources/organization';
import { User } from 'shared/lib/resources/user';
import { UserType } from 'shared/lib/resources/user';
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
  | ADT<'stopEditing', OrgResource.Organization>
  | ADT<'deactivate', OrgResource.Organization>
  | ADT<'sidebar', MenuSidebar.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export interface RouteParams {
  orgId: string;
}

async function defaultState(): Promise<State> {
  return {
    isEditing: false,
    editingLoading: 0,
    sidebar: immutable(await MenuSidebar.init({ links: [] })),
    submitErrors: [],
    organization: OrgResource.Empty(),
    orgForm: immutable(await OrgForm.init({}))
  };
}

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

    if (api.isValid(result) && userOwnsOrg(shared.sessionUser, result.value) && result.value.active) {
      return {
        ...(await defaultState()),
        sidebar: shared.sessionUser.type === UserType.Vendor
                  ? await UserSidebar.makeSidebar(shared.sessionUser, shared.sessionUser, 'organizations')
                  : immutable(await MenuSidebar.init({ links: [] })),
        organization: result.value,
        orgForm: immutable(await OrgForm.init({organization: result.value }))
      };
    } else {
      dispatch(replaceRoute(adt('notice' as const, adt('notFound' as const))));
      return (await defaultState());
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
        const result = await api.organizations.delete(state.organization.id);
        if (api.isValid(result)) {
          state = state.set('organization', result.value);
          state = state.set('isEditing', false);
          state = state.set('orgForm', OrgForm.setValues(state.orgForm, result.value) );
        }
        return state;
      }];
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
    case 'stopEditing': {
      return [ state, async state => {
        state = state.set('organization', msg.value );
        state = state.set('orgForm', OrgForm.setValues(state.orgForm, msg.value) );
        state = state.set('orgForm', OrgForm.setErrors(state.orgForm, {}));
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

        <Col xs='12' className='mb-3 pb-3 d-flex flex-nowrap flex-column flex-md-row align-items-md-center'>
          <h2 className='mr-3'>{state.organization.legalName}</h2>
          <div>
          {
            state.isEditing
            ?
              undefined
            :
              <LoadingButton loading={isLoading} size='sm' color='primary' symbol_={leftPlacement(iconLinkSymbol('edit'))} onClick={() => dispatch(adt('startEditing'))}>
                Edit Organization
              </LoadingButton>

          }
          </div>
        </Col>

        <Col xs='12'>
          <OrgForm.view
            state={state.orgForm}
            icon={'check'}
            disabled={!state.isEditing}
            dispatch={mapComponentDispatch(dispatch, value => adt('orgForm' as const, value))}
            stopEditingHook={(org: OrgResource.Organization) => { dispatch(adt('stopEditing', org)); }}
          />
        </Col>
      </Row>

      <Row className='pt-5 border-top'>
        <Col>
          <h3>Deactivate Organization</h3>
          <p>Deactivating this organization means that it will no longer be available for <i>Sprint With Us</i> opportunities</p>
        </Col>
      </Row>
      <Row>
        <Col>
          <LoadingButton loading={isLoading} color='danger' symbol_={leftPlacement(iconLinkSymbol('minus-circle'))} onClick={() => dispatch(adt('deactivate', state.organization))}>
            Deactivate Organization
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
  getMetadata(state) {
    return makePageMetadata(`${state.organization.legalName} — Organizations`);
  }
};
