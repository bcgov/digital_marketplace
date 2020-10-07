import { makeStartLoading, makeStopLoading } from 'front-end/lib';
import { Route } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, replaceRoute, toast, Update, updateGlobalComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Tab from 'front-end/lib/pages/organization/edit/tab';
import * as OrgForm from 'front-end/lib/pages/organization/lib/components/form';
import * as toasts from 'front-end/lib/pages/organization/lib/toasts';
import EditTabHeader from 'front-end/lib/pages/organization/lib/views/edit-tab-header';
import Link, { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import * as OrgResource from 'shared/lib/resources/organization';
import { User } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';

export interface State extends Tab.Params {
  isEditing: boolean;
  editingLoading: number;
  saveChangesLoading: number;
  archiveLoading: number;
  showArchiveModal: boolean;
  showSaveChangesModal: boolean;
  orgForm: Immutable<OrgForm.State>;
}

export type InnerMsg
  = ADT<'orgForm', OrgForm.Msg>
  | ADT<'startEditing'>
  | ADT<'cancelEditing'>
  | ADT<'saveChanges'>
  | ADT<'archive'>
  | ADT<'hideArchiveModal'>
  | ADT<'hideSaveChangesModal'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

async function resetOrgForm(organization: OrgResource.Organization): Promise<Immutable<OrgForm.State>> {
  return immutable(await OrgForm.init({ organization }));
}

const init: Init<Tab.Params, State> = async params => {
  return {
    ...params,
    isEditing: false,
    editingLoading: 0,
    saveChangesLoading: 0,
    archiveLoading: 0,
    showArchiveModal: false,
    showSaveChangesModal: false,
    orgForm: immutable(await OrgForm.init({ organization: params.organization }))
  };
};

const startEditingLoading = makeStartLoading<State>('editingLoading');
const stopEditingLoading = makeStopLoading<State>('editingLoading');
const startSaveChangesLoading = makeStartLoading<State>('saveChangesLoading');
const stopSaveChangesLoading = makeStopLoading<State>('saveChangesLoading');
const startArchiveLoading = makeStartLoading<State>('archiveLoading');
const stopArchiveLoading = makeStopLoading<State>('archiveLoading');

function isOwner(user: User, org: OrgResource.Organization): boolean {
  return !!org.owner && user.id === org.owner.id;
}

const update: Update<State, Msg> = ({ state, msg }) => {
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
            dispatch(toast(adt('success', toasts.archived.success)));
            if (isOwner(state.viewerUser, state.organization)) {
              dispatch(replaceRoute(adt('userProfile' as const, { userId: state.viewerUser.id, tab: 'organizations' as const })));
            } else {
              dispatch(replaceRoute(adt('orgList' as const, null)));
            }
          } else {
            dispatch(toast(adt('error', toasts.archived.error)));
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
        async (state, dispatch) => {
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
              dispatch(toast(adt('success', toasts.updated.success)));
              return state = state
                .set('isEditing', false)
                .set('organization', result.value[1])
                .set('orgForm', result.value[0]);
            case 'invalid':
              dispatch(toast(adt('error', toasts.updated.error)));
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
    default:
      return [state];
  }
};

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  const isEditingLoading = state.editingLoading > 0;
  const isSaveChangesLoading = state.saveChangesLoading > 0;
  const isArchiveLoading = state.archiveLoading > 0;
  const isLoading = isEditingLoading || isSaveChangesLoading || isArchiveLoading;
  return (
    <div>
      <EditTabHeader
        legalName={state.organization.legalName}
        swuQualified={state.swuQualified} />
      <Row className='mt-5'>
        <Col xs='12'>
          <OrgForm.view
            state={state.orgForm}
            disabled={isLoading || !state.isEditing}
            dispatch={mapComponentDispatch(dispatch, value => adt('orgForm' as const, value))} />
        </Col>
      </Row>
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
          <Link button loading={isArchiveLoading} disabled={isLoading} color='danger' symbol_={leftPlacement(iconLinkSymbol('minus-circle'))} onClick={() => dispatch(adt('archive'))}>
            Archive Organization
          </Link>
        </Col>
      </Row>

    </div>
  );
};

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view,
  getModal: state => {
    if (state.showArchiveModal) {
      return {
        title: 'Archive Organization?',
        body: () => 'Are you sure you want to archive this organization?',
        onCloseMsg: adt('hideArchiveModal'),
        actions: [
          {
            text: 'Archive Organization',
            icon: 'minus-circle',
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
        body: () => 'Are you sure you want to save the changes you\'ve made to this organization?',
        onCloseMsg: adt('hideSaveChangesModal'),
        actions: [
          {
            text: 'Save Changes',
            icon: 'check',
            color: 'success',
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
  },
  getContextualActions: ({ state, dispatch }) => {
    const isEditingLoading = state.editingLoading > 0;
    const isSaveChangesLoading = state.saveChangesLoading > 0;
    const isArchiveLoading = state.archiveLoading > 0;
    const isLoading = isEditingLoading || isSaveChangesLoading || isArchiveLoading;
    const isValid = OrgForm.isValid(state.orgForm);
    if (!state.isEditing) {
      return adt('links', [{
        children: 'Edit Organization',
        onClick: () => dispatch(adt('startEditing')),
        button: true,
        loading: isEditingLoading,
        disabled: isLoading,
        symbol_: leftPlacement(iconLinkSymbol('user-edit')),
        color: 'primary'
      }]);
    } else {
      return adt('links', [
        {
          children: 'Save Changes',
          disabled: !isValid || isLoading,
          onClick: () => dispatch(adt('saveChanges')),
          button: true,
          loading: isSaveChangesLoading,
          symbol_: leftPlacement(iconLinkSymbol('check')),
          color: 'success'
        },
        {
          children: 'Cancel',
          disabled: isLoading,
          onClick: () => dispatch(adt('cancelEditing')),
          color: 'c-nav-fg-alt'
        }
      ]);
    }
  }
};
