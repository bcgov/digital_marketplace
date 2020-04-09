import { DEFAULT_USER_AVATAR_IMAGE_PATH } from 'front-end/config';
import * as CapabilityGrid from 'front-end/lib/components/capability-grid';
import * as Table from 'front-end/lib/components/table';
import { ComponentViewProps, immutable, Immutable, Init, mapComponentDispatch, PageGetModal, Update, updateComponentChild, View } from 'front-end/lib/framework';
import { userAvatarPath } from 'front-end/lib/pages/user/lib';
import { ThemeColor } from 'front-end/lib/types';
import Accordion from 'front-end/lib/views/accordion';
import Badge from 'front-end/lib/views/badge';
import Icon, { AvailableIcons } from 'front-end/lib/views/icon';
import Link, { iconLinkSymbol, imageLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import React from 'react';
import { Col, CustomInput, Row } from 'reactstrap';
import { find, formatDate } from 'shared/lib';
import { AffiliationMember, MembershipStatus } from 'shared/lib/resources/affiliation';
import { fileBlobPath } from 'shared/lib/resources/file';
import { SWUOpportunityPhase } from 'shared/lib/resources/opportunity/sprint-with-us';
import { OrganizationSlim } from 'shared/lib/resources/organization';
import { CreateSWUProposalPhaseBody, CreateSWUProposalPhaseValidationErrors, SWUProposalPhase, SWUProposalTeamMember } from 'shared/lib/resources/proposal/sprint-with-us';
import { adt, ADT, Id } from 'shared/lib/types';

export interface Params {
  organization?: OrganizationSlim;
  affiliations: AffiliationMember[];
  opportunityPhase?: SWUOpportunityPhase;
  proposalPhase?: SWUProposalPhase;
  isAccordionOpen: boolean;
}

type ModalId
  = ADT<'addTeamMembers'>
  | ADT<'viewTeamMember', Member>;

export interface Member extends AffiliationMember {
  scrumMaster: boolean;
  added: boolean;
  toBeAdded: boolean;
}

export interface State extends Omit<Params, 'affiliations'> {
  showModal: ModalId | null;
  members: Member[];
  membersTable: Immutable<Table.State>;
  capabilities: Immutable<CapabilityGrid.State>;
}

export type Msg
  = ADT<'toggleAccordion'>
  | ADT<'showModal', ModalId>
  | ADT<'hideModal'>
  | ADT<'toggleAffiliationToBeAdded', number>
  | ADT<'addTeamMembers'>
  | ADT<'setScrumMaster', Id>
  | ADT<'removeTeamMember', Id>
  | ADT<'membersTable', Table.Msg>
  | ADT<'capabilities', CapabilityGrid.Msg>;

export function setIsAccordionOpen(state: Immutable<State>, isAccordionOpen: boolean): Immutable<State> {
  return state.set('isAccordionOpen', isAccordionOpen);
}

function memberHasCapability(members: Member[], capability: string): boolean {
  for (const m of members) {
    if (m.user.capabilities.indexOf(capability) !== -1) {
      return true;
    }
  }
  return false;
}

function affiliationsToMembers(affiliations: AffiliationMember[], existingMembers: SWUProposalTeamMember[]): Member[] {
  return affiliations
    .map(a => {
      const existingTeamMember = find(existingMembers, ({ member }) => member.id === a.user.id);
      return {
        ...a,
        scrumMaster: existingTeamMember?.scrumMaster || false,
        added: !!existingTeamMember,
        toBeAdded: false
      };
    })
    .sort((a, b) => a.user.name.localeCompare(b.user.name));
}

export function determineCapabilities(members: Member[], opportunityPhase?: SWUOpportunityPhase): CapabilityGrid.CapabilityWithOptionalFullTime[] {
  return opportunityPhase
    ? opportunityPhase.requiredCapabilities.map(c => ({
        ...c,
        checked: memberHasCapability(members, c.capability)
      }))
    : [];
}

export function resetCapabilities(state: Immutable<State>): Immutable<State> {
  return state
    .update('capabilities', s => CapabilityGrid.setCapabilities(s, determineCapabilities(state.members, state.opportunityPhase)));
}

export function setAffiliations(state: Immutable<State>, affiliations: AffiliationMember[]): Immutable<State> {
  state = state.set('members', affiliationsToMembers(affiliations, state.proposalPhase?.members || []));
  return resetCapabilities(state);
}

export const init: Init<Params, State> = async params => {
  const { opportunityPhase, proposalPhase } = params;
  const { affiliations, ...paramsForState } = params;
  const members = affiliationsToMembers(affiliations, proposalPhase?.members || []);
  return {
    ...paramsForState,
    showModal: null,
    members,
    capabilities: immutable(await CapabilityGrid.init({
      showFullTimeSwitch: true,
      capabilities: determineCapabilities(members, opportunityPhase)
    })),
    membersTable: immutable(await Table.init({
      idNamespace: `swu-proposal-phase-members-${Math.random()}`
    }))
  };
};

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'toggleAccordion':
      return [state.update('isAccordionOpen', v => !v)];

    case 'showModal':
      return [state.set('showModal', msg.value)];

    case 'hideModal':
      return [state.set('showModal', null)];

    case 'toggleAffiliationToBeAdded':
      return [state.update('members', ms => ms.map((a, i) => {
        return i === msg.value
          ? { ...a, toBeAdded: !a.toBeAdded }
          : a;
      }))];

    case 'addTeamMembers': {
      state = state.update('members', ms => ms.map(a => ({
        ...a,
        added: a.added || a.toBeAdded,
        toBeAdded: false
      })));
      return [resetCapabilities(state)];
    }

    case 'setScrumMaster':
      return [state.update('members', ms => ms.map(m => ({
        ...m,
        scrumMaster: m.user.id === msg.value
      })))];

    case 'removeTeamMember':
      return [state.update('members', ms => ms.map(m => ({
        ...m,
        added: m.user.id === msg.value ? false : m.added
      })))];

    case 'membersTable':
      return updateComponentChild({
        state,
        childStatePath: ['membersTable'],
        childUpdate: Table.update,
        childMsg: msg.value,
        mapChildMsg: value => ({ tag: 'membersTable', value })
      });

    case 'capabilities':
      return updateComponentChild({
        state,
        childStatePath: ['capabilities'],
        childUpdate: CapabilityGrid.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('capabilities', value)
      });
  }
};

