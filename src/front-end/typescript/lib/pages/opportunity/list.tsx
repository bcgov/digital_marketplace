import {
  SEARCH_DEBOUNCE_DURATION,
  TRUNCATE_OPPORTUNITY_TITLE_LENGTH
} from "front-end/config";
import {
  makePageMetadata,
  makeStartLoading,
  makeStopLoading
} from "front-end/lib";
import { Route, SharedState } from "front-end/lib/app/types";
import * as FormField from "front-end/lib/components/form-field";
import * as Checkbox from "front-end/lib/components/form-field/checkbox";
import * as Select from "front-end/lib/components/form-field/select";
import * as ShortText from "front-end/lib/components/form-field/short-text";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import Accordion from "front-end/lib/views/accordion";
import Badge, { OpportunityBadge } from "front-end/lib/views/badge";
import { IconInfo } from "front-end/lib/views/icon";
import Link, {
  iconLinkSymbol,
  leftPlacement,
  rightPlacement,
  routeDest
} from "front-end/lib/views/link";
import ProgramType from "front-end/lib/views/program-type";
import { truncate } from "lodash";
import React from "react";
import { Col, Row, Spinner } from "reactstrap";
import { compareDates, find, formatAmount, formatDateAtTime } from "shared/lib";
import * as CWUO from "shared/lib/resources/opportunity/code-with-us";
import * as SWUO from "shared/lib/resources/opportunity/sprint-with-us";
import * as TWUO from "shared/lib/resources/opportunity/team-with-us";
import {
  isVendor,
  User,
  UserType,
  UpdateValidationErrors as UserUpdateValidationErrors
} from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import oppHelpers from "front-end/lib/interfaces/opportunities";

export type Opportunity =
  | ADT<"cwu", CWUO.CWUOpportunitySlim>
  | ADT<"swu", SWUO.SWUOpportunitySlim>
  | ADT<"twu", TWUO.TWUOpportunitySlim>;

interface CategorizedOpportunities {
  unpublished: Opportunity[];
  open: Opportunity[];
  closed: Opportunity[];
}

type OpportunityCategory = keyof CategorizedOpportunities;

const opportunityStatusOptions = [
  { label: "Draft", value: "draft" } as const,
  { label: "Under Review", value: "under_review" } as const,
  { label: "Published", value: "published" } as const,
  { label: "Evaluation", value: "evaluation" } as const,
  { label: "Awarded", value: "awarded" } as const
];

type OpportunityStatusOptionValue =
  typeof opportunityStatusOptions[number]["value"];

function isOpportunityStatusOptionValue(
  oppStatusValue: string | undefined
): oppStatusValue is OpportunityStatusOptionValue {
  return opportunityStatusOptions.some(
    (oppOption) => oppOption.value === oppStatusValue
  );
}

export interface State {
  viewerUser?: User;
  toggleWatchLoading: [OpportunityCategory, Id] | null;
  toggleNotificationsLoading: number;
  typeFilter: Immutable<Select.State>;
  statusFilter: Immutable<Select.State>;
  remoteOkFilter: Immutable<Checkbox.State>;
  searchFilter: Immutable<ShortText.State>;
  opportunities: CategorizedOpportunities;
  visibleOpportunities: CategorizedOpportunities;
  unpublishedListOpen: boolean;
  openListOpen: boolean;
  closedListOpen: boolean;
}

function isLoading(state: Immutable<State>): boolean {
  return state.toggleNotificationsLoading > 0 || !!state.toggleWatchLoading;
}

export type InnerMsg =
  | ADT<"noop">
  | ADT<
      "onInitResponse",
      [
        api.ResponseValidation<CWUO.CWUOpportunitySlim[], string[]>,
        api.ResponseValidation<SWUO.SWUOpportunitySlim[], string[]>,
        api.ResponseValidation<TWUO.TWUOpportunitySlim[], string[]>
      ]
    >
  | ADT<"typeFilter", Select.Msg>
  | ADT<"statusFilter", Select.Msg>
  | ADT<"remoteOkFilter", Checkbox.Msg>
  | ADT<"searchFilter", ShortText.Msg>
  | ADT<"toggleUnpublishedList">
  | ADT<"toggleOpenList">
  | ADT<"toggleClosedList">
  | ADT<"toggleNotifications">
  | ADT<
      "onToggleNotificationsResponse",
      api.ResponseValidation<User, UserUpdateValidationErrors>
    >
  | ADT<"toggleWatch", [OpportunityCategory, Id]>
  | ADT<"onToggleWatchResponse", [OpportunityCategory, Id, boolean]>
  | ADT<"search">;

