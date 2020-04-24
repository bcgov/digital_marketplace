import { SEARCH_DEBOUNCE_DURATION } from 'front-end/config';
import { makePageMetadata, makeStartLoading, makeStopLoading } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as FormField from 'front-end/lib/components/form-field';
import * as Checkbox from 'front-end/lib/components/form-field/checkbox';
import * as Select from 'front-end/lib/components/form-field/select';
import * as ShortText from 'front-end/lib/components/form-field/short-text';
import { ComponentView, Dispatch, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild, View } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import { cwuOpportunityToPublicColor, cwuOpportunityToPublicStatus } from 'front-end/lib/pages/opportunity/code-with-us/lib';
import { swuOpportunityToPublicColor, swuOpportunityToPublicStatus } from 'front-end/lib/pages/opportunity/sprint-with-us/lib';
import Badge from 'front-end/lib/views/badge';
import Icon, { AvailableIcons } from 'front-end/lib/views/icon';
import Link, { iconLinkSymbol, leftPlacement, rightPlacement, routeDest } from 'front-end/lib/views/link';
import { debounce } from 'lodash';
import React from 'react';
import { Col, Row, Spinner } from 'reactstrap';
import { compareDates, find, formatAmount, formatDateAndTime } from 'shared/lib';
import * as CWU from 'shared/lib/resources/opportunity/code-with-us';
import * as SWU from 'shared/lib/resources/opportunity/sprint-with-us';
import { isVendor, User, UserType } from 'shared/lib/resources/user';
import { adt, ADT, Id } from 'shared/lib/types';

const CARD_MARGIN_BOTTOM = '2rem';

type Opportunity
  = ADT<'cwu', CWU.CWUOpportunitySlim>
  | ADT<'swu', SWU.SWUOpportunitySlim>;

interface CategorizedOpportunities {
  unpublished: Opportunity[];
  open: Opportunity[];
  closed: Opportunity[];
}

type OpportunityCategory = keyof CategorizedOpportunities;

export interface State {
  viewerUser?: User;
  toggleWatchLoading: [OpportunityCategory, Id] | null;
  toggleNotificationsLoading: number;
  typeFilter: Immutable<Select.State>;
  remoteOkFilter: Immutable<Checkbox.State>;
  searchFilter: Immutable<ShortText.State>;
  opportunities: CategorizedOpportunities;
  visibleOpportunities: CategorizedOpportunities;
}

function isLoading(state: Immutable<State>): boolean {
  return state.toggleNotificationsLoading > 0 || !!state.toggleWatchLoading;
}

type InnerMsg
  = ADT<'typeFilter', Select.Msg>
  | ADT<'remoteOkFilter', Checkbox.Msg>
  | ADT<'searchFilter', ShortText.Msg>
  | ADT<'toggleNotifications'>
  | ADT<'toggleWatch', [OpportunityCategory, Id]>
  | ADT<'search'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

