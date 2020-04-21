import { Route } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, Init, Update } from 'front-end/lib/framework';
import * as Tab from 'front-end/lib/pages/opportunity/sprint-with-us/edit/tab';
import EditTabHeader from 'front-end/lib/pages/opportunity/sprint-with-us/lib/views/edit-tab-header';
import Badge from 'front-end/lib/views/badge';
import DescriptionList from 'front-end/lib/views/description-list';
import Link, { routeDest } from 'front-end/lib/views/link';
import ReportCardList, { ReportCard } from 'front-end/lib/views/report-card-list';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { formatAmount, formatDate } from 'shared/lib';
import { SWUOpportunityPhaseType, swuOpportunityPhaseTypeToTitleCase } from 'shared/lib/resources/opportunity/sprint-with-us';
import { NUM_SCORE_DECIMALS } from 'shared/lib/resources/proposal/sprint-with-us';
import { isAdmin } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';

export type State = Tab.Params;

export type InnerMsg
  = ADT<'noop'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

const init: Init<Tab.Params, State> = async params => params;

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    default:
      return [state];
  }
};

const SuccessfulProponent: ComponentView<State, Msg> = ({ state }) => {
  const { successfulProposal } = state.opportunity;
  const submittedBy = successfulProposal?.createdBy;
  const org = successfulProposal?.organization;
  if (!successfulProposal || !successfulProposal.totalScore || !submittedBy || !org) { return null; }
  const isViewerAdmin = isAdmin(state.viewerUser);
  const items = [
    {
      name: 'Awarded Proponent',
      children: (() => {
        if (isViewerAdmin) {
          return (<Link newTab dest={routeDest(adt('orgEdit', { orgId: org.id }))}>{org.legalName}</Link>);
        } else {
          return org.legalName;
        }
      })()
    },
    {
      name: 'Submitted By',
      children: (() => {
        if (isViewerAdmin) {
          return (<Link newTab dest={routeDest(adt('userProfile', { userId: submittedBy.id }))}>{submittedBy.name}</Link>);
        } else {
          return submittedBy.name;
        }
      })()
    }
  ];
  return (
    <div className='mt-5 pt-5 border-top'>
      <Row>
        <Col xs='12'>
          <h4 className='mb-4'>Successful Proponent</h4>
        </Col>
      </Row>
      <Row>
        <Col xs='12' md='4'>
          <ReportCard
            icon='star-full'
            iconColor='yellow'
            name='Winning Score'
            value={`${successfulProposal.totalScore.toFixed(NUM_SCORE_DECIMALS)}%`} />
        </Col>
        <Col xs='12' md='8'>
          <DescriptionList items={items} />
        </Col>
      </Row>
    </div>
  );
};

const Details: ComponentView<State, Msg> = ({ state }) => {
  const {
    mandatorySkills,
    optionalSkills,
    inceptionPhase,
    prototypePhase,
    implementationPhase,
    assignmentDate,
    proposalDeadline,
    totalMaxBudget,
    minTeamMembers,
    location
  } = state.opportunity;
  const items = [
    {
      name: 'Assignment Date',
      children: formatDate(assignmentDate)
    },
    {
      name: 'Phase Dates',
      children: (
        <div>
          {inceptionPhase
            ? (<div>{swuOpportunityPhaseTypeToTitleCase(SWUOpportunityPhaseType.Inception)}: {formatDate(inceptionPhase.startDate)} to {formatDate(inceptionPhase.completionDate)}</div>)
            : null}
          {prototypePhase
            ? (<div>{swuOpportunityPhaseTypeToTitleCase(SWUOpportunityPhaseType.Prototype)}: {formatDate(prototypePhase.startDate)} to {formatDate(prototypePhase.completionDate)}</div>)
            : null}
          <div>{swuOpportunityPhaseTypeToTitleCase(SWUOpportunityPhaseType.Implementation)}: {formatDate(implementationPhase.startDate)} to {formatDate(implementationPhase.completionDate)}</div>
        </div>
      )
    }
  ];
  const reportCards: ReportCard[] = [
    {
      icon: 'alarm-clock',
      name: 'Proposals Due',
      value: formatDate(proposalDeadline)
    },
    {
      icon: 'badge-dollar',
      name: 'Max. Budget',
      value: formatAmount(totalMaxBudget, '$')
    },
    {
      icon: 'map-marker',
      name: 'Location',
      value: location
    },
    {
      icon: 'users',
      name: 'Min. Team Size',
      value: String(minTeamMembers)
    }
  ];
  return (
    <div className='mt-5 pt-5 border-top'>
      <Row>
        <Col xs='12'>
          <h4 className='mb-4'>Details</h4>
        </Col>
      </Row>
      <Row className='mb-5'>
        <Col xs='12'>
          <ReportCardList reportCards={reportCards} />
        </Col>
      </Row>
      <Row>
        <Col xs='12'>
          <DescriptionList items={items} />
        </Col>
      </Row>
      <Row className='mt-3'>
        <Col xs='12' sm='6'>
          <div className='font-weight-bold mb-2'>Mandatory Skills</div>
          <div className='d-flex flex-wrap'>
            {mandatorySkills.length
              ? mandatorySkills.map((skill, i, arr) => (
                  <Badge
                    key={`opportunity-mandatory-skill-${i}`}
                    className={`mb-2 ${i < arr.length - 1 ? 'mr-2' : ''}`}
                    text={skill}
                    color='purple' />
                ))
              : 'None'}
          </div>
        </Col>
        <Col xs='12' sm='6'>
          <div className='font-weight-bold mb-2'>Optional Skills</div>
          <div className='d-flex flex-wrap'>
            {optionalSkills.length
              ? optionalSkills.map((skill, i, arr) => (
                  <Badge
                    key={`opportunity-optional-skill-${i}`}
                    className={`mb-2 ${i < arr.length - 1 ? 'mr-2' : ''}`}
                    text={skill}
                    color='purple' />
                ))
              : 'None'}
          </div>
        </Col>
      </Row>
    </div>
  );
};

const view: ComponentView<State, Msg> = props => {
  return (
    <div>
      <EditTabHeader opportunity={props.state.opportunity} viewerUser={props.state.viewerUser} />
      <SuccessfulProponent {...props} />
      <Details {...props} />
    </div>
  );
};

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view
};
