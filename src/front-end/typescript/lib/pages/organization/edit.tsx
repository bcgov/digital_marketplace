import { getModalValid, makePageMetadata, makeStartLoading, makeStopLoading, updateValid, viewValid, withValid } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as MenuSidebar from 'front-end/lib/components/sidebar/menu';
import * as UserSidebar from 'front-end/lib/components/sidebar/profile-org';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, PageComponent, PageInit, replaceRoute, Update, updateComponentChild, updateGlobalComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as OrgForm from 'front-end/lib/pages/organization/components/form';
import FormButtonsContainer from 'front-end/lib/views/form-buttons-container';
import Link, { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import LoadingButton from 'front-end/lib/views/loading-button';
import React from 'react';
import { Col, Row } from 'reactstrap';
import * as OrgResource from 'shared/lib/resources/organization';
import { User } from 'shared/lib/resources/user';
import { UserType } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

interface ValidState {
  isEditing: boolean;
  editingLoading: number;
  saveChangesLoading: number;
  archiveLoading: number;
  showArchiveModal: boolean;
  showSaveChangesModal: boolean;
  user: User;
  organization: OrgResource.Organization;
  orgForm: Immutable<OrgForm.State>;
  sidebar: Immutable<MenuSidebar.State>;
}

export type State = Validation<Immutable<ValidState>, null>;

type InnerMsg
  = ADT<'orgForm', OrgForm.Msg>
  | ADT<'startEditing'>
  | ADT<'cancelEditing'>
  | ADT<'saveChanges'>
  | ADT<'archive'>
  | ADT<'hideArchiveModal'>
  | ADT<'hideSaveChangesModal'>
  | ADT<'sidebar', MenuSidebar.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

async function resetOrgForm(organization: OrgResource.Organization): Promise<Immutable<OrgForm.State>> {
  return immutable(await OrgForm.init({ organization }));
}

export interface RouteParams {
  orgId: string;
}

const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType({
  userType: [UserType.Vendor, UserType.Admin],

  async success({ dispatch, routeParams, shared }) {
    const result = await api.organizations.readOne(routeParams.orgId);
    if (api.isValid(result)) {
      return valid(immutable({
        isEditing: false,
        editingLoading: 0,
        saveChangesLoading: 0,
        archiveLoading: 0,
        showArchiveModal: false,
        showSaveChangesModal: false,
        user: shared.sessionUser,
        organization: result.value,
        sidebar: shared.sessionUser.type === UserType.Vendor
                  ? await UserSidebar.makeSidebar(shared.sessionUser, shared.sessionUser, 'organizations')
                  : immutable(await MenuSidebar.init({ links: [] })),
        orgForm: immutable(await OrgForm.init({organization: result.value }))
      }));
    } else {
      dispatch(replaceRoute(adt('notice' as const, adt('notFound' as const))));
      return invalid(null);
    }

  },
  async fail({ dispatch }) {
    dispatch(replaceRoute(adt('notice' as const, adt('notFound' as const))));
    return invalid(null);
  }
});

const startEditingLoading = makeStartLoading<ValidState>('editingLoading');
const stopEditingLoading = makeStopLoading<ValidState>('editingLoading');
const startSaveChangesLoading = makeStartLoading<ValidState>('saveChangesLoading');
const stopSaveChangesLoading = makeStopLoading<ValidState>('saveChangesLoading');
const startArchiveLoading = makeStartLoading<ValidState>('archiveLoading');
const stopArchiveLoading = makeStopLoading<ValidState>('archiveLoading');

function isOwner(user: User, org: OrgResource.Organization): boolean {
  return user.id === org.owner.id;
}

const update: Update<State, Msg> = updateValid(({ state, msg }) => {
  switch (msg.tag) {
    case 'archive':
      if (!state.showArchiveModal) {
        return [state.set('showArchiveModal', true)];
      } else {
        state = startArchiveLoading(state)
          .set('showArchiveModal', false);
      }
      return [
        state,
        async (state, dispatch) => {
          const result = await api.organizations.delete(state.organization.id);
          if (api.isValid(result)) {
            // TODO show confirmation alert on page redirected to.
            if (isOwner(state.user, state.organization)) {
              dispatch(replaceRoute(adt('userProfile' as const, { userId: state.user.id, tab: 'organizations' as const })));
            } else {
              dispatch(replaceRoute(adt('orgList' as const, null)));
            }
          } else {
            state = stopArchiveLoading(state);
          }
          return state;
        }
      ];
    case 'saveChanges':
      if (!state.showSaveChangesModal) {
        return [state.set('showSaveChangesModal', true)];
      } else {
        state = startSaveChangesLoading(state)
          .set('showSaveChangesModal', false);
      }
      return [
        state,
        async state => {
          state = stopSaveChangesLoading(state);
          const result = await OrgForm.persist(adt('update', {
            state: state.orgForm,
            orgId: state.organization.id,
            extraBody: {
              logoImageFile: state.organization.logoImageFile && state.organization.logoImageFile.id
            }
          }));
          switch (result.tag) {
            case 'valid':
              return state = state
                .set('isEditing', false)
                .set('organization', result.value[1])
                .set('orgForm', result.value[0]);
            case 'invalid':
              return state.set('orgForm', result.value);
          }
        }
      ];
    case 'startEditing':
      return [
        startEditingLoading(state),
        async state => {
          state = stopEditingLoading(state);
          const result = await api.organizations.readOne(state.organization.id);
          if (api.isValid(result)) {
            state = state
              .set('isEditing', true)
              .set('organization', result.value)
              .set('orgForm', await resetOrgForm(result.value));
          }
          // Do nothing if an error occurs.
          return state;
        }
      ];
    case 'cancelEditing':
      return [
        state,
        async state => {
          return state
            .set('isEditing', false)
            .set('orgForm', await resetOrgForm(state.organization));
        }
      ];
    case 'hideArchiveModal':
      return [state.set('showArchiveModal', false)];
    case 'hideSaveChangesModal':
      return [state.set('showSaveChangesModal', false)];
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
});

const view: ComponentView<State, Msg> = viewValid(({ state, dispatch }) => {
  const isEditingLoading = state.editingLoading > 0;
  const isSaveChangesLoading = state.saveChangesLoading > 0;
  const isArchiveLoading = state.archiveLoading > 0;
  const isLoading = isEditingLoading || isSaveChangesLoading || isArchiveLoading;
  const isValid = OrgForm.isValid(state.orgForm);
  return (
    <div>
      <Row>
        <Col xs='12' className='mb-5 d-flex flex-wrap flex-column flex-md-row align-items-start align-items-md-center'>
          <h2 className='mr-md-3 mb-0'>{state.organization.legalName}</h2>
          <div>
          {state.isEditing
            ? null
            : (<LoadingButton
                loading={isEditingLoading}
                disabled={isLoading}
                className='mt-1 mb-md-1'
                size='sm'
                color='primary'
                symbol_={leftPlacement(iconLinkSymbol('edit'))}
                onClick={() => dispatch(adt('startEditing'))}>
                Edit Organization
              </LoadingButton>)}
          </div>
        </Col>
      </Row>

      <Row>
        <Col xs='12'>
          <OrgForm.view
            state={state.orgForm}
            disabled={isLoading || !state.isEditing}
            dispatch={mapComponentDispatch(dispatch, value => adt('orgForm' as const, value))} />
        </Col>
      </Row>

      {state.isEditing
        ? (<FormButtonsContainer className='mt-4'>
            <LoadingButton
              loading={isSaveChangesLoading}
              color='primary'
              symbol_={leftPlacement(iconLinkSymbol('check'))}
              onClick={() => dispatch(adt('saveChanges'))}
              disabled={!isValid || isLoading}>
              Save Changes
            </LoadingButton>
            <Link onClick={() => dispatch(adt('cancelEditing'))} color='secondary' className='px-3' disabled={isLoading}>
              Cancel
            </Link>
          </FormButtonsContainer>)
        : null}

      <Row>
        <Col>
          <div className='mt-5 pt-5 border-top'>
            <h3>Archive Organization</h3>
            <p className='mb-4'>Archiving this organization means that it will no longer be available for opportunity proposals.</p>
          </div>
        </Col>
      </Row>
      <Row>
        <Col>
          <LoadingButton loading={isArchiveLoading} disabled={isLoading} color='danger' symbol_={leftPlacement(iconLinkSymbol('minus-circle'))} onClick={() => dispatch(adt('archive'))}>
            Archive Organization
          </LoadingButton>
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
  getMetadata: withValid((state) => {
    return makePageMetadata(`${state.organization.legalName} — Organizations`);
  }, makePageMetadata('Edit Organization')),
  getModal: getModalValid<ValidState, Msg>(state => {
    if (state.showArchiveModal) {
      return {
        title: 'Archive Organization?',
        body: 'Are you sure you want to archive this organization?',
        onCloseMsg: adt('hideArchiveModal'),
        actions: [
          {
            text: 'Archive Organization',
            color: 'danger',
            msg: adt('archive'),
            button: true
          },
          {
            text: 'Cancel',
            color: 'secondary',
            msg: adt('hideArchiveModal')
          }
        ]
      };
    } else if (state.showSaveChangesModal) {
      return {
        title: 'Save Changes?',
        body: 'Are you sure you want to save the changes you\'ve made to this organization?',
        onCloseMsg: adt('hideSaveChangesModal'),
        actions: [
          {
            text: 'Save Changes',
            color: 'primary',
            msg: adt('saveChanges'),
            button: true
          },
          {
            text: 'Cancel',
            color: 'secondary',
            msg: adt('hideSaveChangesModal')
          }
        ]
      };
    }
    return null;
  })
};
