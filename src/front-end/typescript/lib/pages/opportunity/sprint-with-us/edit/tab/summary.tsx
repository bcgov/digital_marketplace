import { Route } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, Init, Update } from 'front-end/lib/framework';
import * as Tab from 'front-end/lib/pages/opportunity/code-with-us/edit/tab';
import EditTabHeader from 'front-end/lib/pages/opportunity/code-with-us/lib/views/edit-tab-header';
import Badge from 'front-end/lib/views/badge';
import DescriptionList from 'front-end/lib/views/description-list';
import Link, { routeDest } from 'front-end/lib/views/link';
import ReportCardList, { ReportCard } from 'front-end/lib/views/report-card-list';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { formatAmount, formatDate } from 'shared/lib';
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
  if (!successfulProposal || !successfulProposal.score) { return null; }
  const isViewerAdmin = isAdmin(state.viewerUser);
  const vendor = successfulProposal.createdBy;
  const items = [
    {
      name: 'Awarded Vendor',
      children: (() => {
        if (isViewerAdmin) {
          return (<Link newTab dest={routeDest(adt('userProfile', { userId: vendor.id }))}>{vendor.name}</Link>);
        } else {
          return vendor.name;
        }
      })()
    },
    ...(successfulProposal.proponent.tag === 'organization'
      ? [{
          name: 'Affiliated Organization',
          children: (() => {
            const org = successfulProposal.proponent.value;
            if (isViewerAdmin) {
              return (<Link newTab dest={routeDest(adt('orgEdit', { orgId: org.id }))}>{org.legalName}</Link>);
            } else {
              return org.legalName;
            }
          })()
        }]
      : [])
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
            value={`${successfulProposal.score}%`} />
        </Col>
        <Col xs='12' md='8'>
          <DescriptionList items={items} />
        </Col>
      </Row>
    </div>
  );
};

const Details: ComponentView<State, Msg> = ({ state }) => {
  const opportunity = state.opportunity;
  const skills = opportunity.skills;
  const items = [
    {
      name: 'Assignment Date',
      children: formatDate(opportunity.assignmentDate)
    },
    {
      name: 'Start Date',
      children: formatDate(opportunity.startDate)
    }
  ];
  const reportCards: ReportCard[] = [
    {
      icon: 'alarm-clock',
      name: 'Proposals Due',
      value: formatDate(opportunity.proposalDeadline)
    },
    {
      icon: 'badge-dollar',
      name: 'Value',
      value: formatAmount(opportunity.reward, '$')
    },
    {
      icon: 'map-marker',
      name: 'Location',
      value: opportunity.location
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
        <Col xs='12' md='6'>
          <DescriptionList items={items} />
        </Col>
        <Col xs='12' md='6'>
          <div className='font-weight-bold mb-2 mt-3 mt-md-0'>Required Skills</div>
          <div className='d-flex flex-wrap'>
            {skills.length
              ? skills.map((skill, i) => (
                  <Badge
                    key={`opportunity-skill-${i}`}
                    className={`mb-2 ${i < skills.length - 1 ? 'mr-2' : ''}`}
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
