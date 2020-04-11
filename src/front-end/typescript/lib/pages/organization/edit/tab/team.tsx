import { makeStartLoading, makeStopLoading } from 'front-end/lib';
import { Route } from 'front-end/lib/app/types';
import * as FormField from 'front-end/lib/components/form-field';
import * as ShortText from 'front-end/lib/components/form-field/short-text';
import * as Table from 'front-end/lib/components/table';
import { ComponentView, ComponentViewProps, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, Update, updateComponentChild } from 'front-end/lib/framework';
//import * as api from 'front-end/lib/http/api';
import * as Tab from 'front-end/lib/pages/organization/edit/tab';
import EditTabHeader from 'front-end/lib/pages/organization/lib/views/edit-tab-header';
import { makeViewTeamMemberModal, PendingBadge } from 'front-end/lib/pages/organization/lib/views/team-member';
import { userAvatarPath } from 'front-end/lib/pages/user/lib';
import Capabilities, { Capability } from 'front-end/lib/views/capabilities';
import Icon from 'front-end/lib/views/icon';
import Link, { iconLinkSymbol, imageLinkSymbol, leftPlacement, routeDest } from 'front-end/lib/views/link';
import LoadingButton from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import CAPABILITIES from 'shared/lib/data/capabilities';
import { AffiliationMember, memberIsPending, membersHaveCapability } from 'shared/lib/resources/affiliation';
import { UserType } from 'shared/lib/resources/user';
import { adt, ADT, Id } from 'shared/lib/types';
import { validateUserEmail } from 'shared/lib/validation/affiliation';

type ModalId
  = ADT<'addTeamMembers'>
  | ADT<'viewTeamMember', AffiliationMember>;

export interface State extends Tab.Params {
  showModal: ModalId | null;
  addTeamMembersLoading: number;
  removeTeamMemberLoading: Id | null; //Id of affiliation, not user
  membersTable: Immutable<Table.State>;
  capabilities: Capability[];
  addTeamMembersEmails: Array<Immutable<ShortText.State>>;
}

export type InnerMsg
  = ADT<'addTeamMembers'>
  | ADT<'removeTeamMember', Id> //Id of affiliation, not user
  | ADT<'showModal', ModalId>
  | ADT<'hideModal'>
  | ADT<'membersTable', Table.Msg>
  | ADT<'addTeamMembersEmails', [number, ShortText.Msg]> //[index, msg]
  | ADT<'addTeamMembersEmailsAddField'>
  | ADT<'addTeamMembersEmailsRemoveField', number>; //index

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export function determineCapabilities(members: AffiliationMember[]): Capability[] {
  //Don't include pending members in capability calculation.
  members = members.filter(m => !memberIsPending(m));
  return CAPABILITIES.map(capability => ({
    capability,
    checked: membersHaveCapability(members, capability)
  }));
}

function resetCapabilities(state: Immutable<State>): Immutable<State> {
  return state.set('capabilities', determineCapabilities(state.affiliations));
}

async function initAddTeamMemberEmailField(): Promise<Immutable<ShortText.State>> {
  return immutable(await ShortText.init({
    errors: [],
    validate: validateUserEmail,
    child: {
      id: 'organization-team-add-team-members-emails',
      type: 'email',
      value: ''
    }
  }));
}

const init: Init<Tab.Params, State> = async params => {
  return {
    ...params,
    showModal: null,
    addTeamMembersLoading: 0,
    removeTeamMemberLoading: null,
    capabilities: determineCapabilities(params.affiliations),
    membersTable: immutable(await Table.init({
      idNamespace: 'organization-members'
    })),
    addTeamMembersEmails: [await initAddTeamMemberEmailField()]
  };
};

