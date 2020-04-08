import { DEFAULT_USER_AVATAR_IMAGE_PATH } from 'front-end/config';
import { makeStartLoading, makeStopLoading } from 'front-end/lib';
import * as CapabilityGrid from 'front-end/lib/components/capability-grid';
import { ComponentViewProps, immutable, Immutable, Init, mapComponentDispatch, PageGetModal, Update, updateComponentChild, View } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import { ThemeColor } from 'front-end/lib/types';
import Accordion from 'front-end/lib/views/accordion';
import Badge from 'front-end/lib/views/badge';
import Icon, { AvailableIcons } from 'front-end/lib/views/icon';
import Link, { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import LoadingButton from 'front-end/lib/views/loading-button';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { formatDate } from 'shared/lib';
import { AffiliationMember, MembershipStatus } from 'shared/lib/resources/affiliation';
import { fileBlobPath } from 'shared/lib/resources/file';
import { SWUOpportunityPhase } from 'shared/lib/resources/opportunity/sprint-with-us';
import { OrganizationSlim } from 'shared/lib/resources/organization';
import { CreateSWUProposalPhaseBody, CreateSWUProposalPhaseValidationErrors, SWUProposalPhase, SWUProposalTeamMember } from 'shared/lib/resources/proposal/sprint-with-us';
import { adt, ADT, Id } from 'shared/lib/types';

export interface Params {
  organization?: OrganizationSlim;
  opportunityPhase?: SWUOpportunityPhase;
  proposalPhase?: SWUProposalPhase;
  isAccordianOpen: boolean;
}

type ModalId = 'addTeamMembers';

export interface State extends Params {
  showAddTeamMembersModalLoading: number;
  addTeamMembersLoading: number;
  showModal: ModalId | null;
  members: SWUProposalTeamMember[];
  affiliations: Array<AffiliationMember & { checked: boolean; }>;
  capabilities: Immutable<CapabilityGrid.State>;
}

export type Msg
  = ADT<'toggleAccordion'>
  | ADT<'showModal', ModalId>
  | ADT<'hideModal'>
  | ADT<'toggleAffiliationChecked', number>
  | ADT<'addTeamMembers'>
  | ADT<'capabilities', CapabilityGrid.Msg>;

export function setIsAccordianOpen(state: Immutable<State>, isAccordianOpen: boolean): Immutable<State> {
  return state.set('isAccordianOpen', isAccordianOpen);
}

function memberHasCapability(members: SWUProposalTeamMember[], capability: string): boolean {
  for (const m of members) {
    if (m.capabilities.indexOf(capability) !== -1) {
      return true;
    }
  }
  return false;
}

function isTeamMember(state: Immutable<State>, userId: Id): boolean {
  for (const m of state.members) {
    if (m.member.id === userId) {
      return true;
    }
  }
  return false;
}

export const init: Init<Params, State> = async params => {
  const { opportunityPhase, proposalPhase } = params;
  const members = proposalPhase?.members || [];
  return {
    ...params,
    showAddTeamMembersModalLoading: 0,
    addTeamMembersLoading: 0,
    showModal: null,
    members,
    affiliations: [], // Loaded when clicking the "Add Team Members" button
    capabilities: immutable(await CapabilityGrid.init({
      showFullTimeSwitch: true,
      capabilities: opportunityPhase
        ? opportunityPhase.requiredCapabilities.map(c => ({
          ...c,
          checked: memberHasCapability(members, c.capability)
        }))
        : []
    }))
  };
};

const startShowAddTeamMembersModalLoading = makeStartLoading<State>('showAddTeamMembersModalLoading');
const stopShowAddTeamMembersModalLoading = makeStopLoading<State>('showAddTeamMembersModalLoading');
const startAddTeamMembersLoading = makeStartLoading<State>('addTeamMembersLoading');
const stopAddTeamMembersLoading = makeStopLoading<State>('addTeamMembersLoading');

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'toggleAccordion':
      return [state.update('isAccordianOpen', v => !v)];

    case 'showModal':
      return [
        startShowAddTeamMembersModalLoading(state).set('showModal', null),
        async state => {
          state = stopShowAddTeamMembersModalLoading(state);
          if (!state.organization) { return state; }
          const result = await api.affiliations.readManyForOrganization(state.organization.id);
          if (!api.isValid(result)) { return state; }
          return state
            .set('affiliations', result.value.map(a => ({
              ...a,
              checked: isTeamMember(state, a.user.id)
            })))
            .set('showModal', 'addTeamMembers');
        }
      ];

    case 'hideModal':
      if (state.addTeamMembersLoading > 0) { return [state]; }
      return [state.set('showModal', null)];

    case 'toggleAffiliationChecked':
      return [state.update('affiliations', affs => affs.map((a, i) => {
        return i === msg.value
          ? { ...a, checked: !a.checked }
          : a;
      }))];

    case 'addTeamMembers':
      return [
        startAddTeamMembersLoading(state),
        async state => stopAddTeamMembersLoading(state)
      ];

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
    members: state.members.map(({ member, scrumMaster }) => ({
      scrumMaster,
      member: member.id,
      pending: false //TODO remove
    }))
  };
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

