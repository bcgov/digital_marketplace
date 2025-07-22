import {
  CWU_TERMS_AND_CONDITIONS_CONTENT_ID,
  EMPTY_STRING
} from "front-end/config";
import {
  makePageMetadata,
  makeStartLoading,
  makeStopLoading
} from "front-end/lib";
import { Route, SharedState } from "front-end/lib/app/types";
import { AddendaList } from "front-end/lib/components/addenda";
import { AttachmentList } from "front-end/lib/components/attachments";
import { component as component_ } from "front-end/lib/framework";
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
import React from "react";
import { Col, Container, Row } from "reactstrap";
import { CONTACT_EMAIL } from "shared/config";
import { formatAmount, formatDate, formatDateAtTime } from "shared/lib";
import { getCWUOpportunityViewsCounterName } from "shared/lib/resources/counter";
import {
  CWUOpportunity,
  DEFAULT_OPPORTUNITY_TITLE,
  isCWUOpportunityAcceptingProposals
} from "shared/lib/resources/opportunity/code-with-us";
import { CWUProposalSlim } from "shared/lib/resources/proposal/code-with-us";
import { isVendor, User, UserType } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import { Content } from "shared/lib/resources/content";

export type InfoTab = "details" | "terms" | "attachments" | "addenda";

export interface State {
  toggleWatchLoading: number;
  opportunity: CWUOpportunity | null;
  existingProposal: CWUProposalSlim | null;
  viewerUser: User | null;
  activeInfoTab: InfoTab;
  termsContent: string;
  routePath: string;
}

