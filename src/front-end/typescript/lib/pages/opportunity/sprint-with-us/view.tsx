import {
  EMPTY_STRING,
  SWU_OPPORTUNITY_SCOPE_CONTENT_ID
} from "front-end/config";
import {
  getAlertsValid,
  getActionsValid,
  getMetadataValid,
  makePageMetadata,
  makeStartLoading,
  makeStopLoading,
  updateValid,
  viewValid
} from "front-end/lib";
import { Route, SharedState } from "front-end/lib/app/types";
import { AddendaList } from "front-end/lib/components/addenda";
import { AttachmentList } from "front-end/lib/components/attachments";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import { OpportunityBadge } from "front-end/lib/views/badge";
import Capabilities from "front-end/lib/views/capabilities";
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
import { getSWUOpportunityViewsCounterName } from "shared/lib/resources/counter";
import {
  DEFAULT_OPPORTUNITY_TITLE,
  isSWUOpportunityAcceptingProposals,
  SWUOpportunity,
  SWUOpportunityPhase,
  swuOpportunityPhaseTypeToTitleCase
} from "shared/lib/resources/opportunity/sprint-with-us";
import { doesOrganizationMeetSWUQualification } from "shared/lib/resources/organization";
import { SWUProposalSlim } from "shared/lib/resources/proposal/sprint-with-us";
import { isVendor, User, UserType } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import { valid, Validation } from "shared/lib/validation";
import { Content } from "shared/lib/resources/content";

export type InfoTab = "details" | "scope" | "attachments" | "addenda";

export interface ValidState {
  toggleWatchLoading: number;
  opportunity: SWUOpportunity | null;
  existingProposal?: SWUProposalSlim | null;
  viewerUser: User | null;
  activeInfoTab: InfoTab;
  routePath: string;
  scopeContent: string;
  isQualified: boolean;
}

export type State = Validation<Immutable<ValidState>, null>;

export type InnerMsg =
  | ADT<"noop">
  | ADT<
      "onInitResponse",
      [
        string,
        api.ResponseValidation<SWUOpportunity, string[]>,
        SWUProposalSlim | null,
        api.ResponseValidation<Content, string[]>,
        boolean
      ]
    >
  | ADT<"toggleWatch">
  | ADT<"onToggleWatchResponse", boolean>
  | ADT<"setActiveInfoTab", InfoTab>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

export interface RouteParams {
  opportunityId: Id;
}

function canVendorStartProposal(state: Immutable<ValidState>): boolean {
  return (
    !!state.viewerUser &&
    isVendor(state.viewerUser) &&
    !state.existingProposal &&
    !!state.opportunity &&
    isSWUOpportunityAcceptingProposals(state.opportunity) &&
    state.isQualified
  );
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
  return [
    valid(
      immutable({
        toggleWatchLoading: 0,
        viewerUser,
        opportunity: null,
        existingProposal: null,
        activeInfoTab: "details",
        routePath,
        scopeContent: "",
        isQualified: false
      })
    ),
    [
      api.counters.update<Msg>()(
        getSWUOpportunityViewsCounterName(opportunityId),
        null,
        () => adt("noop")
      ),
      component_.cmd.join4(
        api.opportunities.swu.readOne()(opportunityId, (response) => response),
        viewerUser && isVendor(viewerUser)
          ? api.proposals.swu.readExistingProposalForOpportunity(
              opportunityId,
              (response) => response
            )
          : component_.cmd.dispatch(null),

        api.content.readOne()(
          SWU_OPPORTUNITY_SCOPE_CONTENT_ID,
          (response) => response
        ),
        api.organizations.owned.readMany()((response) => {
          return api
            .getValidValue(response, [])
            .reduce(
              (acc, o) => acc || doesOrganizationMeetSWUQualification(o),
              false as boolean
            );
        }),
        (opportunityResponse, proposalResponse, contentResponse, isQualified) =>
          adt("onInitResponse", [
            routePath,
            opportunityResponse,
            proposalResponse,
            contentResponse,
            isQualified
          ]) as Msg
      )
    ]
  ];
};

const startToggleWatchLoading =
  makeStartLoading<ValidState>("toggleWatchLoading");
const stopToggleWatchLoading =
  makeStopLoading<ValidState>("toggleWatchLoading");

