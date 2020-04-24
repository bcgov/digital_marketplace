import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
//import * as FormField from 'front-end/lib/components/form-field';
import * as Checkbox from 'front-end/lib/components/form-field/checkbox';
import * as Select from 'front-end/lib/components/form-field/select';
import * as ShortText from 'front-end/lib/components/form-field/short-text';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild, View } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import { cwuOpportunityToPublicColor, cwuOpportunityToPublicStatus } from 'front-end/lib/pages/opportunity/code-with-us/lib';
import { swuOpportunityToPublicColor, swuOpportunityToPublicStatus } from 'front-end/lib/pages/opportunity/sprint-with-us/lib';
import Badge from 'front-end/lib/views/badge';
import Icon, { AvailableIcons } from 'front-end/lib/views/icon';
import Link, { iconLinkSymbol, leftPlacement, routeDest } from 'front-end/lib/views/link';
import LoadingButton from 'front-end/lib/views/loading-button';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { compareDates, formatAmount, formatDateAndTime } from 'shared/lib';
import * as CWU from 'shared/lib/resources/opportunity/code-with-us';
import * as SWU from 'shared/lib/resources/opportunity/sprint-with-us';
import { isVendor, User } from 'shared/lib/resources/user';
import { adt, ADT, Id } from 'shared/lib/types';

type Opportunity
  = ADT<'cwu', CWU.CWUOpportunitySlim>
  | ADT<'swu', SWU.SWUOpportunitySlim>;

type OpportunityCategory
  = 'unpublished'
  | 'open'
  | 'closed';

export interface State {
  viewerUser?: User;
  toggleWatchLoading: [OpportunityCategory, Id] | null;
  notifyLoading: number;
  unpublished: Opportunity[];
  open: Opportunity[];
  closed: Opportunity[];
  typeFilter: Immutable<Select.State>;
  remoteOkFilter: Immutable<Checkbox.State>;
  searchFilter: Immutable<ShortText.State>;
}

function isLoading(state: Immutable<State>): boolean {
  return state.notifyLoading > 0 || !!state.toggleWatchLoading;
}

type InnerMsg
  = ADT<'typeFilter', Select.Msg>
  | ADT<'remoteOkFilter', Checkbox.Msg>
  | ADT<'searchFilter', ShortText.Msg>
  | ADT<'toggleNotifications'>
  | ADT<'toggleWatch', [OpportunityCategory, Id]>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

function categorizeOpportunities(cwu: CWU.CWUOpportunitySlim[], swu: SWU.SWUOpportunitySlim[], viewerUser?: User): Pick<State, 'unpublished' | 'open' | 'closed'> {
  const opportunities: Opportunity[] = [
    ...(cwu.map(o => adt('cwu' as const, o))),
    ...(swu.map(o => adt('swu' as const, o)))
  ];
  const empty: Pick<State, 'unpublished' | 'open' | 'closed'> = {
    unpublished: [],
    open: [],
    closed: []
  };
  const result: Pick<State, 'unpublished' | 'open' | 'closed'> = opportunities.reduce((acc, o) => {
    switch (o.tag) {
      case 'cwu':
        if (CWU.isUnpublished(o.value)) {
          acc.unpublished.push(o);
        } else if (CWU.isOpen(o.value)) {
          acc.open.push(o);
        } else if (CWU.isClosed(o.value)) {
          acc.closed.push(o);
        }
        break;
      case 'swu':
        if (SWU.isUnpublished(o.value)) {
          acc.unpublished.push(o);
        } else if (SWU.isOpen(o.value)) {
          acc.open.push(o);
        } else if (SWU.isClosed(o.value)) {
          acc.closed.push(o);
        }
        break;
    }
    return acc;
  }, empty);
  return {
    unpublished: result.unpublished
      .sort((a, b) => compareDates(a.value.updatedAt, b.value.updatedAt) * -1),
    open: result.open
      .sort((a, b) => compareDates(a.value.updatedAt, b.value.updatedAt) * -1),
    closed: result.closed
      .sort((a, b) => compareDates(a.value.proposalDeadline, b.value.proposalDeadline) * -1)
  };
}

