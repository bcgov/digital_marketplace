import { getMetadataValid, makePageMetadata, TITLE_SEPARATOR, viewValid } from 'front-end/lib';
import { isSignedIn } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, immutable, Immutable, PageComponent, PageInit, replaceRoute, Update } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import ExportedProposal from 'front-end/lib/pages/proposal/code-with-us/lib/views/exported-proposal';
import { iconLinkSymbol, leftPlacement } from 'front-end/lib/views/link';
import React from 'react';
import { CWUProposal, getCWUProponentName } from 'shared/lib/resources/proposal/code-with-us';
import { User } from 'shared/lib/resources/user';
import { adt, ADT, Id } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

interface ValidState {
  proposal: CWUProposal;
  viewerUser: User;
  exportedAt: Date;
}

export type State = Validation<Immutable<ValidState>, null>;

export type Msg = GlobalComponentMsg<ADT<'noop'>, Route>;

export interface RouteParams {
  opportunityId: Id;
  proposalId: Id;
}

const init: PageInit<RouteParams, SharedState, State, Msg> = isSignedIn({
  async success({ routePath, routeParams, shared, dispatch }) {
    const { proposalId, opportunityId } = routeParams;
    const result = await api.proposals.cwu.readOne(opportunityId, proposalId);
    if (!api.isValid(result)) {
      dispatch(replaceRoute(adt('notFound' as const, { path: routePath })));
      return invalid(null);
    }
    return valid(immutable({
      proposal: result.value,
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
  return (<ExportedProposal
    showOpportunityInformation
    exportedAt={state.exportedAt}
    exportedBy={state.viewerUser}
    proposal={state.proposal} />);
});

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  getMetadata: getMetadataValid(state => {
    return makePageMetadata(`${getCWUProponentName(state.proposal)} ${TITLE_SEPARATOR} ${state.proposal.opportunity.title} ${TITLE_SEPARATOR} Exported Code With Us Proposal`);
  }, makePageMetadata('Exported Code With Us Proposal')),
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
