import { makePageMetadata, prefixPath } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, newRoute, PageComponent, PageInit, Update, View, ViewElement } from 'front-end/lib/framework';
import { ContentId } from 'front-end/lib/pages/content';
import Link, { routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { UserType } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';

export interface State {
  empty: true;
}

type InnerMsg
  = ADT<'noop'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType({
  userType: [UserType.Government, UserType.Admin],
  async success() {
    return { empty: true };
  },
  async fail({ dispatch, routePath, shared }) {
    if (!shared.session) {
      dispatch(newRoute(adt('signIn' as const, {
        redirectOnSuccess: routePath
      })));
    } else {
      dispatch(newRoute(adt('notFound' as const, {
        path: routePath
      })));
    }
    return { empty: true };
  }
});

const update: Update<State, Msg> = ({ state, msg }) => {
  return [state];
};

interface CardProps {
  img: string;
  title: string;
  description: ViewElement;
  guide: ContentId;
  getStarted: Route;
  className?: string;
}

const Card: View<CardProps> = ({ img, title, description, guide, getStarted, className }) => {
  return (
    <Col xs='12' md='6' className={className}>
      <div className='d-flex flex-column align-items-center bg-white rounded-lg border p-4 p-md-5 text-center h-100'>
        <img src={img} className='w-100' style={{ maxHeight: '200px' }} alt={`${title} Image`} />
        <h1 className='my-4'>{title}</h1>
        <p className='mb-4 mb-md-5'>{description}</p>
        <Link
          button
          outline
          color='info'
          className='mt-auto mb-3 align-self-stretch justify-content-center'
          dest={routeDest(adt('content', guide))}>
          Read Guide
        </Link>
        <Link
          button
          color='primary'
          className='align-self-stretch justify-content-center'
          dest={routeDest(getStarted)}>
          Get Started
        </Link>
      </div>
    </Col>
  );
};

const view: ComponentView<State, Msg> = () => {
  return (
    <Row>
      <Card
        className='mb-4 mb-md-0'
        img={prefixPath('/images/illustrations/code_with_us.svg')}
        title='Code With Us'
        description={(<span>Use a <em>Code With Us</em> opportunity to pay a fixed price of up to $70,000 for the delivery of code that meets your acceptance criteria.</span>)}
        guide='code-with-us-opportunity-guide'
        getStarted={adt('opportunityCWUCreate', null)} />
      <Card
        img={prefixPath('/images/illustrations/sprint_with_us.svg')}
        title='Sprint With Us'
        description={(<span>Use a <em>Sprint With Us</em> opportunity to procure an Agile product development team for your digital service at a variable cost of up to $2,000,000.</span>)}
        guide='sprint-with-us-opportunity-guide'
        getStarted={adt('opportunitySWUCreate', null)} />
    </Row>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  backgroundColor: 'blue-light-alt-2',
  verticallyCentered: true,
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata('Create an Opportunity');
  }
};