const init: PageInit<RouteParams, SharedState, State, Msg> = async ({ shared }) => {
  let cwu: CWU.CWUOpportunitySlim[] = [];
  let swu: SWU.SWUOpportunitySlim[] = [];
  const cwuR = await api.opportunities.cwu.readMany();
  const swuR = await api.opportunities.swu.readMany();
  if (api.isValid(cwuR) && api.isValid(swuR)) {
    cwu = cwuR.value;
    swu = swuR.value;
  }
  const viewerUser = shared.session?.user;
  return {
    ...categorizeOpportunities(cwu, swu, viewerUser),
    viewerUser,
    toggleWatchLoading: null,
    notifyLoading: 0,
    typeFilter: immutable(await Select.init({
      errors: [],
      child: {
        value: null,
        id: 'opportunity-filter-status',
        options: adt('options', [
          { label: 'Code With Us', value: 'cwu' },
          { label: 'Sprint With Us', value: 'swu' }
        ])
      }
    })),
    remoteOkFilter: immutable(await Checkbox.init({
      errors: [],
      child: {
        value: false,
        id: 'opportunity-filter-remote-ok'
      }
    })),
    searchFilter: immutable(await ShortText.init({
      errors: [],
      child: {
        type: 'text',
        value: '',
        id: 'opportunity-filter-search'
      }
    }))
  };
};

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'typeFilter':
      return updateComponentChild({
        state,
        childStatePath: ['typeFilter'],
        childUpdate: Select.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('typeFilter' as const, value)
      });
    case 'remoteOkFilter':
      return updateComponentChild({
        state,
        childStatePath: ['remoteOkFilter'],
        childUpdate: Checkbox.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('remoteOkFilter' as const, value)
      });
    case 'searchFilter':
      return updateComponentChild({
        state,
        childStatePath: ['searchFilter'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('searchFilter' as const, value)
      });
    case 'toggleNotifications':
    case 'toggleWatch':
    default:
      return [state];
  }
};

const Header: ComponentView<State, Msg> = () => {
  return (
    <div className='rounded-lg bg-bcgov-blue text-white'>
      <Row>
        <Col xs='12' md='7' lg='6'>
          <div className='py-5 px-4 px-sm-5 pl-md-7'>
            <div className='font-weight-bold'>Welcome to the</div>
            <h1 className='mb-3'>Digital Marketplace</h1>
            <p className='mb-0'>Browse through the latest opportunities to find interesting government projects that match your skills and interests.</p>
          </div>
        </Col>
      </Row>
    </div>
  );
};

const Filters: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <Row className='mt-5'>
      <Col xs='12' md='4' className='d-flex align-items-end order-1'>
        <Select.view
          extraChildProps={{}}
          label='Filter Opportunities'
          placeholder='All Opportunity Types'
          disabled={isLoading(state)}
          state={state.typeFilter}
          className='flex-grow-1'
          dispatch={mapComponentDispatch(dispatch, value => adt('typeFilter' as const, value))} />
      </Col>
      <Col xs='12' md='3' className='d-flex align-items-end order-3 order-md-2'>
        <Checkbox.view
          extraChildProps={{ inlineLabel: 'Remote OK' }}
          disabled={isLoading(state)}
          state={state.remoteOkFilter}
          className='flex-grow-1 mt-n2 mt-md-0'
          dispatch={mapComponentDispatch(dispatch, value => adt('remoteOkFilter' as const, value))} />
      </Col>
      <Col xs='12' md='5' className='d-flex align-items-end order-2 order-md-3'>
        <ShortText.view
          extraChildProps={{}}
          placeholder='Search by Title or Location'
          disabled={isLoading(state)}
          state={state.searchFilter}
          className='flex-grow-1'
          dispatch={mapComponentDispatch(dispatch, value => adt('searchFilter' as const, value))} />
      </Col>
    </Row>
  );
};

interface OpportunityTypeProps {
  type_: Opportunity['tag'];
}

const OpportunityType: View<OpportunityTypeProps> = ({ type_ }) => {
  return (
    <div className='d-flex flex-nowrap align-items-center font-size-small font-weight-bold text-info'>
      <Icon
        className='mr-2 flex-shrink-0 flex-grow-0'
        name={type_ === 'cwu' ? 'code' : 'users-class'} />
      {type_ === 'cwu' ? 'Code With Us' : 'Sprint With Us'}
    </div>
  );
};

interface OpportunityBadgeProps {
  opportunity: Opportunity;
  viewerUser?: User;
  className?: string;
}

