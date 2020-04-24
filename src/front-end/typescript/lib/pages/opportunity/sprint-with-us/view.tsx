import { getContextualActionsValid, getMetadataValid, makePageMetadata, updateValid, viewValid } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, PageComponent, PageInit, replaceRoute, Update } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import { iconLinkSymbol, leftPlacement, routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { getSWUOpportunityViewsCounterName } from 'shared/lib/resources/counter';
import { DEFAULT_OPPORTUNITY_TITLE, SWUOpportunity } from 'shared/lib/resources/opportunity/sprint-with-us';
import { User, UserType } from 'shared/lib/resources/user';
import { adt, ADT, Id } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

interface ValidState {
  opportunity: SWUOpportunity;
  viewerUser?: User;
}

export type State = Validation<Immutable<ValidState>, null>;

export type Msg = GlobalComponentMsg<ADT<'noop'>, Route>;

export interface RouteParams {
  opportunityId: Id;
}

const init: PageInit<RouteParams, SharedState, State, Msg> = async ({ dispatch, routeParams, shared, routePath }) => {
  const oppR = await api.opportunities.swu.readOne(routeParams.opportunityId);
  if (!api.isValid(oppR)) {
    dispatch(replaceRoute(adt('notFound', { path: routePath }) as Route));
    return invalid(null);
  }
  await api.counters.update(getSWUOpportunityViewsCounterName(routeParams.opportunityId), null);
  return valid(immutable({
    viewerUser: shared.session?.user,
    opportunity: oppR.value
  }));
};

const update: Update<State, Msg> = updateValid(({ state, msg }) => {
  return [state];
});

const view: ComponentView<State, Msg> = viewValid(({ state }) => {
  return (
    <Row>
      <Col xs='12'>
        Opportunities/View
      </Col>
    </Row>
  );
});

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  getMetadata: getMetadataValid(state => {
    return makePageMetadata(state.opportunity.title || DEFAULT_OPPORTUNITY_TITLE);
  }, makePageMetadata('Opportunity')),
  getContextualActions: getContextualActionsValid(({ state }) => {
    const viewerUser = state.viewerUser;
    if (!viewerUser) { return null; }
    switch (viewerUser.type) {
      case UserType.Admin:
        return adt('links', [
          {
            children: 'Edit Opportunity',
            symbol_: leftPlacement(iconLinkSymbol('edit')),
            button: true,
            color: 'primary',
            dest: routeDest(adt('opportunitySWUEdit', {
              opportunityId: state.opportunity.id
            }))
          }
        ]);
      case UserType.Government:
        if (state.opportunity.createdBy?.id === viewerUser.id) {
          return adt('links', [
            {
              children: 'Edit Opportunity',
              symbol_: leftPlacement(iconLinkSymbol('edit')),
              button: true,
              color: 'primary',
              dest: routeDest(adt('opportunitySWUEdit', {
                opportunityId: state.opportunity.id
              }))
            }
          ]);
        } else {
          return null;
        }
      case UserType.Vendor:
        return adt('links', [
          {
            children: 'Start Proposal',
            symbol_: leftPlacement(iconLinkSymbol('comment-dollar')),
            button: true,
            color: 'primary',
            dest: routeDest(adt('proposalSWUCreate', {
              opportunityId: state.opportunity.id
            }))
          }
        ]);
    }
  })
};
