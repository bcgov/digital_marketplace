import {
  getAlertsValid,
  getActionsValid,
  makePageMetadata,
  updateValid,
  Intersperse,
  viewValid,
  prefixPath
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
import { Col, Container, Row } from "reactstrap";
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
import TabbedNav, { Tab } from "front-end/lib/views/tabbed-nav";
import {
  cwuOpportunityToPublicColor,
  cwuOpportunityToPublicStatus
} from "front-end/lib/pages/opportunity/code-with-us/lib";
import {
  swuOpportunityToPublicColor,
  swuOpportunityToPublicStatus
} from "front-end/lib/pages/opportunity/sprint-with-us/lib";
import {
  twuOpportunityToPublicColor,
  twuOpportunityToPublicStatus
} from "front-end/lib/pages/opportunity/team-with-us/lib";

type ProposalsTab = "my-proposals" | "org-proposals";

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
  orgTable: {
    title: string;
    link?: {
      text: string;
      route: Route;
    };
    headCells: Table.HeadCells;
    bodyRows: Table.BodyRows;
    state: Immutable<Table.State>;
  };
  panelTable: {
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
  activeProposalsTab: ProposalsTab;
  activeTab: "my-opportunities" | "panel-opportunities";
}

export type State = Validation<Immutable<ValidState>, null>;

type InitResponse =
  | ADT<
      "vendor",
      [
        CWUP.CWUProposalSlim[],
        SWUP.SWUProposalSlim[],
        TWUP.TWUProposalSlim[],
        OrganizationSlim[],
        CWUP.CWUProposalSlim[],
        SWUP.SWUProposalSlim[],
        TWUP.TWUProposalSlim[]
      ]
    >
  | ADT<
      "publicSector",
      [
        CWUO.CWUOpportunitySlim[],
        SWUO.SWUOpportunitySlim[],
        TWUO.TWUOpportunitySlim[],
        SWUO.SWUOpportunitySlim[],
        TWUO.TWUOpportunitySlim[]
      ]
    >;

export type InnerMsg =
  | ADT<"table", Table.Msg>
  | ADT<"onInitResponse", InitResponse>
  | ADT<"setActiveProposalsTab", ProposalsTab>
  | ADT<"setActiveTab", "my-opportunities" | "panel-opportunities">;

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
        // Vendor can see the opportunity status
        {
          children: (
            <Badge
              color={
                p.tag === "cwu"
                  ? cwuOpportunityToPublicColor(p.value.opportunity, viewerUser)
                  : p.tag === "swu"
                  ? swuOpportunityToPublicColor(p.value.opportunity, viewerUser)
                  : twuOpportunityToPublicColor(p.value.opportunity, viewerUser)
              }
              text={
                p.tag === "cwu"
                  ? cwuOpportunityToPublicStatus(
                      p.value.opportunity,
                      viewerUser
                    )
                  : p.tag === "swu"
                  ? swuOpportunityToPublicStatus(
                      p.value.opportunity,
                      viewerUser
                    )
                  : twuOpportunityToPublicStatus(
                      p.value.opportunity,
                      viewerUser
                    )
              }
            />
          )
        },
        {
          children: (
            <div>
              {formatDate(p.value.createdAt)}
              <div className="small text-secondary text-uppercase">
                {p.value.createdBy?.name}
              </div>
            </div>
          )
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
          children: (
            <div>
              {formatDate(p.value.createdAt)}
              <div className="small text-secondary text-uppercase">
                {p.value.createdBy?.name}
              </div>
            </div>
          )
        }
      ];
    });
}