export type Msg = component_.page.Msg<InnerMsg, Route>;

export type RouteParams = null;

function truncateTitle(title: string): string {
  return truncate(title, { length: TRUNCATE_OPPORTUNITY_TITLE_LENGTH });
}

function categorizeOpportunities(
  cwu: CWUO.CWUOpportunitySlim[],
  swu: SWUO.SWUOpportunitySlim[],
  twu: TWUO.TWUOpportunitySlim[]
): CategorizedOpportunities {
  const opportunities: Opportunity[] = [
    ...cwu.map((o) =>
      adt("cwu" as const, {
        ...o,
        title: truncateTitle(o.title || CWUO.DEFAULT_OPPORTUNITY_TITLE)
      })
    ),
    ...swu.map((o) =>
      adt("swu" as const, {
        ...o,
        title: truncateTitle(o.title || SWUO.DEFAULT_OPPORTUNITY_TITLE)
      })
    ),
    ...twu.map((o) =>
      adt("twu" as const, {
        ...o,
        title: truncateTitle(o.title || TWUO.DEFAULT_OPPORTUNITY_TITLE)
      })
    )
  ];
  const empty: CategorizedOpportunities = {
    unpublished: [],
    open: [],
    closed: []
  };
  const result: CategorizedOpportunities = opportunities.reduce((acc, o) => {
    switch (o.tag) {
      case "cwu":
        if (CWUO.isUnpublished(o.value)) {
          acc.unpublished.push(o);
        } else if (CWUO.isOpen(o.value)) {
          acc.open.push(o);
        } else if (CWUO.isClosed(o.value)) {
          acc.closed.push(o);
        }
        break;
      case "swu":
        if (SWUO.isUnpublished(o.value)) {
          acc.unpublished.push(o);
        } else if (SWUO.isOpen(o.value)) {
          acc.open.push(o);
        } else if (SWUO.isClosed(o.value)) {
          acc.closed.push(o);
        }
        break;
      case "twu":
        if (TWUO.isUnpublished(o.value)) {
          acc.unpublished.push(o);
        } else if (TWUO.isOpen(o.value)) {
          acc.open.push(o);
        } else if (TWUO.isClosed(o.value)) {
          acc.closed.push(o);
        }
        break;
    }
    return acc;
  }, empty);
  return {
    unpublished: result.unpublished.sort(
      (a, b) => compareDates(a.value.updatedAt, b.value.updatedAt) * -1
    ),
    // Show open opportunities with closest proposal deadline first.
    open: result.open.sort((a, b) =>
      compareDates(a.value.proposalDeadline, b.value.proposalDeadline)
    ),
    // Show most recently closed opportunities first.
    closed: result.closed.sort(
      (a, b) =>
        compareDates(a.value.proposalDeadline, b.value.proposalDeadline) * -1
    )
  };
}

