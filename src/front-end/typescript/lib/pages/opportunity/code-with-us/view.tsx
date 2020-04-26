import { getContextualActionsValid, getMetadataValid, makePageMetadata, updateValid, viewValid } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { AddendaList } from 'front-end/lib/components/addenda';
import { AttachmentList } from 'front-end/lib/components/attachments';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, PageComponent, PageInit, replaceRoute, Update, View } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import GotQuestions from 'front-end/lib/views/got-questions';
import Icon, { AvailableIcons } from 'front-end/lib/views/icon';
import Link, { iconLinkSymbol, leftPlacement, routeDest } from 'front-end/lib/views/link';
import Markdown from 'front-end/lib/views/markdown';
import Skills from 'front-end/lib/views/skills';
import TabbedNav, { Tab } from 'front-end/lib/views/tabbed-nav';
import React from 'react';
import { Col, Container, Row } from 'reactstrap';
import { getCWUOpportunityViewsCounterName } from 'shared/lib/resources/counter';
import { CWUOpportunity, DEFAULT_OPPORTUNITY_TITLE } from 'shared/lib/resources/opportunity/code-with-us';
import { CWUProposalSlim } from 'shared/lib/resources/proposal/code-with-us';
import { isVendor, User, UserType } from 'shared/lib/resources/user';
import { adt, ADT, Id } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

type InfoTab
  = 'details'
  | 'attachments'
  | 'addenda';

interface ValidState {
  opportunity: CWUOpportunity;
  existingProposalId?: Id;
  viewerUser?: User;
  activeInfoTab: InfoTab;
  routePath: string;
}

export type State = Validation<Immutable<ValidState>, null>;

type InnerMsg
  = ADT<'toggleWatch'>
  | ADT<'setActiveInfoTab', InfoTab>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export interface RouteParams {
  opportunityId: Id;
}

const init: PageInit<RouteParams, SharedState, State, Msg> = async ({ dispatch, routeParams, shared, routePath }) => {
  const { opportunityId } = routeParams;
  const viewerUser = shared.session?.user;
  const oppR = await api.opportunities.cwu.readOne(opportunityId);
  if (!api.isValid(oppR)) {
    dispatch(replaceRoute(adt('notFound', { path: routePath }) as Route));
    return invalid(null);
  }
  await api.counters.update(getCWUOpportunityViewsCounterName(opportunityId), null);
  let existingProposal: CWUProposalSlim | undefined;
  if (viewerUser && isVendor(viewerUser)) {
    existingProposal = await api.proposals.cwu.getExistingProposalForOpportunity(opportunityId);
  }
  return valid(immutable({
    viewerUser,
    opportunity: oppR.value,
    existingProposalId: existingProposal?.id,
    activeInfoTab: 'details',
    routePath
  }));
};

const update: Update<State, Msg> = updateValid(({ state, msg }) => {
  switch (msg.tag) {
    case 'setActiveInfoTab':
      return [state.set('activeInfoTab', msg.value)];
    case 'toggleWatch':
    default:
      return [state];
  }
});

