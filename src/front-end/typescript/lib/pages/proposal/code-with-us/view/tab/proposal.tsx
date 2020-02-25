import { EMPTY_STRING } from 'front-end/config';
import { getContextualActionsValid, updateValid, viewValid } from 'front-end/lib';
import { Route } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, Update, updateComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Tab from 'front-end/lib/pages/proposal/code-with-us/edit/tab';
import * as Form from 'front-end/lib/pages/proposal/code-with-us/lib/components/form';
import ViewTabHeader from 'front-end/lib/pages/proposal/code-with-us/lib/views/view-tab-header';
import ReportCardList, { ReportCard } from 'front-end/lib/views/report-card-list';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { CWUProposalStatus } from 'shared/lib/resources/proposal/code-with-us';
import { adt, ADT } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

interface ValidState extends Tab.Params {
  form: Immutable<Form.State>;
}

export type State = Validation<Immutable<ValidState>, null>;

export type InnerMsg
  = ADT<'form', Form.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

const init: Init<Tab.Params, State> = async params => {
  // Fetch opportunity.
  const opportunityResult = await api.opportunities.cwu.readOne(params.proposal.opportunity.id);
  // Redirect to 404 page if there is a server error.
  if (!api.isValid(opportunityResult)) {
    return invalid(null);
  }
  return valid(immutable({
    ...params,
    form: immutable(await Form.init({
      opportunity: opportunityResult.value,
      affiliations: [],
      proposal: params.proposal
    }))
  }));
};

const update: Update<State, Msg> = updateValid(({ state, msg }) => {
  switch (msg.tag) {
    case 'form':
      return updateComponentChild({
        state,
        childStatePath: ['form'],
        childUpdate: Form.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('form', value)
      });
    default:
      return [state];
  }
});

const Reporting: ComponentView<ValidState, Msg> = ({ state }) => {
  const proposal = state.proposal;
  if (proposal.status === CWUProposalStatus.UnderReview || proposal.status === CWUProposalStatus.Disqualified || proposal.status === CWUProposalStatus.Withdrawn) { return null; }
  const reportCards: ReportCard[] = [
    {
      icon: 'star-full',
      iconColor: 'yellow',
      name: 'Total Score',
      value: proposal.score ? `${proposal.score}%` : EMPTY_STRING
    },
    {
      icon: 'trophy',
      iconColor: 'yellow',
      name: 'Ranking',
      value: proposal.rank ? String(proposal.rank) : EMPTY_STRING
    }
  ];
  return (
    <Row className='mt-5'>
      <Col xs='12'>
        <ReportCardList reportCards={reportCards} />
      </Col>
    </Row>
  );
};

const view: ComponentView<State, Msg> = viewValid(props => {
  const { state, dispatch } = props;
  return (
    <div>
      <ViewTabHeader proposal={state.proposal} viewerUser={state.viewerUser} />
      <Reporting {...props} />
      <Row className='mt-5'>
        <Col xs='12'>
          <Form.view
            disabled
            state={state.form}
            dispatch={mapComponentDispatch(dispatch, v => adt('form' as const, v))} />
        </Col>
      </Row>
    </div>
  );
});

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view,
  getContextualActions: getContextualActionsValid(({ state, dispatch }) => {
    const proposal = state.proposal;
    const propStatus = proposal.status;
    switch (propStatus) {
      case CWUProposalStatus.UnderReview:
        // Enter Score, Disqualify
      case CWUProposalStatus.Evaluated:
        // Award, Edit Score, Disqualify
      case CWUProposalStatus.NotAwarded:
        // Award
      default:
        return null;
    }
  })
};