export type Values = Pick<CreateSWUProposalPhaseBody, 'members'>;

export function getValues(state: Immutable<State>): Values {
  return {
    members: state.members.map(({ user, scrumMaster }) => ({
      scrumMaster,
      member: user.id,
      pending: false //TODO remove
    }))
  };
}

export function getMembers(state: Immutable<State>): Member[] {
  return state.members;
}

export type Errors = CreateSWUProposalPhaseValidationErrors;

export function setErrors(state: Immutable<State>, errors?: Errors): Immutable<State> {
  //TODO
  return state;
}

export function isValid(state: Immutable<State>): boolean {
  return !!state.members.length
      && CapabilityGrid.areAllChecked(state.capabilities);
}

export interface Props extends ComponentViewProps<State, Msg> {
  title: string;
  icon: AvailableIcons;
  iconColor?: ThemeColor;
  disabled?: boolean;
  className?: string;
}

const Dates: View<Props> = ({ state }) => {
  const opportunityPhase = state.opportunityPhase;
  if (!opportunityPhase) { return null; }
  return (
    <Row className='mb-4'>
      <Col xs='12' className='d-flex flex-nowrap align-items-center'>
        <Icon name='calendar' width={0.9} height={0.9} className='mr-1' />
        <span className='font-weight-bold mr-2'>Phase Dates</span>
        <span>
          {formatDate(opportunityPhase.startDate)} to {formatDate(opportunityPhase.completionDate)}
        </span>
      </Col>
    </Row>
  );
};

function membersTableHeadCells(state: Immutable<State>): Table.HeadCells {
  return [
    {
      children: 'Team Member',
      style: {
      }
    },
    {
      children: 'Scrum Master',
      style: {
      }
    },
    {
      children: null,
      style: {
      }
    }
  ];
}

function membersTableBodyRows(props: Props): Table.BodyRows {
  const { state, dispatch, disabled } = props;
  //TODO member view modal
  return state.members.map(m => [
    {
      children: (<div className='d-flex align-items-center flex-nowrap'>
        <Link
          symbol_={leftPlacement(imageLinkSymbol(m.user.avatarImageFile ? fileBlobPath(m.user.avatarImageFile) : DEFAULT_USER_AVATAR_IMAGE_PATH))}>
          {m.user.name}
        </Link>
        <Badge text='Pending' color='yellow' className='ml-3' />
      </div>)
    },
    {
      children: (
        <CustomInput
          checked={m.scrumMaster}
          disabled={disabled}
          type='radio'
          onChange={e => {
            if (e.currentTarget.checked) {
              dispatch(adt('setScrumMaster', m.user.id));
            }
          }} />
      )
    },
    {
      children: (
        <Link
          button
          size='sm'
          symbol_={leftPlacement(iconLinkSymbol('user-minus'))}
          onClick={() => dispatch(adt('removeTeamMember', m.user.id))}
          color='danger'>
          Remove
        </Link>
      )
    }
  ]);
}