const startAddTeamMembersLoading = makeStartLoading<State>('addTeamMembersLoading');
const stopAddTeamMembersLoading = makeStopLoading<State>('addTeamMembersLoading');

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'showModal':
      return [state.set('showModal', msg.value)];

    case 'hideModal':
      return [state.set('showModal', null)];

    case 'addTeamMembers': {
      //TODO
      return [
        startAddTeamMembersLoading(state),
        async state => {
          state = stopAddTeamMembersLoading(state);
          return resetCapabilities(state);
        }
      ];
    }

    case 'removeTeamMember': {
      //TODO
      return [
        state.set('removeTeamMemberLoading', msg.value),
        async state => {
          state = state.set('removeTeamMemberLoading', null);
          return resetCapabilities(state);
        }
      ];
    }

    case 'membersTable':
      return updateComponentChild({
        state,
        childStatePath: ['membersTable'],
        childUpdate: Table.update,
        childMsg: msg.value,
        mapChildMsg: value => ({ tag: 'membersTable', value })
      });

    case 'addTeamMembersEmails':
      return updateComponentChild({
        state,
        childStatePath: ['addTeamMembersEmails', String(msg.value[0])],
        childUpdate: ShortText.update,
        childMsg: msg.value[1],
        mapChildMsg: value => adt('addTeamMembersEmails', [msg.value[0], value]) as Msg
      });

    case 'addTeamMembersEmailsAddField':
      return [
        state,
        async state => state.set('addTeamMembersEmails', [
          ...state.addTeamMembersEmails,
          await initAddTeamMemberEmailField()
        ])
      ];

    case 'addTeamMembersEmailsRemoveField':
      return [
        state.update('addTeamMembersEmails', vs => {
          return vs.filter((v, i) => i !== msg.value);
        })
      ];

    default:
      return [state];
  }
};

function membersTableHeadCells(state: Immutable<State>): Table.HeadCells {
  return [
    {
      children: 'Team Member',
      style: {
        width: '220px'
      }
    },
    {
      children: 'Capabilities',
      className: 'text-center',
      style: {
        width: '130px'
      }
    },
    {
      children: null,
      style: {
        width: '130px'
      }
    }
  ];
}

function membersTableBodyRows(props: ComponentViewProps<State, Msg>): Table.BodyRows {
  const { state, dispatch } = props;
  const isAddTeamMembersLoading = state.addTeamMembersLoading > 0;
  const isRemoveTeamMemberLoading = !!state.removeTeamMemberLoading;
  const isLoading = isAddTeamMembersLoading || isRemoveTeamMemberLoading;
  return state.affiliations.map(m => [
    {
      children: (<div className='d-flex align-items-center flex-nowrap'>
        <Link
          onClick={() => dispatch(adt('showModal', adt('viewTeamMember', m)) as Msg)}
          symbol_={leftPlacement(imageLinkSymbol(userAvatarPath(m.user)))}>
          {m.user.name}
        </Link>
        {memberIsPending(m)
          ? (<PendingBadge className='ml-3' />)
          : null}
      </div>),
      className: 'text-wrap align-middle'
    },
    {
      children: String(m.user.capabilities.length + 1),
      className: 'text-center align-middle'
    },
    {
      children: (
        <LoadingButton
          button
          disabled={isLoading}
          loading={state.removeTeamMemberLoading === m.id}
          size='sm'
          symbol_={leftPlacement(iconLinkSymbol('user-times'))}
          onClick={() => dispatch(adt('removeTeamMember', m.id))}
          color='danger'>
          Remove
        </LoadingButton>
      ),
      className: 'text-right align-middle'
    }
  ]);
}