const init: component_.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = ({ shared }) => {
  const viewerUser = shared.session?.user;
  const opportunities = categorizeOpportunities([], [], []);
  const [typeFilterState, typeFilterCmds] = Select.init({
    errors: [],
    child: {
      value: null,
      id: "opportunity-filter-type",
      options: adt("options", [
        { label: "Code With Us", value: "cwu" },
        { label: "Sprint With Us", value: "swu" },
        { label: "Team With Us", value: "twu" }
      ])
    }
  });
  const [statusFilterState, statusFilterCmds] = Select.init({
    errors: [],
    child: {
      value: null,
      id: "opportunity-filter-status",
      options: adt("options", opportunityStatusOptions)
    }
  });
  const [remoteOkFilterState, remoteOkFilterCmds] = Checkbox.init({
    errors: [],
    child: {
      value: false,
      id: "opportunity-filter-remote-ok"
    }
  });
  const [searchFilterState, searchFilterCmds] = ShortText.init({
    errors: [],
    child: {
      type: "text",
      value: "",
      id: "opportunity-filter-search"
    }
  });
  return [
    {
      opportunities,
      visibleOpportunities: opportunities,
      viewerUser,
      toggleWatchLoading: null,
      toggleNotificationsLoading: 0,
      typeFilter: immutable(typeFilterState),
      statusFilter: immutable(statusFilterState),
      remoteOkFilter: immutable(remoteOkFilterState),
      searchFilter: immutable(searchFilterState),
      unpublishedListOpen: false,
      openListOpen: true,
      closedListOpen: false
    },
    [
      component_.cmd.join3(
        api.opportunities.cwu.readMany()((response) => response),
        api.opportunities.swu.readMany()((response) => response),
        api.opportunities.twu.readMany()((response) => response),
        (cwuResponse, swuResponse, twuResponse) =>
          adt("onInitResponse", [
            cwuResponse,
            swuResponse,
            twuResponse
          ] as const)
      ),
      ...component_.cmd.mapMany(
        typeFilterCmds,
        (msg) => adt("typeFilter", msg) as Msg
      ),
      ...component_.cmd.mapMany(
        statusFilterCmds,
        (msg) => adt("statusFilter", msg) as Msg
      ),
      ...component_.cmd.mapMany(
        remoteOkFilterCmds,
        (msg) => adt("remoteOkFilter", msg) as Msg
      ),
      ...component_.cmd.mapMany(
        searchFilterCmds,
        (msg) => adt("searchFilter", msg) as Msg
      )
    ] as component_.Cmd<Msg>[]
  ];
};

const dispatchSearch = component_.cmd.makeDebouncedDispatch(
  adt("noop") as InnerMsg,
  adt("search") as InnerMsg,
  SEARCH_DEBOUNCE_DURATION
);

function makeQueryRegExp(query: string): RegExp | null {
  if (!query) {
    return null;
  }
  return new RegExp(query.split(/\s+/).join(".*"), "i");
}

function filter(
  opps: Opportunity[],
  oppType: string | undefined,
  oppStatus: string | undefined,
  remoteOk: boolean,
  query: string
): Opportunity[] {
  const regExp = makeQueryRegExp(query);
  return opps.filter((o) => {
    if (oppType && o.tag !== oppType) {
      return false;
    }
    if (remoteOk && !o.value.remoteOk) {
      return false;
    }
    if (
      isOpportunityStatusOptionValue(oppStatus) &&
      !doesOppHaveStatus(o, oppStatus)
    ) {
      return false;
    }
    if (
      regExp &&
      !o.value.title.match(regExp) &&
      !o.value.location.match(regExp)
    ) {
      return false;
    }
    return true;
  });
}

function doesOppHaveStatus(
  opp: Opportunity,
  oppStatus: OpportunityStatusOptionValue
): boolean {
  return (
    (oppStatus === "draft" &&
      [
        CWUO.CWUOpportunityStatus.Draft,
        SWUO.SWUOpportunityStatus.Draft,
        TWUO.TWUOpportunityStatus.Draft
      ].includes(opp.value.status)) ||
    (oppStatus === "under_review" &&
      [
        CWUO.CWUOpportunityStatus.UnderReview,
        SWUO.SWUOpportunityStatus.UnderReview,
        TWUO.TWUOpportunityStatus.UnderReview
      ].includes(opp.value.status)) ||
    (oppStatus === "published" &&
      [
        CWUO.CWUOpportunityStatus.Published,
        SWUO.SWUOpportunityStatus.Published,
        TWUO.TWUOpportunityStatus.Published
      ].includes(opp.value.status)) ||
    (oppStatus === "evaluation" &&
      [
        CWUO.CWUOpportunityStatus.Evaluation,
        SWUO.SWUOpportunityStatus.EvaluationTeamQuestionsIndividual,
        SWUO.SWUOpportunityStatus.EvaluationTeamQuestionsConsensus,
        SWUO.SWUOpportunityStatus.EvaluationCodeChallenge,
        SWUO.SWUOpportunityStatus.EvaluationTeamScenario,
        TWUO.TWUOpportunityStatus.EvaluationChallenge,
        TWUO.TWUOpportunityStatus.EvaluationResourceQuestionsIndividual,
        TWUO.TWUOpportunityStatus.EvaluationResourceQuestionsConsensus
      ].includes(opp.value.status)) ||
    (oppStatus === "awarded" &&
      [
        CWUO.CWUOpportunityStatus.Awarded,
        SWUO.SWUOpportunityStatus.Awarded,
        TWUO.TWUOpportunityStatus.Awarded
      ].includes(opp.value.status))
  );
}

