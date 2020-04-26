import { CONTACT_EMAIL, EMPTY_STRING } from 'front-end/config';
import { getAlertsValid, getContextualActionsValid, getMetadataValid, makePageMetadata, makeStartLoading, makeStopLoading, updateValid, viewValid } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { AddendaList } from 'front-end/lib/components/addenda';
import { AttachmentList } from 'front-end/lib/components/attachments';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, PageComponent, PageInit, replaceRoute, Update, View } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import { OpportunityBadge } from 'front-end/lib/views/badge';
import DateMetadata from 'front-end/lib/views/date-metadata';
import GotQuestions from 'front-end/lib/views/got-questions';
import Icon, { AvailableIcons, IconInfo } from 'front-end/lib/views/icon';
import Link, { emailDest, iconLinkSymbol, leftPlacement, routeDest } from 'front-end/lib/views/link';
import Markdown from 'front-end/lib/views/markdown';
import OpportunityInfo from 'front-end/lib/views/opportunity-info';
import ProgramType from 'front-end/lib/views/program-type';
import Skills from 'front-end/lib/views/skills';
import TabbedNav, { Tab } from 'front-end/lib/views/tabbed-nav';
import React from 'react';
import { Col, Container, Row } from 'reactstrap';
import { formatAmount, formatDate, formatDateAndTime } from 'shared/lib';
import { getCWUOpportunityViewsCounterName } from 'shared/lib/resources/counter';
import { CWUOpportunity, DEFAULT_OPPORTUNITY_TITLE, isCWUOpportunityAcceptingProposals } from 'shared/lib/resources/opportunity/code-with-us';
import { CWUProposalSlim } from 'shared/lib/resources/proposal/code-with-us';
import { isVendor, User, UserType } from 'shared/lib/resources/user';
import { adt, ADT, Id } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

type InfoTab
  = 'details'
  | 'attachments'
  | 'addenda';

interface ValidState {
  toggleWatchLoading: number;
  opportunity: CWUOpportunity;
  existingProposal?: CWUProposalSlim;
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
    toggleWatchLoading: 0,
    viewerUser,
    opportunity: oppR.value,
    existingProposal,
    activeInfoTab: 'details',
    routePath
  }));
};

const startToggleWatchLoading = makeStartLoading<ValidState>('toggleWatchLoading');
const stopToggleWatchLoading = makeStopLoading<ValidState>('toggleWatchLoading');

const update: Update<State, Msg> = updateValid(({ state, msg }) => {
  switch (msg.tag) {
    case 'setActiveInfoTab':
      return [state.set('activeInfoTab', msg.value)];
    case 'toggleWatch':
      return [
        startToggleWatchLoading(state),
        async state => {
          state = stopToggleWatchLoading(state);
          const id = state.opportunity.id;
          const result = state.opportunity.subscribed
            ? await api.subscribers.cwu.delete(id)
            : await api.subscribers.cwu.create({ opportunity: id });
          if (result.tag === 'valid') {
            state = state.update('opportunity', o => ({
              ...o,
              subscribed: !o.subscribed
            }));
          }
          return state;
        }
      ];
    default:
      return [state];
  }
});

