import { EMPTY_STRING } from "front-end/config";
import { Route } from "front-end/lib/app/types";
import { component as component_ } from "front-end/lib/framework";
import * as Tab from "front-end/lib/pages/opportunity/team-with-us/edit/tab";
import EditTabHeader from "front-end/lib/pages/opportunity/team-with-us/lib/views/edit-tab-header";
import DescriptionList from "front-end/lib/views/description-list";
import Link, { emailDest, routeDest } from "front-end/lib/views/link";
import ReportCardList, {
  ReportCard
} from "front-end/lib/views/report-card-list";
import Skills from "front-end/lib/views/skills";
import React from "react";
import { Col, Row } from "reactstrap";
import { formatAmount, formatDate } from "shared/lib";
import { TWUOpportunity } from "shared/lib/resources/opportunity/team-with-us";
import { NUM_SCORE_DECIMALS } from "shared/lib/resources/proposal/team-with-us";
import { isAdmin } from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";
import { twuServiceAreaToTitleCase } from "front-end/lib/pages/opportunity/team-with-us/lib";
import { map } from "lodash";

export interface State extends Tab.Params {
  opportunity: TWUOpportunity | null;
}

export type InnerMsg = ADT<"onInitResponse", Tab.InitResponse> | ADT<"noop">;

export type Msg = component_.page.Msg<InnerMsg, Route>;

const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  return [
    {
      ...params,
      opportunity: null
    },
    []
  ];
};

const update: component_.page.Update<State, InnerMsg, Route> = ({
  state,
  msg
}) => {
  switch (msg.tag) {
    case "onInitResponse": {
      const opportunity = msg.value[0];
      return [
        state.set("opportunity", opportunity),
        [component_.cmd.dispatch(component_.page.readyMsg())]
      ];
    }
    default:
      return [state, []];
  }
};

const SuccessfulProponent: component_.page.View<State, InnerMsg, Route> = ({
  state
}) => {
  const opportunity = state.opportunity;
  if (!opportunity) return null;
  const { successfulProponent } = opportunity;
  if (!successfulProponent || !successfulProponent.totalScore) {
    return null;
  }
  const isViewerAdmin = isAdmin(state.viewerUser);
  const items = [
    {
      name: "Awarded Proponent",
      children: (() => {
        if (isViewerAdmin) {
          const email = (() => {
            if (successfulProponent.email) {
              return (
                <span>
                  (
                  <Link dest={emailDest([successfulProponent.email])}>
                    {successfulProponent.email}
                  </Link>
                  )
                </span>
              );
            } else {
              return null;
            }
          })();
          return (
            <div>
              <Link
                newTab
                dest={routeDest(
                  adt("orgEdit", { orgId: successfulProponent.id })
                )}>
                {successfulProponent.name}
              </Link>{" "}
              {email}
            </div>
          );
        } else {
          return successfulProponent.name;
        }
      })()
    },
    {
      name: "Submitted By",
      children: (() => {
        if (!successfulProponent.createdBy) {
          return null;
        }
        if (isViewerAdmin) {
          return (
            <Link
              newTab
              dest={routeDest(
                adt("userProfile", { userId: successfulProponent.createdBy.id })
              )}>
              {successfulProponent.createdBy.name}
            </Link>
          );
        } else {
          return successfulProponent.createdBy.name;
        }
      })()
    }
  ];
  return (
    <div className="mt-5 pt-5 border-top">
      <Row>
        <Col xs="12">
          <h4 className="mb-4">Successful Proponent</h4>
        </Col>
      </Row>
      <Row>
        <Col xs="12" md="4" className="mb-4 mb-md-0 d-flex d-md-block">
          <ReportCard
            icon="star-full"
            iconColor="c-report-card-icon-highlight"
            name="Winning Score"
            value={`${
              successfulProponent.totalScore
                ? `${successfulProponent.totalScore.toFixed(
                    NUM_SCORE_DECIMALS
                  )}%`
                : EMPTY_STRING
            }`}
          />
        </Col>
        <Col xs="12" md="8" className="d-flex align-items-center flex-nowrap">
          <DescriptionList items={items} />
        </Col>
      </Row>
    </div>
  );
};

const Details: component_.page.View<State, InnerMsg, Route> = ({ state }) => {
  const opportunity = state.opportunity;
  if (!opportunity) return null;
  const {
    mandatorySkills,
    optionalSkills,
    assignmentDate,
    proposalDeadline,
    startDate,
    completionDate,
    serviceArea,
    targetAllocation,
    maxBudget,
    location
  } = opportunity;
  const items = [
    {
      name: "Contract Award Date",
      children: formatDate(assignmentDate)
    },
    {
      name: "Contract Start Date",
      children: formatDate(startDate)
    },
    {
      name: "Contract Completion Date",
      children: formatDate(completionDate)
    }
  ];
  const reportCards = map(
    [
      {
        icon: "alarm-clock",
        name: "Proposals Due",
        value: formatDate(proposalDeadline)
      },
      {
        icon: "badge-dollar",
        name: "Max. Budget",
        value: formatAmount(maxBudget, "$")
      },
      {
        icon: "map-marker",
        name: "Location",
        value: location
      },
      {
        icon: "laptop-code-outline",
        name: "Service Area",
        value: twuServiceAreaToTitleCase(serviceArea)
      },
      {
        icon: "balance-scale",
        name: "Resource Target Allocation",
        value: targetAllocation.toString().concat("%")
      }
    ],
    (rc: ReportCard): ReportCard => ({
      ...rc,
      className: "flex-grow-1 mr-4 mb-4"
    })
  );

  return (
    <div className="mt-5 pt-5 border-top">
      <Row>
        <Col xs="12">
          <h4 className="mb-4">Details</h4>
        </Col>
      </Row>
      <Row className="mb-5">
        <Col xs="12">
          <ReportCardList reportCards={reportCards} />
        </Col>
      </Row>
      <Row>
        <Col xs="12">
          <DescriptionList items={items} />
        </Col>
      </Row>
      <Row className="mt-3">
        <Col xs="12" sm="6">
          <div className="font-weight-bold mb-2">Mandatory Skills</div>
          <Skills skills={mandatorySkills} />
        </Col>
        <Col xs="12" sm="6">
          <div className="font-weight-bold mb-2">Optional Skills</div>
          <Skills skills={optionalSkills} />
        </Col>
      </Row>
    </div>
  );
};

const view: component_.page.View<State, InnerMsg, Route> = (props) => {
  const opportunity = props.state.opportunity;
  if (!opportunity) return null;
  return (
    <div>
      <EditTabHeader
        opportunity={opportunity}
        viewerUser={props.state.viewerUser}
      />
      <SuccessfulProponent {...props} />
      <Details {...props} />
    </div>
  );
};

export const component: Tab.Component<State, InnerMsg> = {
  init,
  update,
  view,
  onInitResponse(response) {
    return adt("onInitResponse", response);
  }
};
