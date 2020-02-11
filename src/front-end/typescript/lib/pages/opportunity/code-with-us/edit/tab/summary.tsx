import { Route } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, Init, Update } from 'front-end/lib/framework';
import * as Tab from 'front-end/lib/pages/opportunity/code-with-us/edit/tab';
import EditTabHeader from 'front-end/lib/pages/opportunity/code-with-us/lib/views/edit-tab-header';
import Badge from 'front-end/lib/views/badge';
import DescriptionList from 'front-end/lib/views/description-list';
import ReportCardList, { ReportCard } from 'front-end/lib/views/report-card-list';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { formatAmount, formatDate } from 'shared/lib';
import { ADT } from 'shared/lib/types';

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
  const successfulProponent = state.opportunity.successfulProponent;
  if (!successfulProponent) { return null; }
  return (
    <div className='mt-5 pt-5 border-top'>
      <Row>
        <Col xs='12'>
          <h3 className='mb-4'>Successful Proponent</h3>
        </Col>
      </Row>
      <Row>
        <Col xs='12' md='4'>
          Score Card
        </Col>
        <Col xs='12' md='8' className='d-flex align-items-center flex-nowrap mt-4 mt-md-0'>
          Description list
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
      value: formatAmount(opportunity.reward * 10, '$')
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
          <h3 className='mb-4'>Details</h3>
        </Col>
      </Row>
      <Row className='mb-3'>
        <Col xs='12'>
          <ReportCardList reportCards={reportCards} />
        </Col>
      </Row>
      <Row>
        <Col xs='12' md='6'>
          <DescriptionList items={items} />
        </Col>
        <Col xs='12' md='6'>
          <div className='font-weight-bold mb-2'>Required Skills</div>
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
      <EditTabHeader opportunity={props.state.opportunity} />
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
