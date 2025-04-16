import { makePageMetadata } from "front-end/lib";
import { isUserType } from "front-end/lib/access-control";
import { Route, SharedState } from "front-end/lib/app/types";
import { component as component_ } from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import DescriptionList from "front-end/lib/views/description-list";
import Skills from "front-end/lib/views/skills";
import { formatAmount, formatDate } from "shared/lib";
import React from "react";
import { Col, Row, Container } from "reactstrap";
import {
  SWUOpportunity,
  SWUOpportunityPhaseType,
  swuOpportunityPhaseTypeToTitleCase
} from "shared/lib/resources/opportunity/sprint-with-us";
import { User, UserType } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";

export interface RouteParams {
  opportunityId: Id;
}

export interface State {
  opportunity: SWUOpportunity | null;
  viewerUser: User;
  notFound: boolean;
  loading: boolean;
}

export type InnerMsg = ADT<
  "onInitResponse",
  api.ResponseValidation<SWUOpportunity, string[]>
>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

const init: component_.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = isUserType({
  userType: [UserType.Admin],
  success({ routeParams, shared }) {
    return [
      {
        opportunity: null,
        viewerUser: shared.sessionUser,
        notFound: false,
        loading: true
      } as State,
      [
        api.opportunities.swu.readOne()(routeParams.opportunityId, (response) =>
          adt("onInitResponse", response)
        )
      ] as component_.Cmd<Msg>[]
    ];
  },
  fail({ routePath, shared }) {
    return [
      {
        opportunity: null,
        viewerUser: {} as User,
        notFound: true,
        loading: false
      } as State,
      [
        component_.cmd.dispatch(
          component_.global.replaceRouteMsg(
            shared.session
              ? adt("notFound" as const, { path: routePath })
              : adt("signIn" as const, { redirectOnSuccess: routePath })
          )
        )
      ] as component_.Cmd<Msg>[]
    ];
  }
});

const update: component_.page.Update<State, InnerMsg, Route> = ({
  state,
  msg
}) => {
  switch (msg.tag) {
    case "onInitResponse": {
      const response = msg.value;
      switch (response.tag) {
        case "valid": {
          return [
            { ...state, opportunity: response.value, loading: false },
            [component_.cmd.dispatch(component_.page.readyMsg())]
          ];
        }
        case "invalid": {
          return [
            { ...state, notFound: true, loading: false },
            [
              component_.cmd.dispatch(
                component_.global.replaceRouteMsg(
                  adt("notFound" as const, { path: "" })
                )
              )
            ]
          ];
        }
        default: {
          return [state, []];
        }
      }
      // This line is never reached because all cases in the inner switch return
      // But adding it makes the linter happy
      break;
    }
    default:
      return [state, []];
  }
};