const Header: ComponentView<ValidState, Msg> = ({ state, dispatch }) => {
  const opp = state.opportunity;
  const isToggleWatchLoading = state.toggleWatchLoading > 0;
  return (
    <div>
      <Container>
        <Row>
          <Col xs='12'>
            <DateMetadata
              className='mb-3'
              dates={[
                opp.publishedAt
                  ? {
                      tag: 'date',
                      date: opp.publishedAt,
                      label: 'Published',
                      withTimeZone: true
                    }
                  : null,
                {
                  tag: 'date',
                  date: opp.updatedAt,
                  label: 'Updated',
                  withTimeZone: true
                }
              ]} />
          </Col>
        </Row>
        <Row className='align-items-center'>
          <Col xs='12' md='6' lg='6'>
            <h1 className='mb-2'>{opp.title || DEFAULT_OPPORTUNITY_TITLE}</h1>
            <ProgramType size='lg' type_='cwu' className='mb-4' />
            <div className='d-flex flex-column flex-sm-row flex-nowrap align-items-start align-items-md-center mb-4'>
              <OpportunityBadge opportunity={adt('cwu', opp)} viewerUser={state.viewerUser} className='mb-2 mb-sm-0' />
              <IconInfo
                name='alarm-clock-outline'
                value={formatDateAndTime(opp.proposalDeadline, true)}
                className='ml-sm-3 flex-shrink-0' />
            </div>
            {opp.teaser ? (<p className='text-secondary mb-4'>{opp.teaser}</p>) : null}
            <div className='d-flex flex-nowrap align-items-center'>
              <Link
                disabled={isToggleWatchLoading}
                dest={emailDest([CONTACT_EMAIL, opp.title])}
                symbol_={leftPlacement(iconLinkSymbol('envelope'))}
                color='info'
                size='sm'
                outline
                button>
                Contact
              </Link>
              {state.viewerUser
                ? (<Link
                    className='ml-3'
                    disabled={isToggleWatchLoading}
                    loading={isToggleWatchLoading}
                    onClick={() => dispatch(adt('toggleWatch'))}
                    symbol_={leftPlacement(iconLinkSymbol(opp.subscribed ? 'check' : 'eye'))}
                    color={opp.subscribed ? 'info' : 'primary'}
                    size='sm'
                    outline={!opp.subscribed}
                    button>
                    {opp.subscribed ? 'Watching' : 'Watch'}
                  </Link>)
                : null}
            </div>
          </Col>
          <Col xs='12' md='6' lg={{ offset: 1, size: 5 }} className='mt-5 mt-md-0 pl-md-4'>
            <Row className='mb-4'>
              <Col xs='6' className='d-flex justify-content-start align-items-start flex-nowrap'>
                <OpportunityInfo
                  icon='comment-dollar-outline'
                  name='Proposal Deadline'
                  value={formatDate(opp.proposalDeadline, true)} />
              </Col>
              <Col xs='6' className='d-flex justify-content-start align-items-start flex-nowrap'>
                <OpportunityInfo
                  icon='badge-dollar-outline'
                  name='Value'
                  value={opp.reward ? formatAmount(opp.reward, '$') : EMPTY_STRING} />
              </Col>
            </Row>
            <Row className='mb-4'>
              <Col xs='6' className='d-flex justify-content-start align-items-start flex-nowrap'>
                <OpportunityInfo
                  icon='map-marker-outline'
                  name='Location'
                  value={opp.location || EMPTY_STRING} />
              </Col>
              <Col xs='6' className='d-flex justify-content-start align-items-start flex-nowrap'>
                <OpportunityInfo
                  icon='laptop-outline'
                  name='Remote OK?'
                  value={opp.remoteOk ? 'Yes' : 'No'} />
              </Col>
            </Row>
            <Row>
              <Col xs='6' className='d-flex justify-content-start align-items-start flex-nowrap'>
                <OpportunityInfo
                  icon='award-outline'
                  name='Assignment Date'
                  value={formatDate(opp.assignmentDate, true)} />
              </Col>
              <Col xs='6' className='d-flex justify-content-start align-items-start flex-nowrap'>
                <OpportunityInfo
                  icon='user-hard-hat-outline'
                  name='Work Start Date'
                  value={formatDate(opp.startDate, true)} />
              </Col>
            </Row>
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
        <Markdown source={opp.description || EMPTY_STRING} smallerHeadings openLinksInNewTabs />
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
  if (!hasAttachments && !hasAddenda) { return (<div className='border-top mb-5' style={{ height: '2px' }}></div>); }
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
    <div className='mt-6'>
      <Container>
        <InfoTabs {...props} />
        <Row>
          <Col xs='12' md='8'>
            {activeTab}
          </Col>
          <Col xs='12' md='4' lg={{ offset: 1, size: 3 }} className='mt-5 mt-md-0'>
            <GotQuestions disabled={state.toggleWatchLoading > 0} title={state.opportunity.title} />
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
  const viewerUser = state.viewerUser;
  if ((viewerUser && !isVendor(viewerUser)) || !isCWUOpportunityAcceptingProposals(state.opportunity)) { return null; }
  return (
    <div className='bg-blue-light-alt py-5 mt-auto'>
      <Container>
        <Row>
          <Col xs='12' md='8'>
            <h2 className='mb-4'>How To Apply</h2>
            <p>
              To submit a proposal for this Code With Us opportunity, you must have signed up for a Digital Marketplace vendor account.&nbsp;
              {!viewerUser
                ? (<span>If you already have a vendor account, please <Link dest={routeDest(adt('signIn', { redirectOnSuccess: state.routePath }))}>sign in</Link>.</span>)
                : null}
            </p>
            <p className='mb-0'>Please note that you will not be able to submit a proposal if the opportunity's proposal deadline has passed.</p>
            {viewerUser && isVendor(viewerUser) && !state.existingProposal && isCWUOpportunityAcceptingProposals(state.opportunity)
              ? (<Link
                  disabled={state.toggleWatchLoading > 0}
                  className='mt-4'
                  button
                  color='primary'
                  dest={routeDest(adt('proposalCWUCreate', { opportunityId: state.opportunity.id }))}
                  symbol_={leftPlacement(iconLinkSymbol('comment-dollar'))}>
                  Start Proposal
                </Link>)
              : null}
          </Col>
          <Col md='4' lg={{ offset: 1, size: 3 }} className='align-items-center justify-content-center d-none d-md-flex'>
            <OpportunityInfo
              icon='comment-dollar-outline'
              name='Proposal Deadline'
              value={formatDate(state.opportunity.proposalDeadline, true)} />
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

  getAlerts: getAlertsValid(state => {
    const viewerUser = state.viewerUser;
    const existingProposal = state.existingProposal;
    const successfulProponentName = state.opportunity.successfulProponentName;
    return {
      info: (() => {
        const alerts = [];
        if (viewerUser && isVendor(viewerUser) && existingProposal?.submittedAt) {
          alerts.push({
            text: `You submitted a proposal to this opportunity on ${formatDateAndTime(existingProposal.submittedAt, true)}.`
          });
        }
        if (successfulProponentName) {
          alerts.push({
            text: `This opportunity was awarded to ${successfulProponentName}.`
          });
        }
        return alerts;
      })()
    };
  }),

  getContextualActions: getContextualActionsValid(({ state }) => {
    const viewerUser = state.viewerUser;
    if (!viewerUser) { return null; }
    const isToggleWatchLoading = state.toggleWatchLoading > 0;
    switch (viewerUser.type) {
      case UserType.Admin:
        return adt('links', [
          {
            disabled: isToggleWatchLoading,
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
              disabled: isToggleWatchLoading,
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
        if (state.existingProposal) {
          return adt('links', [
            {
              disabled: isToggleWatchLoading,
              children: 'View Proposal',
              symbol_: leftPlacement(iconLinkSymbol('comment-dollar')),
              button: true,
              color: 'primary',
              dest: routeDest(adt('proposalCWUEdit', {
                opportunityId: state.opportunity.id,
                proposalId: state.existingProposal.id
              }))
            }
          ]);
        } else {
          return adt('links', [
            {
              disabled: isToggleWatchLoading,
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