function runSearch(state: Immutable<State>): Immutable<State> {
  const oppType = FormField.getValue(state.typeFilter)?.value;
  const oppStatus = FormField.getValue(state.statusFilter)?.value;
  const remoteOk = FormField.getValue(state.remoteOkFilter);
  const query = FormField.getValue(state.searchFilter);
  return state.set("visibleOpportunities", {
    unpublished: filter(
      state.opportunities.unpublished,
      oppType,
      oppStatus,
      remoteOk,
      query
    ),
    open: filter(state.opportunities.open, oppType, oppStatus, remoteOk, query),
    closed: filter(
      state.opportunities.closed,
      oppType,
      oppStatus,
      remoteOk,
      query
    )
  });
}

const startToggleNotificationsLoading = makeStartLoading<State>(
  "toggleNotificationsLoading"
);
const stopToggleNotificationsLoading = makeStopLoading<State>(
  "toggleNotificationsLoading"
);

const update: component_.page.Update<State, InnerMsg, Route> = ({
  state,
  msg
}) => {
  switch (msg.tag) {
    case "onInitResponse": {
      const [cwuResponse, swuResponse, twuResponse] = msg.value;
      let cwu: CWUO.CWUOpportunitySlim[] = [];
      let swu: SWUO.SWUOpportunitySlim[] = [];
      let twu: TWUO.TWUOpportunitySlim[] = [];
      if (
        api.isValid(cwuResponse) &&
        api.isValid(swuResponse) &&
        api.isValid(twuResponse)
      ) {
        cwu = cwuResponse.value;
        swu = swuResponse.value;
        twu = twuResponse.value;
      }
      const opportunities = categorizeOpportunities(cwu, swu, twu);
      return [
        state
          .set("opportunities", opportunities)
          .set("visibleOpportunities", opportunities),
        [component_.cmd.dispatch(component_.page.readyMsg())]
      ];
    }
    case "typeFilter":
      return component_.base.updateChild({
        state,
        childStatePath: ["typeFilter"],
        childUpdate: Select.update,
        childMsg: msg.value,
        mapChildMsg: (msg) => adt("typeFilter", msg),
        updateAfter: (state) =>
          [state, [dispatchSearch()]] as component_.page.UpdateReturnValue<
            State,
            InnerMsg,
            Route
          >
      });
    case "statusFilter":
      return component_.base.updateChild({
        state,
        childStatePath: ["statusFilter"],
        childUpdate: Select.update,
        childMsg: msg.value,
        mapChildMsg: (msg) => adt("statusFilter", msg),
        updateAfter: (state) =>
          [state, [dispatchSearch()]] as component_.page.UpdateReturnValue<
            State,
            InnerMsg,
            Route
          >
      });
    case "remoteOkFilter":
      return component_.base.updateChild({
        state,
        childStatePath: ["remoteOkFilter"],
        childUpdate: Checkbox.update,
        childMsg: msg.value,
        mapChildMsg: (msg) => adt("remoteOkFilter", msg),
        updateAfter: (state) =>
          [state, [dispatchSearch()]] as component_.page.UpdateReturnValue<
            State,
            InnerMsg,
            Route
          >
      });
    case "searchFilter":
      return component_.base.updateChild({
        state,
        childStatePath: ["searchFilter"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (msg) => adt("searchFilter", msg),
        updateAfter: (state) =>
          [state, [dispatchSearch()]] as component_.page.UpdateReturnValue<
            State,
            InnerMsg,
            Route
          >
      });
    case "toggleNotifications":
      if (!state.viewerUser) return [state, []];
      return [
        startToggleNotificationsLoading(state),
        [
          api.users.update<Msg>()(
            state.viewerUser.id,
            adt("updateNotifications", !state.viewerUser.notificationsOn),
            (response) => adt("onToggleNotificationsResponse", response)
          )
        ]
      ];
    case "onToggleNotificationsResponse": {
      const response = msg.value;
      state = stopToggleNotificationsLoading(state);
      if (api.isValid(response)) {
        state = state.set("viewerUser", response.value);
      }
      return [state, []];
    }
    case "toggleWatch": {
      const category = msg.value[0];
      const id = msg.value[1];
      const opportunity: Opportunity | null = find(
        state.opportunities[category],
        (o) => o.value.id === id
      );
      if (!opportunity) {
        return [state, []];
      }
      const program = opportunity.tag;
      const makeOnToggleWatchResponse = (
        response: api.ResponseValidation<unknown, unknown>
      ) =>
        adt("onToggleWatchResponse", [
          category,
          id,
          api.isValid(response)
        ]) as Msg;
      const requestCmd = opportunity.value.subscribed
        ? api.subscribers[program].delete_<Msg>()(id, makeOnToggleWatchResponse)
        : api.subscribers[program].create<Msg>()(
            { opportunity: id },
            makeOnToggleWatchResponse
          );
      return [state.set("toggleWatchLoading", msg.value), [requestCmd]];
    }
    case "onToggleWatchResponse": {
      const [category, id, isResponseValid] = msg.value;
      state = state.set("toggleWatchLoading", null);
      if (isResponseValid) {
        state = state.update("opportunities", (os) => ({
          ...os,
          [category]: os[category].map((o) => {
            if (o.value.id === id) {
              o.value.subscribed = !o.value.subscribed;
            }
            return o;
          })
        }));
        return [runSearch(state), []];
      } else {
        return [state, []];
      }
    }
    case "search":
      return [runSearch(state), []];
    case "toggleUnpublishedList":
      return [state.update("unpublishedListOpen", (v) => !v), []];
    case "toggleOpenList":
      return [state.update("openListOpen", (v) => !v), []];
    case "toggleClosedList":
      return [state.update("closedListOpen", (v) => !v), []];
    default:
      return [state, []];
  }
};

const Header: component_.page.View<State, InnerMsg, Route> = () => {
  return (
    <Row>
      <Col xs="12">
        <h1 className="mb-4">Welcome to the Digital Marketplace</h1>
      </Col>
      <Col xs="12" md="4" className="mb-4 mb-md-0">
        <div className="rounded bg-c-opportunity-list-learn-more-bg p-4 h-100 d-flex flex-column align-items-start flex-nowrap">
          <ProgramType type_="cwu" className="mb-2" />
          <p className="mb-3 font-size-small">
            <em>Code With Us</em> opportunities pay a fixed price for meeting
            acceptance criteria.
          </p>
          <Link
            className="font-size-small mt-auto"
            symbol_={rightPlacement(iconLinkSymbol("arrow-right"))}
            iconSymbolSize={0.9}
            dest={routeDest(adt("learnMoreCWU", null))}>
            Learn More
          </Link>
        </div>
      </Col>
      <Col xs="12" md="4" className="mb-4 mb-md-0">
        <div className="rounded bg-c-opportunity-list-learn-more-bg p-4 h-100 d-flex flex-column align-items-start flex-nowrap">
          <ProgramType type_="twu" className="mb-2" />
          <p className="mb-3 font-size-small">
            <em>Team With Us</em> opportunities are for registered organizations
            that are pre-qualified to supply individual resources for a given
            service area (e.g., Full-Stack Developer).
          </p>
          <Link
            className="font-size-small mt-auto"
            symbol_={rightPlacement(iconLinkSymbol("arrow-right"))}
            iconSymbolSize={0.9}
            dest={routeDest(adt("learnMoreTWU", null))}>
            Learn More
          </Link>
        </div>
      </Col>
      <Col xs="12" md="4">
        <div className="rounded bg-c-opportunity-list-learn-more-bg p-4 h-100 d-flex flex-column align-items-start flex-nowrap">
          <ProgramType type_="swu" className="mb-2" />
          <p className="mb-3 font-size-small">
            <em>Sprint With Us</em> opportunities are for registered
            organizations that can supply teams.
          </p>
          <Link
            className="font-size-small mt-auto"
            symbol_={rightPlacement(iconLinkSymbol("arrow-right"))}
            iconSymbolSize={0.9}
            dest={routeDest(adt("learnMoreSWU", null))}>
            Learn More
          </Link>
        </div>
      </Col>
    </Row>
  );
};

const Filters: component_.page.View<State, InnerMsg, Route> = ({
  state,
  dispatch
}) => {
  const userIsGov =
    state.viewerUser?.type === UserType.Admin ||
    state.viewerUser?.type === UserType.Government;
  return (
    <Row className="mt-5">
      <Col xs="12" md="3" className="d-flex align-items-end order-1">
        <Select.view
          extraChildProps={{}}
          label="Filter Opportunities"
          placeholder="All Opportunity Types"
          disabled={isLoading(state)}
          state={state.typeFilter}
          className="flex-grow-1"
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("typeFilter" as const, value)
          )}
        />
      </Col>
      {userIsGov ? (
        <Col xs="12" md="3" className="d-flex align-items-end order-1">
          <Select.view
            extraChildProps={{}}
            placeholder="All Opportunity Statuses"
            disabled={isLoading(state)}
            state={state.statusFilter}
            className="flex-grow-1"
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("statusFilter" as const, value)
            )}
          />
        </Col>
      ) : null}
      <Col xs="12" md="2" className="d-flex align-items-end order-3 order-md-2">
        <div className="mb-n2">
          <Checkbox.view
            extraChildProps={{ inlineLabel: "Remote OK" }}
            disabled={isLoading(state)}
            state={state.remoteOkFilter}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("remoteOkFilter" as const, value)
            )}
          />
        </div>
      </Col>
      <Col
        xs="12"
        md="4"
        className="d-flex align-items-end order-2 order-md-3 ms-auto">
        <ShortText.view
          extraChildProps={{}}
          placeholder="Search by Title or Location"
          disabled={isLoading(state)}
          state={state.searchFilter}
          className="flex-grow-1"
          dispatch={component_.base.mapDispatch(dispatch, (value) =>
            adt("searchFilter" as const, value)
          )}
        />
      </Col>
    </Row>
  );
};