const Header: ComponentView<ValidState, Msg> = props => {
  return (
    <div>
      <Container>
        <Row>
          <Col xs='12'>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

const InfoDetailsHeading: View<{ icon: AvailableIcons; text: string; }> = ({ icon, text }) => {
  return (
    <div className='d-flex align-items-start flex-nowrap mb-3'>
      <Icon name={icon} width={1.5} height={1.5} className='flex-shrink-0' style={{ marginTop: '0.3rem' }} />
      <h3 className='mb-0 ml-2'>{text}</h3>
    </div>
  );
};

const InfoDetails: ComponentView<ValidState, Msg> = ({ state }) => {
  const opp = state.opportunity;
  return (
    <Row>
      <Col xs='12'>
        <h2 className='mb-0'>Details</h2>
      </Col>
      <Col xs='12' className='mt-4'>
        <InfoDetailsHeading icon='toolbox-outline' text='Required Skills' />
        <p>To submit a proposal for this opportunity, you must possess the following skills:</p>
        <Skills skills={opp.skills} />
      </Col>
      <Col xs='12' className='mt-4'>
        <InfoDetailsHeading icon='info-circle-outline' text='Description' />
        <Markdown source={opp.description} smallerHeadings openLinksInNewTabs />
      </Col>
      {opp.submissionInfo
        ? (<Col xs='12' className='mt-4'>
            <InfoDetailsHeading icon='laptop-code-outline' text='Project Submission Information' />
            <p className='mb-0'>{opp.submissionInfo}</p>
          </Col>)
        : null}
      {opp.remoteOk && opp.remoteDesc
        ? (<Col xs='12' className='mt-4'>
            <InfoDetailsHeading icon='laptop-outline' text='Remote Work Options' />
            <p className='mb-0' style={{ whiteSpace: 'pre-line' }}>{opp.remoteDesc}</p>
          </Col>)
        : null}
    </Row>
  );
};

const InfoAttachments: ComponentView<ValidState, Msg> = ({ state }) => {
  return (
    <Row>
      <Col xs='12'>
        <h2 className='mb-0'>Attachments</h2>
      </Col>
      <Col xs='12' className='mt-4'>
        <AttachmentList files={state.opportunity.attachments} />
      </Col>
    </Row>
  );
};

const InfoAddenda: ComponentView<ValidState, Msg> = ({ state }) => {
  return (
    <Row>
      <Col xs='12'>
        <h2 className='mb-0'>Addenda</h2>
      </Col>
      <Col xs='12' className='mt-4'>
        <AddendaList addenda={state.opportunity.addenda} />
      </Col>
    </Row>
  );
};

const InfoTabs: ComponentView<ValidState, Msg> = ({ state, dispatch }) => {
  const activeTab = state.activeInfoTab;
  const opp = state.opportunity;
  const hasAttachments = opp.attachments.length;
  const hasAddenda = opp.addenda.length;
  if (!hasAttachments && !hasAddenda) { return null; }
  const getTabInfo = (tab: InfoTab) => ({
    active: activeTab === tab,
    onClick: () => dispatch(adt('setActiveInfoTab', tab))
  });
  const tabs: Tab[] = [{
    ...getTabInfo('details'),
    text: 'Details'
  }];
  if (hasAttachments) {
    tabs.push({
      ...getTabInfo('attachments'),
      text: 'Attachments',
      count: opp.attachments.length
    });
  }
  if (hasAddenda) {
    tabs.push({
      ...getTabInfo('addenda'),
      text: 'Addenda',
      count: opp.addenda.length
    });
  }
  return (
    <Row className='mb-5'>
      <Col xs='12'>
        <TabbedNav tabs={tabs} />
      </Col>
    </Row>
  );
};

const Info: ComponentView<ValidState, Msg> = props => {
  const { state } = props;
  const activeTab = (() => {
    switch (state.activeInfoTab) {
      case 'details':     return (<InfoDetails {...props} />);
      case 'attachments': return (<InfoAttachments {...props} />);
      case 'addenda':     return (<InfoAddenda {...props} />);
    }
  })();
  return (
    <div>
      <Container>
        <InfoTabs {...props} />
        <Row>
          <Col xs='12' md='8'>
            {activeTab}
          </Col>
          <Col xs='12' md='4' lg={{ offset: 1, size: 3 }} className='mt-5 mt-md-0'>
            <GotQuestions />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

const AcceptanceCriteria: ComponentView<ValidState, Msg> = ({ state }) => {
  if (!state.opportunity.acceptanceCriteria) { return null; }
  return (
    <Container>
      <div className='mt-5 pt-5 border-top'>
        <Row>
          <Col xs='12' md='8'>
            <h2 className='mb-4'>Acceptance Criteria</h2>
            <p className='mb-4'>This is a fixed-price opportunity governed by the terms of our lightweight procurement model, Code With Us. To be paid the fixed price for this opportunity, you need to meet all of the following criteria:</p>
            <Markdown source={state.opportunity.acceptanceCriteria} smallerHeadings openLinksInNewTabs />
          </Col>
        </Row>
      </div>
    </Container>
  );
};

const EvaluationCriteria: ComponentView<ValidState, Msg> = ({ state }) => {
  if (!state.opportunity.evaluationCriteria) { return null; }
  return (
    <Container>
      <div className='mt-5 pt-5 border-top'>
        <Row>
          <Col xs='12' md='8'>
            <h2 className='mb-4'>Proposal Evaluation Criteria</h2>
            <p className='mb-4'>Your proposal will be scored using the following criteria:</p>
            <Markdown source={state.opportunity.evaluationCriteria} smallerHeadings openLinksInNewTabs />
          </Col>
        </Row>
      </div>
    </Container>
  );
};

const HowToApply: ComponentView<ValidState, Msg> = ({ state }) => {
  return (
    <div className='bg-blue-light-alt py-5 mt-auto'>
      <Container>
        <Row>
          <Col xs='12' md='8'>
            <h2 className='mb-4'>How To Apply</h2>
            <p>To submit a proposal for this Code With Us opportunity, you must have <Link dest={routeDest(adt('signUpStepOne', null))}>signed up</Link> for a Digital Marketplace account as a vendor and be <Link dest={routeDest(adt('signIn', { redirectOnSuccess: state.routePath }))}>signed in</Link>.</p>
            <p className='mb-0'>Please note that you will not be able to submit a proposal if the opportunity's proposal deadline has passed.</p>
          </Col>
          <Col xs='12' md='4' lg={{ offset: 1, size: 3 }}>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

const view: ComponentView<State, Msg> = viewValid(props => {
  const isDetails = props.state.activeInfoTab === 'details';
  return (
    <div className='flex-grow-1 d-flex flex-column flex-nowrap align-items-stretch'>
      <div className='mb-5'>
        <Header {...props} />
        <Info {...props} />
        {isDetails ? (<AcceptanceCriteria {...props} />) : null}
        {isDetails ? (<EvaluationCriteria {...props} />) : null}
      </div>
      <HowToApply {...props} />
    </div>
  );
});

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  fullWidth: true,
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
            dest: routeDest(adt('opportunityCWUEdit', {
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
              dest: routeDest(adt('opportunityCWUEdit', {
                opportunityId: state.opportunity.id
              }))
            }
          ]);
        } else {
          return null;
        }
      case UserType.Vendor:
        if (state.existingProposalId) {
          return adt('links', [
            {
              children: 'View Proposal',
              symbol_: leftPlacement(iconLinkSymbol('comment-dollar')),
              button: true,
              color: 'primary',
              dest: routeDest(adt('proposalCWUEdit', {
                opportunityId: state.opportunity.id,
                proposalId: state.existingProposalId
              }))
            }
          ]);
        } else {
          return adt('links', [
            {
              children: 'Start Proposal',
              symbol_: leftPlacement(iconLinkSymbol('comment-dollar')),
              button: true,
              color: 'primary',
              dest: routeDest(adt('proposalCWUCreate', {
                opportunityId: state.opportunity.id
              }))
            }
          ]);
        }
    }
  })
};