const TeamMembers: View<Props> = props => {
  const { state, dispatch, disabled } = props;
  return (
    <Row className='mb-4'>
      <Col xs='12' className='mb-4'>
        <h4>Team Members</h4>
        <Link
          button
          outline
          size='sm'
          disabled={disabled}
          onClick={() => dispatch(adt('showModal', adt('addTeamMembers')) as Msg)}
          symbol_={leftPlacement(iconLinkSymbol('user-plus'))}>
          Add Team Member(s)
        </Link>
      </Col>
      <Col xs='12'>
        {state.members.length
          ? (<Table.view
              headCells={membersTableHeadCells(state)}
              bodyRows={membersTableBodyRows(props)}
              state={state.membersTable}
              dispatch={mapComponentDispatch(dispatch, v => adt('membersTable' as const, v))} />)
          : null}
      </Col>
    </Row>
  );
};

const Capabilities: View<Props> = ({ state, dispatch }) => {
  return (
    <Row>
      <Col xs='12'>
        <h4>Required Capabilities</h4>
        <p className='mb-4'>This grid will automatically update to reflect the combined capabilities of your selected team members. To satisfy this phase's requirements, your team must collectively possess all capabilities listed here.</p>
      </Col>
      <Col xs='12'>
        <CapabilityGrid.view
          state={state.capabilities}
          dispatch={mapComponentDispatch(dispatch, v => adt('capabilities' as const, v))}
          disabled={true} />
      </Col>
    </Row>
  );
};

export const view: View<Props> = props => {
  const { state, title, icon, iconColor, dispatch, className } = props;
  return (
    <Accordion
      className={className}
      toggle={() => dispatch(adt('toggleAccordion'))}
      color='blue-dark'
      title={title}
      titleClassName='h3 mb-0'
      icon={icon}
      iconWidth={2}
      iconHeight={2}
      iconClassName='mr-3'
      iconColor={iconColor}
      chevronWidth={1.5}
      chevronHeight={1.5}
      open={state.isAccordionOpen}>
      <Dates {...props} />
      <TeamMembers {...props} />
      <Capabilities {...props} />
    </Accordion>
  );
};

export const getModal: PageGetModal<State, Msg> = state => {
  if (!state.showModal) { return null; }
  switch (state.showModal.tag) {
    case 'viewTeamMember': {
      const member = state.showModal.value;
      return {
        title: 'View Team Member',
        onCloseMsg: adt('hideModal'),
        body: dispatch => {
          const numCapabilities = member.user.capabilities.length + 1;
          return (
            <div>
              <div className='d-flex flex-nowrap align-items-center'>
                <img
                  className='rounded-circle border'
                  style={{
                    width: '5rem',
                    height: '5rem',
                    objectFit: 'cover'
                  }}
                  src={userAvatarPath(member.user)} />
                <div className='ml-3 d-flex flex-column align-items-start'>
                  <strong className='mb-3'>{member.user.name}</strong>
                  <span className='font-size-small'>{numCapabilities} Capabilit{numCapabilities === 1 ? 'y' : 'ies'}</span>
                </div>
              </div>
              <div className='border-top border-left'>
                {member.user.capabilities.map((c, i) => {
                  return (
                    <div key={`swu-proposal-phase-view-member-capability-${i}`} className='d-flex flex-nowrap align-items-center py-2 px-3 border-right border-bottom'>
                      <Icon className='mr-2' name='check-circle' color='success' />
                      <span>{c}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        },
        actions: []
      };
    }

    case 'addTeamMembers':
      return {
        title: 'Add Team Member(s)',
        onCloseMsg: adt('hideModal'),
        body: dispatch => {
          return (
            <div>
              <p>Select the team member(s) that you want to propose to be part of your team for this opportunity. If you do no see the team member that you want to add, you must send them a <Link>request to join your organization</Link>.</p>
              <div className='border-top border-left'>
                {state.members.map((m, i) => {
                  //Only show team members that have not yet been added.
                  if (m.added) { return null; }
                  return (
                    <div key={`swu-proposal-phase-affiliation-${i}`} className='d-flex flex-nowrap align-items-center py-2 px-3 border-right border-bottom'>
                      <Link
                        onClick={() => dispatch(adt('toggleAffiliationToBeAdded', i))}
                        symbol_={leftPlacement(iconLinkSymbol(m.toBeAdded ? 'check-circle' : 'circle'))}
                        symbolClassName={m.toBeAdded ? 'text-success' : 'text-body'}
                        className='text-nowrap flex-nowrap'
                        color='body'>
                        <img
                          className='rounded-circle border'
                          style={{
                            width: '1.75rem',
                            height: '1.75rem',
                            objectFit: 'cover'
                          }}
                          src={userAvatarPath(m.user)} />
                        {m.user.name}
                      </Link>
                      {m.membershipStatus === MembershipStatus.Pending
                        ? (<Badge text='pending' color='yellow' className='ml-3' />)
                        : null}
                    </div>
                  );
                })}
              </div>
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
};