function makePanelBodyRows(
  swu: SWUO.SWUOpportunitySlim[],
  twu: TWUO.TWUOpportunitySlim[]
): Table.BodyRows {
  return [
    ...swu.map((o) => adt("swu" as const, o)),
    ...twu.map((o) => adt("twu" as const, o))
  ]
    .sort((a, b) => compareDates(a.value.createdAt, b.value.createdAt) * -1)
    .map((o) => {
      const defaultTitle = oppHelpers(o).dashboard.getDefaultTitle();
      return [
        {
          children: (
            <div>
              <Link
                dest={routeDest(
                  oppHelpers(o).dashboard.getOppEditRoute(o.value.id)
                )}>
                {o.value.title || defaultTitle}
              </Link>
              <div className="small text-secondary text-uppercase">
                {o.tag === "swu" ? "Sprint With Us" : "Team With Us"}
              </div>
            </div>
          )
        },
        {
          children: (
            <Badge
              color={oppHelpers(o).dashboard.getOppStatusColor(o.value.status)}
              text={oppHelpers(o).dashboard.getOppStatusText(o.value.status)}
            />
          )
        },
        {
          children: (
            <div>
              {formatDate(o.value.createdAt)}
              <div className="small text-secondary text-uppercase">
                {o.value.createdBy?.name}
              </div>
            </div>
          )
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
    const title = vendor ? "" : "My Opportunities";
    // Vendors can see both the proposal status as well as the opportunity status
    // Public sector users can only see the opportunity status
    const headCells: Table.HeadCells = vendor
      ? [
          {
            children: "Opportunity",
            style: {
              width: "70%",
              minWidth: "200px"
            }
          },
          {
            children: "Proposal Status",
            style: { width: "0px" }
          },
          {
            children: "Opportunity Status",
            style: { width: "0px" }
          },
          {
            children: "Created",
            className: "text-nowrap",
            style: { width: "10%", minWidth: "125px" }
          }
        ]
      : [
          {
            children: "Title",
            style: {
              width: "90%",
              minWidth: "200px"
            }
          },
          {
            children: "Status",
            style: { width: "0px" }
          },
          {
            children: "Created",
            className: "text-nowrap",
            style: { width: "10%", minWidth: "125px" }
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
          activeProposalsTab: "my-proposals", // active tab for vendor
          activeTab: "my-opportunities", // active tab for public sector
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
          },
          orgTable: {
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
          },
          panelTable: {
            title: "Evaluations",
            headCells,
            bodyRows,
            state: immutable(tableState),
            link: {
              text: "View all opportunities",
              route: adt("opportunities", null)
            }
          }
        })
      ),
      [
        ...component_.cmd.mapMany(tableCmds, (msg) => adt("table", msg) as Msg),
        vendor
          ? component_.cmd.join7(
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
              api.proposals.cwu.readMany(
                "",
                "orgProposals"
              )((response) => api.getValidValue(response, [])),
              api.proposals.swu.readMany(
                "",
                "orgProposals"
              )((response) => api.getValidValue(response, [])),
              api.proposals.twu.readMany(
                "",
                "orgProposals"
              )((response) => api.getValidValue(response, [])),
              (cwu, swu, twu, orgs, orgCwu, orgSwu, orgTwu) =>
                adt(
                  "onInitResponse",
                  adt("vendor", [
                    cwu,
                    swu,
                    twu,
                    orgs,
                    orgCwu,
                    orgSwu,
                    orgTwu
                  ] as const)
                ) as Msg
            )
          : component_.cmd.join5(
              api.opportunities.cwu.readMany()((response) =>
                api.getValidValue(response, [])
              ),
              api.opportunities.swu.readMany()((response) =>
                api.getValidValue(response, [])
              ),
              api.opportunities.twu.readMany()((response) =>
                api.getValidValue(response, [])
              ),
              // get panel opportunities
              api.opportunities.swu.readMany({ panelMember: true })(
                (response) => api.getValidValue(response, [])
              ),
              api.opportunities.twu.readMany({ panelMember: true })(
                (response) => api.getValidValue(response, [])
              ),
              (cwu, swu, twu, swuPanelOpps, twuPanelOpps) =>
                adt(
                  "onInitResponse",
                  adt("publicSector", [
                    cwu,
                    swu,
                    twu,
                    swuPanelOpps,
                    twuPanelOpps
                  ] as const) as InitResponse
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
            const [
              cwuProposals,
              swuProposals,
              twuProposals,
              organizations,
              orgCwuProposals,
              orgSwuProposals,
              orgTwuProposals
            ] = msg.value.value;
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
                .set("activeProposalsTab", state.activeProposalsTab)
                .setIn(
                  ["table", "bodyRows"],
                  makeVendorBodyRows(
                    cwuProposals,
                    swuProposals,
                    twuProposals,
                    state.viewerUser
                  )
                )
                .setIn(
                  ["orgTable", "bodyRows"],
                  makeVendorBodyRows(
                    orgCwuProposals,
                    orgSwuProposals,
                    orgTwuProposals,
                    state.viewerUser
                  )
                ),
              [component_.cmd.dispatch(component_.page.readyMsg())]
            ];
          }
          case "publicSector":
          default: {
            const [
              cwuOpportunities,
              swuOpportunities,
              twuOpportunities,
              swuPanelOpportunities,
              twuPanelOpportunities
            ] = msg.value.value;
            return [
              state
                .set("activeTab", state.activeTab)
                .setIn(
                  ["table", "bodyRows"],
                  makePublicSectorBodyRows(
                    cwuOpportunities,
                    swuOpportunities,
                    twuOpportunities,
                    state.viewerUser
                  )
                )
                .setIn(
                  ["panelTable", "bodyRows"],
                  makePanelBodyRows(
                    swuPanelOpportunities,
                    twuPanelOpportunities
                  )
                ),
              [component_.cmd.dispatch(component_.page.readyMsg())]
            ];
          }
        }
      }
      case "setActiveProposalsTab":
        return [state.set("activeProposalsTab", msg.value), []];
      case "setActiveTab":
        return [state.set("activeTab", msg.value), []];
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

const Header: component_.base.View = () => {
  return (
    <Row className="mb-5">
      <Col xs="12">
        <h1 className="mb-0">Dashboard</h1>
      </Col>
    </Row>
  );
};

/**
 * Will display Tabs only for Vendors. For both Vendors and Public Sector Users,
 * will display tables only if there is data to show, otherwise Welcome
 */
const view: component_.page.View<State, InnerMsg, Route> = viewValid(
  ({ state, dispatch }) => {
    const vendor = isVendor(state.viewerUser);
    if (vendor) {
      return (
        <div className="flex-grow-1 d-flex flex-column flex-nowrap align-items-stretch">
          <Header />
          <Row>
            <Col xs="12" md="9">
              <div className="rounded-lg bg-white p-4 p-sm-4h shadow-hover">
                <Proposals state={state} dispatch={dispatch} />
              </div>
            </Col>
          </Row>
        </div>
      );
    } else {
      return (
        <div className="flex-grow-1 d-flex flex-column flex-nowrap align-items-stretch">
          <Header />
          <Row>
            <Col xs="12" md="9">
              <div className="rounded-lg bg-white p-4 p-sm-4h shadow-hover">
                {state.table ? (
                  state.activeTab === "my-opportunities" ? (
                    <Dashboard
                      dispatch={dispatch}
                      viewerUser={state.viewerUser}
                      table={state.table}
                      showTabs={true}
                      activeTab={state.activeTab}
                    />
                  ) : (
                    <Dashboard
                      dispatch={dispatch}
                      viewerUser={state.viewerUser}
                      table={state.panelTable}
                      showTabs={true}
                      activeTab={state.activeTab}
                    />
                  )
                ) : (
                  <Welcome viewerUser={state.viewerUser} />
                )}
              </div>
            </Col>
          </Row>
        </div>
      );
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

// Tabs for government users
interface GovTabsProps {
  activeTab: "my-opportunities" | "panel-opportunities";
  dispatch: component_.base.Dispatch<Msg>;
}

const GovTabs: component_.base.View<GovTabsProps> = ({
  activeTab,
  dispatch
}) => {
  const getTabInfo = (tab: "my-opportunities" | "panel-opportunities") => ({
    active: activeTab === tab,
    onClick: () => dispatch(adt("setActiveTab", tab))
  });

  const tabs: Tab[] = [
    {
      ...getTabInfo("my-opportunities"),
      text: "My Opportunities"
    },
    {
      ...getTabInfo("panel-opportunities"),
      text: "Evaluations"
    }
  ];

  return (
    <Row className="mb-2">
      <Col xs="12">
        <TabbedNav tabs={tabs} />
      </Col>
    </Row>
  );
};

interface DashboardProps extends Pick<ValidState, "viewerUser"> {
  table: Defined<ValidState["table"]>;
  dispatch: component_.base.Dispatch<Msg>;
  showTabs?: boolean;
  activeTab?: "my-opportunities" | "panel-opportunities";
}

const Dashboard: component_.base.View<DashboardProps> = ({
  table,
  dispatch,
  showTabs = false,
  activeTab
}) => {
  return (
    <div>
      {showTabs && activeTab ? (
        <GovTabs activeTab={activeTab} dispatch={dispatch} />
      ) : null}
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
  );
};

const Proposals: component_.base.ComponentView<ValidState, Msg> = ({
  state,
  dispatch
}) => {
  const activeTab = (() => {
    switch (state.activeProposalsTab) {
      case "my-proposals":
        if (state.table.bodyRows.length > 0) {
          return (
            <Dashboard
              dispatch={dispatch}
              viewerUser={state.viewerUser}
              table={state.table}
            />
          );
        } else {
          return <Welcome viewerUser={state.viewerUser} />;
        }
      case "org-proposals":
        if (state.orgTable.bodyRows.length > 0) {
          return (
            <Dashboard
              dispatch={dispatch}
              viewerUser={state.viewerUser}
              table={state.orgTable}
            />
          );
        } else {
          return (
            <div className="d-flex flex-column justify-content-center align-items-stretch flex-grow-1">
              <Row>
                <Col xs="12">
                  <p>
                    Proposals belonging to your organizations or organizations
                    you are affiliated with will appear here after you have been
                    made an Admin in those organizations.
                  </p>
                </Col>
              </Row>
            </div>
          );
        }
    }
  })();
  return (
    <Container>
      <ProposalTabs state={state} dispatch={dispatch} />
      <Row>
        <Col xs="12" md="12">
          {activeTab}
        </Col>
      </Row>
    </Container>
  );
};

const ProposalTabs: component_.base.ComponentView<ValidState, Msg> = ({
  state,
  dispatch
}) => {
  const activeTab = state.activeProposalsTab;
  const getTabInfo = (tab: ProposalsTab) => ({
    active: activeTab === tab,
    onClick: () => dispatch(adt("setActiveProposalsTab", tab))
  });
  const tabs: Tab[] = [
    {
      ...getTabInfo("my-proposals"),
      text: "My Proposals"
    },
    {
      ...getTabInfo("org-proposals"),
      text: "Org Proposals"
    }
  ];

  return (
    <Row className="mb-2">
      <Col xs="12">
        <TabbedNav tabs={tabs} />
      </Col>
    </Row>
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
