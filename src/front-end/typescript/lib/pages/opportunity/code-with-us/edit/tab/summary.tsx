import { EMPTY_STRING } from 'front-end/config';
import { Route } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, Init, Update } from 'front-end/lib/framework';
import * as Tab from 'front-end/lib/pages/opportunity/code-with-us/edit/tab';
import EditTabHeader from 'front-end/lib/pages/opportunity/code-with-us/lib/views/edit-tab-header';
import DescriptionList from 'front-end/lib/views/description-list';
import Link, { emailDest, routeDest } from 'front-end/lib/views/link';
import ReportCardList, { ReportCard } from 'front-end/lib/views/report-card-list';
import Skills from 'front-end/lib/views/skills';
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
  const { successfulProponent } = state.opportunity;
  if (!successfulProponent || !successfulProponent.score) { return null; }
  const isViewerAdmin = isAdmin(state.viewerUser);
  const items = [
    {
      name: 'Awarded Proponent',
      children: (() => {
        if (isViewerAdmin) {
          const nameRoute: Route = (() => {
            switch (successfulProponent.id.tag) {
              case 'individual':
                return adt('userProfile', { userId: successfulProponent.id.value }) as Route;
              case 'organization':
                return adt('orgEdit', { orgId: successfulProponent.id.value }) as Route;
            }
          })();
          return (
            <div>
              <Link newTab dest={routeDest(nameRoute)}>{successfulProponent.name}</Link> (<Link dest={emailDest([successfulProponent.email])}>{successfulProponent.email}</Link>)
            </div>
          );
        } else {
          return successfulProponent.name;
        }
      })()
    },
    {
      name: 'Submitted By',
      children: (() => {
        if (isViewerAdmin) {
          return (<Link newTab dest={routeDest(adt('userProfile', { userId: successfulProponent.createdBy.id }))}>{successfulProponent.createdBy.name}</Link>);
        } else {
          return successfulProponent.createdBy.name;
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
        <Col xs='12' md='4' className='mb-4 mb-md-0 d-flex d-md-block'>
          <ReportCard
            icon='star-full'
            iconColor='c-report-card-icon-highlight'
            name='Winning Score'
            value={`${successfulProponent.score !== undefined ? `${successfulProponent.score}%` : EMPTY_STRING}`} />
        </Col>
        <Col xs='12' md='8' className='d-flex align-items-center flex-nowrap'>
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
          <Skills skills={skills} />
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
