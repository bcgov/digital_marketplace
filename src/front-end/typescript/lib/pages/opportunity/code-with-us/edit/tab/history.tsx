import { Route } from 'front-end/lib/app/types';
import * as History from 'front-end/lib/components/table/history';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, Update, updateComponentChild } from 'front-end/lib/framework';
import * as Tab from 'front-end/lib/pages/opportunity/code-with-us/edit/tab';
import { opportunityToHistoryItems } from 'front-end/lib/pages/opportunity/code-with-us/lib';
import EditTabHeader from 'front-end/lib/pages/opportunity/code-with-us/lib/views/edit-tab-header';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { adt, ADT, Id } from 'shared/lib/types';
import  { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import * as ShortText from 'front-end/lib/components/form-field/short-text';
import * as FormField from 'front-end/lib/components/form-field';
import Icon from 'front-end/lib/views/icon';
import { makeViewTeamMemberModal} from 'front-end/lib/pages/organization/lib/views/team-member';
import * as Table from 'front-end/lib/components/table';
import { Capability } from 'front-end/lib/views/capabilities';
import CAPABILITIES from 'shared/lib/data/capabilities';
import { AffiliationMember,  memberIsPending, membersHaveCapability } from 'shared/lib/resources/affiliation';
// import { isAdmin, isVendor } from 'shared/lib/resources/user';


type ModalId
  = ADT<'addTeamMembers'>
  | ADT<'viewTeamMember', AffiliationMember>
  | ADT<'removeTeamMember', AffiliationMember>
  | ADT<'approveAffiliation', AffiliationMember>;

export interface State extends Tab.Params {
  history: Immutable<History.State>;
  // from team
  showModal: ModalId | null;
  addTeamMembersLoading: number;
  removeTeamMemberLoading: Id | null; //Id of affiliation, not user
  approveAffiliationLoading: Id | null; //Id of affiliation, not user
  membersTable: Immutable<Table.State>;
  // capabilities: Capability[];
  addTeamMembersEmails: Array<Immutable<ShortText.State>>;
}

export type InnerMsg
  = ADT<'history', History.Msg>
  //from team
  | ADT<'addTeamMembers'>
  | ADT<'removeTeamMember', AffiliationMember> //Id of affiliation, not user
  | ADT<'approveAffiliation', AffiliationMember>
  | ADT<'showModal', ModalId>
  | ADT<'hideModal'>
  | ADT<'membersTable', Table.Msg>
  | ADT<'addTeamMembersEmails', [number, ShortText.Msg]> //[index, msg]
  | ADT<'addTeamMembersEmailsAddField'>
  | ADT<'addTeamMembersEmailsRemoveField', number>; //index

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

// team members functions
export function determineCapabilities(members: AffiliationMember[]): Capability[] {
  //Don't include pending members in capability calculation.
  members = members.filter(m => !memberIsPending(m));
  return CAPABILITIES.map(capability => ({
    capability,
    checked: membersHaveCapability(members, capability)
  }));
}

// function resetCapabilities(state: Immutable<State>): Immutable<State> {
//   return state.set('capabilities', determineCapabilities(state.affiliations));
// }

async function initAddTeamMemberEmailField(): Promise<Immutable<ShortText.State>> {
  return immutable(await ShortText.init({
    errors: [],
    // validate: validateUserEmail,
    child: {
      id: 'organization-team-add-team-members-emails',
      type: 'email',
      value: ''
    }
  }));
}

// async function resetAddTeamMemberEmails(state: Immutable<State>): Promise<Immutable<State>> {
//   return state.set('addTeamMembersEmails', [await initAddTeamMemberEmailField()]);
// }

function isAddTeamMembersEmailsValid(state: Immutable<State>): boolean {
  for (const s of state.addTeamMembersEmails) {
    if (!FormField.isValid(s)) { return false; }
  }
  return true;
}
//team members functions end


const init: Init<Tab.Params, State> = async params => {
  return {
    ...params,
    history: immutable(await History.init({
      idNamespace: 'cwu-opportunity-history',
      items: opportunityToHistoryItems(params.opportunity),
      viewerUser: params.viewerUser
    })),
    //from team
    showModal: null,
    addTeamMembersLoading: 0,
    removeTeamMemberLoading: null,
    approveAffiliationLoading: null,
    // capabilities: determineCapabilities(params.affiliations),
    membersTable: immutable(await Table.init({
      idNamespace: 'organization-members'
    })),
    addTeamMembersEmails: [await initAddTeamMemberEmailField()]
  };
};

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'history':
      return updateComponentChild({
        state,
        childStatePath: ['history'],
        childUpdate: History.update,
        childMsg: msg.value,
        mapChildMsg: value => ({ tag: 'history', value })
      });
    default:
      return [state];
  }
};

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <div>
      <EditTabHeader opportunity={state.opportunity} viewerUser={state.viewerUser} />
      <div className='mt-5 pt-5 border-top'>
        <Row>
          <Col xs='12'>
            <h3 className='mb-4'>History</h3>
            <History.view
              state={state.history}
              dispatch={mapComponentDispatch(dispatch, msg => adt('history' as const, msg))} />
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
    // if (!isVendor(state.viewerUser) && !isAdmin(state.viewerUser)) { return null; }
    // const isAddTeamMembersLoading = state.addTeamMembersLoading > 0;
    // const isRemoveTeamMemberLoading = !!state.removeTeamMemberLoading;
    // const isLoading = isAddTeamMembersLoading || isRemoveTeamMemberLoading;
    return adt('links', [{
      children: 'Add Entry',
      onClick: () => dispatch(adt('showModal', adt('addTeamMembers')) as Msg),
      button: true,
      // loading: isAddTeamMembersLoading,
      // disabled: isLoading,
      symbol_: leftPlacement(iconLinkSymbol('file-edit')),
      color: 'primary'
    }]);
  }
};
