import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, PageComponent, PageInit, Update } from 'front-end/lib/framework';
import Link from 'front-end/lib/views/link';
import makeVerticalBar from 'front-end/lib/views/vertical-bar/menu';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { ADT } from 'shared/lib/types';

export interface State {
  empty: true;
}

export type Msg = GlobalComponentMsg<ADT<'noop'>, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => ({
  empty: true,
  hello: ''
});

const update: Update<State, Msg> = ({ state, msg }) => {
  return [state];
};

const view: ComponentView<State, Msg> = ({ state }) => {
  return (
    <div>
      <Row className='mb-3 pb-3'>
        <Col xs='12'>
          Hello, world.
        </Col>
      </Row>
    </div>
  );
};

// const menuLinks: Link<Params>[] = [ <Link>LinkTitle!</Link> ]

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  viewVerticalBar: makeVerticalBar<State, Msg>({
    links: [
      <Link>hi!</Link>
    ]
  }),
  getMetadata() {
    return makePageMetadata('Hello, World');
  },
  getBreadcrumbs() {
    return [
      { text: 'One' },
      { text: 'Two' },
      { text: 'Three' }
    ];
  }
};
