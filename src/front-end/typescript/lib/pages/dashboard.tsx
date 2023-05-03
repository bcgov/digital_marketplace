import {
  getAlertsValid,
  getActionsValid,
  makePageMetadata,
  prefixPath,
  updateValid,
  viewValid,
  Intersperse
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
import * as TWUO from "shared/lib/resources/opportunity/team-with-us";
import {
  doesOrganizationMeetSWUQualification,
  doesOrganizationMeetTWUQualification,
  OrganizationSlim
} from "shared/lib/resources/organization";
import * as CWUP from "shared/lib/resources/proposal/code-with-us";
import * as SWUP from "shared/lib/resources/proposal/sprint-with-us";
import * as TWUP from "shared/lib/resources/proposal/team-with-us";
import { isVendor, User } from "shared/lib/resources/user";
import { adt, ADT, Defined } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";
import oppHelpers from "../interfaces/opportunities";
import {
  twuProposalStatusToColor,
  twuProposalStatusToTitleCase
} from "front-end/lib/pages/proposal/team-with-us/lib";

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
  isSWUQualified?: boolean;
  isTWUQualified?: boolean;
}

export type State = Validation<Immutable<ValidState>, null>;

type InitResponse =
  | ADT<
      "vendor",
      [
        CWUP.CWUProposalSlim[],
        SWUP.SWUProposalSlim[],
        TWUP.TWUProposalSlim[],
        OrganizationSlim[]
      ]
    >
  | ADT<
      "publicSector",
      [
        CWUO.CWUOpportunitySlim[],
        SWUO.SWUOpportunitySlim[],
        TWUO.TWUOpportunitySlim[]
      ]
    >;

export type InnerMsg =
  | ADT<"table", Table.Msg>
  | ADT<"onInitResponse", InitResponse>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

export type RouteParams = null;

