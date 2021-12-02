import { EMPTY_STRING, SWU_OPPORTUNITY_SCOPE_CONTENT_ID } from 'front-end/typescript/config';
import { getAlertsValid, getContextualActionsValid, getMetadataValid, makePageMetadata, makeStartLoading, makeStopLoading, updateValid, viewValid } from 'front-end/typescript/lib';
import { Route, SharedState } from 'front-end/typescript/lib/app/types';
import { AddendaList } from 'front-end/typescript/lib/components/addenda';
import { AttachmentList } from 'front-end/typescript/lib/components/attachments';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, PageComponent, PageInit, replaceRoute, Update, View } from 'front-end/typescript/lib/framework';
import * as api from 'front-end/typescript/lib/http/api';
import { OpportunityBadge } from 'front-end/typescript/lib/views/badge';
import Capabilities from 'front-end/typescript/lib/views/capabilities';
import DateMetadata from 'front-end/typescript/lib/views/date-metadata';
import GotQuestions from 'front-end/typescript/lib/views/got-questions';
import Icon, { AvailableIcons, IconInfo } from 'front-end/typescript/lib/views/icon';
import Link, { emailDest, iconLinkSymbol, leftPlacement, routeDest } from 'front-end/typescript/lib/views/link';
import Markdown from 'front-end/typescript/lib/views/markdown';
import OpportunityInfo from 'front-end/typescript/lib/views/opportunity-info';
import ProgramType from 'front-end/typescript/lib/views/program-type';
import Skills from 'front-end/typescript/lib/views/skills';
import TabbedNav, { Tab } from 'front-end/typescript/lib/views/tabbed-nav';
import React, { Fragment } from 'react';
import { Col, Container, Row } from 'reactstrap';
import { CONTACT_EMAIL } from 'shared/config';
import { formatAmount, formatDate, formatDateAtTime } from 'shared/lib';
import { getSWUOpportunityViewsCounterName } from 'shared/lib/resources/counter';
import { DEFAULT_OPPORTUNITY_TITLE, isSWUOpportunityAcceptingProposals, SWUOpportunity, SWUOpportunityPhase, swuOpportunityPhaseTypeToTitleCase } from 'shared/lib/resources/opportunity/sprint-with-us';
import { doesOrganizationMeetSWUQualification } from 'shared/lib/resources/organization';
import { SWUProposalSlim } from 'shared/lib/resources/proposal/sprint-with-us';
import { isVendor, User, UserType } from 'shared/lib/resources/user';
import { adt, ADT, Id } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

type InfoTab
  = 'details'
  | 'scope'
  | 'attachments'
  | 'addenda';

interface ValidState {
  toggleWatchLoading: number;
  opportunity: SWUOpportunity;
  existingProposal?: SWUProposalSlim;
  viewerUser?: User;
  activeInfoTab: InfoTab;
  routePath: string;
  scopeContent: string;
  isQualified: boolean;
}

export type State = Validation<Immutable<ValidState>, null>;

type InnerMsg
  = ADT<'toggleWatch'>
  | ADT<'setActiveInfoTab', InfoTab>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export interface RouteParams {
  opportunityId: Id;
}

function canVendorStartProposal(state: Immutable<ValidState>): boolean {
  return !!state.viewerUser
      && isVendor(state.viewerUser)
      && !state.existingProposal
      && isSWUOpportunityAcceptingProposals(state.opportunity)
      && state.isQualified;
}

