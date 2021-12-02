import { getMetadataValid, makePageMetadata, TITLE_SEPARATOR, viewValid } from 'front-end/typescript/lib';
import { isUserType } from 'front-end/typescript/lib/access-control';
import { Route, SharedState } from 'front-end/typescript/lib/app/types';
import { ComponentView, GlobalComponentMsg, immutable, Immutable, PageComponent, PageInit, replaceRoute, Update } from 'front-end/typescript/lib/framework';
import * as api from 'front-end/typescript/lib/http/api';
import { cwuOpportunityStatusToColor, cwuOpportunityStatusToTitleCase } from 'front-end/typescript/lib/pages/opportunity/code-with-us/lib';
import ExportedProposal from 'front-end/typescript/lib/pages/proposal/code-with-us/lib/views/exported-proposal';
import Badge from 'front-end/typescript/lib/views/badge';
import DescriptionList from 'front-end/typescript/lib/views/description-list';
import { iconLinkSymbol, leftPlacement } from 'front-end/typescript/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { formatDateAndTime } from 'shared/lib';
import { CWUOpportunity } from 'shared/lib/resources/opportunity/code-with-us';
import { CWUProposal } from 'shared/lib/resources/proposal/code-with-us';
import { User, UserType } from 'shared/lib/resources/user';
import { adt, ADT, Id } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

interface ValidState {
  opportunity: CWUOpportunity;
  proposals: CWUProposal[];
  viewerUser: User;
  exportedAt: Date;
}

export type State = Validation<Immutable<ValidState>, null>;

export type Msg = GlobalComponentMsg<ADT<'noop'>, Route>;

export interface RouteParams {
  opportunityId: Id;
}

const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType({
  userType: [UserType.Admin, UserType.Government],
  async success({ routePath, routeParams, shared, dispatch }) {
    const { opportunityId } = routeParams;
    const oppResult = await api.opportunities.cwu.readOne(opportunityId);
    const propSlimResult = await api.proposals.cwu.readMany(opportunityId);
    if (!api.isValid(oppResult) || !api.isValid(propSlimResult)) {
      dispatch(replaceRoute(adt('notFound' as const, { path: routePath })));
      return invalid(null);
    }
    const propResults = await Promise.all(propSlimResult.value.map(({ id }) => api.proposals.cwu.readOne(opportunityId, id)));
    const proposals: CWUProposal[] = [];
    for (const proposal of propResults) {
      if (!api.isValid(proposal)) {
        dispatch(replaceRoute(adt('notFound' as const, { path: routePath })));
        return invalid(null);
      }
      proposals.push(proposal.value);
    }
    return valid(immutable({
      opportunity: oppResult.value,
      proposals,
      viewerUser: shared.sessionUser,
      exportedAt: new Date()
    }));
  },
  async fail({ routePath, dispatch }) {
    dispatch(replaceRoute(adt('notFound' as const, { path: routePath })));
    return invalid(null);
  }
});

const update: Update<State, Msg> = ({ state, msg }) => {
  return [state];
};

const view: ComponentView<State, Msg> = viewValid(({ state }) => {
  const opportunity = state.opportunity;
  const proposals = state.proposals;
  return (
    <div>
      <Row>
        <Col xs='12'>
          <h1 className='mb-4'>{opportunity.title}</h1>
          <DescriptionList
            items={[
              { name: 'ID', children: opportunity.id },
              { name: 'Type', children: 'Code With Us' },
              {
                name: 'Status',
                children: (<Badge text={cwuOpportunityStatusToTitleCase(opportunity.status)} color={cwuOpportunityStatusToColor(opportunity.status)} />)
              },
              { name: 'Exported By', children: state.viewerUser.name },
              { name: 'Exported On', children: formatDateAndTime(state.exportedAt) }
            ]}
          />
        </Col>
      </Row>
      {proposals.map((p, i) => (
        <ExportedProposal
          key={`cwu-proposal-export-${i}`}
          className='mt-5 pt-5 border-top'
          proposal={p} />
      ))}
    </div>
  );
});

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  getMetadata: getMetadataValid(state => {
    return makePageMetadata(`${state.opportunity.title} ${TITLE_SEPARATOR} Exported Code With Us Proposals`);
  }, makePageMetadata('Exported Code With Us Proposals')),
  getContextualActions({ state, dispatch }) {
    return adt('links', [
      {
        children: 'Print',
        symbol_: leftPlacement(iconLinkSymbol('print')),
        color: 'primary',
        button: true,
        onClick: () => window.print()
      }
    ]);
  }
};
