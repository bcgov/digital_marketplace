import { makePageMetadata, prefixPath } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, PageComponent, PageInit, Update, View } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import { BulletPoint } from 'front-end/lib/views/bullet-point';
import Icon from 'front-end/lib/views/icon';
import Link, { iconLinkSymbol, leftPlacement, rightPlacement, routeDest } from 'front-end/lib/views/link';
import ProgramCard from 'front-end/lib/views/program-card';
import React from 'react';
import { Col, Container, Row } from 'reactstrap';
import { COPY } from 'shared/config';
import { formatAmount } from 'shared/lib';
import * as cwu from 'shared/lib/resources/opportunity/code-with-us';
import * as swu from 'shared/lib/resources/opportunity/sprint-with-us';
import { adt, ADT } from 'shared/lib/types';

const IMG_MAX_WIDTH = '550px';

export interface State {
  totalCount: number;
  totalAwarded: number;
}

type InnerMsg = ADT<'noop'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => {
  const metricsR = await api.metrics.readMany();
  if (!api.isValid(metricsR)) {
    return {
      totalCount: 0,
      totalAwarded: 0
    };
  }

  return metricsR.value[0];
};

const update: Update<State, Msg> = ({ state, msg }) => {
  return [state];
};

const Hero: ComponentView<State, Msg> = ({state, dispatch}) => {
  return (
    <Container className='pb-7 pb-md-8 pt-sm-4 pt-md-3'>
      <Row className='justify-content-center text-center'>
        <Col xs='12' sm='10' md='6'>
          <h1 style={{lineHeight: '3.75rem'}}>
            Discover Unique Opportunities to Collaborate with the {COPY.region.name.short} Public Sector.
          </h1>
        </Col>
      </Row>
      <Row className='justify-content-center text-center'>
        <Col xs='12' sm='10' md='6' className='mt-3'>
          The Digital Marketplace is a new platform that will help build an ecosystem of innovation and collaboration between tech entrepreneurs and {COPY.region.name.short}'s public sector.
        </Col>
      </Row>
      <Row className='mt-5'>
        <Col xs='12' className='d-flex justify-content-center'>
          <Link
            button
            symbol_={leftPlacement(iconLinkSymbol('search'))}
            dest={routeDest(adt('opportunities', null))}
            color='primary'>
            Browse Opportunities
          </Link>
        </Col>
      </Row>
    </Container>
  );
};