const OpportunityBadge: View<OpportunityBadgeProps> = ({ opportunity, viewerUser, className }) => {
  switch (opportunity.tag) {
    case 'cwu':
      return (<Badge
        className={className}
        text={cwuOpportunityToPublicStatus(opportunity.value, viewerUser)}
        color={cwuOpportunityToPublicColor(opportunity.value, viewerUser)} />);
    case 'swu':
      return (<Badge
        className={className}
        text={swuOpportunityToPublicStatus(opportunity.value, viewerUser)}
        color={swuOpportunityToPublicColor(opportunity.value, viewerUser)} />);
  }
};

interface IconInfoProps {
  name: AvailableIcons;
  value: string;
  className?: string;
}

const IconInfo: View<IconInfoProps> = ({ name, value, className }) => {
  return (
    <div className={className}>
      <div className='d-flex flex-nowrap align-items-center text-nowrap'>
        <Icon
          name={name}
          className='mr-2 flex-shrink-0' />
        {value}
      </div>
    </div>
  );
};

interface OpportunityCardProps {
  opportunity: Opportunity;
  viewerUser?: User;
  disabled: boolean;
  isWatchLoading: boolean;
  toggleWatch(): void;
}

const OpportunityCard: View<OpportunityCardProps> = ({ opportunity, viewerUser, toggleWatch, isWatchLoading, disabled }) => {
  const isCWU = opportunity.tag === 'cwu' ;
  const subscribed = opportunity.value.subscribed;
  return (
    <Col xs='12' md='6' style={{ marginBottom: '2rem', minHeight: '320px' }}>
      <Link className='shadow-hover w-100 h-100 text-decoration-none rounded-lg border align-items-stretch' color='body' dest={routeDest(adt(isCWU ? 'opportunityCWUView' : 'opportunitySWUView', { opportunityId: opportunity.value.id }))}>
        <div className='d-flex flex-column align-items-stretch flex-grow-1'>
          <div className='p-4 flex-grow-1'>
            <h5 className='mb-2'>
              {opportunity.value.title || (isCWU ? CWU.DEFAULT_OPPORTUNITY_TITLE : SWU.DEFAULT_OPPORTUNITY_TITLE)}
            </h5>
            <OpportunityType type_={opportunity.tag} />
            <div className='mt-3 font-size-small d-flex flex-column flex-sm-row flex-nowrap align-items-start align-items-sm-center text-body'>
              <OpportunityBadge opportunity={opportunity} viewerUser={viewerUser} className='mb-2 mb-sm-0' />
              <IconInfo
                name='alarm-clock-outline'
                value={formatDateAndTime(opportunity.value.proposalDeadline, true)}
                className='ml-sm-3 flex-shrink-0' />
            </div>
            <p className='mt-3 mb-0 text-secondary font-size-small'>
              {opportunity.value.teaser}
            </p>
          </div>
          <div className='px-4 pt-3 border-top d-flex flex-wrap mt-auto flex-shrink-0 flex-grow-0 font-size-small align-items-center'>
            <IconInfo
              className='mr-3 mb-3'
              value={formatAmount(opportunity.tag === 'cwu' ? opportunity.value.reward : opportunity.value.totalMaxBudget, '$')}
              name='badge-dollar-outline' />
            <IconInfo
              className='mr-3 mb-3 d-none d-sm-flex'
              value={opportunity.value.location}
              name='map-marker-outline' />
            <div className='mr-auto'>
              {opportunity.value.remoteOk
                ? (<IconInfo
                    className='mr-3 mb-3'
                    value='Remote OK'
                    name='laptop-outline' />)
                : null}
            </div>
            {subscribed !== undefined
              ? (<LoadingButton
                  loading={isWatchLoading}
                  disabled={disabled}
                  outline={!subscribed}
                  size='sm'
                  color={subscribed ? 'info' : 'primary'}
                  symbol_={leftPlacement(iconLinkSymbol(subscribed ? 'check' : 'eye'))}
                  className='mb-3'
                  onClick={e => {
                    if (e) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                    toggleWatch();
                  }}>
                  {subscribed ? 'Watching' : 'Watch'}
                </LoadingButton>)
              : null}
          </div>
        </div>
      </Link>
    </Col>
  );
};

interface OpportunityListProps {
  title: string;
  noneText: string;
  opportunities: Opportunity[];
  className?: string;
  showCount?: boolean;
  viewerUser?: User;
  disabled: boolean;
  toggleWatchLoading?: Id;
  toggleWatch(id: Id): void;
  toggleNotifications?(): void;
}