const view: ComponentView<State, Msg> = props => {
  const { state, dispatch } = props;
  return (
    <div>
      <EditTabHeader
        legalName={state.organization.legalName}
        swuQualified={state.organization.swuQualified} />
      <Row className='mt-5'>
        <Col xs='12'>
          <h3 className='mb-4'>Team Members</h3>
          {state.affiliations.length
            ? (<Table.view
                headCells={membersTableHeadCells(state)}
                bodyRows={membersTableBodyRows(props)}
                state={state.membersTable}
                dispatch={mapComponentDispatch(dispatch, v => adt('membersTable' as const, v))} />)
            : null}
        </Col>
      </Row>
      <div className='mt-5 pt-5 border-top'>
        <Row>
          <Col xs='12'>
            <h3>Team Capabilities</h3>
            <p className='mb-4'>This is a summary of the capabilities your organization's team possesses as whole. It only includes the capabilities of confirmed (non-pending) team members.</p>
          </Col>
          <Col xs='12'>
            <h4 className='mb-3'>Capabilities</h4>
            <Capabilities grid capabilities={state.capabilities} />
          </Col>
        </Row>
      </div>
    </div>
  );
};

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view,
  getAlerts: state => {
    return {
      info: !state.organization.swuQualified && state.viewerUser.type === UserType.Vendor
      ? [{
          text: (
            <div>
              This organization is not qualified to apply for <em>Sprint With Us</em> opportunities. You must <Link dest={routeDest(adt('orgEdit', { orgId: state.organization.id, tab: 'qualification' as const }))}>apply to become a Qualified Supplier</Link>.
            </div>
          )
        }]
      : []
    };
  },
  getModal: state => {
    if (!state.showModal) { return null; }
    switch (state.showModal.tag) {
      case 'viewTeamMember':
        return makeViewTeamMemberModal({
          member: state.showModal.value,
          onCloseMsg: adt('hideModal')
        });

      case 'addTeamMembers':
        return {
          title: 'Add Team Member(s)',
          onCloseMsg: adt('hideModal'),
          body: dispatch => {
            return (
              <div>
                <p>Provide an email address for each team member to invite to join your organization.</p>
                {state.addTeamMembersEmails.map((s, i) => {
                  const props = {
                    extraChildProps: {},
                    className: 'flex-grow-1 mb-0',
                    placeholder: 'Email Address',
                    dispatch: mapComponentDispatch(dispatch, v => adt('addTeamMembersEmails', [i, v]) as Msg),
                    state: s
                  };
                  const isFirst = i === 0;
                  const isLast = i === state.addTeamMembersEmails.length - 1;
                  return (
                    <div>
                      {isFirst
                        ? (<FormField.ConditionalLabel label='Email Addresses' required {...props} />)
                        : null}
                      <div className='mb-3 d-flex align-items-start flex-nowrap'>
                        <ShortText.view {...props} />
                        <div className='d-flex flex-nowrap align-items-center' style={{ marginTop: '0.625rem' }}>
                          {state.addTeamMembersEmails.length === 1
                            ? null
                            : (<Icon
                                hover
                                name='trash'
                                color='info'
                                className='ml-2'
                                width={0.9}
                                height={0.9}
                                onClick={() => dispatch(adt('addTeamMembersEmailsRemoveField', i))} />)}
                          <Icon
                            hover={isLast}
                            name='plus'
                            color='primary'
                            className={`ml-2 ${isLast ? 'o-100' : 'o-0'}`}
                            width={1.1}
                            height={1.1}
                            onClick={() => isLast && dispatch(adt('addTeamMembersEmailsAddField'))} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          },
          actions: [
            {
              text: 'Add Team Member(s)',
              button: true,
              color: 'primary',
              icon: 'user-plus',
              msg: adt('addTeamMembers')
            },
            {
              text: 'Cancel',
              color: 'secondary',
              msg: adt('hideModal')
            }
          ]
        };
    }
  },
  getContextualActions: ({ state, dispatch }) => {
    const isAddTeamMembersLoading = state.addTeamMembersLoading > 0;
    const isRemoveTeamMemberLoading = !!state.removeTeamMemberLoading;
    const isLoading = isAddTeamMembersLoading || isRemoveTeamMemberLoading;
    return adt('links', [{
      children: 'Add Team Member(s)',
      onClick: () => dispatch(adt('showModal', adt('addTeamMembers')) as Msg),
      button: true,
      loading: isAddTeamMembersLoading,
      disabled: isLoading,
      symbol_: leftPlacement(iconLinkSymbol('user-plus')),
      color: 'primary'
    }]);
  }
};