const TeamMembers: View<Props> = ({ state, dispatch, disabled }) => {
  const isLoading = state.addTeamMembersLoading > 0;
  return (
    <Row className='mb-4'>
      <Col xs='12' className='mb-4'>
        <h4>Team Members</h4>
        <LoadingButton
          outline
          size='sm'
          loading={isLoading}
          disabled={isLoading}
          onClick={() => dispatch(adt('showModal', 'addTeamMembers'))}
          symbol_={leftPlacement(iconLinkSymbol('user-plus'))}>
          Add Team Member(s)
        </LoadingButton>
      </Col>
      <Col xs='12'>
        {state.members.length
          ? 'Table'
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
      open={state.isAccordianOpen}>
      <Dates {...props} />
      <TeamMembers {...props} />
      <Capabilities {...props} />
    </Accordion>
  );
};

export const getModal: PageGetModal<State, Msg> = state => {
  const isAddTeamMembersLoading = state.addTeamMembersLoading > 0;
  switch (state.showModal) {
    case null:
      return null;

    case 'addTeamMembers':
      return {
        title: 'Add Team Member(s)',
        onCloseMsg: adt('hideModal'),
        body: dispatch => {
          return (
            <div>
              <p>Select the team member(s) that you want to propose to be part of your team for this opportunity. If you do no see the team member that you want to add, you must send them a <Link>request to join your organization</Link>.</p>
              <div className='border-top border-left'>
                {state.affiliations.map((a, i) => {
                  return (
                    <div key={`swu-proposal-phase-affiliation-${i}`} className='d-flex flex-nowrap align-items-center py-2 px-3 border-right border-bottom'>
                      <Link
                        onClick={() => dispatch(adt('toggleAffiliationChecked', i))}
                        symbol_={leftPlacement(iconLinkSymbol(a.checked ? 'check-circle' : 'circle'))}
                        symbolClassName={a.checked ? 'text-success' : 'text-body'}
                        className='font-size-small text-nowrap flex-nowrap'
                        iconSymbolSize={0.9}
                        color='body'
                        disabled={isAddTeamMembersLoading}>
                        <img
                          src={a.user.avatarImageFile ? fileBlobPath(a.user.avatarImageFile) : DEFAULT_USER_AVATAR_IMAGE_PATH}
                          style={{
                            width: '1.75rem',
                            height: '1.75rem',
                            objectFit: 'cover',
                            borderRadius: '50%'
                          }}
                          className='mr-2' />
                        {a.user.name}
                      </Link>
                      {a.membershipStatus === MembershipStatus.Pending
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
