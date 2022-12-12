import {
  getAlertsValid,
  getActionsValid,
  makePageMetadata,
  prefixPath,
  updateValid,
  viewValid
} from "front-end/lib";
import { isSignedIn } from "front-end/lib/access-control";
import { Route, SharedState } from "front-end/lib/app/types";
import * as Table from "front-end/lib/components/table";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import {
  cwuOpportunityStatusToColor,
  cwuOpportunityStatusToTitleCase
} from "front-end/lib/pages/opportunity/code-with-us/lib";
import {
  swuOpportunityStatusToColor,
  swuOpportunityStatusToTitleCase
} from "front-end/lib/pages/opportunity/sprint-with-us/lib";
import {
  cwuProposalStatusToColor,
  cwuProposalStatusToTitleCase
} from "front-end/lib/pages/proposal/code-with-us/lib";
import {
  swuProposalStatusToColor,
  swuProposalStatusToTitleCase
} from "front-end/lib/pages/proposal/sprint-with-us/lib";
import Badge from "front-end/lib/views/badge";
import Link, {
  iconLinkSymbol,
  leftPlacement,
  rightPlacement,
  routeDest
} from "front-end/lib/views/link";
import React from "react";
import { Col, Row } from "reactstrap";
import { compareDates, formatDate } from "shared/lib";
import * as CWUO from "shared/lib/resources/opportunity/code-with-us";
import * as SWUO from "shared/lib/resources/opportunity/sprint-with-us";
import {
  doesOrganizationMeetSWUQualification,
  OrganizationSlim
} from "shared/lib/resources/organization";
import * as CWUP from "shared/lib/resources/proposal/code-with-us";
import * as SWUP from "shared/lib/resources/proposal/sprint-with-us";
import { isVendor, User } from "shared/lib/resources/user";
import { adt, ADT, Defined } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";

interface ValidState {
  table: {
    title: string;
    link?: {
      text: string;
      route: Route;
    };
    headCells: Table.HeadCells;
    bodyRows: Table.BodyRows;
    state: Immutable<Table.State>;
  };
  viewerUser: User;
  isQualified?: boolean;
}

export type State = Validation<Immutable<ValidState>, null>;

type InitResponse =
  | ADT<
      "vendor",
      [CWUP.CWUProposalSlim[], SWUP.SWUProposalSlim[], OrganizationSlim[]]
    >
  | ADT<"publicSector", [CWUO.CWUOpportunitySlim[], SWUO.SWUOpportunitySlim[]]>;

export type InnerMsg =
  | ADT<"table", Table.Msg>
  | ADT<"onInitResponse", InitResponse>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

export type RouteParams = null;

function makeVendorBodyRows(
  cwu: CWUP.CWUProposalSlim[],
  swu: SWUP.SWUProposalSlim[],
  viewerUser: User
): Table.BodyRows {
  return [
    ...cwu.map((p) => adt("cwu" as const, p)),
    ...swu.map((p) => adt("swu" as const, p))
  ]
    .sort((a, b) => compareDates(a.value.createdAt, b.value.createdAt) * -1)
    .map((p) => {
      return [
        {
          children: (
            <div>
              <Link
                dest={routeDest(
                  adt(p.tag === "cwu" ? "proposalCWUEdit" : "proposalSWUEdit", {
                    proposalId: p.value.id,
                    opportunityId: p.value.opportunity.id
                  })
                )}>
                {p.value.opportunity.title}
              </Link>
              <div className="small text-secondary text-uppercase">
                {p.tag === "cwu" ? "Code With Us" : "Sprint With Us"}
              </div>
            </div>
          )
        },
        {
          children: (
            <Badge
              color={
                p.tag === "cwu"
                  ? cwuProposalStatusToColor(p.value.status, viewerUser.type)
                  : swuProposalStatusToColor(p.value.status, viewerUser.type)
              }
              text={
                p.tag === "cwu"
                  ? cwuProposalStatusToTitleCase(
                      p.value.status,
                      viewerUser.type
                    )
                  : swuProposalStatusToTitleCase(
                      p.value.status,
                      viewerUser.type
                    )
              }
            />
          )
        },
        {
          children: formatDate(p.value.createdAt)
        }
      ];
    });
}