const update: component_.page.Update<State, InnerMsg, Route> = updateValid(
  ({ state, msg }) => {
    switch (msg.tag) {
      case "onInitResponse": {
        const [
          routePath,
          opportunityResponse,
          proposalResponse,
          contentResponse,
          isQualified
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
        } else {
          state = state.set("opportunity", opportunityResponse.value);
        }
        if (proposalResponse) {
          state = state.set("existingProposal", proposalResponse);
        }
        if (contentResponse && api.isValid(contentResponse)) {
          state = state.set("scopeContent", contentResponse.value.body);
        }
        state = state.set("isQualified", isQualified);
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
              ? api.subscribers.swu.delete_<Msg>()(id, (response) =>
                  adt("onToggleWatchResponse", api.isValid(response))
                )
              : api.subscribers.swu.create<Msg>()(
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
      default:
        return [state, []];
    }
  }
);

const Header: component_.base.ComponentView<ValidState, Msg> = ({
  state,
  dispatch
}) => {
  const opportunity = state.opportunity;
  if (!opportunity) return null;
  const isToggleWatchLoading = state.toggleWatchLoading > 0;
  const isAcceptingProposals = isSWUOpportunityAcceptingProposals(opportunity);
  const compNumber =
    opportunity.publishedAt &&
    opportunity.publishedAt.valueOf() < new Date("2022-08-29").valueOf()
      ? "ON-003166"
      : "ON-003166-1";
  return (
    <div>
      <Container>
        <Row>
          <Col xs="12">
            <DateMetadata
              className="mb-2"
              dates={[
                opportunity.publishedAt
                  ? {
                      tag: "date",
                      date: opportunity.publishedAt,
                      label: "Published",
                      withTimeZone: true
                    }
                  : null,
                {
                  tag: "date",
                  date: opportunity.updatedAt,
                  label: "Updated",
                  withTimeZone: true
                }
              ]}
            />
            <p className="fst-italic small text-secondary mb-5">
              This RFP is a Competition Notice under RFQ No. {compNumber} and is
              restricted to Proponents that have become Qualified Suppliers
              pursuant to that RFQ.
            </p>
          </Col>
        </Row>
        <Row className="align-items-center">
          <Col xs="12" md="6" lg="6">
            <h2 className="mb-2">
              {opportunity.title || DEFAULT_OPPORTUNITY_TITLE}
            </h2>
            <ProgramType size="lg" type_="swu" className="mb-4" />
            <div className="d-flex flex-column flex-sm-row flex-nowrap align-items-start align-items-md-center mb-4">
              <OpportunityBadge
                opportunity={adt("swu", opportunity)}
                viewerUser={state.viewerUser || undefined}
                className="mb-2 mb-sm-0"
              />
              <IconInfo
                name="alarm-clock-outline"
                value={`Close${
                  isAcceptingProposals ? "s" : "d"
                } ${formatDateAtTime(opportunity.proposalDeadline, true)}`}
                className="ms-sm-3 flex-shrink-0"
              />
            </div>
            {opportunity.teaser ? (
              <p className="text-secondary mb-4">{opportunity.teaser}</p>
            ) : null}
            <div className="d-flex flex-nowrap align-items-center">
              <Link
                disabled={isToggleWatchLoading}
                dest={emailDest([CONTACT_EMAIL, opportunity.title])}
                symbol_={leftPlacement(iconLinkSymbol("envelope"))}
                color="info"
                size="sm"
                outline
                button>
                Contact
              </Link>
              {state.viewerUser &&
              state.viewerUser.id !== opportunity.createdBy?.id ? (
                <Link
                  className="ms-3"
                  disabled={isToggleWatchLoading}
                  loading={isToggleWatchLoading}
                  onClick={() => dispatch(adt("toggleWatch"))}
                  symbol_={leftPlacement(
                    iconLinkSymbol(opportunity.subscribed ? "check" : "eye")
                  )}
                  color={opportunity.subscribed ? "info" : "primary"}
                  size="sm"
                  outline={!opportunity.subscribed}
                  button>
                  {opportunity.subscribed ? "Watching" : "Watch"}
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
                  icon="comment-dollar-outline"
                  name="Proposal Deadline"
                  value={formatDate(opportunity.proposalDeadline)}
                />
              </Col>
              <Col
                xs="6"
                className="d-flex justify-content-start align-items-start flex-nowrap">
                <OpportunityInfo
                  icon="badge-dollar-outline"
                  name="Value"
                  value={
                    opportunity.totalMaxBudget
                      ? formatAmount(opportunity.totalMaxBudget, "$")
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
                  icon="map-marker-outline"
                  name="Location"
                  value={opportunity.location || EMPTY_STRING}
                />
              </Col>
              <Col
                xs="6"
                className="d-flex justify-content-start align-items-start flex-nowrap">
                <OpportunityInfo
                  icon="laptop-outline"
                  name="Remote OK?"
                  value={opportunity.remoteOk ? "Yes" : "No"}
                />
              </Col>
            </Row>
            <Row>
              {opportunity.minTeamMembers ? (
                <Col
                  xs="6"
                  className="d-flex justify-content-start align-items-start flex-nowrap">
                  <OpportunityInfo
                    icon="users-outline"
                    name="Recommended Min. Team Size"
                    value={String(opportunity.minTeamMembers)}
                  />
                </Col>
              ) : null}
              <Col
                xs="6"
                className="d-flex justify-content-start align-items-start flex-nowrap">
                <OpportunityInfo
                  icon="award-outline"
                  name="Assignment Date"
                  value={formatDate(opportunity.assignmentDate)}
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

const InfoDetails: component_.base.ComponentView<ValidState, Msg> = ({
  state
}) => {
  const opportunity = state.opportunity;
  if (!opportunity) return null;
  return (
    <Row>
      <Col xs="12">
        <h3 className="mb-0">Details</h3>
      </Col>
      <Col xs="12" className="mt-5">
        <InfoDetailsHeading icon="toolbox-outline" text="Skills" />
        <p className="mb-2">
          To submit a proposal for this opportunity, you must possess the
          following skills:
        </p>
        <Skills skills={opportunity.mandatorySkills} />
        {opportunity.optionalSkills.length ? (
          <Fragment>
            <p className="mt-3 mb-2">
              Additionally, possessing the following skills would be considered
              a bonus:
            </p>
            <Skills skills={opportunity.optionalSkills} />
          </Fragment>
        ) : null}
      </Col>
      <Col xs="12" className="mt-5">
        <InfoDetailsHeading icon="info-circle-outline" text="Description" />
        <Markdown
          source={opportunity.description || EMPTY_STRING}
          smallerHeadings
          openLinksInNewTabs
        />
      </Col>
      {opportunity.remoteOk && opportunity.remoteDesc ? (
        <Col xs="12" className="mt-5">
          <InfoDetailsHeading
            icon="laptop-outline"
            text="Remote Work Options"
          />
          <p className="mb-0" style={{ whiteSpace: "pre-line" }}>
            {opportunity.remoteDesc}
          </p>
        </Col>
      ) : null}
    </Row>
  );
};

const InfoScope: component_.base.ComponentView<ValidState, Msg> = ({
  state
}) => {
  return (
    <Row>
      <Col xs="12">
        <h3 className="mb-0">Scope &amp; Contract</h3>
      </Col>
      <Col xs="12" className="mt-4">
        <Markdown source={state.scopeContent} openLinksInNewTabs />
      </Col>
    </Row>
  );
};

const InfoAttachments: component_.base.ComponentView<ValidState, Msg> = ({
  state
}) => {
  const opportunity = state.opportunity;
  if (!opportunity) return null;
  const attachments = opportunity.attachments;
  return (
    <Row>
      <Col xs="12">
        <h3 className="mb-0">Attachments</h3>
      </Col>
      <Col xs="12" className="mt-4">
        {attachments.length ? (
          <AttachmentList files={opportunity.attachments} />
        ) : (
          "There are currently no attachments for this opportunity."
        )}
      </Col>
    </Row>
  );
};

const InfoAddenda: component_.base.ComponentView<ValidState, Msg> = ({
  state
}) => {
  const opportunity = state.opportunity;
  if (!opportunity) return null;
  const addenda = opportunity.addenda;
  return (
    <Row>
      <Col xs="12">
        <h3 className="mb-0">Addenda</h3>
      </Col>
      <Col xs="12" className="mt-4">
        {addenda.length ? (
          <AddendaList addenda={opportunity.addenda} />
        ) : (
          "There are currently no addenda for this opportunity."
        )}
      </Col>
    </Row>
  );
};

const InfoTabs: component_.base.ComponentView<ValidState, Msg> = ({
  state,
  dispatch
}) => {
  const opp = state.opportunity;
  if (!opp) return null;
  const activeTab = state.activeInfoTab;
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
      ...getTabInfo("scope"),
      text: "Scope & Contract"
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

const Info: component_.base.ComponentView<ValidState, Msg> = (props) => {
  const { state } = props;
  const opportunity = state.opportunity;
  if (!opportunity) return null;
  const activeTab = (() => {
    switch (state.activeInfoTab) {
      case "details":
        return <InfoDetails {...props} />;
      case "scope":
        return <InfoScope {...props} />;
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
              title={opportunity.title}
            />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

const Budget: component_.base.ComponentView<ValidState, Msg> = ({ state }) => {
  const opportunity = state.opportunity;
  if (!opportunity) return null;
  const totalMaxBudget = opportunity.totalMaxBudget;
  return (
    <Container>
      <div className="mt-5 pt-5 border-top">
        <Row>
          <Col xs="12">
            <h3 className="mb-4">Budget</h3>
            <p className="mb-0">
              The Total Proponent Cost set out in the Proponent{"'"}s Proposal
              must not exceed{" "}
              {totalMaxBudget
                ? formatAmount(totalMaxBudget, "$")
                : EMPTY_STRING}{" "}
              (inclusive of all expenses, but exclusive of applicable taxes).
              This RFP system will not permit a Proponent to submit a Proposal
              unless this mandatory requirement is satisfied.
            </p>
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

const Phase: component_.base.View<PhaseProps> = ({ icon, phase }) => {
  return (
    <Col xs="12" md="4" className="mb-4 mb-md-0">
      <div className="rounded border overflow-hidden">
        <div className="p-3 border-bottom d-flex flex-nowrap align-items-center bg-light">
          <Icon name={icon} width={1.5} height={1.5} />
          <h4 className="mb-0 ms-2">
            {swuOpportunityPhaseTypeToTitleCase(phase.phase)}
          </h4>
        </div>
        <div className="px-3 py-4 d-flex flex-column flex-nowrap align-items-stretch">
          <IconInfo
            name="calendar"
            value="Phase Dates"
            className="fw-bold mb-1"
          />
          <p className="pb-4 border-bottom mb-4">
            {formatDate(phase.startDate, true)} to{" "}
            {formatDate(phase.completionDate, true)}
          </p>
          <IconInfo
            name="toolbox-outline"
            value="Required Capabilities"
            className="fw-bold mb-2"
          />
          {phase.requiredCapabilities.length ? (
            <Capabilities
              capabilities={phase.requiredCapabilities}
              showChecked={false}
              showFullOrPartTime
            />
          ) : (
            "None Selected"
          )}
        </div>
      </div>
    </Col>
  );
};

const Phases: component_.base.ComponentView<ValidState, Msg> = ({ state }) => {
  const opportunity = state.opportunity;
  if (!opportunity) return null;
  const inception = opportunity.inceptionPhase;
  const prototype = opportunity.prototypePhase;
  const implementation = opportunity.implementationPhase;
  return (
    <Container>
      <div className="mt-5 pt-5 border-top">
        <Row>
          <Col xs="12">
            <h3 className="mb-4">Phases of Work</h3>
            <p className="mb-5">
              The following phase(s) of work need to be carried out:
            </p>
          </Col>
        </Row>
        <Row className="mb-4">
          {inception ? <Phase icon="map" phase={inception} /> : null}
          {prototype ? <Phase icon="rocket" phase={prototype} /> : null}
          <Phase icon="cogs" phase={implementation} />
        </Row>
        <Row>
          <Col xs="12">
            <p className="mb-0 fst-italic small">
              * Capabilities are claimed by individuals in their personal
              profile.
            </p>
          </Col>
        </Row>
      </div>
    </Container>
  );
};

const HowToApply: component_.base.ComponentView<ValidState, Msg> = ({
  state
}) => {
  const viewerUser = state.viewerUser;
  const opportunity = state.opportunity;
  if (
    !opportunity ||
    (viewerUser && !isVendor(viewerUser)) ||
    !isSWUOpportunityAcceptingProposals(opportunity)
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
              To submit a proposal for this Sprint With Us opportunity, you must
              have signed up for a Digital Marketplace vendor account and be a{" "}
              <Link dest={routeDest(adt("learnMoreSWU", null))}>
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
              Please note that you will not be able to submit a proposal if the
              opportunity{"'"}s proposal deadline has passed.
            </p>
            {canVendorStartProposal(state) ? (
              <Link
                disabled={state.toggleWatchLoading > 0}
                className="mt-4"
                button
                color="primary"
                dest={routeDest(
                  adt("proposalSWUCreate", {
                    opportunityId: opportunity.id
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
              name="Proposal Deadline"
              value={formatDate(opportunity.proposalDeadline, true)}
            />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

const view: component_.page.View<State, InnerMsg, Route> = viewValid(
  (props) => {
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
          {isDetails ? <Phases {...props} /> : null}
        </div>
        <HowToApply {...props} />
      </div>
    );
  }
);

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

  getMetadata: getMetadataValid((state) => {
    return makePageMetadata(
      state.opportunity?.title || DEFAULT_OPPORTUNITY_TITLE
    );
  }, makePageMetadata("Opportunity")),

  getAlerts: getAlertsValid((state) => {
    const opportunity = state.opportunity;
    if (!opportunity) return component_.page.alerts.empty();
    const viewerUser = state.viewerUser;
    const existingProposal = state.existingProposal;
    const successfulProponentName = opportunity.successfulProponent?.name;
    const vendor = !!viewerUser && isVendor(viewerUser);
    const isAcceptingProposals =
      isSWUOpportunityAcceptingProposals(opportunity);
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
                <Link dest={routeDest(adt("learnMoreSWU", null))}>
                  Qualified Supplier
                </Link>{" "}
                in order to submit a proposal to this opportunity.
              </span>
            )
          });
        } else if (
          isAcceptingProposals &&
          vendor &&
          !state.isQualified &&
          !existingProposal?.submittedAt &&
          isAcceptingProposals
        ) {
          alerts.push({
            text: (
              <span>
                You must be a{" "}
                <Link dest={routeDest(adt("learnMoreSWU", null))}>
                  Qualified Supplier
                </Link>{" "}
                in order to submit a proposal to this opportunity.
              </span>
            )
          });
        }
        return alerts;
      })()
    };
  }),

  getActions: getActionsValid(({ state }) => {
    const opportunity = state.opportunity;
    const viewerUser = state.viewerUser;
    if (!opportunity || !viewerUser) {
      return component_.page.actions.none();
    }
    const isToggleWatchLoading = state.toggleWatchLoading > 0;
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
              adt("opportunitySWUEdit", {
                opportunityId: opportunity.id
              })
            )
          }
        ]);
      case UserType.Government:
        if (opportunity.createdBy?.id === viewerUser.id) {
          return component_.page.actions.links([
            {
              disabled: isToggleWatchLoading,
              children: "Edit Opportunity",
              symbol_: leftPlacement(iconLinkSymbol("edit")),
              button: true,
              color: "primary",
              dest: routeDest(
                adt("opportunitySWUEdit", {
                  opportunityId: opportunity.id
                })
              )
            }
          ]);
        } else {
          return component_.page.actions.none();
        }
      case UserType.Vendor: {
        if (state.existingProposal) {
          return component_.page.actions.links([
            {
              disabled: isToggleWatchLoading,
              children: "View Proposal",
              symbol_: leftPlacement(iconLinkSymbol("comment-dollar")),
              button: true,
              color: "primary",
              dest: routeDest(
                adt("proposalSWUEdit", {
                  opportunityId: opportunity.id,
                  proposalId: state.existingProposal.id
                })
              )
            }
          ]);
        } else if (canVendorStartProposal(state)) {
          return component_.page.actions.links([
            {
              disabled: isToggleWatchLoading,
              children: "Start Proposal",
              symbol_: leftPlacement(iconLinkSymbol("comment-dollar")),
              button: true,
              color: "primary",
              dest: routeDest(
                adt("proposalSWUCreate", {
                  opportunityId: opportunity.id
                })
              )
            }
          ]);
        } else {
          return component_.page.actions.none();
        }
      }
    }
  })
};
