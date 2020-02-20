import { makePageMetadata } from 'front-end/lib';
import * as api from 'front-end/lib/http/api';
import { CWUOpportunitySlim } from 'shared/lib/resources/opportunity/code-with-us';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, PageComponent, PageInit, Update } from 'front-end/lib/framework';
import Link, { iconLinkSymbol, leftPlacement, routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { adt, ADT } from 'shared/lib/types';

export interface State {
  opportunities: CWUOpportunitySlim[];
}

export type Msg = GlobalComponentMsg<ADT<'noop'>, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => {
  let result = { opportunities: [] as CWUOpportunitySlim[] }
  const apiRequest = await api.opportunities.cwu.readMany();
  if (apiRequest.tag === 'valid') {
    result.opportunities = apiRequest.value;
  }
  return result;
};

const update: Update<State, Msg> = ({ state, msg }) => {
  return [state];
};

const view: ComponentView<State, Msg> = ({ state }) => {
  return (
    <Row>
      <Col xs='12'>
        {
          state.opportunities.map( o => {
            return (
              <div>
                <Link
                  dest={routeDest(adt('opportunityCWUEdit', {opportunityId: o.id}))}
                >
                  {o.title}
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
            children: 'Create CodeWithUs Opportunity',
            button: true,
            color: 'primary' as const,
            symbol_: leftPlacement(iconLinkSymbol('plus-circle')),
            dest: routeDest(adt('opportunityCWUCreate', null))
          }
        ]
      }]
    });
  }
};
