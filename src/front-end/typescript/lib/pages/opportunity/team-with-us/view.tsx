import { EMPTY_STRING, TWU_QUALIFICATION_TERMS_ID } from "front-end/config";
import {
  makePageMetadata,
  makeStartLoading,
  makeStopLoading
} from "front-end/lib";
import { Route, SharedState } from "front-end/lib/app/types";
import * as Table from "front-end/lib/components/table";
import { AddendaList } from "front-end/lib/components/addenda";
import { AttachmentList } from "front-end/lib/components/attachments";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import { OpportunityBadge } from "front-end/lib/views/badge";
import DateMetadata from "front-end/lib/views/date-metadata";
import GotQuestions from "front-end/lib/views/got-questions";
import Icon, { AvailableIcons, IconInfo } from "front-end/lib/views/icon";
import Link, {
  emailDest,
  iconLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";
import Markdown from "front-end/lib/views/markdown";
import OpportunityInfo from "front-end/lib/views/opportunity-info";
import ProgramType from "front-end/lib/views/program-type";
import Skills from "front-end/lib/views/skills";
import TabbedNav, { Tab } from "front-end/lib/views/tabbed-nav";
import React, { Fragment } from "react";
import { Col, Container, Row } from "reactstrap";
import { CONTACT_EMAIL } from "shared/config";
import { formatAmount, formatDate, formatDateAtTime } from "shared/lib";
import { getTWUOpportunityViewsCounterName } from "shared/lib/resources/counter";
import {
  TWUOpportunity,
  DEFAULT_OPPORTUNITY_TITLE,
  isTWUOpportunityAcceptingProposals
} from "shared/lib/resources/opportunity/team-with-us";
import { TWUProposalSlim } from "shared/lib/resources/proposal/team-with-us";
import { isVendor, User, UserType } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import { lowerCase, startCase } from "lodash";
import { Content } from "shared/lib/resources/content";
import {
  OrganizationSlim,
  doesOrganizationMeetTWUQualification,
  doesOrganizationProvideServiceAreas
} from "shared/lib/resources/organization";
import { aggregateResourceSkills } from "front-end/lib/pages/opportunity/team-with-us/lib";

type InfoTab = "details" | "competitionRules" | "attachments" | "addenda";

type Qualification =
  | "notQualified"
  | "qualifiedCorrectServiceArea"
  | "qualifiedIncorrectServiceArea";

export interface State {
  toggleWatchLoading: number;
  opportunity: TWUOpportunity | null;
  existingProposal: TWUProposalSlim | null;
  viewerUser: User | null;
  activeInfoTab: InfoTab;
  routePath: string;
  competitionRulesContent: string;
  qualification: Qualification;
  table: Immutable<Table.State>;
}

export type InnerMsg =
  | ADT<"noop">
  | ADT<
      "onInitResponse",
      [
        string,
        api.ResponseValidation<TWUOpportunity, string[]>,
        TWUProposalSlim | null,
        api.ResponseValidation<Content, string[]>,
        api.ResponseValidation<OrganizationSlim[], string[]>
      ]
    >
  | ADT<"toggleWatch">
  | ADT<"onToggleWatchResponse", boolean>
  | ADT<"setActiveInfoTab", InfoTab>
  | ADT<"table", Table.Msg>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

export interface RouteParams {
  opportunityId: Id;
}

const init: component_.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = ({ routeParams, shared, routePath }) => {
  const { opportunityId } = routeParams;
  const viewerUser = shared.session?.user || null;
  const [tableState, tableCmds] = Table.init({
    idNamespace: "resources-table"
  });
  return [
    {
      toggleWatchLoading: 0,
      viewerUser,
      opportunity: null,
      existingProposal: null,
      activeInfoTab: "details",
      routePath,
      competitionRulesContent: "",
      qualification: "notQualified",
      table: immutable(tableState)
    },
    [
      api.counters.update<Msg>()(
        getTWUOpportunityViewsCounterName(opportunityId),
        null,
        () => adt("noop")
      ),
      component_.cmd.join4(
        api.opportunities.twu.readOne()(opportunityId, (response) => response),
        viewerUser && isVendor(viewerUser)
          ? api.proposals.twu.readExistingProposalForOpportunity(
              opportunityId,
              (response) => response
            )
          : component_.cmd.dispatch(null),
        api.content.readOne()(
          TWU_QUALIFICATION_TERMS_ID,
          (response) => response
        ),
        api.organizations.owned.readMany()((response) => response),
        (
          opportunityResponse,
          proposalResponse,
          competitionRulesContentResponse,
          organizationsResponse
        ) =>
          adt("onInitResponse", [
            routePath,
            opportunityResponse,
            proposalResponse,
            competitionRulesContentResponse,
            organizationsResponse
          ]) as Msg
      ),
      ...component_.cmd.mapMany(tableCmds, (msg) => adt("table", msg) as Msg)
    ]
  ];
};

const startToggleWatchLoading = makeStartLoading<State>("toggleWatchLoading");
const stopToggleWatchLoading = makeStopLoading<State>("toggleWatchLoading");

const update: component_.page.Update<State, InnerMsg, Route> = ({
  state,
  msg
}) => {
  switch (msg.tag) {
    case "onInitResponse": {
      const [
        routePath,
        opportunityResponse,
        proposalResponse,
        competitionRulesContentResponse,
        organizationsResponse
      ] = msg.value;
      if (!api.isValid(opportunityResponse)) {
        return [
          state,
          [
            component_.cmd.dispatch(
              component_.global.replaceRouteMsg(
                adt("notFound", { path: routePath }) as Route
              )
            )
          ]
        ];
      }
      const opportunity = opportunityResponse.value;
      state = state.set("opportunity", opportunity);

      if (proposalResponse) {
        state = state.set("existingProposal", proposalResponse);
      }
      if (
        competitionRulesContentResponse &&
        api.isValid(competitionRulesContentResponse)
      ) {
        state = state.set(
          "competitionRulesContent",
          competitionRulesContentResponse.value.body
        );
      }
      const organizations = api.getValidValue(organizationsResponse, []);

      // Assume lowest level of qualification and qualify upwards
      const qualification = organizations.reduce(
        (qualification: Qualification, organization) => {
          if (doesOrganizationMeetTWUQualification(organization)) {
            if (
              doesOrganizationProvideServiceAreas(
                organization,
                opportunity.resources
              )
            ) {
              return "qualifiedCorrectServiceArea";
            } else if (qualification !== "qualifiedCorrectServiceArea") {
              return "qualifiedIncorrectServiceArea";
            }
          }
          return qualification;
        },
        "notQualified"
      );
      state = state.set("qualification", qualification);
      return [state, [component_.cmd.dispatch(component_.page.readyMsg())]];
    }
    case "setActiveInfoTab":
      return [state.set("activeInfoTab", msg.value), []];
    case "toggleWatch": {
      if (!state.opportunity) return [state, []];
      const id = state.opportunity.id;
      return [
        startToggleWatchLoading(state),
        [
          state.opportunity.subscribed
            ? api.subscribers.twu.delete_<Msg>()(id, (response) =>
                adt("onToggleWatchResponse", api.isValid(response))
              )
            : api.subscribers.twu.create<Msg>()(
                { opportunity: id },
                (response) =>
                  adt("onToggleWatchResponse", api.isValid(response))
              )
        ]
      ];
    }
    case "onToggleWatchResponse": {
      const isValid = msg.value;
      if (isValid) {
        state = state.update(
          "opportunity",
          (o) =>
            o && {
              ...o,
              subscribed: !o.subscribed
            }
        );
      }
      return [stopToggleWatchLoading(state), []];
    }
    case "table":
      return component_.base.updateChild({
        state,
        childStatePath: ["table", "state"],
        childUpdate: Table.update,
        childMsg: msg.value,
        mapChildMsg: (value) => ({ tag: "table", value })
      });
    default:
      return [state, []];
  }
};
const Header: component_.base.ComponentView<State, Msg> = ({
  state,
  dispatch
}) => {
  if (!state.opportunity) return null;
  const opp = state.opportunity;
  const isToggleWatchLoading = state.toggleWatchLoading > 0;
  const isAcceptingProposals = isTWUOpportunityAcceptingProposals(
    state.opportunity
  );
  const competitionNoticeOpportunityId = "DO-2024-1";
  return (
    <div>
      <Container>
        <Row>
          <Col xs="12">
            <DateMetadata
              className="mb-2"
              dates={[
                opp.publishedAt
                  ? {
                      tag: "date",
                      date: opp.publishedAt,
                      label: "Published",
                      withTimeZone: true
                    }
                  : null,
                {
                  tag: "date",
                  date: opp.updatedAt,
                  label: "Updated",
                  withTimeZone: true
                }
              ]}
            />
            <p className="fst-italic small text-secondary mb-5">
              This RFP is a Competition Notice under Opportunity ID{" "}
              {competitionNoticeOpportunityId} and is restricted to Proponents
              that have become Qualified Suppliers pursuant to that Opportunity.
            </p>
          </Col>
        </Row>
        <Row className="align-items-center">
          <Col xs="12" md="6" lg="6">
            <h2 className="mb-2">{opp.title || DEFAULT_OPPORTUNITY_TITLE}</h2>
            <ProgramType size="lg" type_="twu" className="mb-4" />
            <div className="d-flex flex-column flex-sm-row flex-nowrap align-items-start align-items-md-center mb-4">
              <OpportunityBadge
                opportunity={adt("twu", opp)}
                viewerUser={state.viewerUser || undefined}
                className="mb-2 mb-sm-0"
              />
              <IconInfo
                name="alarm-clock-outline"
                value={`Close${
                  isAcceptingProposals ? "s" : "d"
                } ${formatDateAtTime(opp.proposalDeadline, true)}`}
                className="ms-sm-3 flex-shrink-0"
              />
            </div>
            {opp.teaser ? (
              <p className="text-secondary mb-4">{opp.teaser}</p>
            ) : null}
            <div className="d-flex flex-nowrap align-items-center">
              <Link
                disabled={isToggleWatchLoading}
                dest={emailDest([CONTACT_EMAIL, opp.title])}
                symbol_={leftPlacement(iconLinkSymbol("envelope"))}
                color="info"
                size="sm"
                outline
                button>
                Contact
              </Link>
              {state.viewerUser && state.viewerUser.id !== opp.createdBy?.id ? (
                <Link
                  className="ms-3"
                  disabled={isToggleWatchLoading}
                  loading={isToggleWatchLoading}
                  onClick={() => dispatch(adt("toggleWatch"))}
                  symbol_={leftPlacement(
                    iconLinkSymbol(opp.subscribed ? "check" : "eye")
                  )}
                  color={opp.subscribed ? "info" : "primary"}
                  size="sm"
                  outline={!opp.subscribed}
                  button>
                  {opp.subscribed ? "Watching" : "Watch"}
                </Link>
              ) : null}
            </div>
          </Col>
          <Col
            xs="12"
            md="6"
            lg={{ offset: 1, size: 5 }}
            className="mt-5 mt-md-0 ps-md-4">
            <Row className="mb-4 mb-md-5">
              <Col
                xs="6"
                className="d-flex justify-content-start align-items-start flex-nowrap">
                <OpportunityInfo
                  icon="calendar"
                  name="Closing Date"
                  value={formatDate(opp.proposalDeadline)}
                />
              </Col>
              <Col
                xs="6"
                className="d-flex justify-content-start align-items-start flex-nowrap">
                <OpportunityInfo
                  icon="badge-dollar-outline"
                  name="Maximum Contract Value"
                  value={
                    opp.maxBudget
                      ? formatAmount(opp.maxBudget, "$")
                      : EMPTY_STRING
                  }
                />
              </Col>
            </Row>
            <Row className="mb-4 mb-md-5">
              <Col
                xs="6"
                className="d-flex justify-content-start align-items-start flex-nowrap">
                <OpportunityInfo
                  icon="map-marker"
                  name="Location"
                  value={opp.location}
                />
              </Col>
              <Col
                xs="6"
                className="d-flex justify-content-start align-items-start flex-nowrap">
                <OpportunityInfo
                  icon="map"
                  name="Remote OK?"
                  value={opp.remoteOk ? "Yes" : "No"}
                />
              </Col>
            </Row>
            <Row>
              <Col
                xs="6"
                className="d-flex justify-content-start align-items-start flex-nowrap">
                <OpportunityInfo
                  icon="award"
                  name="Contract Award Date"
                  value={formatDate(opp.assignmentDate)}
                />
              </Col>
              <Col
                xs="6"
                className="d-flex justify-content-start align-items-start flex-nowrap">
                <OpportunityInfo
                  icon="calendar"
                  name="Contract Start Date"
                  value={formatDate(opp.startDate)}
                />
              </Col>
            </Row>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

const InfoDetailsHeading: component_.base.View<{
  icon: AvailableIcons;
  text: string;
}> = ({ icon, text }) => {
  return (
    <div className="d-flex align-items-start flex-nowrap mb-3">
      <Icon
        name={icon}
        width={1.5}
        height={1.5}
        className="flex-shrink-0"
        style={{ marginTop: "0.3rem" }}
      />
      <h4 className="mb-0 ms-2">{text}</h4>
    </div>
  );
};

function resourceTableHeadCells(): Table.HeadCells {
  return [
    {
      children: "Resource",
      className: "text-nowrap",
      style: { width: "100%" }
    },
    {
      children: "Allocation %",
      className: "text-nowrap text-center",
      style: { width: "0px" }
    }
  ];
}

function resourceTableBodyRows(state: Immutable<State>): Table.BodyRows {
  return (
    state.opportunity?.resources.map(({ serviceArea, targetAllocation }) => [
      { children: startCase(lowerCase(serviceArea)) },
      { children: targetAllocation.toString(), className: "text-center" }
    ]) ?? []
  );
}

const ResourcesTable: component_.base.ComponentView<State, Msg> = ({
  state,
  dispatch
}) => {
  return (
    <Table.view
      headCells={resourceTableHeadCells()}
      bodyRows={resourceTableBodyRows(state)}
      state={state.table}
      dispatch={component_.base.mapDispatch(dispatch, (msg) =>
        adt("table" as const, msg)
      )}
      hover={false}
    />
  );
};

const InfoDetails: component_.base.ComponentView<State, Msg> = ({
  state,
  dispatch
}) => {
  const opp = state.opportunity;
  if (!opp) return null;

  const skills = aggregateResourceSkills(opp);

  return (
    <Row>
      <Col xs="12">
        <h3 className="mb-0">Details</h3>
      </Col>
      <Col xs="12" className="mt-5">
        <InfoDetailsHeading
          icon="laptop-code-outline"
          text={`Service Area${opp.resources.length ? "s" : ""}`}
        />
        <ResourcesTable state={state} dispatch={dispatch} />
      </Col>
      <Col xs="12" className="mt-5">
        <InfoDetailsHeading icon="toolbox-outline" text="Required Skills" />
        <p className="mb-2">
          To submit a proposal for this opportunity, you must possess the
          following skills:
        </p>
        <Skills skills={skills.mandatory} />
        {skills.optional.length ? (
          <Fragment>
            <p className="mt-3 mb-2">
              Additionally, possessing the following skills would be considered
              a bonus:
            </p>
            <Skills skills={skills.optional} />
          </Fragment>
        ) : null}
      </Col>
      <Col xs="12" className="mt-5">
        <InfoDetailsHeading
          icon="info-circle-outline"
          text="Description and Contract Details"
        />
        <Markdown
          source={opp.description || EMPTY_STRING}
          smallerHeadings
          openLinksInNewTabs
        />
      </Col>
      {opp.remoteOk && opp.remoteDesc ? (
        <Col xs="12" className="mt-5">
          <InfoDetailsHeading icon="map" text="Remote Work Options" />
          <p className="mb-0" style={{ whiteSpace: "pre-line" }}>
            {opp.remoteDesc}
          </p>
        </Col>
      ) : null}
    </Row>
  );
};

const InfoCompetitionRules: component_.base.ComponentView<State, Msg> = ({
  state
}) => {
  return (
    <Row>
      <Col xs="12">
        <h3 className="mb-0">Competition Rules</h3>
      </Col>
      <Col xs="12" className="mt-4">
        <Markdown source={state.competitionRulesContent} openLinksInNewTabs />
      </Col>
    </Row>
  );
};

const InfoAttachments: component_.base.ComponentView<State, Msg> = ({
  state
}) => {
  if (!state.opportunity) return null;
  const attachments = state.opportunity.attachments;
  return (
    <Row>
      <Col xs="12">
        <h3 className="mb-0">Attachments</h3>
      </Col>
      <Col xs="12" className="mt-4">
        {attachments.length ? (
          <AttachmentList files={state.opportunity.attachments} />
        ) : (
          "There are currently no attachments for this opportunity."
        )}
      </Col>
    </Row>
  );
};

const InfoAddenda: component_.base.ComponentView<State, Msg> = ({ state }) => {
  if (!state.opportunity) return null;
  const addenda = state.opportunity.addenda;
  return (
    <Row>
      <Col xs="12">
        <h3 className="mb-0">Addenda</h3>
      </Col>
      <Col xs="12" className="mt-4">
        {addenda.length ? (
          <AddendaList addenda={state.opportunity.addenda} />
        ) : (
          "There are currently no addenda for this opportunity."
        )}
      </Col>
    </Row>
  );
};

const InfoTabs: component_.base.ComponentView<State, Msg> = ({
  state,
  dispatch
}) => {
  const activeTab = state.activeInfoTab;
  const opp = state.opportunity;
  if (!opp) return null;
  const getTabInfo = (tab: InfoTab) => ({
    active: activeTab === tab,
    onClick: () => dispatch(adt("setActiveInfoTab", tab))
  });
  const tabs: Tab[] = [
    {
      ...getTabInfo("details"),
      text: "Details"
    },
    {
      ...getTabInfo("competitionRules"),
      text: "Competition Rules"
    },
    {
      ...getTabInfo("attachments"),
      text: "Attachments",
      count: opp.attachments.length
    },
    {
      ...getTabInfo("addenda"),
      text: "Addenda",
      count: opp.addenda.length
    }
  ];
  return (
    <Row className="mb-5">
      <Col xs="12">
        <TabbedNav tabs={tabs} />
      </Col>
    </Row>
  );
};

const Info: component_.base.ComponentView<State, Msg> = (props) => {
  const { state } = props;
  if (!state.opportunity) return null;
  const activeTab = (() => {
    switch (state.activeInfoTab) {
      case "details":
        return <InfoDetails {...props} />;
      case "competitionRules":
        return <InfoCompetitionRules {...props} />;
      case "attachments":
        return <InfoAttachments {...props} />;
      case "addenda":
        return <InfoAddenda {...props} />;
    }
  })();
  return (
    <div className="mt-6">
      <Container>
        <InfoTabs {...props} />
        <Row>
          <Col xs="12" md="8">
            {activeTab}
          </Col>
          <Col
            xs="12"
            md="4"
            lg={{ offset: 1, size: 3 }}
            className="mt-5 mt-md-0">
            <GotQuestions
              disabled={state.toggleWatchLoading > 0}
              title={state.opportunity.title}
            />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

const HowToApply: component_.base.ComponentView<State, Msg> = ({ state }) => {
  if (!state.opportunity) return null;
  const viewerUser = state.viewerUser;
  if (
    (viewerUser && !isVendor(viewerUser)) ||
    !isTWUOpportunityAcceptingProposals(state.opportunity)
  ) {
    return null;
  }
  return (
    <div className="bg-c-opportunity-view-apply-bg py-5 mt-auto">
      <Container>
        <Row>
          <Col xs="12" md="8">
            <h3 className="mb-4">How To Apply</h3>
            <p>
              To submit a proposal for this Team With Us opportunity, you must
              have signed up for a Digital Marketplace vendor account and be a{" "}
              <Link dest={routeDest(adt("learnMoreTWU", null))}>
                Qualified Supplier
              </Link>
              .&nbsp;
              {!viewerUser ? (
                <span>
                  If you already have a vendor account, please{" "}
                  <Link
                    dest={routeDest(
                      adt("signIn", { redirectOnSuccess: state.routePath })
                    )}>
                    sign in
                  </Link>
                  .
                </span>
              ) : null}
            </p>
            <p className="mb-0">
              Please note that you will not be able to submit a proposal after
              the opportunity{"'"}s closing date and time.
            </p>
            {viewerUser &&
            isVendor(viewerUser) &&
            !state.existingProposal &&
            isTWUOpportunityAcceptingProposals(state.opportunity) &&
            state.qualification === "qualifiedCorrectServiceArea" ? (
              <Link
                disabled={state.toggleWatchLoading > 0}
                className="mt-4"
                button
                color="primary"
                dest={routeDest(
                  adt("proposalTWUCreate", {
                    opportunityId: state.opportunity.id
                  })
                )}
                symbol_={leftPlacement(iconLinkSymbol("comment-dollar"))}>
                Start Proposal
              </Link>
            ) : null}
          </Col>
          <Col
            md="4"
            lg={{ offset: 1, size: 3 }}
            className="align-items-center justify-content-center d-none d-md-flex">
            <OpportunityInfo
              icon="comment-dollar-outline"
              name="Closing Date"
              value={formatDate(state.opportunity.proposalDeadline, true)}
            />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

const Budget: component_.base.ComponentView<State, Msg> = ({ state }) => {
  const opportunity = state.opportunity;
  if (!opportunity) return null;
  const maxBudget = opportunity.maxBudget;
  return (
    <Container>
      <div className="mt-5 pt-5 border-top">
        <Row>
          <Col xs="12">
            <h3 className="mb-4">Budget</h3>
            <p className="mb-0">
              The maximum available budget for this opportunity would be{" "}
              {maxBudget ? formatAmount(maxBudget, "$") : EMPTY_STRING}{" "}
            </p>
          </Col>
        </Row>
      </div>
    </Container>
  );
};

const KeyDates: component_.base.ComponentView<State, Msg> = ({ state }) => {
  const opportunity = state.opportunity;
  if (!opportunity) return null;
  const proposal = opportunity.proposalDeadline;
  const assignment = opportunity.assignmentDate;
  const startDate = opportunity.startDate;
  const completionDate = opportunity.completionDate;
  return (
    <Container>
      <div className="mt-5 pt-5 border-top">
        <Row>
          <Col xs="12">
            <h3 className="mb-4">Key Dates</h3>
            <p className="mb-2">
              <strong>Closing Date and Time</strong>{" "}
              <span className="ms-3">{formatDateAtTime(proposal, true)}</span>
            </p>
            <p className="mb-2">
              <strong>Contract Award Date (Anticipated)</strong>{" "}
              <span className="ms-3">{formatDate(assignment, false)}</span>
            </p>
            <p className="mb-2">
              <strong>Contract Start Date (Anticipated)</strong>{" "}
              <span className="ms-3">{formatDate(startDate, false)}</span>
            </p>
            <p className="mb-2">
              <strong>Contract Completion Date (Anticipated)</strong>{" "}
              <span className="ms-3">{formatDate(completionDate, false)}</span>
            </p>
          </Col>
        </Row>
      </div>
    </Container>
  );
};
const view: component_.page.View<State, InnerMsg, Route> = (props) => {
  const isDetails = props.state.activeInfoTab === "details";
  return (
    <div className="flex-grow-1 d-flex flex-column flex-nowrap align-items-stretch">
      <div
        className={`mb-5 ${
          isDetails ? "public-details-tab-container" : "public-tab-container"
        }`}>
        <Header {...props} />
        <Info {...props} />
        {isDetails ? <Budget {...props} /> : null}
        {isDetails ? <KeyDates {...props} /> : null}
      </div>
      <HowToApply {...props} />
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
  fullWidth: true,
  init,
  update,
  view,

  getMetadata: (state) => {
    return makePageMetadata(
      state.opportunity?.title || DEFAULT_OPPORTUNITY_TITLE
    );
  },

  getAlerts: (state) => {
    const opportunity = state.opportunity;
    if (!opportunity) return component_.page.alerts.empty();
    const viewerUser = state.viewerUser;
    const existingProposal = state.existingProposal;
    const successfulProponentName = opportunity.successfulProponent?.name;
    const vendor = !!viewerUser && isVendor(viewerUser);
    const isAcceptingProposals =
      isTWUOpportunityAcceptingProposals(opportunity);
    return {
      info: (() => {
        const alerts: component_.page.alerts.Alert<Msg>[] = [];
        if (vendor && existingProposal?.submittedAt) {
          alerts.push({
            text: `You submitted a proposal to this opportunity on ${formatDateAtTime(
              existingProposal.submittedAt,
              true
            )}.`
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
                You must be{" "}
                <Link
                  dest={routeDest(
                    adt("signIn", { redirectOnSuccess: state.routePath })
                  )}>
                  signed in
                </Link>{" "}
                and a{" "}
                <Link dest={routeDest(adt("learnMoreTWU", null))}>
                  Qualified Supplier
                </Link>{" "}
                in order to submit a proposal to this opportunity.
              </span>
            )
          });
        } else if (
          isAcceptingProposals &&
          vendor &&
          state.qualification !== "qualifiedCorrectServiceArea" &&
          !existingProposal?.submittedAt &&
          isAcceptingProposals
        ) {
          switch (state.qualification) {
            case "notQualified": {
              alerts.push({
                text: (
                  <span>
                    You must be a{" "}
                    <Link dest={routeDest(adt("learnMoreTWU", null))}>
                      Qualified Supplier
                    </Link>{" "}
                    in order to submit a proposal to this opportunity.
                  </span>
                )
              });
              break;
            }
            case "qualifiedIncorrectServiceArea": {
              alerts.push({
                text: (
                  <span>
                    You must be a{" "}
                    <Link dest={routeDest(adt("learnMoreTWU", null))}>
                      Qualified Supplier
                    </Link>{" "}
                    for these Service Areas in order to submit a proposal to
                    this opportunity.
                  </span>
                )
              });
              break;
            }
          }
        }
        return alerts;
      })()
    };
  },

  getActions: ({ state }) => {
    const viewerUser = state.viewerUser;
    if (!state.opportunity || !viewerUser) {
      return component_.page.actions.none();
    }
    const isToggleWatchLoading = state.toggleWatchLoading > 0;
    const isAcceptingProposals = isTWUOpportunityAcceptingProposals(
      state.opportunity
    );
    switch (viewerUser.type) {
      case UserType.Admin:
        return component_.page.actions.links([
          {
            disabled: isToggleWatchLoading,
            children: "Edit Opportunity",
            symbol_: leftPlacement(iconLinkSymbol("edit")),
            button: true,
            color: "primary",
            dest: routeDest(
              adt("opportunityTWUEdit", {
                opportunityId: state.opportunity.id
              })
            )
          }
        ]);
      case UserType.Government:
        if (state.opportunity.createdBy?.id === viewerUser.id) {
          return component_.page.actions.links([
            {
              disabled: isToggleWatchLoading,
              children: "Edit Opportunity",
              symbol_: leftPlacement(iconLinkSymbol("edit")),
              button: true,
              color: "primary",
              dest: routeDest(
                adt("opportunityTWUEdit", {
                  opportunityId: state.opportunity.id
                })
              )
            }
          ]);
        } else {
          return component_.page.actions.none();
        }
      case UserType.Vendor:
        if (state.existingProposal) {
          return component_.page.actions.links([
            {
              disabled: isToggleWatchLoading,
              children: "View Proposal",
              symbol_: leftPlacement(iconLinkSymbol("comment-dollar")),
              button: true,
              color: "primary",
              dest: routeDest(
                adt("proposalTWUEdit", {
                  opportunityId: state.opportunity.id,
                  proposalId: state.existingProposal.id
                })
              )
            }
          ]);
        } else if (
          isAcceptingProposals &&
          state.qualification === "qualifiedCorrectServiceArea"
        ) {
          return component_.page.actions.links([
            {
              disabled: isToggleWatchLoading,
              children: "Start Proposal",
              symbol_: leftPlacement(iconLinkSymbol("comment-dollar")),
              button: true,
              color: "primary",
              dest: routeDest(
                adt("proposalTWUCreate", {
                  opportunityId: state.opportunity.id
                })
              )
            }
          ]);
        } else {
          return component_.page.actions.none();
        }
    }
  }
};
