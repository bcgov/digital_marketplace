import { Route } from 'front-end/lib/app/types';
import { View } from 'front-end/lib/framework';
import { ComponentView, GlobalComponentMsg, Init, Update } from 'front-end/lib/framework';
import * as Tab from 'front-end/lib/pages/opportunity/code-with-us/edit/tab';
import EditTabHeader from 'front-end/lib/pages/opportunity/code-with-us/lib/views/edit-tab-header';
import ReportCardList, { ReportCard } from 'front-end/lib/views/report-card-list';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { CWUOpportunity } from 'shared/lib/resources/opportunity/code-with-us';
import { ADT } from 'shared/lib/types';

export type State = Tab.Params;

export type InnerMsg
  = ADT<'noop'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

const init: Init<Tab.Params, State> = async params => {
  return params;
};

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    default:
      return [state];
  }
};

const reportCards = (opportunity: CWUOpportunity): ReportCard[]  => {
  const proposalsValue = opportunity.reporting ? opportunity.reporting.numProposals.toString() : '- -';
  const winningScoreValue = '- -'; // TODO(Jesse): @successful-proponent
  const avgScoreValue = '- -';
  return [
    {
      icon: 'comment-dollar',
      name: 'Proposals',
      value: proposalsValue
    },
    {
      icon: 'star-full',
      iconColor: 'yellow',
      name: 'Winning Score',
      value: winningScoreValue
    },
    {
      icon: 'star-half',
      iconColor: 'yellow',
      name: 'Avg. Score',
      value: avgScoreValue
    }
  ];
};

type Props = {
  state: State;
};

const WaitForOpportunityToClose: View<Props> = ({ state }) => {
  return (<div>Proposals will be displayed here once the opportunity has closed.</div>);
};

const view: ComponentView<State, Msg> = ({ state }) => {
  const opportunity = state.opportunity;
  const cards = reportCards(opportunity);

  let ActiveView = WaitForOpportunityToClose({state});

  switch (opportunity.status) {
    case 'DRAFT':
      ActiveView = WaitForOpportunityToClose({state});
      break;
  }

  return (
    <div>
      <EditTabHeader opportunity={state.opportunity} viewerUser={state.viewerUser} />
      <Row>
        <Col className='py-5' xs='12'>
          <ReportCardList reportCards={cards} />
        </Col>
      </Row>
      <Row>
        <Col className='border-top py-5' xs='12'>
          <h4 className='pb-3'>Proposals</h4>
          { ActiveView }
        </Col>
      </Row>
    </div>
  );
};

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view
};
