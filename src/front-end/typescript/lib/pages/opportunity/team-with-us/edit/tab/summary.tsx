import { EMPTY_STRING } from "front-end/config";
import { Route } from "front-end/lib/app/types";
import {
  component as component_,
  Immutable,
  immutable
} from "front-end/lib/framework";
import * as Tab from "front-end/lib/pages/opportunity/team-with-us/edit/tab";
import EditTabHeader from "front-end/lib/pages/opportunity/team-with-us/lib/views/edit-tab-header";
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
import { Col, Row } from "reactstrap";
import { formatAmount, formatDate } from "shared/lib";
import {
  TWUOpportunity,
  TWUOpportunityStatus
} from "shared/lib/resources/opportunity/team-with-us";
import { NUM_SCORE_DECIMALS } from "shared/lib/resources/proposal/team-with-us";
import { isAdmin } from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";
import { lowerCase, map, startCase } from "lodash";
import { aggregateResourceSkills } from "front-end/lib/pages/opportunity/team-with-us/lib";
import Icon, { AvailableIcons } from "front-end/lib/views/icon";
import * as Table from "front-end/lib/components/table";
import { prefixPath } from "front-end/lib";

export interface State extends Tab.Params {
  opportunity: TWUOpportunity | null;
  table: Immutable<Table.State>;
}

export type InnerMsg =
  | ADT<"onInitResponse", Tab.InitResponse>
  | ADT<"noop">
  | ADT<"table", Table.Msg>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  const [tableState, tableCmds] = Table.init({
    idNamespace: "resources-summary-table"
  });
  return [
    {
      ...params,
      opportunity: null,
      table: immutable(tableState)
    },
    [...component_.cmd.mapMany(tableCmds, (msg) => adt("table", msg) as Msg)]
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

const Details: component_.page.View<State, InnerMsg, Route> = ({
  state,
  dispatch
}) => {
  const opportunity = state.opportunity;
  if (!opportunity) return null;
  const {
    assignmentDate,
    proposalDeadline,
    startDate,
    completionDate,
    maxBudget,
    location,
    remoteOk,
    resources
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
        name: "Proposals Deadline",
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
        name: "Remote OK",
        value: remoteOk ? "Yes" : "No"
      },
      {
        icon: "calendar",
        name: "Contract Award Date",
        value: formatDate(assignmentDate)
      },
      {
        icon: "calendar",
        name: "Contract Start Date",
        value: formatDate(startDate)
      }
    ],
    (rc: ReportCard): ReportCard => ({
      ...rc,
      className: "flex-grow-1 me-3 mb-4"
    })
  );

  const skills = aggregateResourceSkills(opportunity);

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
      <Row className="mb-5">
        <Col>
          <ServiceAreasHeading
            icon="laptop-code-outline"
            text={`Service Area${resources.length ? "s" : ""}`}
          />
          <ResourcesTable state={state} dispatch={dispatch} />
        </Col>
      </Row>
      <Row className="mb-5">
        <Col xs="12" sm="6">
          <div className="fw-bold mb-2">Mandatory Skills</div>
          <Skills skills={skills.mandatory} />
        </Col>
        <Col xs="12" sm="6">
          <div className="fw-bold mb-2">Optional Skills</div>
          <Skills skills={skills.optional} />
        </Col>
      </Row>
      <Row>
        <Col xs="12">
          <DescriptionList items={items} />
        </Col>
      </Row>
    </div>
  );
};

const ServiceAreasHeading: component_.base.View<{
  icon: AvailableIcons;
  text: string;
}> = ({ icon, text }) => {
  return (
    <div className="d-flex align-items-start flex-nowrap mb-4">
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
      opportunity.status !== TWUOpportunityStatus.Awarded
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
          prefixPath(`/opportunities/team-with-us/${opportunity.id}/complete`)
        ),
        newTab: true
      }
    ]);
  }
};
