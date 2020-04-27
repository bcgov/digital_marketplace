import { makePageMetadata, prefixPath } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, newRoute, PageComponent, PageInit, Update } from 'front-end/lib/framework';
import { TextColor } from 'front-end/lib/types';
import { routeDest } from 'front-end/lib/views/link';
import ProgramCard from 'front-end/lib/views/program-card';
import React from 'react';
import { Row } from 'reactstrap';
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

const view: ComponentView<State, Msg> = () => {
  return (
    <Row>
      <ProgramCard
        img={prefixPath('/images/illustrations/code_with_us.svg')}
        title='Code With Us'
        className='mb-4 mb-md-0'
        description={(<span>Use a <em>Code With Us</em> opportunity to pay a fixed price of up to $70,000 for the delivery of code that meets your acceptance criteria.</span>)}
        wideLinks
        links={[
          {
            button: true,
            dest: routeDest(adt('content', 'code-with-us-opportunity-guide')),
            children: ['Read Guide'],
            color: 'info' as TextColor,
            outline: true
          },
          {
            button: true,
            dest: routeDest(adt('opportunityCWUCreate', null)),
            children: ['Get Started'],
            color: 'primary' as TextColor
          }
        ]}
      />
      <ProgramCard
        img={prefixPath('/images/illustrations/sprint_with_us.svg')}
        title='Sprint With Us'
        description={(<span>Use a <em>Sprint With Us</em> opportunity to procure an Agile product development team for your digital service at a variable cost of up to $2,000,000.</span>)}
        wideLinks
        links={[
          {
            button: true,
            dest: routeDest(adt('content', 'sprint-with-us-opportunity-guide')),
            children: ['Read Guide'],
            color: 'info' as TextColor,
            outline: true
          },
          {
            button: true,
            dest: routeDest(adt('opportunitySWUCreate', null)),
            children: ['Get Started'],
            color: 'primary' as TextColor
          }
        ]}
      />
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