function makePublicSectorBodyRows(
  cwu: CWUO.CWUOpportunitySlim[],
  swu: SWUO.SWUOpportunitySlim[],
  viewerUser: User
): Table.BodyRows {
  return [
    ...cwu.map((o) => adt("cwu" as const, o)),
    ...swu.map((o) => adt("swu" as const, o))
  ]
    .filter((o) => o.value.createdBy?.id === viewerUser.id)
    .sort((a, b) => compareDates(a.value.createdAt, b.value.createdAt) * -1)
    .map((p) => {
      const defaultTitle =
        p.tag === "cwu"
          ? CWUO.DEFAULT_OPPORTUNITY_TITLE
          : SWUO.DEFAULT_OPPORTUNITY_TITLE;
      return [
        {
          children: (
            <div>
              <Link
                dest={routeDest(
                  adt(
                    p.tag === "cwu"
                      ? "opportunityCWUEdit"
                      : "opportunitySWUEdit",
                    { opportunityId: p.value.id }
                  )
                )}>
                {p.value.title || defaultTitle}
              </Link>
              <div className="small text-secondary text-uppercase">
                {p.tag === "cwu" ? "Code With Us" : "Sprint With Us"}
              </div>
            </div>
          )
        },
        {
          children: (
            <Badge
              color={
                p.tag === "cwu"
                  ? cwuOpportunityStatusToColor(p.value.status)
                  : swuOpportunityStatusToColor(p.value.status)
              }
              text={
                p.tag === "cwu"
                  ? cwuOpportunityStatusToTitleCase(p.value.status)
                  : swuOpportunityStatusToTitleCase(p.value.status)
              }
            />
          )
        },
        {
          children: formatDate(p.value.createdAt)
        }
      ];
    });
}

const init: component_.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = isSignedIn<RouteParams, State, Msg>({
  success({ shared }) {
    const viewerUser = shared.sessionUser;
    const vendor = isVendor(viewerUser);
    const title = vendor ? "My Proposals" : "My Opportunities";
    const headCells: Table.HeadCells = [
      {
        children: vendor ? "Opportunity" : "Title",
        style: {
          width: "100%",
          minWidth: "200px"
        }
      },
      {
        children: "Status",
        style: { width: "0px" }
      },
      {
        children: "Date Created",
        className: "text-nowrap",
        style: { width: "0px" }
      }
    ];
    const [tableState, tableCmds] = Table.init({
      idNamespace: "dashboard-table"
    });
    const bodyRows: Table.BodyRows = [];
    return [
      valid(
        immutable({
          isQualified: false,
          viewerUser,
          table: {
            title,
            headCells,
            bodyRows,
            state: immutable(tableState),
            link: vendor
              ? undefined
              : {
                  text: "View all opportunities",
                  route: adt("opportunities", null)
                }
          }
        })
      ),
      [
        ...component_.cmd.mapMany(tableCmds, (msg) => adt("table", msg) as Msg),
        vendor
          ? (component_.cmd.join3(
              api.proposals.cwu.readMany()((response) =>
                api.getValidValue(response, [])
              ),
              api.proposals.swu.readMany()((response) =>
                api.getValidValue(response, [])
              ),
              api.organizations.owned.readMany((response) =>
                api.getValidValue(response, [])
              ),
              (cwu, swu, orgs) =>
                adt(
                  "onInitResponse",
                  adt("vendor", [cwu, swu, orgs] as const)
                ) as Msg
            ) as component_.Cmd<Msg>)
          : component_.cmd.join(
              api.opportunities.cwu.readMany((response) =>
                api.getValidValue(response, [])
              ),
              api.opportunities.swu.readMany((response) =>
                api.getValidValue(response, [])
              ),
              (cwu, swu) =>
                adt(
                  "onInitResponse",
                  adt("publicSector", [cwu, swu] as const)
                ) as Msg
            )
      ]
    ];
  },

  fail() {
    return [
      invalid(null),
      [
        component_.cmd.dispatch(
          component_.global.replaceRouteMsg(adt("landing" as const, null))
        )
      ]
    ];
  }
});

