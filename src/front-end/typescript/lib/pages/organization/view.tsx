import { getContextualActionsValid, getModalValid, makePageMetadata, makeStartLoading, makeStopLoading, updateValid, viewValid, withValid } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import router from 'front-end/lib/app/router';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as MenuSidebar from 'front-end/lib/components/sidebar/menu';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, newRoute, PageComponent, PageInit, replaceRoute, Update, updateComponentChild, updateGlobalComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as OrgForm from 'front-end/lib/pages/organization/lib/components/form';
import { makeSidebarState } from 'front-end/lib/pages/user/profile/tab';
import Link, { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import * as OrgResource from 'shared/lib/resources/organization';
import { User } from 'shared/lib/resources/user';
import { UserType } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

interface ValidState {
  archiveLoading: number;
  showArchiveModal: boolean;
  user: User;
  organization: OrgResource.Organization;
  orgForm: Immutable<OrgForm.State>;
  sidebar: Immutable<MenuSidebar.State>;
}

export type State = Validation<Immutable<ValidState>, null>;

type InnerMsg
  = ADT<'orgForm', OrgForm.Msg>
  | ADT<'archive'>
  | ADT<'hideArchiveModal'>
  | ADT<'sidebar', MenuSidebar.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export interface RouteParams {
  orgId: string;
}

const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType({
  userType: [UserType.Vendor, UserType.Admin],

  async success({ dispatch, routeParams, shared }) {
    const result = await api.organizations.readOne(routeParams.orgId);
    if (api.isValid(result)) {
      return valid(immutable({
        archiveLoading: 0,
        showArchiveModal: false,
        user: shared.sessionUser,
        organization: result.value,
        sidebar: shared.sessionUser.type === UserType.Vendor
                  ? await makeSidebarState(shared.sessionUser, shared.sessionUser, 'organizations')
                  : immutable(await MenuSidebar.init({ links: [] })),
        orgForm: immutable(await OrgForm.init({organization: result.value }))
      }));
    } else {
      dispatch(replaceRoute(adt('notice' as const, adt('notFound' as const))));
      return invalid(null);
    }
  },
  async fail({dispatch, shared, routeParams}) {
    if (!shared.session || !shared.session.user) {
      dispatch(replaceRoute(adt('signIn' as const, {
        redirectOnSuccess: router.routeToUrl(adt('orgEdit', {orgId: routeParams.orgId}))
      })));
    } else {
      dispatch(replaceRoute(adt('notice' as const, adt('notFound' as const))));
    }

    return invalid(null);
  }
});

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
    case 'hideArchiveModal':
      return [state.set('showArchiveModal', false)];
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
  const isArchiveLoading = state.archiveLoading > 0;
  const isLoading = isArchiveLoading;
  return (
    <div>
      <Row>
        <Col xs='12' className='mb-5'>
          <h2>{state.organization.legalName}</h2>
        </Col>
      </Row>
      <Row>
        <Col xs='12'>
          <OrgForm.view
            state={state.orgForm}
            disabled={true}
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
    }

    return null;
  }),
  getContextualActions: getContextualActionsValid(({ state, dispatch }) => {
    const isArchiveLoading = state.archiveLoading > 0;
    const isLoading =  isArchiveLoading;
    return adt('links', [{
      children: 'Edit Organization',
      onClick: () => { dispatch(newRoute(adt('orgEdit' as const, { orgId: state.organization.id }))); },
      button: true,
      disabled: isLoading,
      symbol_: leftPlacement(iconLinkSymbol('user-edit')),
      color: 'primary'
    }]);
  })
};
