import { Route } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, Init, Update, View, ViewElement } from 'front-end/lib/framework';
import * as Tab from 'front-end/lib/pages/organization/edit/tab';
import EditTabHeader from 'front-end/lib/pages/organization/lib/views/edit-tab-header';
import { acceptedSWUTermsText, TITLE as SWU_TERMS_TITLE } from 'front-end/lib/pages/organization/sprint-with-us-terms';
import Icon from 'front-end/lib/views/icon';
import Link, { routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import CAPABILITIES from 'shared/lib/data/capabilities';
import { AffiliationMember, memberIsPending, membersHaveCapability } from 'shared/lib/resources/affiliation';
import { adt, ADT } from 'shared/lib/types';

export interface State extends Tab.Params {
  atLeastTwoMembers: boolean;
  possessAllCapabilities: boolean;
  agreedToSWUTerms: boolean;
}

export type InnerMsg = ADT<'noop'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export function atLeastTwoMembers(members: AffiliationMember[]): boolean {
  return members.filter(m => !memberIsPending(m)).length >= 2;
}

export function possessAllCapabilities(members: AffiliationMember[]): boolean {
  //Don't include pending members in calculation.
  members = members.filter(m => !memberIsPending(m));
  return CAPABILITIES.reduce((acc, c) => {
    return acc && membersHaveCapability(members, c);
  }, true as boolean);
}

const init: Init<Tab.Params, State> = async params => {
  return {
    ...params,
    atLeastTwoMembers: atLeastTwoMembers(params.affiliations),
    possessAllCapabilities: possessAllCapabilities(params.affiliations),
    agreedToSWUTerms: !!params.organization.acceptedSWUTerms
  };
};

const update: Update<State, Msg> = ({ state, msg }) => {
  return [state];
};

interface RequirementProps {
  name: string | ViewElement;
  description: string;
  checked: boolean;
  className?: string;
}

const Requirement: View<RequirementProps> = ({ name, description, checked, className = '' }) => {
  return (
    <div className={`d-flex flex-nowrap align-items-start ${className}`}>
      <Icon name={checked ? 'check-circle' : 'circle'} color={checked ? 'success' : 'body'} className='mr-2 mt-1 flex-shrink-0'/>
      <div className='flex-grow-1'>
        <div className='mb-1'>{name}</div>
        <div className='small text-secondary'>{description}</div>
      </div>
    </div>
  );
};

const view: ComponentView<State, Msg> = ({ state }) => {
  return (
    <div>
      <EditTabHeader
        legalName={state.organization.legalName}
        swuQualified={state.organization.swuQualified} />
      <Row className='mt-5'>
        <Col xs='12'>
          <h3>Requirements</h3>
          <p className='mb-4'>To qualify to submit proposals for Sprint With Us opportunities, your organization must meet the following requirements:</p>
          <Requirement
            className='mb-4'
            name='At least two team members.'
            description='Add team members from the "Team" tab to begin the process of satisfying this requirement.'
            checked={state.atLeastTwoMembers} />
          <Requirement
            className='mb-4'
            name='Team members collectively possess all capabilities.'
            description='Your team members can choose their capabilities on their user profiles.'
            checked={state.possessAllCapabilities} />
          <Requirement
            name={`Agreed to ${SWU_TERMS_TITLE}.`}
            description={`You can view the ${SWU_TERMS_TITLE} below.`}
            checked={!!state.organization.acceptedSWUTerms} />
        </Col>
      </Row>
      <div className='mt-5 pt-5 border-top'>
        <Row>
          <Col xs='12'>
            <h3>Terms & Conditions</h3>
            <p className='mb-4'>
              {acceptedSWUTermsText(state.organization, `View the ${SWU_TERMS_TITLE} by clicking the button below.`)}
            </p>
            <Link
              button
              color='primary'
              dest={routeDest(adt('orgSWUTerms', { orgId: state.organization.id }))}>
              View Terms & Conditions
            </Link>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view
};