const init: PageInit<RouteParams, SharedState, State, Msg> = async ({ dispatch, routeParams, shared, routePath }) => {
  const fail = () => {
    dispatch(replaceRoute(adt('notFound', { path: routePath }) as Route));
    return invalid(null);
  };
  const { opportunityId } = routeParams;
  const viewerUser = shared.session?.user;
  const oppR = await api.opportunities.swu.readOne(opportunityId);
  if (!api.isValid(oppR)) { return fail(); }
  const scopeContentResult = await api.content.readOne(SWU_OPPORTUNITY_SCOPE_CONTENT_ID);
  if (!api.isValid(scopeContentResult)) { return fail(); }
  await api.counters.update(getSWUOpportunityViewsCounterName(opportunityId), null);
  let existingProposal: SWUProposalSlim | undefined;
  let isQualified = false;
  if (viewerUser && isVendor(viewerUser)) {
    existingProposal = await api.proposals.swu.getExistingProposalForOpportunity(opportunityId);
    const orgs = api.getValidValue(await api.ownedOrganizations.readMany(), []);
    isQualified = orgs.reduce((acc, o) => acc || doesOrganizationMeetSWUQualification(o), false as boolean);
  }
  return valid(immutable({
    isQualified,
    toggleWatchLoading: 0,
    viewerUser,
    opportunity: oppR.value,
    existingProposal,
    activeInfoTab: 'details',
    routePath,
    scopeContent: scopeContentResult.value.body
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
            ? await api.subscribers.swu.delete(id)
            : await api.subscribers.swu.create({ opportunity: id });
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
  const isAcceptingProposals = isSWUOpportunityAcceptingProposals(state.opportunity);
  return (
    <div>
      <Container>
        <Row>
          <Col xs='12'>
            <DateMetadata
              className='mb-2'
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
              <p className='font-italic small text-secondary mb-5'>This RFP is a Competition Notice under RFQ No. ON-003166 and is restricted to Proponents that have become Qualified Suppliers pursuant to that RFQ.</p>
          </Col>
        </Row>
        <Row className='align-items-center'>
          <Col xs='12' md='6' lg='6'>
            <h2 className='mb-2'>{opp.title || DEFAULT_OPPORTUNITY_TITLE}</h2>
            <ProgramType size='lg' type_='swu' className='mb-4' />
            <div className='d-flex flex-column flex-sm-row flex-nowrap align-items-start align-items-md-center mb-4'>
              <OpportunityBadge opportunity={adt('swu', opp)} viewerUser={state.viewerUser} className='mb-2 mb-sm-0' />
              <IconInfo
                name='alarm-clock-outline'
                value={`Close${isAcceptingProposals ? 's' : 'd'} ${formatDateAtTime(opp.proposalDeadline, true)}`}
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
              {state.viewerUser && state.viewerUser.id !== opp.createdBy?.id
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
            <Row className='mb-4 mb-md-5'>
              <Col xs='6' className='d-flex justify-content-start align-items-start flex-nowrap'>
                <OpportunityInfo
                  icon='comment-dollar-outline'
                  name='Proposal Deadline'
                  value={formatDate(opp.proposalDeadline)} />
              </Col>
              <Col xs='6' className='d-flex justify-content-start align-items-start flex-nowrap'>
                <OpportunityInfo
                  icon='badge-dollar-outline'
                  name='Value'
                  value={opp.totalMaxBudget ? formatAmount(opp.totalMaxBudget, '$') : EMPTY_STRING} />
              </Col>
            </Row>
            <Row className='mb-4 mb-md-5'>
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
              {opp.minTeamMembers
                ? (<Col xs='6' className='d-flex justify-content-start align-items-start flex-nowrap'>
                    <OpportunityInfo
                      icon='users-outline'
                      name='Min. Team Size'
                      value={String(opp.minTeamMembers)} />
                  </Col>)
                : null}
              <Col xs='6' className='d-flex justify-content-start align-items-start flex-nowrap'>
                <OpportunityInfo
                  icon='award-outline'
                  name='Assignment Date'
                  value={formatDate(opp.assignmentDate)} />
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
      <h4 className='mb-0 ml-2'>{text}</h4>
    </div>
  );
};

const InfoDetails: ComponentView<ValidState, Msg> = ({ state }) => {
  const opp = state.opportunity;
  return (
    <Row>
      <Col xs='12'>
        <h3 className='mb-0'>Details</h3>
      </Col>
      <Col xs='12' className='mt-5'>
        <InfoDetailsHeading icon='toolbox-outline' text='Skills' />
        <p className='mb-2'>To submit a proposal for this opportunity, you must possess the following skills:</p>
        <Skills skills={opp.mandatorySkills} />
        {opp.optionalSkills.length
          ? (<Fragment>
              <p className='mt-3 mb-2'>Additionally, possessing the following skills would be considered a bonus:</p>
              <Skills skills={opp.optionalSkills} />
            </Fragment>)
          : null}
      </Col>
      <Col xs='12' className='mt-5'>
        <InfoDetailsHeading icon='info-circle-outline' text='Description' />
        <Markdown source={opp.description || EMPTY_STRING} smallerHeadings openLinksInNewTabs />
      </Col>
      {opp.remoteOk && opp.remoteDesc
        ? (<Col xs='12' className='mt-5'>
            <InfoDetailsHeading icon='laptop-outline' text='Remote Work Options' />
            <p className='mb-0' style={{ whiteSpace: 'pre-line' }}>{opp.remoteDesc}</p>
          </Col>)
        : null}
    </Row>
  );
};

const InfoScope: ComponentView<ValidState, Msg> = ({ state }) => {
  return (
    <Row>
      <Col xs='12'>
        <h3 className='mb-0'>Scope &amp; Contract</h3>
      </Col>
      <Col xs='12' className='mt-4'>
        <Markdown source={state.scopeContent} openLinksInNewTabs />
      </Col>
    </Row>
  );
};

const InfoAttachments: ComponentView<ValidState, Msg> = ({ state }) => {
  const attachments = state.opportunity.attachments;
  return (
    <Row>
      <Col xs='12'>
        <h3 className='mb-0'>Attachments</h3>
      </Col>
      <Col xs='12' className='mt-4'>
        {attachments.length
          ? (<AttachmentList files={state.opportunity.attachments} />)
          : 'There are currently no attachments for this opportunity.'}
      </Col>
    </Row>
  );
};

const InfoAddenda: ComponentView<ValidState, Msg> = ({ state }) => {
  const addenda = state.opportunity.addenda;
  return (
    <Row>
      <Col xs='12'>
        <h3 className='mb-0'>Addenda</h3>
      </Col>
      <Col xs='12' className='mt-4'>
        {addenda.length
          ? (<AddendaList addenda={state.opportunity.addenda} />)
          : 'There are currently no addenda for this opportunity.'}
      </Col>
    </Row>
  );
};

const InfoTabs: ComponentView<ValidState, Msg> = ({ state, dispatch }) => {
  const activeTab = state.activeInfoTab;
  const opp = state.opportunity;
  const getTabInfo = (tab: InfoTab) => ({
    active: activeTab === tab,
    onClick: () => dispatch(adt('setActiveInfoTab', tab))
  });
  const tabs: Tab[] = [
    {
      ...getTabInfo('details'),
      text: 'Details'
    },
    {
      ...getTabInfo('scope'),
      text: 'Scope & Contract'
    },
    {
      ...getTabInfo('attachments'),
      text: 'Attachments',
      count: opp.attachments.length
    },
    {
      ...getTabInfo('addenda'),
      text: 'Addenda',
      count: opp.addenda.length
    }
  ];
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
      case 'scope':       return (<InfoScope {...props} />);
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

const Budget: ComponentView<ValidState, Msg> = ({ state }) => {
  const totalMaxBudget = state.opportunity.totalMaxBudget;
  return (
    <Container>
      <div className='mt-5 pt-5 border-top'>
        <Row>
          <Col xs='12'>
            <h3 className='mb-4'>Budget</h3>
            <p className='mb-0'>The Total Proponent Cost set out in the Proponent's Proposal must not exceed {totalMaxBudget ? formatAmount(totalMaxBudget, '$') : EMPTY_STRING} (inclusive of all expenses, but exclusive of applicable taxes). This RFP system will not permit a Proponent to submit a Proposal unless this mandatory requirement is satisfied.</p>
          </Col>
        </Row>
      </div>
    </Container>
  );
};

interface PhaseProps {
  icon: AvailableIcons;
  phase: SWUOpportunityPhase;
}

const Phase: View<PhaseProps> = ({ icon, phase }) => {
  return (
    <Col xs='12' md='4' className='mb-4 mb-md-0'>
      <div className='rounded border overflow-hidden'>
        <div className='p-3 border-bottom d-flex flex-nowrap align-items-center bg-light'>
          <Icon name={icon} width={1.5} height={1.5} />
          <h4 className='mb-0 ml-2'>{swuOpportunityPhaseTypeToTitleCase(phase.phase)}</h4>
        </div>
        <div className='px-3 py-4 d-flex flex-column flex-nowrap align-items-stretch'>
          <IconInfo name='calendar' value='Phase Dates' className='font-weight-bold mb-1' />
          <p className='pb-4 border-bottom mb-4'>{formatDate(phase.startDate, true)} to {formatDate(phase.completionDate, true)}</p>
          <IconInfo name='toolbox-outline' value='Required Capabilities' className='font-weight-bold mb-2' />
          {phase.requiredCapabilities.length
            ? (<Capabilities capabilities={phase.requiredCapabilities} showChecked={false} showFullOrPartTime />)
            : 'None Selected'}
        </div>
      </div>
    </Col>
  );
};

const Phases: ComponentView<ValidState, Msg> = ({ state }) => {
  const inception = state.opportunity.inceptionPhase;
  const prototype = state.opportunity.prototypePhase;
  const implementation = state.opportunity.implementationPhase;
  return (
    <Container>
      <div className='mt-5 pt-5 border-top'>
        <Row>
          <Col xs='12'>
            <h3 className='mb-4'>Phases of Work</h3>
            <p className='mb-5'>The following phase(s) of work need to be carried out:</p>
          </Col>
        </Row>
        <Row className='mb-4'>
          {inception
            ? (<Phase
                  icon='map'
                  phase={inception} />)
            : null}
          {prototype
            ? (<Phase
                  icon='rocket'
                  phase={prototype} />)
            : null}
          <Phase
            icon='cogs'
            phase={implementation} />
        </Row>
        <Row>
          <Col xs='12'>
            <p className='mb-0 font-italic small'>* Capabilities are claimed by individuals in their personal profile.</p>
          </Col>
        </Row>
      </div>
    </Container>
  );
};

const HowToApply: ComponentView<ValidState, Msg> = ({ state }) => {
  const viewerUser = state.viewerUser;
  if ((viewerUser && !isVendor(viewerUser)) || !isSWUOpportunityAcceptingProposals(state.opportunity)) { return null; }
  return (
    <div className='bg-c-opportunity-view-apply-bg py-5 mt-auto'>
      <Container>
        <Row>
          <Col xs='12' md='8'>
            <h3 className='mb-4'>How To Apply</h3>
            <p>
              To submit a proposal for this Sprint With Us opportunity, you must have signed up for a Digital Marketplace vendor account and be a <Link dest={routeDest(adt('learnMoreSWU', null))}>Qualified Supplier</Link>.&nbsp;
              {!viewerUser
                ? (<span>If you already have a vendor account, please <Link dest={routeDest(adt('signIn', { redirectOnSuccess: state.routePath }))}>sign in</Link>.</span>)
                : null}
            </p>
            <p className='mb-0'>Please note that you will not be able to submit a proposal if the opportunity's proposal deadline has passed.</p>
            {canVendorStartProposal(state)
              ? (<Link
                  disabled={state.toggleWatchLoading > 0}
                  className='mt-4'
                  button
                  color='primary'
                  dest={routeDest(adt('proposalSWUCreate', { opportunityId: state.opportunity.id }))}
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
        {isDetails ? (<Budget {...props} />) : null}
        {isDetails ? (<Phases {...props} />) : null}
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
    const successfulProponentName = state.opportunity.successfulProponent?.name;
    const vendor = !!viewerUser && isVendor(viewerUser);
    const isAcceptingProposals = isSWUOpportunityAcceptingProposals(state.opportunity);
    return {
      info: (() => {
        const alerts = [];
        if (vendor && existingProposal?.submittedAt) {
          alerts.push({
            text: `You submitted a proposal to this opportunity on ${formatDateAtTime(existingProposal.submittedAt, true)}.`
          });
        }
        if (successfulProponentName) {
          alerts.push({
            text: `This opportunity was awarded to ${successfulProponentName}.`
          });
        } else if (isAcceptingProposals && !viewerUser) {
          alerts.push({
            text: (
              <span>
                You must be <Link dest={routeDest(adt('signIn', { redirectOnSuccess: state.routePath }))}>signed in</Link> and a <Link dest={routeDest(adt('learnMoreSWU', null))}>Qualified Supplier</Link> in order to submit a proposal to this opportunity.
              </span>
            )
          });
        } else if (isAcceptingProposals && vendor && !state.isQualified && !existingProposal?.submittedAt && isAcceptingProposals) {
          alerts.push({
            text: (
              <span>
                You must be a <Link dest={routeDest(adt('learnMoreSWU', null))}>Qualified Supplier</Link> in order to submit a proposal to this opportunity.
              </span>
            )
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
            dest: routeDest(adt('opportunitySWUEdit', {
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
              dest: routeDest(adt('opportunitySWUEdit', {
                opportunityId: state.opportunity.id
              }))
            }
          ]);
        } else {
          return null;
        }
      case UserType.Vendor: {
        if (state.existingProposal) {
          return adt('links', [
            {
              disabled: isToggleWatchLoading,
              children: 'View Proposal',
              symbol_: leftPlacement(iconLinkSymbol('comment-dollar')),
              button: true,
              color: 'primary',
              dest: routeDest(adt('proposalSWUEdit', {
                opportunityId: state.opportunity.id,
                proposalId: state.existingProposal.id
              }))
            }
          ]);
        } else if (canVendorStartProposal(state)) {
          return adt('links', [
            {
              disabled: isToggleWatchLoading,
              children: 'Start Proposal',
              symbol_: leftPlacement(iconLinkSymbol('comment-dollar')),
              button: true,
              color: 'primary',
              dest: routeDest(adt('proposalSWUCreate', {
                opportunityId: state.opportunity.id
              }))
            }
          ]);
        } else {
          return null;
        }
      }
    }
  })
};
