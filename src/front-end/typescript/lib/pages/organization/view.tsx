import { getContextualActionsValid, getModalValid, makePageMetadata, makeStartLoading, makeStopLoading, updateValid, viewValid, withValid } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import router from 'front-end/lib/app/router';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as MenuSidebar from 'front-end/lib/components/sidebar/menu';
import * as TabbedPage from 'front-end/lib/components/sidebar/menu/tabbed-page';
import * as Table from 'front-end/lib/components/table';
import { ComponentView, Dispatch, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, newRoute, PageComponent, PageInit, replaceRoute, Update, updateComponentChild, updateGlobalComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import Badge from 'front-end/lib/views/badge';
import Caps from 'shared/lib/data/capabilities';

import * as OrgForm from 'front-end/lib/pages/organization/lib/components/form';
import * as OrgTabs from 'front-end/lib/pages/organization/lib/components/tab';
import * as OrganizationTab from 'front-end/lib/pages/organization/lib/components/tab/organizations';
import * as QualificationTab from 'front-end/lib/pages/organization/lib/components/tab/qualifications';
import * as TeamTab from 'front-end/lib/pages/organization/lib/components/tab/team';

import Icon from 'front-end/lib/views/icon';
import { routeDest } from 'front-end/lib/views/link';
import Link, { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import * as OrgResource from 'shared/lib/resources/organization';
import { User, UserType } from 'shared/lib/resources/user';
import { adt, ADT, Id } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

interface ValidState {
  archiveLoading: number;
  showArchiveModal: boolean;
  user: User;
  organization: OrgResource.Organization;
  orgForm: Immutable<OrgForm.State>;
  sidebar: Immutable<MenuSidebar.State>;
  activeTab?: OrgTabs.TabId;

  teamMemberTable: Immutable<Table.State>;
}

export type State = Validation<Immutable<ValidState>, null>;

type InnerMsg
  = ADT<'orgForm', OrgForm.Msg>
  | ADT<'archive'>
  | ADT<'table', Table.Msg>
  | ADT<'hideArchiveModal'>
  | ADT<'sidebar', MenuSidebar.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export interface RouteParams {
  orgId: string;
  tab?: OrgTabs.TabId;
}

export function idToDefinition<K extends OrgTabs.TabId>(id: K): TabbedPage.TabDefinition<OrgTabs.Tabs, K> {
  switch (id) {
    case 'team':
      return {
        component: TeamTab.component,
        icon: 'bell',
        title: 'Team'
      } as TabbedPage.TabDefinition<OrgTabs.Tabs, K>;

    case 'qualification':
      return {
        component: QualificationTab.component,
        icon: 'balance-scale',
        title: 'SWU Qualification'
      } as TabbedPage.TabDefinition<OrgTabs.Tabs, K>;

    case 'organization':
    default:
      return {
        component: OrganizationTab.component,
        icon: 'user',
        title: 'Organization'
      } as TabbedPage.TabDefinition<OrgTabs.Tabs, K>;
  }
}

export function makeSidebarLink(tab: OrgTabs.TabId, userId: Id, activeTab: OrgTabs.TabId, orgId: Id): MenuSidebar.SidebarLink {
  const { icon, title } = idToDefinition(tab);
  return {
    icon,
    text: title,
    active: activeTab === tab,
    dest: routeDest(adt('orgView', {orgId, tab}))
  };
}

export async function makeSidebarState(profileUser: User, viewerUser: User, activeTab: OrgTabs.TabId, orgId: Id): Promise<Immutable<MenuSidebar.State>> {
  const links = (() => {
    return [
      makeSidebarLink('organization',   profileUser.id,  activeTab, orgId),
      makeSidebarLink('team',           profileUser.id,  activeTab, orgId),
      makeSidebarLink('qualification',  profileUser.id,  activeTab, orgId)
    ];
  })();
  return immutable(await MenuSidebar.init({ links }));
}

const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType({
  userType: [UserType.Vendor, UserType.Admin],

  async success({ dispatch, routeParams, shared }) {
    const result = await api.organizations.readOne(routeParams.orgId);
    const activeTab = routeParams.tab || 'organization';
    if (api.isValid(result)) {
      return valid(immutable({
        archiveLoading: 0,
        showArchiveModal: false,
        user: shared.sessionUser,
        organization: result.value,
        sidebar: shared.sessionUser.type === UserType.Vendor
                  ? await makeSidebarState(shared.sessionUser, shared.sessionUser, activeTab, result.value.id )
                  : immutable(await MenuSidebar.init({ links: [] })),
        orgForm: immutable(await OrgForm.init({organization: result.value })),
        teamMemberTable: immutable(await Table.init({
          idNamespace: 'team-member-table'
        })),
        activeTab
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

const OrgFormView = (state: ValidState, dispatch: Dispatch<Msg>) => {
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
};

const orgTeamMembers = [
  { id: '12345',    name: 'A team member', pending: false, capabilities: ['Backend Development', 'Security Engineering']},
  { id: '123456',   name: 'Team Member 2', pending: false, capabilities: ['DevOps Engineering', 'Agile Coaching', 'Security Engineering']},
  { id: '1234567',  name: 'Team Member 3', pending: true,  capabilities: ['Agile Coaching', 'Security Engineering', 'Frontend Development']},
  { id: '12345678', name: 'Team Member 4', pending: false, capabilities: ['Delivery Management', 'Technical Architecture', 'User Research', 'User Experience Design']}
];

function tableHeadCells(): Table.HeadCells {
  return [
    {
      children: 'Team Member',
      style: {
        width: '60%',
        minWidth: '240px'
      }
    },
    {
      children: 'Capabilities',
      style: {
        width: '20%'
      }
    },
    {
      children: '',
      style: {
        width: '20%'
      }
    }
  ];
}

function reduceCapabilities( current: string[], append: string[] ) {
  append.map( (cap) => {
    if (!current.includes(cap)) {
      current.push(cap);
    }
  });

  return current;
}

function tableBodyRows(): Table.BodyRows {
  return orgTeamMembers.map( member => {
    return [
      { children:
        <div>
          <Link dest={routeDest(adt('userProfile', { userId: member.id }))}>{member.name}</Link>
           { member.pending ? <Badge className='ml-2' text='pending' color='warning' /> : null }
        </div> },
      { children: <div>{member.capabilities.length}</div>},

      /* Note(Jesse): This button popping may be fixed by changing the
       * mecahnism that showOnHover is showing/hiding elements with.
       * Grep for : @popping_remove_button
       **/
      { showOnHover: true, children: <Link symbol_={leftPlacement(iconLinkSymbol('user-times'))} size='sm' button color='danger'>Remove</Link> }

    ];
  });
}

const TeamTabView = (state: ValidState, dispatch: Dispatch<Msg>, teamCapabilities: string[]) => {
  const org = state.organization;
  const dispatchTable = mapComponentDispatch<Msg, Table.Msg>(dispatch, value => ({ tag: 'table', value }));
  return (
    <div>
      <Row>
        <Col xs='12' className='mb-5 px-0'>
          <h2>{org.legalName}</h2>
        </Col>
        <Col className='px-0 pb-4 border-bottom'>
          <h3>Team Memeber(s)</h3>
          <Table.view
            headCells={tableHeadCells()}
            bodyRows={tableBodyRows()}
            state={state.teamMemberTable}
            dispatch={dispatchTable} />
        </Col>
      </Row>

      <Row className='pt-5'>
        <Col xs='12'>
          <h3>Team Capabilities</h3>
          <p className='pb-3'>This is a summary of the capabilities that your organization's team posses as a whole.</p>
        </Col>
        <Col xs='12'>
          <h4>Capabilities</h4>
        </Col>
        {
          Caps.map( c => {
            let icon = <Icon className='mx-2' name='circle'></Icon>;
            if (teamCapabilities.includes(c)) {
              icon = <Icon color='green' className='mx-2' name='check-circle'></Icon>;
            }
            return (
              <Col xs='6' className='border p-2'>
                {icon}
                {c}
              </Col>
            );
          })
        }
      </Row>

    </div>
  );
};

function predicatedOption(predicate: boolean, mainText: string, subtext: string) {
  return (
    <div className='d-flex py-2'>
      <div>
        { predicate ?
            <Icon color='green' className='mx-2' name='check-circle'></Icon> :
            <Icon className='mx-2' name='circle'></Icon> }
      </div>
      <div>
        <span>{mainText}</span>
        <div><span><small>{subtext}</small></span></div>
      </div>
    </div>
    );
}

const QualificationTabView = (state: ValidState, dispatch: Dispatch<Msg>, capabilityPredicate: boolean) => {
  const org = state.organization;
  return (
    <div>
      <Row className='pb-5 border-bottom'>
        <Col xs='12' className='mb-5 px-0'>
          <h3>{org.legalName}</h3>
          <p>To qualify to apply on Sprint With Us opportunities, your organization must meet the following requirements:</p>
        </Col>
        <Col xs='12'>
          <h3>Requirements</h3>
            {predicatedOption(orgTeamMembers.length >= 2,
                              'At least two team members',
                              'Send a request to one or more potential team members from the “Team” tab to begin the process of satisfying this requirement.')
            }
            {predicatedOption(capabilityPredicate,
                              'Team members collectively possess all capabilities',
                              'Your team members must update the capabilities on their user profile.')
            }
            {predicatedOption(org.acceptedSWUTerms != null,
                              'Agree to \'Sprint WIth Us\' Terms & Conditions',
                              'You may view the terms and conditions in the section below.')
            }

        </Col>
      </Row>

      <Row className='mt-5'>
        <Col xs='12' className='mb-5 px-0'>
          <h3>Terms & Conditions</h3>
          <p>View the Sprint With Us terms and conditions using the button below.</p>
          <Link button color='primary'>View Terms & Conditions</Link>
        </Col>
      </Row>

    </div>
  );
};

const view: ComponentView<State, Msg> = viewValid(({ state, dispatch }) => {
  const teamCapabilities = orgTeamMembers.reduce((current, member) => {
    return reduceCapabilities(current, member.capabilities);
  }, [] as string[]);

  switch (state.activeTab) {
    case 'team': {
      return TeamTabView(state, dispatch, teamCapabilities);
    }
    case 'qualification': {
      return QualificationTabView(state, dispatch, teamCapabilities.length === Caps.length);
    }
    case 'organization':
    default: {
      return OrgFormView(state, dispatch);
    }
  }
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