const OpportunityDetails: component_.base.View<{
  opportunity: SWUOpportunity;
}> = ({ opportunity }) => {
  if (!opportunity) return null;
  const {
    title,
    teaser,
    remoteOk,
    remoteDesc,
    location,
    totalMaxBudget,
    minTeamMembers,
    mandatorySkills,
    optionalSkills,
    description,
    proposalDeadline,
    assignmentDate,
    inceptionPhase,
    prototypePhase,
    implementationPhase,
    questionsWeight,
    codeChallengeWeight,
    scenarioWeight,
    priceWeight
  } = opportunity;

  const detailsItems = [
    {
      name: "Teaser",
      children: teaser
    },
    {
      name: "Location",
      children: location
    },
    {
      name: "Remote OK?",
      children: remoteOk ? "Yes" : "No"
    },
    ...(remoteOk
      ? [
          {
            name: "Remote Description",
            children: remoteDesc
          }
        ]
      : []),
    {
      name: "Proposal Deadline",
      children: formatDate(proposalDeadline)
    },
    {
      name: "Assignment Date",
      children: formatDate(assignmentDate)
    },
    {
      name: "Maximum Budget",
      children: formatAmount(totalMaxBudget, "$")
    },
    ...(minTeamMembers !== undefined && minTeamMembers !== null
      ? [
          {
            name: "Recommended Min. Team Size",
            children: String(minTeamMembers)
          }
        ]
      : []),
    {
      name: "Evaluation Weights",
      children: (
        <div>
          <div>Team Questions: {questionsWeight}%</div>
          <div>Code Challenge: {codeChallengeWeight}%</div>
          <div>Team Scenario: {scenarioWeight}%</div>
          <div>Price: {priceWeight}%</div>
        </div>
      )
    },
    {
      name: "Phase Dates",
      children: (
        <div>
          {inceptionPhase ? (
            <div>
              {swuOpportunityPhaseTypeToTitleCase(
                SWUOpportunityPhaseType.Inception
              )}
              : {formatDate(inceptionPhase.startDate)} to{" "}
              {formatDate(inceptionPhase.completionDate)}
            </div>
          ) : null}
          {prototypePhase ? (
            <div>
              {swuOpportunityPhaseTypeToTitleCase(
                SWUOpportunityPhaseType.Prototype
              )}
              : {formatDate(prototypePhase.startDate)} to{" "}
              {formatDate(prototypePhase.completionDate)}
            </div>
          ) : null}
          <div>
            {swuOpportunityPhaseTypeToTitleCase(
              SWUOpportunityPhaseType.Implementation
            )}
            : {formatDate(implementationPhase.startDate)} to{" "}
            {formatDate(implementationPhase.completionDate)}
          </div>
        </div>
      )
    }
  ];

  const phaseDetails = [
    {
      phase: "Inception",
      data: inceptionPhase
    },
    {
      phase: "Proof of Concept",
      data: prototypePhase
    },
    {
      phase: "Implementation",
      data: implementationPhase
    }
  ].filter((phase) => phase.data);

  return (
    <Container className="mt-5">
      <Row>
        <Col xs="12">
          <h1>{title}</h1>
          <h2 className="mb-4">Opportunity Details</h2>
        </Col>
      </Row>
      <Row>
        <Col xs="12">
          <DescriptionList items={detailsItems} />
        </Col>
      </Row>
      <Row>
        <Col xs="12">
          <h3 className="mt-5 mb-4">Description</h3>
          <div dangerouslySetInnerHTML={{ __html: description }}></div>
        </Col>
      </Row>
      <Row className="mt-5">
        <Col xs="12" sm="6">
          <div className="font-weight-bold mb-2">Mandatory Skills</div>
          <Skills skills={mandatorySkills} />
        </Col>
        <Col xs="12" sm="6">
          <div className="font-weight-bold mb-2">Optional Skills</div>
          <Skills skills={optionalSkills} />
        </Col>
      </Row>

      <Row>
        <Col xs="12">
          <h2 className="mt-5 mb-4">Phase Details</h2>
        </Col>
      </Row>

      {phaseDetails.map(
        ({ phase, data }) =>
          data && (
            <div key={phase} className="mb-5">
              <h3>{phase}</h3>
              <Row>
                <Col xs="12" md="6">
                  <DescriptionList
                    items={[
                      {
                        name: "Start Date",
                        children: formatDate(data.startDate)
                      },
                      {
                        name: "Completion Date",
                        children: formatDate(data.completionDate)
                      },
                      {
                        name: "Maximum Budget",
                        children: formatAmount(data.maxBudget, "$")
                      }
                    ]}
                  />
                </Col>
              </Row>
              <h4 className="mt-3">Required Capabilities</h4>
              <ul>
                {data.requiredCapabilities.map((capability, i) => (
                  <li key={i}>
                    {capability.capability} (
                    {capability.fullTime ? "Full-time" : "Part-time"})
                  </li>
                ))}
              </ul>
            </div>
          )
      )}
    </Container>
  );
};

const view: component_.page.View<State, InnerMsg, Route> = ({ state }) => {
  if (state.notFound) {
    return <div>Opportunity not found.</div>;
  }

  if (state.loading || !state.opportunity) {
    return <div>Loading...</div>;
  }

  return <OpportunityDetails opportunity={state.opportunity} />;
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
  getMetadata: (state) => {
    return makePageMetadata(
      `Complete Competition${
        state.opportunity ? `: ${state.opportunity.title}` : ""
      }`
    );
  }
};