interface OpportunityCardProps {
  opportunity: Opportunity;
  viewerUser?: User;
  disabled: boolean;
  isWatchLoading: boolean;
  toggleWatch(): void;
}

const OpportunityCard: component_.base.View<OpportunityCardProps> = ({
  opportunity,
  viewerUser,
  toggleWatch,
  isWatchLoading,
  disabled
}) => {
  const subscribed = opportunity.value.subscribed;
  const dest: Route = (() => {
    const view: Route = oppHelpers(opportunity).list.getOppViewRoute(
      opportunity.value.id
    );
    const edit: Route = oppHelpers(opportunity).list.getOppEditRoute(
      opportunity.value.id
    );
    if (!viewerUser) {
      return view;
    }
    switch (viewerUser.type) {
      case UserType.Admin:
        return edit;
      case UserType.Vendor:
        return view;
      case UserType.Government:
        if (opportunity.value.createdBy?.id === viewerUser.id) {
          return edit;
        } else {
          return view;
        }
    }
  })();
  const isAcceptingProposals = oppHelpers(
    opportunity
  ).list.isOpportunityAcceptingProposals(opportunity.value);

  return (
    <Col xs="12" md="6" className="mb-4h" style={{ minHeight: "320px" }}>
      <div className="overflow-hidden shadow-hover w-100 h-100 rounded-3 border align-items-stretch d-flex flex-column align-items-stretch">
        <Link
          disabled={disabled}
          style={{ outline: "none" }}
          className="bg-hover-c-opportunity-list-card-hover-bg text-decoration-none d-flex flex-column align-items-stretch p-4 flex-grow-1"
          color="body"
          dest={routeDest(dest)}>
          <h5 className="mb-2">{opportunity.value.title}</h5>
          <ProgramType type_={opportunity.tag} />
          <div className="mt-3 font-size-small d-flex flex-column flex-sm-row flex-nowrap align-items-start align-items-sm-center text-body">
            <OpportunityBadge
              opportunity={opportunity}
              viewerUser={viewerUser}
              className="mb-2 mb-sm-0"
            />
            <IconInfo
              small
              name="alarm-clock-outline"
              value={`Close${
                isAcceptingProposals ? "s" : "d"
              } ${formatDateAtTime(opportunity.value.proposalDeadline, true)}`}
              className="ms-sm-3 flex-shrink-0"
            />
          </div>
          <p className="mt-3 mb-0 text-secondary font-size-small">
            {opportunity.value.teaser}
          </p>
        </Link>
        <div
          style={{ minHeight: "4rem" }}
          className="px-4 pt-3 border-top d-flex flex-wrap mt-auto flex-shrink-0 flex-grow-0 font-size-small align-items-center">
          <IconInfo
            small
            className="me-3 mb-3"
            value={formatAmount(
              oppHelpers(opportunity).list.getOppDollarAmount(
                opportunity.value
              ),
              "$"
            )}
            name="badge-dollar-outline"
          />
          <IconInfo
            small
            className="me-3 mb-3 d-none d-sm-flex"
            value={opportunity.value.location}
            name="map-marker-outline"
          />
          <div className="me-auto">
            {opportunity.value.remoteOk ? (
              <IconInfo
                small
                className="me-3 mb-3"
                value="Remote OK"
                name="laptop-outline"
              />
            ) : null}
          </div>
          {viewerUser &&
          subscribed !== undefined &&
          opportunity.value.createdBy?.id !== viewerUser.id ? (
            <Link
              button
              loading={isWatchLoading}
              disabled={disabled}
              outline={!subscribed}
              size="sm"
              color={subscribed ? "info" : "primary"}
              symbol_={leftPlacement(
                iconLinkSymbol(subscribed ? "check" : "eye")
              )}
              className="mb-3"
              onClick={toggleWatch}>
              {subscribed ? "Watching" : "Watch"}
            </Link>
          ) : null}
        </div>
      </div>
    </Col>
  );
};