const Stats: ComponentView<State, Msg> = ({ state }) => {
  return (
    <div className='bg-c-landing-stats-bg py-5'>
      <Container>
        <Row>
          <Col xs='12' className='d-flex flex-column flex-md-row justify-content-center align-items-center'>
            <Stat stat={formatAmount(state.totalCount)} description='Total Opportunities Awarded' className='mr-md-6 mb-5 mb-md-0' />
            <Stat stat={formatAmount(state.totalAwarded, '$')} description='Total Value of All Opportunities' />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

const Stat: View<{ stat: string; description: string; className?: string; }> = ({ stat, description, className }) => {
  return (
    <div className={`d-flex flex-column justify-content-center align-items-center text-center ${className}`}>
      <div className='h1 mb-3 text-c-landing-stats-stat'>{stat}</div>
      <div className='overline text-c-landing-stats-description'>{description}</div>
    </div>
  );
};

const Programs: View = () => {
  return (
    <div className='bg-c-landing-programs-bg py-7'>
      <Container>
        <Row>
          <ProgramCard
            img={prefixPath('/images/illustrations/code_with_us.svg')}
            title='Code With Us'
            className='mb-4 mb-md-0'
            description={
              (<div>
                <div>Commit Code.</div>
                <div>Get Paid.</div>
                <div className='mt-3'>Opportunities up to {cwu.FORMATTED_MAX_BUDGET}.</div>
              </div>)
            }
            links={[
              {
                button: true,
                dest: routeDest(adt('learnMoreCWU', null)),
                children: ['Learn More'],
                color: 'primary',
                outline: true,
                symbol_: rightPlacement(iconLinkSymbol('arrow-right'))
              }
            ]}
          />
          <ProgramCard
            img={prefixPath('/images/illustrations/sprint_with_us.svg')}
            title='Sprint With Us'
            description={
              (<div>
                <div>Supply an Agile Team to work with a government product manager in a modern DevOps environment.</div>
                <div className='mt-3'>Opportunities up to {swu.FORMATTED_MAX_BUDGET}.</div>
              </div>)
            }
            links={[
              {
                button: true,
                dest: routeDest(adt('learnMoreSWU', null)),
                children: [('Learn More')],
                color: 'primary',
                outline: true,
                symbol_: rightPlacement(iconLinkSymbol('arrow-right'))
              }
            ]}
          />
        </Row>
      </Container>
    </div>
  );
};

const AppInfo: View = () => {
  return (
    <Container className='mt-7 mt-md-9'>
      <Row className='justify-content-center text-center'>
        <Col xs='12' md='8'>
          <h2 className='mb-0'>
            Join a community of developers, entrepreneurs and public service innovators who are making public services better.
          </h2>
        </Col>
      </Row>
      <Row>
        <Col xs='12' className='d-flex align-items-center justify-content-center'>
          <div className='px-1 pt-1 mt-4 bg-c-landing-small-underline' style={{ width: '5rem' }} />
        </Col>
      </Row>
    </Container>
  );
};

const VendorRoleInfo: View = () => {
  return (
    <Container className='mt-7 mt-md-9'>
      <Row>
        <Col xs='12' className='order-2 order-md-1'>
          <h6 className='text-c-landing-role-heading'><Icon name='store' className='mr-2 mb-1' />Vendors</h6>
        </Col>
        <Col xs='12' md='6' className='order-3 order-md-2'>
          <h4 className='mb-3'>Collaborate with the {COPY.region.name.short} Public Sector to build innovative digital products.</h4>
          <BulletPoint
            className='ml-3 my-4'
            icon='star-exclamation'
            iconColor='c-landing-role-icon'
            header='Submit proposals to open opportunities'
            subText='Save a draft version of your proposal until you are ready to submit it.' />
          <BulletPoint
            className='ml-3 my-4'
            icon='star-exclamation'
            iconColor='c-landing-role-icon'
            header='View and export your submitted proposals'
            subText='View all outstanding and past submissions, where you can see your scores and rankings once submitted.' />
          <BulletPoint
            className='ml-3 my-4'
            icon='star-exclamation'
            iconColor='c-landing-role-icon'
            header='Build your team'
            subText='Add team members to your organization.' />
        </Col>
        <Col xs='12' md='6' className='order-1 order-md-3 mb-5 mb-md-0'>
          <img style={{ maxWidth: IMG_MAX_WIDTH }} className='w-100 mx-auto d-block' src={prefixPath('/images/illustrations/collaboration_work.svg')} />
        </Col>
      </Row>
    </Container>
  );
};

const GovRoleInfo: View = () => {
  return (
    <Container className='my-7 my-md-9'>
      <Row>
        <Col xs='12' md='6' className='mb-5 mb-md-0'>
          <img style={{ maxWidth: IMG_MAX_WIDTH }} className='w-100 mx-auto d-block' src={prefixPath('/images/illustrations/consultation.svg')} />
        </Col>
        <Col cs='12' md='6'>
          <Row>
            <Col xs='12'>
              <h6 className='text-c-landing-role-heading'><Icon name='government' className='mr-2 pb-1' />Public Service Employees</h6>
            </Col>
            <Col xs='12'>
              <h4 className='mb-3'>Connect with talented developers to build your digital products.</h4>
              <BulletPoint
                className='ml-3 my-4'
                icon='star-exclamation'
                iconColor='c-landing-role-icon'
                header='Post a new opportunity'
                subText='Select the program that suits your unique needs, post your opportunity and wait for the proposals to come in.' />
              <BulletPoint
                className='ml-3 my-4'
                icon='star-exclamation'
                iconColor='c-landing-role-icon'
                header='View and manage your posted opportunities'
                subText='View a complete history of your posted opportunities, where you can review and evaluate all received proposals, award the opportunity to the successful proponent, and more.' />
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

const TestimonialsView: View = () => {
  return (
    <div className='bg-info py-7'>
      <Container>
        <Row>
          <Col xs='12' md='6'>
            <Row>
              <Col xs='12' className='d-flex justify-content-center pb-5'><Icon name='quote' color='primary' width={2.875} height={2.875} /></Col>
              <Col xs='10' className='d-flex mx-auto pb-5'><h6 className='text-white text-center' style={{lineHeight: '1.5rem'}}>“We quickly found a qualified developer, worked collaboratively in the open, and got a great final product.”</h6></Col>
              <Col xs='12' className='d-flex flex-column justify-content-center'>
                <img className='mx-auto d-block rounded-circle' src={prefixPath('/images/andy.jpg')} width='40px' height='40px' />
                <div className='text-c-landing-testimonial-source font-size-small text-center'>Andy, Environmental Analyst</div>
                <div className='text-white small text-center'>Province of B.C.</div>
              </Col>
            </Row>
          </Col>
          <Col xs='12' md='6'>
            <Row>
              <Col xs='12' className='d-none d-md-flex justify-content-center pb-5'><Icon name='quote' color='primary' width={2.875} height={2.875} /></Col>
              <Col xs='10' className='d-flex mx-auto pt-7 pt-md-0 pb-5'><h6 className='text-white text-center' style={{lineHeight: '1.5rem'}}>“I think this platform could be a game changer for matching government agencies with the best talent in this province.”</h6></Col>
              <Col xs='12' className='d-flex flex-column justify-content-center'>
                <img className='mx-auto d-block rounded-circle' src={prefixPath('/images/wayne.jpg')} width='40px' height='40px' />
                <div className='text-c-landing-testimonial-source font-size-small text-center'>Wayne, Developer</div>
                <div className='text-white small text-center'>Vancouver</div>
              </Col>
            </Row>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

const BottomView: View = () => {
  return (
    <Container className='my-7'>
      <Row className='justify-content-center text-center'>
        <Col xs='12' md='8'>
          <h2>Check out the latest opportunities on the Digital Marketplace</h2>
        </Col>
      </Row>
      <Row className='mt-5'>
        <Col xs='12' className='d-flex justify-content-center'>
          <Link
            button
            symbol_={leftPlacement(iconLinkSymbol('search'))}
            dest={routeDest(adt('opportunities', null))}
            color='primary'>
            Browse Opportunities
          </Link>
        </Col>
      </Row>
    </Container>
  );
};

const view: ComponentView<State, Msg> = props => {
  return (
    <div>
      <Hero {...props} />
      <Stats {...props} />
      <Programs />
      <AppInfo />
      <VendorRoleInfo />
      <GovRoleInfo />
      <TestimonialsView />
      <BottomView />
    </div>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  fullWidth: true,
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata('Welcome');
  }
};
