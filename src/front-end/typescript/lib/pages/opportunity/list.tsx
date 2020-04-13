import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, PageComponent, PageInit, Update } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import Link, { iconLinkSymbol, leftPlacement, routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { CWUOpportunitySlim, DEFAULT_OPPORTUNITY_TITLE } from 'shared/lib/resources/opportunity/code-with-us';
import { isAdmin, User } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';

export interface State {
  opportunities: CWUOpportunitySlim[];
  viewerUser?: User;
}

export type Msg = GlobalComponentMsg<ADT<'noop'>, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = async ({ shared }) => {
  let opportunities: CWUOpportunitySlim[] = [];
  const apiResult = await api.opportunities.cwu.readMany();
  if (apiResult.tag === 'valid') {
    opportunities = apiResult.value;
  }
  return {
    opportunities,
    viewerUser: shared.session?.user
  };
};

const update: Update<State, Msg> = ({ state, msg }) => {
  return [state];
};

const view: ComponentView<State, Msg> = ({ state }) => {
  return (
    <Row>
      <Col xs='12'>
        {
          state.opportunities.map(o => {
            const route: Route = state.viewerUser && isAdmin(state.viewerUser)
              ? adt('opportunityCWUEdit', { opportunityId: o.id })
              : adt('opportunityCWUView', { opportunityId: o.id });
            return (
              <div>
                <Link dest={routeDest(route)}>
                  {o.status}: {o.title || DEFAULT_OPPORTUNITY_TITLE}
                </Link>
              </div>
            );
          })
        }
      </Col>
    </Row>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata('Opportunities');
  },
  getContextualActions() {
    return adt('dropdown', {
      text: 'Actions',
      linkGroups: [{
        links: [
          {
            children: 'Create Code With Us Opportunity',
            button: true,
            color: 'primary' as const,
            symbol_: leftPlacement(iconLinkSymbol('plus-circle')),
            dest: routeDest(adt('opportunityCWUCreate', null))
          },
          {
            children: 'Create Sprint With Us Opportunity',
            button: true,
            color: 'primary' as const,
            symbol_: leftPlacement(iconLinkSymbol('plus-circle')),
            dest: routeDest(adt('opportunitySWUCreate', null))
          }
        ]
      }]
    });
  }
};