interface OpportunityListProps {
  title: string;
  isOpen: boolean;
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
  toggleAccordion(): void;
}

const OpportunityList: component_.base.View<OpportunityListProps> = ({
  isOpen,
  disabled,
  toggleWatchLoading,
  className,
  title,
  noneText,
  opportunities,
  showCount,
  toggleWatch,
  toggleNotifications,
  viewerUser,
  toggleNotificationsLoading,
  toggleAccordion
}) => {
  const badge =
    showCount && opportunities.length ? (
      <Badge
        pill
        color="success"
        text={String(opportunities.length)}
        className="font-size-small ms-2"
      />
    ) : undefined;
  return (
    <Row className="position-relative">
      {viewerUser && toggleNotifications ? (
        <Col
          className="col-auto position-absolute d-md-flex d-none align-items-center flex-nowrap"
          style={{ top: "0px", right: "0px", zIndex: 2 }}>
          {toggleNotificationsLoading ? (
            <Spinner size="sm" color="secondary" className="mx-2" />
          ) : null}
          <Link
            className="order-1 order-md-2"
            disabled={disabled}
            onClick={toggleNotifications}
            color={viewerUser.notificationsOn ? "secondary" : undefined}
            symbol_={leftPlacement(
              iconLinkSymbol(
                viewerUser.notificationsOn
                  ? "bell-slash-outline"
                  : "bell-outline"
              )
            )}>
            {viewerUser.notificationsOn
              ? "Stop notifying me about new opportunities"
              : "Notify me about new opportunities"}
          </Link>
        </Col>
      ) : null}
      <Col xs="12">
        <Accordion
          className={className}
          toggle={() => toggleAccordion()}
          color="info"
          title={
            <div className="d-flex align-items-center flex-nowrap">
              {title}
              {badge}
            </div>
          }
          titleClassName="h4 mb-0"
          iconWidth={2}
          iconHeight={2}
          iconClassName="me-3"
          chevronWidth={1.5}
          chevronHeight={1.5}
          chevronClassName="ms-3"
          linkClassName="w-auto"
          open={isOpen}
          childrenWrapperClassName={isOpen ? "pt-2" : ""}>
          {opportunities.length ? (
            <Row>
              {opportunities.map((o, i) => (
                <OpportunityCard
                  key={`opportunity-list-${i}`}
                  opportunity={o}
                  viewerUser={viewerUser}
                  isWatchLoading={toggleWatchLoading === o.value.id}
                  disabled={disabled}
                  toggleWatch={() => toggleWatch(o.value.id)}
                />
              ))}
            </Row>
          ) : (
            noneText
          )}
        </Accordion>
      </Col>
    </Row>
  );
};