const OpportunityList: View<OpportunityListProps> = ({ disabled, toggleWatchLoading, className, title, noneText, opportunities, showCount, toggleWatch, toggleNotifications, viewerUser }) => {
  return (
    <div className={className}>
      <Row>
        <Col xs='12' className='d-flex flex-column flex-md-row align-items-start align-items-md-center flex-nowrap'>
          <h4 className='mb-3 mb-md-4 d-flex align-items-center'>
            {title}
            {showCount && opportunities.length
              ? (<Badge pill color='success' text={String(opportunities.length)} className='font-size-small ml-2' />)
              : null}
          </h4>
          {viewerUser && toggleNotifications
            ? (<Link
                className='ml-md-auto mb-4'
                disabled={disabled}
                onClick={toggleNotifications}
                color={viewerUser.notificationsOn ? 'secondary' : 'primary'}
                symbol_={leftPlacement(iconLinkSymbol(viewerUser.notificationsOn ? 'bell-slash-outline' : 'bell-outline'))}>
                {viewerUser.notificationsOn
                  ? 'Stop notifying me about new opportunities'
                  : 'Notify me about new opportunities'}
              </Link>)
            : null}
        </Col>
        {opportunities.length
          ? opportunities.map((o, i) => (
              <OpportunityCard
                opportunity={o}
                viewerUser={viewerUser}
                isWatchLoading={toggleWatchLoading === o.value.id}
                disabled={disabled}
                toggleWatch={() => toggleWatch(o.value.id)} />
              ))
          : (<Col xs='12'>{noneText}</Col>)}
      </Row>
    </div>
  );
};

const Opportunities: ComponentView<State, Msg> = ({ state, dispatch }) => {
  const toggleWatch = (category: OpportunityCategory) => (id: Id) => dispatch(adt('toggleWatch', [category, id]) as Msg);
  const toggleNotifications = () => dispatch(adt('toggleNotifications'));
  const hasUnpublished = !!state.unpublished.length;
  const isDisabled = isLoading(state);
  const getToggleWatchLoadingId = (c: OpportunityCategory) => {
    return state.toggleWatchLoading && state.toggleWatchLoading[0] === c
      ? state.toggleWatchLoading[1]
      : undefined;
  };
  return (
    <div className='mt-5 pt-5 border-top'>
      {hasUnpublished
        ? (<OpportunityList
            title='Unpublished Opportunities'
            noneText='There are currently no unpublished opportunities.'
            opportunities={state.unpublished}
            viewerUser={state.viewerUser}
            className='mb-5'
            disabled={isDisabled}
            toggleWatchLoading={getToggleWatchLoadingId('unpublished')}
            showCount
            toggleWatch={toggleWatch('open')}
            toggleNotifications={toggleNotifications} />)
        : null}
      <OpportunityList
        title='Open Opportunities'
        noneText='There are currently no open opportunities. Check back soon!'
        opportunities={state.open}
        viewerUser={state.viewerUser}
        className='mb-5'
        disabled={isDisabled}
        toggleWatchLoading={getToggleWatchLoadingId('open')}
        showCount
        toggleWatch={toggleWatch('open')}
        toggleNotifications={hasUnpublished ? undefined : toggleNotifications} />
      <OpportunityList
        title='Closed Opportunities'
        noneText='There are currently no closed opportunities.'
        opportunities={state.closed}
        viewerUser={state.viewerUser}
        disabled={isDisabled}
        toggleWatchLoading={getToggleWatchLoadingId('closed')}
        toggleWatch={toggleWatch('closed')} />
    </div>
  );
};

const view: ComponentView<State, Msg> = props => {
  return (
    <div>
      <Header {...props} />
      <Filters {...props} />
      <Opportunities {...props} />
    </div>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata('Opportunities');
  },
  getContextualActions({ state }) {
    if (!state.viewerUser || isVendor(state.viewerUser)) { return null; }
    return adt('links', [
      {
        children: 'Create Opportunity',
        button: true,
        disabled: isLoading(state),
        color: 'primary' as const,
        symbol_: leftPlacement(iconLinkSymbol('plus-circle')),
        dest: routeDest(adt('opportunityCreate', null))
      }
    ]);
  }
};
