import { makeStartLoading, makeStopLoading } from 'front-end/lib';
import { Route } from 'front-end/lib/app/types';
import * as FormField from 'front-end/lib/components/form-field';
import * as ShortText from 'front-end/lib/components/form-field/short-text';
import * as Table from 'front-end/lib/components/table';
import { ComponentView, ComponentViewProps, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, toast, Update, updateComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Tab from 'front-end/lib/pages/organization/edit/tab';
import * as toasts from 'front-end/lib/pages/organization/lib/toasts';
import EditTabHeader from 'front-end/lib/pages/organization/lib/views/edit-tab-header';
import { makeViewTeamMemberModal, OwnerBadge, PendingBadge } from 'front-end/lib/pages/organization/lib/views/team-member';
import { userAvatarPath } from 'front-end/lib/pages/user/lib';
import Capabilities, { Capability } from 'front-end/lib/views/capabilities';
import Icon from 'front-end/lib/views/icon';
import Link, { iconLinkSymbol, imageLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import CAPABILITIES from 'shared/lib/data/capabilities';
import { AffiliationMember, memberIsOwner, memberIsPending, membersHaveCapability, MembershipType } from 'shared/lib/resources/affiliation';
import { isAdmin, isVendor } from 'shared/lib/resources/user';
import { adt, ADT, Id } from 'shared/lib/types';
import { validateUserEmail } from 'shared/lib/validation/affiliation';

type ModalId
  = ADT<'addTeamMembers'>
  | ADT<'viewTeamMember', AffiliationMember>
  | ADT<'removeTeamMember', AffiliationMember>
  | ADT<'approveAffiliation', AffiliationMember>;


export interface State extends Tab.Params {
  showModal: ModalId | null;
  addTeamMembersLoading: number;
  removeTeamMemberLoading: Id | null; //Id of affiliation, not user
  approveAffiliationLoading: Id | null; //Id of affiliation, not user
  membersTable: Immutable<Table.State>;
  capabilities: Capability[];
  addTeamMembersEmails: Array<Immutable<ShortText.State>>;
}

export type InnerMsg
  = ADT<'addTeamMembers'>
  | ADT<'removeTeamMember', AffiliationMember> //Id of affiliation, not user
  | ADT<'approveAffiliation', AffiliationMember>
  | ADT<'showModal', ModalId>
  | ADT<'hideModal'>
  | ADT<'membersTable', Table.Msg>
  | ADT<'addTeamMembersEmails', [number, ShortText.Msg]> //[index, msg]
  | ADT<'addTeamMembersEmailsAddField'>
  | ADT<'addTeamMembersEmailsRemoveField', number>; //index

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export function determineCapabilities(members: AffiliationMember[]): Capability[] {
  //Don't include pending members in capability calculation.
  //TODO THIS PURPOSELY SKIPS THE PENDING MEMBERS
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

async function resetAddTeamMemberEmails(state: Immutable<State>): Promise<Immutable<State>> {
  return state.set('addTeamMembersEmails', [await initAddTeamMemberEmailField()]);
}

const init: Init<Tab.Params, State> = async params => {
  return {
    ...params,
    showModal: null,
    addTeamMembersLoading: 0,
    removeTeamMemberLoading: null,
    approveAffiliationLoading: null,
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

    case 'hideModal': {
      const existingShowModal = state.showModal;
      return [
        state.set('showModal', null),
        async state => {
          if (existingShowModal && existingShowModal.tag === 'addTeamMembers') {
            return await resetAddTeamMemberEmails(state);
          }
          return null;
        }
      ];
    }

    case 'addTeamMembers': {
      state = state.set('showModal', null);
      return [
        startAddTeamMembersLoading(state),
        async (state, dispatch) => {
          state = stopAddTeamMembersLoading(state);
          const successToasts: string[] = []; //emails
          const warningToasts: string[] = []; //emails
          const errorToasts: string[] = []; //emails
          for (const s of state.addTeamMembersEmails) {
            const userEmail = FormField.getValue(s);
            const result = await api.affiliations.create({
              userEmail,
              organization: state.organization.id,
              membershipType: MembershipType.Member
            });
            switch (result.tag) {
              case 'valid':
                successToasts.push(userEmail);
                state = state.update('affiliations', affs => [...affs, result.value]);
                break;
              case 'invalid':
                if (result.value.inviteeNotRegistered?.length) {
                  warningToasts.push(userEmail);
                } else {
                  errorToasts.push(userEmail);
                }
                break;
              case 'unhandled':
                errorToasts.push(userEmail);
                break;
            }
          }
          //Dispatch resulting toasts to user.
          if (successToasts.length) {
            dispatch(toast(adt('success', toasts.addedTeamMembers.success(successToasts))));
          }
          if (warningToasts.length) {
            dispatch(toast(adt('warning', toasts.addedTeamMembers.warning(warningToasts))));
          }
          if (errorToasts.length) {
            dispatch(toast(adt('error', toasts.addedTeamMembers.error(errorToasts))));
          }
          state = resetCapabilities(state);
          return await resetAddTeamMemberEmails(state);
        }
      ];
    }

    case 'approveAffiliation':
      // console.log('the state is')
      // console.log(state)
      return [
        state
          .set('approveAffiliationLoading', msg.value.id)
          .set('showModal', null),
        async (state, dispatch) => {
          state = state.set('approveAffiliationLoading', null);
          // console.log("The msg.value.id is:")
          // console.log(msg.value.id)
          const result = await api.affiliations.update(msg.value.id, null);
          if (!api.isValid(result)) {
            dispatch(toast(adt('error', toasts.approvedTeamMember.error(msg.value))));
            return state;
          }
          const params = await Tab.initParams(state.organization.id, state.viewerUser);
          // console.log('the params are')
          // console.log(params?.organization)
          if (params) {
            state = state
              .set('organization', params.organization)
              .set('affiliations', params.affiliations)
              .set('viewerUser', params.viewerUser)
              .set('swuQualified', params.swuQualified);
          }
          console.log(`the message value is: ${msg.value}`)
          console.log(msg.value)

          dispatch(toast(adt('success', toasts.approvedTeamMember.success(msg.value))));
          return resetCapabilities(state);
        }
      ];

    case 'removeTeamMember':
      state = state.set('showModal', null);
      return [
        state.set('removeTeamMemberLoading', msg.value.id),
        async (state, dispatch) => {
          state = state.set('removeTeamMemberLoading', null);
          const result = await api.affiliations.delete(msg.value.id);
          if (!api.isValid(result)) {
            dispatch(toast(adt('error', toasts.removedTeamMember.error(msg.value))));
            return state;
          }
          const params = await Tab.initParams(state.organization.id, state.viewerUser);
          if (params) {
            state = state
              .set('organization', params.organization)
              .set('affiliations', params.affiliations)
              .set('viewerUser', params.viewerUser)
              .set('swuQualified', params.swuQualified);
          }
          console.log(`the message value is: ${msg.value}`)
          console.log(msg.value)
          dispatch(toast(adt('success', toasts.removedTeamMember.success(msg.value))));
          return resetCapabilities(state);
        }
      ];

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
        width: '100%'
      }
    },
    {
      children: 'Capabilities',
      className: 'text-center'
    },
    {
      children: null
    }
  ];
}

function membersTableBodyRows(props: ComponentViewProps<State, Msg>): Table.BodyRows {
  const { state, dispatch } = props;
  const isAddTeamMembersLoading = state.addTeamMembersLoading > 0;
  const isRemoveTeamMemberLoading = !!state.removeTeamMemberLoading;
  const isApproveAffiliationLoading = !!state.approveAffiliationLoading;

  const isLoading = isAddTeamMembersLoading || isRemoveTeamMemberLoading || isApproveAffiliationLoading;
  // const isDisabled = isDeleteLoading || isApproveLoading || isRejectLoading;
  //TODO CHANGE 'm' TO 'affiliation' maybe.... 
  return state.affiliations.map(m => {
    const isMemberLoading = state.removeTeamMemberLoading === m.id;
    //TODO:this may be wrong (member id vs affiliation id)
    const isApproveLoading = state.approveAffiliationLoading === m.id;
    // console.log(m)
    // console.log(` is pending ${memberIsPending(m)}`)
    return [
      {
        children: (
          <div className='d-flex align-items-center flex-nowrap'>
            <Link
              onClick={() => dispatch(adt('showModal', adt('viewTeamMember', m)) as Msg)}
              symbol_={leftPlacement(imageLinkSymbol(userAvatarPath(m.user)))}>
              {m.user.name}
            </Link>
            {memberIsOwner(m)
              ? (<OwnerBadge className='ml-3' />)
              : null}
            {memberIsPending(m)
              ? (<PendingBadge className='ml-3' />)
              : null}
          </div>
        ),
        className: 'text-nowrap align-middle'
      },
      {
        children: String(m.user.capabilities.length),
        className: 'text-center align-middle'
      },
      {
        showOnHover: !(isMemberLoading || isApproveLoading),
        //TODO FIX THIS LOGIC BRO!!!!
        // The approve function comes from: src/front-end/typescript/lib/pages/user/profile/tab/organizations.tsx
        children:
          <div className='d-flex align-items-center flex-nowrap'>
            {/* add the proper conditionals */}
            {(isAdmin(state.viewerUser) && memberIsPending(m)) &&
              <Link
                button
                disabled={isLoading}
                loading={isApproveLoading}
                size='sm'
                color='success'
                className='mr-2'
                symbol_={leftPlacement(iconLinkSymbol('user-check'))}
                onClick={() => dispatch(adt('showModal', adt('approveAffiliation', m)) as Msg)}>
                Approve
              </Link>
            }
            {(!(memberIsOwner(m) || !isVendor(state.viewerUser)) || isAdmin(state.viewerUser)) &&
              <Link
                button
                disabled={isLoading}
                loading={isMemberLoading}
                size='sm'
                symbol_={leftPlacement(iconLinkSymbol('user-times'))}
                onClick={() => dispatch(adt('showModal', adt('removeTeamMember', m)) as Msg)}
                color='danger'>
                Remove
              </Link>
            }
          </div>,
        className: 'text-right align-middle'
      }
    ];
  });
}

const view: ComponentView<State, Msg> = props => {
  const { state, dispatch } = props;
  // console.log("The legal name is")
  // console.log(state.organization)
  // console.log(state.organization.legalName)
  return (
    <div>
      <EditTabHeader
        legalName={state.organization?.legalName}
        swuQualified={state.swuQualified} />
      <Row className='mt-5'>
        <Col xs='12'>
          <h3>Team Members</h3>
          <p className='mb-4'>Add team members to your organization by clicking on the "Add Team Member(s)" button above. Please ensure team members have already signed up for a Digital Marketplace Vendor account before adding them to your organization.</p>
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
            <p className='mb-4'>This is a summary of the capabilities your organization's team possesses as whole, only including the capabilities of confirmed (non-pending) members. Team members can claim capabilities in their user profiles in the "Capabilities" section.</p>
            <Capabilities grid capabilities={state.capabilities} />
          </Col>
        </Row>
      </div>
    </div>
  );
};

function isAddTeamMembersEmailsValid(state: Immutable<State>): boolean {
  for (const s of state.addTeamMembersEmails) {
    if (!FormField.isValid(s)) { return false; }
  }
  return true;
}

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view,
  getModal: state => {
    if (!state.showModal) { return null; }
    switch (state.showModal.tag) {
      case 'viewTeamMember':
        return makeViewTeamMemberModal({
          member: state.showModal.value,
          onCloseMsg: adt('hideModal')
        });

      case 'approveAffiliation':
        return {
          title: 'Approve Request?',
          body: () => 'Approving this request will allow this company to put you forward as a team member on proposals for opportunities.',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Approve Request',
              icon: 'user-check',
              color: 'success',
              msg: adt('approveAffiliation', state.showModal.value),
              button: true
            },
            {
              text: 'Cancel',
              color: 'secondary',
              msg: adt('hideModal')
            }
          ]
        };

      case 'addTeamMembers': {
        const isValid = isAddTeamMembersEmailsValid(state);
        return {
          title: 'Add Team Member(s)',
          onCloseMsg: adt('hideModal'),
          body: dispatch => {
            const addField = () => dispatch(adt('addTeamMembersEmailsAddField'));
            return (
              <div>
                <p>Provide an email address for each team member to invite them to join your organization.</p>
                <p><strong>Please ensure team members have already signed up for a Digital Marketplace Vendor account before adding them to your organization, and only enter the email addresses associated with their Digital Marketplace accounts.</strong></p>
                {state.addTeamMembersEmails.map((s, i) => {
                  const isFirst = i === 0;
                  const isLast = i === state.addTeamMembersEmails.length - 1;
                  const props = {
                    extraChildProps: {},
                    className: 'flex-grow-1 mb-0',
                    placeholder: 'Email Address',
                    dispatch: mapComponentDispatch(dispatch, v => adt('addTeamMembersEmails', [i, v]) as Msg),
                    state: s
                  };
                  return (
                    <div key={`organization-add-team-member-email-${i}`}>
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
                            onClick={isLast ? addField : undefined} />
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
              disabled: !isValid,
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

      case 'removeTeamMember': {
        const affiliation = state.showModal.value;
        return {
          title: `Remove ${affiliation.user.name}?`,
          body: () => `Are you sure you want to remove ${affiliation.user.name} from this organization?`,
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Remove Team Member',
              icon: 'user-times',
              color: 'danger',
              msg: adt('removeTeamMember', affiliation),
              button: true
            },
            {
              text: 'Cancel',
              color: 'secondary',
              msg: adt('hideModal')
            }
          ]
        };
      }
    }
  },
  getContextualActions: ({ state, dispatch }) => {
    if (!isVendor(state.viewerUser) && !isAdmin(state.viewerUser)) { return null; }
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