const Opportunities: component_.page.View<State, InnerMsg, Route> = ({
  state,
  dispatch
}) => {
  const toggleWatch = (category: OpportunityCategory) => (id: Id) =>
    dispatch(adt("toggleWatch", [category, id]) as Msg);
  const toggleNotifications = () => dispatch(adt("toggleNotifications"));
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
    <div className="mt-5 pt-5 border-top">
      {hasUnpublished ? (
        <OpportunityList
          title="Unpublished Opportunities"
          noneText={
            opps.unpublished.length !== state.opportunities.unpublished.length
              ? "There are no unpublished opportunities that match your search criteria."
              : "There are currently no unpublished opportunities."
          }
          opportunities={opps.unpublished}
          viewerUser={state.viewerUser}
          className={`pt-0 ${state.unpublishedListOpen ? "pb-3" : "pb-5"}`}
          disabled={isDisabled}
          toggleWatchLoading={getToggleWatchLoadingId("unpublished")}
          toggleNotificationsLoading={isToggleNotificationsLoading}
          showCount
          toggleWatch={toggleWatch("unpublished")}
          toggleNotifications={toggleNotifications}
          isOpen={state.unpublishedListOpen}
          toggleAccordion={() => dispatch(adt("toggleUnpublishedList"))}
        />
      ) : null}
      <OpportunityList
        title="Open Opportunities"
        noneText={
          opps.open.length !== state.opportunities.open.length
            ? "There are no open opportunities that match your search criteria."
            : "There are currently no open opportunities. Check back soon!"
        }
        opportunities={opps.open}
        viewerUser={state.viewerUser}
        className={`pt-0 ${state.openListOpen ? "pb-3" : "pb-5"}`}
        disabled={isDisabled}
        toggleWatchLoading={getToggleWatchLoadingId("open")}
        toggleNotificationsLoading={isToggleNotificationsLoading}
        showCount
        toggleWatch={toggleWatch("open")}
        toggleNotifications={hasUnpublished ? undefined : toggleNotifications}
        isOpen={state.openListOpen}
        toggleAccordion={() => dispatch(adt("toggleOpenList"))}
      />
      <OpportunityList
        title="Closed Opportunities"
        noneText={
          opps.closed.length !== state.opportunities.closed.length
            ? "There are no closed opportunities that match your search criteria."
            : "There are currently no closed opportunities."
        }
        opportunities={opps.closed}
        viewerUser={state.viewerUser}
        className="pt-0 pb-0"
        disabled={isDisabled}
        toggleWatchLoading={getToggleWatchLoadingId("closed")}
        toggleWatch={toggleWatch("closed")}
        isOpen={state.closedListOpen}
        toggleAccordion={() => dispatch(adt("toggleClosedList"))}
      />
    </div>
  );
};

const view: component_.page.View<State, InnerMsg, Route> = (props) => {
  return (
    <div>
      <Header {...props} />
      <Filters {...props} />
      <Opportunities {...props} />
    </div>
  );
};

export const component: component_.page.Component<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = {
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata("Opportunities");
  },
  getActions({ state }) {
    if (!state.viewerUser || isVendor(state.viewerUser)) {
      return component_.page.actions.none();
    }
    return component_.page.actions.links([
      {
        children: "Create Opportunity",
        button: true,
        disabled: isLoading(state),
        color: "primary" as const,
        symbol_: leftPlacement(iconLinkSymbol("plus-circle")),
        dest: routeDest(adt("opportunityCreate", null))
      }
    ]);
  }
};