export type InnerMsg =
  | ADT<"noop">
  | ADT<
      "onInitResponse",
      [
        string,
        api.ResponseValidation<CWUOpportunity, string[]>,
        CWUProposalSlim | null,
        api.ResponseValidation<Content, string[]>
      ]
    >
  | ADT<"toggleWatch">
  | ADT<"onToggleWatchResponse", boolean>
  | ADT<"setActiveInfoTab", InfoTab>;

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
  return [
    {
      toggleWatchLoading: 0,
      viewerUser,
      opportunity: null,
      existingProposal: null,
      activeInfoTab: "details",
      routePath,
      termsContent: ""
    },
    [
      api.counters.update<Msg>()(
        getCWUOpportunityViewsCounterName(opportunityId),
        null,
        () => adt("noop")
      ),
      component_.cmd.join3(
        api.opportunities.cwu.readOne()(opportunityId, (response) => response),
        viewerUser && isVendor(viewerUser)
          ? api.proposals.cwu.readExistingProposalForOpportunity(
              opportunityId,
              (response) => response
            )
          : component_.cmd.dispatch(null),

        api.content.readOne()(
          CWU_TERMS_AND_CONDITIONS_CONTENT_ID,
          (response) => response
        ),
        (opportunityResponse, proposalResponse, contentResponse) =>
          adt("onInitResponse", [
            routePath,
            opportunityResponse,
            proposalResponse,
            contentResponse
          ]) as Msg
      )
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
        contentResponse
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
        state = state.set("termsContent", contentResponse.value.body);
      }
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
            ? api.subscribers.cwu.delete_<Msg>()(id, (response) =>
                adt("onToggleWatchResponse", api.isValid(response))
              )
            : api.subscribers.cwu.create<Msg>()(
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
};
const Header: component_.base.ComponentView<State, Msg> = ({
  state,
  dispatch
}) => {
  if (!state.opportunity) return null;
  const opp = state.opportunity;
  const isToggleWatchLoading = state.toggleWatchLoading > 0;
  const isAcceptingProposals = isCWUOpportunityAcceptingProposals(
    state.opportunity
  );
  return (
    <div>
      <Container>
        <Row>
          <Col xs="12">
            <DateMetadata
              className="mb-5"
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
          </Col>
        </Row>
        <Row className="align-items-center">
          <Col xs="12" md="6" lg="6">
            <h2 className="mb-2">{opp.title || DEFAULT_OPPORTUNITY_TITLE}</h2>
            <ProgramType size="lg" type_="cwu" className="mb-4" />
            <div className="d-flex flex-column flex-sm-row flex-nowrap align-items-start align-items-md-center mb-4">
              <OpportunityBadge
                opportunity={adt("cwu", opp)}
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
                  icon="comment-dollar-outline"
                  name="Proposal Deadline"
                  value={formatDate(opp.proposalDeadline)}
                />
              </Col>
              <Col
                xs="6"
                className="d-flex justify-content-start align-items-start flex-nowrap">
                <OpportunityInfo
                  icon="badge-dollar-outline"
                  name="Value"
                  value={
                    opp.reward ? formatAmount(opp.reward, "$") : EMPTY_STRING
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
                  value={opp.location || EMPTY_STRING}
                />
              </Col>
              <Col
                xs="6"
                className="d-flex justify-content-start align-items-start flex-nowrap">
                <OpportunityInfo
                  icon="laptop-outline"
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
                  icon="award-outline"
                  name="Assignment Date"
                  value={formatDate(opp.assignmentDate)}
                />
              </Col>
              <Col
                xs="6"
                className="d-flex justify-content-start align-items-start flex-nowrap">
                <OpportunityInfo
                  icon="user-hard-hat-outline"
                  name="Work Start Date"
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

const InfoDetails: component_.base.ComponentView<State, Msg> = ({ state }) => {
  const opp = state.opportunity;
  if (!opp) return null;
  return (
    <Row>
      <Col xs="12">
        <h3 className="mb-0">Details</h3>
      </Col>
      <Col xs="12" className="mt-5">
        <InfoDetailsHeading icon="toolbox-outline" text="Required Skills" />
        <p className="mb-2">
          To submit a proposal for this opportunity, you must possess the
          following skills:
        </p>
        <Skills skills={opp.skills} />
      </Col>
      <Col xs="12" className="mt-5">
        <InfoDetailsHeading icon="info-circle-outline" text="Description" />
        <Markdown
          source={opp.description || EMPTY_STRING}
          smallerHeadings
          openLinksInNewTabs
        />
      </Col>
      {opp.submissionInfo ? (
        <Col xs="12" className="mt-5">
          <InfoDetailsHeading
            icon="laptop-code-outline"
            text="Project Submission Information"
          />
          <p className="mb-0">{opp.submissionInfo}</p>
        </Col>
      ) : null}
      {opp.remoteOk && opp.remoteDesc ? (
        <Col xs="12" className="mt-5">
          <InfoDetailsHeading
            icon="laptop-outline"
            text="Remote Work Options"
          />
          <p className="mb-0" style={{ whiteSpace: "pre-line" }}>
            {opp.remoteDesc}
          </p>
        </Col>
      ) : null}
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

const InfoTerms: component_.base.ComponentView<State, Msg> = ({ state }) => {
  return (
    <Row>
      <Col xs="12">
        <h3 className="mb-0">Terms and Conditions</h3>
      </Col>
      <Col xs="12" className="mt-4">
        <Markdown source={state.termsContent} openLinksInNewTabs />
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
      ...getTabInfo("terms"),
      text: "Terms and Conditions"
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
      case "terms":
        return <InfoTerms {...props} />;
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

const AcceptanceCriteria: component_.base.ComponentView<State, Msg> = ({
  state
}) => {
  if (!state.opportunity?.acceptanceCriteria) {
    return null;
  }
  return (
    <Container>
      <div className="mt-5 pt-5 border-top">
        <Row>
          <Col xs="12">
            <h3 className="mb-4">Acceptance Criteria</h3>
            <p className="mb-4">
              This is a fixed-price opportunity governed by the terms of our
              lightweight procurement model, Code With Us. To be paid the fixed
              price for this opportunity, you need to meet all of the following
              criteria:
            </p>
            <Markdown
              source={state.opportunity.acceptanceCriteria}
              smallerHeadings
              openLinksInNewTabs
            />
          </Col>
        </Row>
      </div>
    </Container>
  );
};

const EvaluationCriteria: component_.base.ComponentView<State, Msg> = ({
  state
}) => {
  if (!state.opportunity?.evaluationCriteria) {
    return null;
  }
  return (
    <Container>
      <div className="mt-5 pt-5 border-top">
        <Row>
          <Col xs="12">
            <h3 className="mb-4">Proposal Evaluation Criteria</h3>
            <p className="mb-4">
              Your proposal will be scored using the following criteria:
            </p>
            <Markdown
              source={state.opportunity.evaluationCriteria}
              smallerHeadings
              openLinksInNewTabs
            />
          </Col>
        </Row>
      </div>
    </Container>
  );
};

const HowToApply: component_.base.ComponentView<State, Msg> = ({ state }) => {
  if (!state.opportunity) return null;
  const viewerUser = state.viewerUser;
  if (
    (viewerUser && !isVendor(viewerUser)) ||
    !isCWUOpportunityAcceptingProposals(state.opportunity)
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
              To submit a proposal for this Code With Us opportunity, you must
              have signed up for a Digital Marketplace vendor account.&nbsp;
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
            {viewerUser &&
            isVendor(viewerUser) &&
            !state.existingProposal &&
            isCWUOpportunityAcceptingProposals(state.opportunity) ? (
              <Link
                disabled={state.toggleWatchLoading > 0}
                className="mt-4"
                button
                color="primary"
                dest={routeDest(
                  adt("proposalCWUCreate", {
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
              name="Proposal Deadline"
              value={formatDate(state.opportunity.proposalDeadline, true)}
            />
          </Col>
        </Row>
      </Container>
    </div>
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
        {isDetails ? <AcceptanceCriteria {...props} /> : null}
        {isDetails ? <EvaluationCriteria {...props} /> : null}
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
    const viewerUser = state.viewerUser;
    const existingProposal = state.existingProposal;
    const successfulProponentName =
      state.opportunity?.successfulProponent?.name;
    return {
      info: (() => {
        const alerts: component_.page.alerts.Alert<Msg>[] = [];
        if (
          viewerUser &&
          isVendor(viewerUser) &&
          existingProposal?.submittedAt
        ) {
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
    const isAcceptingProposals = isCWUOpportunityAcceptingProposals(
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
              adt("opportunityCWUEdit", {
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
                adt("opportunityCWUEdit", {
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
                adt("proposalCWUEdit", {
                  opportunityId: state.opportunity.id,
                  proposalId: state.existingProposal.id
                })
              )
            }
          ]);
        } else if (isAcceptingProposals) {
          return component_.page.actions.links([
            {
              disabled: isToggleWatchLoading,
              children: "Start Proposal",
              symbol_: leftPlacement(iconLinkSymbol("comment-dollar")),
              button: true,
              color: "primary",
              dest: routeDest(
                adt("proposalCWUCreate", {
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
