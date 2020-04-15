import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, PageComponent, PageInit, Update } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import Link, { iconLinkSymbol, leftPlacement, routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { CWUOpportunitySlim, DEFAULT_OPPORTUNITY_TITLE } from 'shared/lib/resources/opportunity/code-with-us';
import { SWUOpportunitySlim } from 'shared/lib/resources/opportunity/sprint-with-us';
import { isAdmin, User } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';

export interface State {
  cwu: CWUOpportunitySlim[];
  swu: SWUOpportunitySlim[];
  viewerUser?: User;
}

export type Msg = GlobalComponentMsg<ADT<'noop'>, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = async ({ shared }) => {
  let cwu: CWUOpportunitySlim[] = [];
  let swu: SWUOpportunitySlim[] = [];
  const cwuR = await api.opportunities.cwu.readMany();
  const swuR = await api.opportunities.swu.readMany();
  if (api.isValid(cwuR) && api.isValid(swuR)) {
    cwu = cwuR.value;
    swu = swuR.value;
  }
  return {
    cwu,
    swu,
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
        <h2>CWU</h2>
        {
          state.cwu.map(o => {
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
        <h2 className='mt-5'>SWU</h2>
        {
          state.swu.map(o => {
            const route: Route = state.viewerUser && isAdmin(state.viewerUser)
              ? adt('opportunitySWUEdit', { opportunityId: o.id })
              : adt('opportunitySWUView', { opportunityId: o.id });
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