function categorizeOpportunities(cwu: CWU.CWUOpportunitySlim[], swu: SWU.SWUOpportunitySlim[], viewerUser?: User): CategorizedOpportunities {
  const opportunities: Opportunity[] = [
    ...(cwu.map(o => adt('cwu' as const, {
      ...o,
      title: o.title || CWU.DEFAULT_OPPORTUNITY_TITLE
    }))),
    ...(swu.map(o => adt('swu' as const, {
      ...o,
      title: o.title || SWU.DEFAULT_OPPORTUNITY_TITLE
    })))
  ];
  const empty: CategorizedOpportunities = {
    unpublished: [],
    open: [],
    closed: []
  };
  const result: CategorizedOpportunities = opportunities.reduce((acc, o) => {
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
    // Show open opportunities with closest proposal deadline first.
    open: result.open
      .sort((a, b) => compareDates(a.value.proposalDeadline, b.value.proposalDeadline)),
    // Show most recently closed opportunities first.
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
  const opportunities = categorizeOpportunities(cwu, swu, viewerUser);
  return {
    opportunities,
    visibleOpportunities: opportunities,
    viewerUser,
    toggleWatchLoading: null,
    toggleNotificationsLoading: 0,
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

const dispatchSearch = debounce((dispatch: Dispatch<Msg>) => dispatch(adt('search')), SEARCH_DEBOUNCE_DURATION);

function makeQueryRegExp(query: string): RegExp | null {
  if (!query) { return null; }
  return new RegExp(query.split(/\s+/).join('.*'), 'i');
}

function filter(opps: Opportunity[], oppType: string | undefined, remoteOk: boolean, query: string): Opportunity[] {
  const regExp = makeQueryRegExp(query);
  return opps.filter(o => {
    if (oppType && o.tag !== oppType) { return false; }
    if (remoteOk && !o.value.remoteOk) { return false; }
    if (regExp && !o.value.title.match(regExp) && !o.value.location.match(regExp)) { return false; }
    return true;
  });
}

function runSearch(state: Immutable<State>): Immutable<State> {
  const oppType = FormField.getValue(state.typeFilter)?.value;
  const remoteOk = FormField.getValue(state.remoteOkFilter);
  const query = FormField.getValue(state.searchFilter);
  return state.set('visibleOpportunities', {
    unpublished: filter(state.opportunities.unpublished, oppType, remoteOk, query),
    open: filter(state.opportunities.open, oppType, remoteOk, query),
    closed: filter(state.opportunities.closed, oppType, remoteOk, query)
  });
}

const startToggleNotificationsLoading = makeStartLoading<State>('toggleNotificationsLoading');
const stopToggleNotificationsLoading = makeStopLoading<State>('toggleNotificationsLoading');

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'typeFilter':
      return updateComponentChild({
        state,
        childStatePath: ['typeFilter'],
        childUpdate: Select.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('typeFilter' as const, value),
        updateAfter: state => [
          state,
          async (state, dispatch) => {
            dispatchSearch(dispatch);
            return null;
          }
        ]
      });
    case 'remoteOkFilter':
      return updateComponentChild({
        state,
        childStatePath: ['remoteOkFilter'],
        childUpdate: Checkbox.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('remoteOkFilter' as const, value),
        updateAfter: state => [
          state,
          async (state, dispatch) => {
            dispatchSearch(dispatch);
            return null;
          }
        ]
      });
    case 'searchFilter':
      return updateComponentChild({
        state,
        childStatePath: ['searchFilter'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('searchFilter' as const, value),
        updateAfter: state => [
          state,
          async (state, dispatch) => {
            dispatchSearch(dispatch);
            return null;
          }
        ]
      });
    case 'toggleNotifications':
      return [
        startToggleNotificationsLoading(state),
        async (state, dispatch) => {
          state = stopToggleNotificationsLoading(state);
          if (!state.viewerUser) { return state; }
          const result = await api.users.update(state.viewerUser.id, adt('updateNotifications', !state.viewerUser.notificationsOn));
          if (api.isValid(result)) {
            return state.set('viewerUser', result.value);
          }
          return state;
        }
      ];
    case 'toggleWatch':
      return [
        state.set('toggleWatchLoading', msg.value),
        async (state, dispatch) => {
          state = state.set('toggleWatchLoading', null);
          const category = msg.value[0];
          const id = msg.value[1];
          const opportunity: Opportunity | null = find(state.opportunities[category], o => o.value.id === id);
          if (!opportunity) { return state; }
          const program = opportunity.tag;
          const result = opportunity.value.subscribed
            ? await api.subscribers[program].delete(id)
            : await api.subscribers[program].create({ opportunity: id });
          if (result.tag === 'valid') {
            state = state.update('opportunities', os => ({
              ...os,
              [category]: os[category].map(o => {
                if (o.value.id === id) {
                  o.value.subscribed = !o.value.subscribed;
                }
                return o;
              })
            }));
            return runSearch(state);
          }
          return state;
        }
      ];
    case 'search':
      return [runSearch(state)];
    default:
      return [state];
  }
};

const Header: ComponentView<State, Msg> = () => {
  return (
    <Row>
      <Col xs='12'>
        <h1 className='mb-4'>Welcome to the Digital Marketplace</h1>
      </Col>
      <Col xs='12' md='6'>
        <div className='rounded bg-blue-light-alt-2 p-4 h-100'>
          <OpportunityType type_='cwu' className='mb-2' />
          <p className='mb-3 font-size-small'><em>Code With Us</em> opportunities pay a fixed price for meeting acceptance criteria.</p>
          <Link
            className='font-size-small'
            symbol_={rightPlacement(iconLinkSymbol('arrow-right'))}
            dest={routeDest(adt('learnMoreCWU', null))}>
            Learn More
          </Link>
        </div>
      </Col>
      <Col xs='12' md='6'>
        <div className='rounded bg-blue-light-alt-2 p-4 h-100'>
          <OpportunityType type_='swu' className='mb-2' />
          <p className='mb-3 font-size-small'><em>Sprint With Us</em> opportunities are for registered organizations that can supply teams.</p>
          <Link
            className='font-size-small'
            symbol_={rightPlacement(iconLinkSymbol('arrow-right'))}
            dest={routeDest(adt('learnMoreSWU', null))}>
            Learn More
          </Link>
        </div>
      </Col>
    </Row>
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
  className?: string;
}

const OpportunityType: View<OpportunityTypeProps> = ({ type_, className = '' }) => {
  return (
    <div className={`d-flex flex-nowrap align-items-center font-size-small font-weight-bold text-info ${className}`}>
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
          width={0.9}
          height={0.9}
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
  const dest: Route = (() => {
    const view: Route = adt(isCWU ? 'opportunityCWUView' : 'opportunitySWUView', { opportunityId: opportunity.value.id });
    const edit: Route = adt(isCWU ? 'opportunityCWUEdit' : 'opportunitySWUEdit', { opportunityId: opportunity.value.id });
    if (!viewerUser) { return view; }
    switch (viewerUser.type) {
      case UserType.Admin: return edit;
      case UserType.Vendor: return view;
      case UserType.Government:
        if (opportunity.value.createdBy?.id === viewerUser.id) {
          return edit;
        } else {
          return view;
        }
    }
  })();
  return (
    <Col xs='12' md='6' style={{ marginBottom: CARD_MARGIN_BOTTOM, minHeight: '320px' }}>
      <div className='overflow-hidden shadow-hover w-100 h-100 rounded-lg border align-items-stretch d-flex flex-column align-items-stretch'>
        <Link disabled={disabled} style={{ outline: 'none' }} className='bg-hover-blue-light-alt-2 text-decoration-none d-flex flex-column align-items-stretch p-4 flex-grow-1' color='body' dest={routeDest(dest)}>
          <h5 className='mb-2'>
            {opportunity.value.title}
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
        </Link>
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
            ? (<Link
                button
                loading={isWatchLoading}
                disabled={disabled}
                outline={!subscribed}
                size='sm'
                color={subscribed ? 'info' : 'primary'}
                symbol_={leftPlacement(iconLinkSymbol(subscribed ? 'check' : 'eye'))}
                className='mb-3'
                onClick={toggleWatch}>
                {subscribed ? 'Watching' : 'Watch'}
              </Link>)
            : null}
        </div>
      </div>
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
  toggleNotificationsLoading?: boolean;
  toggleWatchLoading?: Id;
  toggleWatch(id: Id): void;
  toggleNotifications?(): void;
}

const OpportunityList: View<OpportunityListProps> = ({ disabled, toggleWatchLoading, className, title, noneText, opportunities, showCount, toggleWatch, toggleNotifications, viewerUser, toggleNotificationsLoading }) => {
  return (
    <div className={className}>
      <Row>
        <Col xs='12' className='d-flex flex-column flex-md-row align-items-start align-items-md-center flex-nowrap'>
          <h4 className='mb-4 d-flex align-items-center'>
            {title}
            {showCount && opportunities.length
              ? (<Badge pill color='success' text={String(opportunities.length)} className='font-size-small ml-2' />)
              : null}
          </h4>
          {viewerUser && toggleNotifications
            ? (<div className='mb-4 ml-md-auto d-flex align-items-center flex-nowrap'>
                {toggleNotificationsLoading
                  ? (<Spinner size='sm' color='secondary' className='mx-2 order-2 order-md-1' />)
                  : null}
                <Link
                  className='order-1 order-md-2'
                  disabled={disabled}
                  onClick={toggleNotifications}
                  color={viewerUser.notificationsOn ? 'secondary' : 'primary'}
                  symbol_={leftPlacement(iconLinkSymbol(viewerUser.notificationsOn ? 'bell-slash-outline' : 'bell-outline'))}>
                  {viewerUser.notificationsOn
                    ? 'Stop notifying me about new opportunities'
                    : 'Notify me about new opportunities'}
                </Link>
              </div>)
            : null}
        </Col>
        {opportunities.length
          ? (<Col xs='12' style={{ marginBottom: `-${CARD_MARGIN_BOTTOM}` }}>
              <Row>
                {opportunities.map((o, i) => (
                  <OpportunityCard
                    key={`opportunity-list-${i}`}
                    opportunity={o}
                    viewerUser={viewerUser}
                    isWatchLoading={toggleWatchLoading === o.value.id}
                    disabled={disabled}
                    toggleWatch={() => toggleWatch(o.value.id)} />
                ))}
              </Row>
            </Col>)
          : (<Col xs='12'>{noneText}</Col>)}
      </Row>
    </div>
  );
};

const Opportunities: ComponentView<State, Msg> = ({ state, dispatch }) => {
  const toggleWatch = (category: OpportunityCategory) => (id: Id) => dispatch(adt('toggleWatch', [category, id]) as Msg);
  const toggleNotifications = () => dispatch(adt('toggleNotifications'));
  const opps = state.visibleOpportunities;
  const hasUnpublished = !!opps.unpublished.length;
  const isToggleNotificationsLoading = state.toggleNotificationsLoading > 0;
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
            noneText={opps.unpublished.length !== state.opportunities.unpublished.length
              ? 'There are no unpublished opportunities that match your search criteria.'
              : 'There are currently no unpublished opportunities.'}
            opportunities={opps.unpublished}
            viewerUser={state.viewerUser}
            className='mb-5'
            disabled={isDisabled}
            toggleWatchLoading={getToggleWatchLoadingId('unpublished')}
            toggleNotificationsLoading={isToggleNotificationsLoading}
            showCount
            toggleWatch={toggleWatch('unpublished')}
            toggleNotifications={toggleNotifications} />)
        : null}
      <OpportunityList
        title='Open Opportunities'
        noneText={opps.open.length !== state.opportunities.open.length
          ? 'There are no open opportunities that match your search criteria.'
          : 'There are currently no open opportunities. Check back soon!'}
        opportunities={opps.open}
        viewerUser={state.viewerUser}
        className='mb-5'
        disabled={isDisabled}
        toggleWatchLoading={getToggleWatchLoadingId('open')}
        toggleNotificationsLoading={isToggleNotificationsLoading}
        showCount
        toggleWatch={toggleWatch('open')}
        toggleNotifications={hasUnpublished ? undefined : toggleNotifications} />
      <OpportunityList
        title='Closed Opportunities'
        noneText={opps.closed.length !== state.opportunities.closed.length
          ? 'There are no closed opportunities that match your search criteria.'
          : 'There are currently no closed opportunities.'}
        opportunities={opps.closed}
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
