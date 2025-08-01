import { EMPTY_STRING } from "front-end/config";
import { Route } from "front-end/lib/app/types";
import { component as component_ } from "front-end/lib/framework";
import * as Tab from "front-end/lib/pages/opportunity/code-with-us/edit/tab";
import EditTabHeader from "front-end/lib/pages/opportunity/code-with-us/lib/views/edit-tab-header";
import DescriptionList from "front-end/lib/views/description-list";
import Link, {
  emailDest,
  externalDest,
  iconLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";
import ReportCardList, {
  ReportCard
} from "front-end/lib/views/report-card-list";
import Skills from "front-end/lib/views/skills";
import React from "react";
import {
  CWUOpportunity,
  CWUOpportunityStatus
} from "shared/lib/resources/opportunity/code-with-us";
import { Col, Row } from "reactstrap";
import { formatAmount, formatDate } from "shared/lib";
import { NUM_SCORE_DECIMALS } from "shared/lib/resources/proposal/code-with-us";
import { isAdmin } from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";
import { prefixPath } from "front-end/lib";

export interface State extends Tab.Params {
  opportunity: CWUOpportunity | null;
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
  if (!successfulProponent || !successfulProponent.score) {
    return null;
  }
  const isViewerAdmin = isAdmin(state.viewerUser);
  const items = [
    {
      name: "Awarded Proponent",
      children: (() => {
        if (isViewerAdmin) {
          const nameRoute: Route = (() => {
            switch (successfulProponent.id.tag) {
              case "individual":
                return adt("userProfile", {
                  userId: successfulProponent.id.value
                }) as Route;
              case "organization":
                return adt("orgEdit", {
                  orgId: successfulProponent.id.value
                }) as Route;
            }
          })();
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
              <Link newTab dest={routeDest(nameRoute)}>
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
              successfulProponent.score
                ? `${successfulProponent.score.toFixed(NUM_SCORE_DECIMALS)}%`
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
  const skills = opportunity.skills;
  const items = [
    {
      name: "Assignment Date",
      children: formatDate(opportunity.assignmentDate)
    },
    {
      name: "Start Date",
      children: formatDate(opportunity.startDate)
    }
  ];
  const reportCards: ReportCard[] = [
    {
      icon: "alarm-clock",
      name: "Proposals Deadline",
      value: formatDate(opportunity.proposalDeadline)
    },
    {
      icon: "badge-dollar",
      name: "Value",
      value: formatAmount(opportunity.reward, "$")
    },
    {
      icon: "map-marker",
      name: "Location",
      value: opportunity.location
    }
  ];
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
        <Col xs="12" md="6">
          <DescriptionList items={items} />
        </Col>
        <Col xs="12" md="6">
          <div className="fw-bold mb-2 mt-3 mt-md-0">Required Skills</div>
          <Skills skills={skills} />
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
  },
  // Add "View Complete Competition" button action if the opportunity is awarded and the user is an admin
  getActions: ({ state }) => {
    const opportunity = state.opportunity;
    const viewerUser = state.viewerUser;
    if (
      !opportunity ||
      !isAdmin(viewerUser) ||
      opportunity.status !== CWUOpportunityStatus.Awarded
    ) {
      return component_.page.actions.none();
    }
    return component_.page.actions.links([
      {
        children: "View Complete Competition",
        symbol_: leftPlacement(iconLinkSymbol("external-link")),
        button: true,
        color: "primary" as const,
        dest: externalDest(
          prefixPath(`/opportunities/code-with-us/${opportunity.id}/complete`)
        ),
        newTab: true
      }
    ]);
  }
};