const update: component_.page.Update<State, InnerMsg, Route> = updateValid(
  ({ state, msg }) => {
    switch (msg.tag) {
      case "onInitResponse": {
        switch (msg.value.tag) {
          case "vendor": {
            const [cwuProposals, swuProposals, organizations] = msg.value.value;
            const isQualified = organizations.reduce(
              (acc, o) => acc || doesOrganizationMeetSWUQualification(o),
              false as boolean
            );
            return [
              state
                .set("isQualified", isQualified)
                .setIn(
                  ["table", "bodyRows"],
                  makeVendorBodyRows(
                    cwuProposals,
                    swuProposals,
                    state.viewerUser
                  )
                ),
              [component_.cmd.dispatch(component_.page.readyMsg())]
            ];
          }
          case "publicSector":
          default: {
            const [cwuOpportunities, swuOpportunities] = msg.value.value;
            return [
              state.setIn(
                ["table", "bodyRows"],
                makePublicSectorBodyRows(
                  cwuOpportunities,
                  swuOpportunities,
                  state.viewerUser
                )
              ),
              [component_.cmd.dispatch(component_.page.readyMsg())]
            ];
          }
        }
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
  }
);

const Welcome: component_.base.View<Pick<ValidState, "viewerUser">> = ({
  viewerUser
}) => {
  const vendor = isVendor(viewerUser);
  return (
    <div className="d-flex flex-column justify-content-center align-items-stretch flex-grow-1">
      <Row className="justify-content-center text-center">
        <Col xs="12" sm="10" md="6">
          <img
            src={prefixPath("/images/illustrations/dashboard_welcome.svg")}
            className="mb-5 mb-md-6"
            style={{ maxWidth: "100%" }}
          />
          <h1 className="mb-4">Welcome to the Digital Marketplace!</h1>
          <p>
            {vendor
              ? "Get started by browsing the opportunities posted to the Digital Marketplace."
              : "Get started by creating your first opportunity or browsing the opportunities posted to the Digital Marketplace."}
          </p>
          <div className="d-flex flex-column flex-sm-row flex-nowrap justify-content-center align-items-center mt-5">
            <Link
              button
              className="text-nowrap"
              dest={routeDest(adt("opportunities", null))}
              color={vendor ? "primary" : "info"}
              outline={!vendor}>
              View All Opportunities
            </Link>
            {!vendor ? (
              <Link
                button
                className="ml-sm-4 mt-3 mt-sm-0 text-nowrap"
                dest={routeDest(adt("opportunityCreate", null))}
                color="primary">
                Create Your First Opportunity
              </Link>
            ) : null}
          </div>
        </Col>
      </Row>
    </div>
  );
};

interface DashboardProps extends Pick<ValidState, "viewerUser"> {
  table: Defined<ValidState["table"]>;
  dispatch: component_.base.Dispatch<Msg>;
}

const Dashboard: component_.base.View<DashboardProps> = ({
  table,
  dispatch
}) => {
  return (
    <div>
      <Row className="mb-5">
        <Col xs="12">
          <h1 className="mb-0">Dashboard</h1>
        </Col>
      </Row>
      <Row>
        <Col xs="12" md="9">
          <div className="rounded-lg border bg-white p-4 p-sm-4h shadow-hover">
            <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center mb-3">
              <div className="font-weight-bold mr-sm-3">{table.title}</div>
              {table.link ? (
                <span className="d-none d-sm-inline-flex ml-sm-auto font-size-small">
                  <Link
                    dest={routeDest(table.link.route)}
                    iconSymbolSize={0.9}
                    symbol_={rightPlacement(iconLinkSymbol("arrow-right"))}>
                    {table.link.text}
                  </Link>
                </span>
              ) : null}
            </div>
            <Table.view
              headCells={table.headCells}
              bodyRows={table.bodyRows}
              state={table.state}
              dispatch={component_.base.mapDispatch(dispatch, (msg) =>
                adt("table" as const, msg)
              )}
            />
          </div>
        </Col>
      </Row>
    </div>
  );
};

const view: component_.page.View<State, InnerMsg, Route> = viewValid(
  ({ state, dispatch }) => {
    if (state.table) {
      return (
        <Dashboard
          dispatch={dispatch}
          viewerUser={state.viewerUser}
          table={state.table}
        />
      );
    }
    return <Welcome viewerUser={state.viewerUser} />;
  }
);

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
  backgroundColor: "c-dashboard-bg",

  getMetadata() {
    return makePageMetadata("Dashboard");
  },

  getAlerts: getAlertsValid((state) => {
    return {
      info:
        isVendor(state.viewerUser) && !state.isQualified && state.table
          ? [
              {
                text: (
                  <span>
                    You must{" "}
                    <Link dest={routeDest(adt("orgCreate", null))}>
                      create an organization
                    </Link>{" "}
                    and be a{" "}
                    <Link dest={routeDest(adt("learnMoreSWU", null))}>
                      Qualified Supplier
                    </Link>{" "}
                    in order to submit proposals to Sprint With Us
                    opportunities.
                  </span>
                )
              }
            ]
          : []
    };
  }),

  getActions: getActionsValid(({ state }) => {
    if (isVendor(state.viewerUser) || !state.table) {
      return component_.page.actions.none();
    }
    return component_.page.actions.links([
      {
        children: "Create Opportunity",
        symbol_: leftPlacement(iconLinkSymbol("plus-circle")),
        dest: routeDest(adt("opportunityCreate", null)),
        button: true,
        color: "primary"
      }
    ]);
  })
};