function makeVendorBodyRows(
  cwu: CWUP.CWUProposalSlim[],
  swu: SWUP.SWUProposalSlim[],
  twu: TWUP.TWUProposalSlim[],
  viewerUser: User
): Table.BodyRows {
  return [
    ...cwu.map((p) => adt("cwu" as const, p)),
    ...swu.map((p) => adt("swu" as const, p)),
    ...twu.map((p) => adt("twu" as const, p))
  ]
    .sort((a, b) => compareDates(a.value.createdAt, b.value.createdAt) * -1)
    .map((p) => {
      return [
        {
          children: (
            <div>
              <Link
                dest={routeDest(
                  adt(
                    p.tag === "cwu"
                      ? "proposalCWUEdit"
                      : p.tag === "swu"
                      ? "proposalSWUEdit"
                      : "proposalTWUEdit",
                    {
                      proposalId: p.value.id,
                      opportunityId: p.value.opportunity.id
                    }
                  )
                )}>
                {p.value.opportunity.title}
              </Link>
              <div className="small text-secondary text-uppercase">
                {p.tag === "cwu"
                  ? "Code With Us"
                  : p.tag === "swu"
                  ? "Sprint With Us"
                  : "Team With Us"}
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
                  : p.tag === "swu"
                  ? swuProposalStatusToColor(p.value.status, viewerUser.type)
                  : twuProposalStatusToColor(p.value.status, viewerUser.type)
              }
              text={
                p.tag === "cwu"
                  ? cwuProposalStatusToTitleCase(
                      p.value.status,
                      viewerUser.type
                    )
                  : p.tag === "swu"
                  ? swuProposalStatusToTitleCase(
                      p.value.status,
                      viewerUser.type
                    )
                  : twuProposalStatusToTitleCase(
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
  twu: TWUO.TWUOpportunitySlim[],
  viewerUser: User
): Table.BodyRows {
  return [
    ...cwu.map((o) => adt("cwu" as const, o)),
    ...swu.map((o) => adt("swu" as const, o)),
    ...twu.map((o) => adt("twu" as const, o))
  ]
    .filter((o) => o.value.createdBy?.id === viewerUser.id)
    .sort((a, b) => compareDates(a.value.createdAt, b.value.createdAt) * -1)
    .map((p) => {
      const defaultTitle = oppHelpers(p).dashboard.getDefaultTitle();
      return [
        {
          children: (
            <div>
              <Link
                dest={routeDest(
                  oppHelpers(p).dashboard.getOppEditRoute(p.value.id)
                )}>
                {p.value.title || defaultTitle}
              </Link>
              <div className="small text-secondary text-uppercase">
                {p.tag === "cwu"
                  ? "Code With Us"
                  : p.tag === "swu"
                  ? "Sprint With Us"
                  : "Team With Us"}
              </div>
            </div>
          )
        },
        {
          children: (
            <Badge
              color={oppHelpers(p).dashboard.getOppStatusColor(p.value.status)}
              text={oppHelpers(p).dashboard.getOppStatusText(p.value.status)}
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
          isSWUQualified: false,
          isTWUQualified: false,
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
          ? component_.cmd.join4(
              api.proposals.cwu.readMany()((response) =>
                api.getValidValue(response, [])
              ),
              api.proposals.swu.readMany()((response) =>
                api.getValidValue(response, [])
              ),
              api.proposals.twu.readMany()((response) =>
                api.getValidValue(response, [])
              ),
              api.organizations.owned.readMany()((response) =>
                api.getValidValue(response, [])
              ),
              (cwu, swu, twu, orgs) =>
                adt(
                  "onInitResponse",
                  adt("vendor", [cwu, swu, twu, orgs] as const)
                ) as Msg
            )
          : component_.cmd.join3(
              api.opportunities.cwu.readMany()((response) =>
                api.getValidValue(response, [])
              ),
              api.opportunities.swu.readMany()((response) =>
                api.getValidValue(response, [])
              ),
              api.opportunities.twu.readMany()((response) =>
                api.getValidValue(response, [])
              ),
              (cwu, swu, twu) =>
                adt(
                  "onInitResponse",
                  adt("publicSector", [cwu, swu, twu]) as InitResponse
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
            const [cwuProposals, swuProposals, twuProposals, organizations] =
              msg.value.value;
            const isSWUQualified = organizations.some(
              doesOrganizationMeetSWUQualification
            );
            const isTWUQualified = organizations.some(
              doesOrganizationMeetTWUQualification
            );
            return [
              state
                .set("isSWUQualified", isSWUQualified)
                .set("isTWUQualified", isTWUQualified)
                .setIn(
                  ["table", "bodyRows"],
                  makeVendorBodyRows(
                    cwuProposals,
                    swuProposals,
                    twuProposals,
                    state.viewerUser
                  )
                ),
              [component_.cmd.dispatch(component_.page.readyMsg())]
            ];
          }
          case "publicSector":
          default: {
            const [cwuOpportunities, swuOpportunities, twuOpportunities] =
              msg.value.value;
            return [
              state.setIn(
                ["table", "bodyRows"],
                makePublicSectorBodyRows(
                  cwuOpportunities,
                  swuOpportunities,
                  twuOpportunities,
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
    const programsToQualify = [
      ...(state.isSWUQualified
        ? []
        : [
            {
              name: "Sprint With Us",
              qualificationLink: (
                <Link dest={routeDest(adt("learnMoreSWU", null))}>
                  Qualified Sprint With Us Supplier
                </Link>
              )
            }
          ]),
      ...(state.isTWUQualified
        ? []
        : [
            {
              name: "Team With Us",
              qualificationLink: (
                <Link dest={routeDest(adt("learnMoreTWU", null))}>
                  Qualified Team With Us Supplier
                </Link>
              )
            }
          ])
    ];
    return {
      info:
        isVendor(state.viewerUser) &&
        programsToQualify.length > 0 &&
        state.table
          ? [
              {
                text: (
                  <span>
                    You must{" "}
                    <Link dest={routeDest(adt("orgCreate", null))}>
                      create an organization
                    </Link>{" "}
                    and be a{" "}
                    <Intersperse
                      collection={programsToQualify.map(
                        ({ qualificationLink }) => qualificationLink
                      )}
                      separator={" or "}
                    />{" "}
                    in order to submit proposals to{" "}
                    <Intersperse
                      collection={programsToQualify.map(({ name }) => name)}
                      separator={" or "}
                    />{" "}
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
