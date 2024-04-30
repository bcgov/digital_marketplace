import { EMPTY_STRING } from "front-end/config";
import {
  makePageMetadata,
  makeStartLoading,
  makeStopLoading
} from "front-end/lib";
import { pushState } from "front-end/lib/app/router";
import { Route, SharedState } from "front-end/lib/app/types";
import * as Table from "front-end/lib/components/table";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import Link, {
  iconLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";
import Pagination from "front-end/lib/views/pagination";
import React from "react";
import { Col, Row } from "reactstrap";
import { DEFAULT_PAGE_SIZE } from "shared/config";
import {
  doesOrganizationMeetSWUQualification,
  doesOrganizationMeetTWUQualification,
  OrganizationSlim,
  ReadManyResponseBody
} from "shared/lib/resources/organization";
import {
  isAdmin,
  isVendor,
  User,
  usersAreEquivalent,
  UserType
} from "shared/lib/resources/user";
import { ADT, adt } from "shared/lib/types";
import Icon from "front-end/lib/views/icon";

type TableOrganization = OrganizationSlim;

export interface State {
  loading: number;
  table: Immutable<Table.State>;
  page: number;
  numPages: number;
  organizations: TableOrganization[];
  sessionUser: User | null;
}

type InnerMsg =
  | ADT<"noop">
  | ADT<"onInitResponse", ReadManyResponseBody>
  | ADT<"table", Table.Msg>
  | ADT<"pageChange", number>
  | ADT<"onPageChangeResponse", ReadManyResponseBody>
  | ADT<"startLoading">
  | ADT<"stopLoading">;

export type Msg = component_.page.Msg<InnerMsg, Route>;

export interface RouteParams {
  page?: number;
}

function updateUrl(page: number): component_.Cmd<Msg> {
  return pushState(adt("orgList", { page }), adt("noop"));
}

const DEFAULT_PAGE = 1;
const DEFAULT_NUM_PAGES = 6;

function loadPage(page: number): component_.Cmd<ReadManyResponseBody> {
  return api.organizations.readMany(page, DEFAULT_PAGE_SIZE, (response) => {
    if (api.isValid(response)) return response.value;
    return {
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      numPages: Math.max(page, DEFAULT_NUM_PAGES),
      items: []
    };
  });
}

const init: component_.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = ({ routeParams, shared }) => {
  const [tableState, tableCmds] = Table.init({
    idNamespace: "org-list-table"
  });
  const page =
    routeParams.page && routeParams.page > 0 ? routeParams.page : DEFAULT_PAGE;
  return [
    {
      loading: 0,
      page,
      numPages: Math.max(page, DEFAULT_NUM_PAGES),
      organizations: [],
      table: immutable(tableState),
      sessionUser: shared.session?.user || null
    },
    [
      ...component_.cmd.mapMany(tableCmds, (msg) => adt("table", msg) as Msg),
      component_.cmd.map(loadPage(page), (response) =>
        adt("onInitResponse", response)
      )
    ]
  ];
};

const startLoading = makeStartLoading<State>("loading");
const stopLoading = makeStopLoading<State>("loading");

const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "onInitResponse": {
      const { page, numPages, items } = msg.value;
      return [
        state
          .set("page", page)
          .set("numPages", numPages)
          .set("organizations", items),
        [component_.cmd.dispatch(component_.page.readyMsg())]
      ];
    }
    case "table":
      return component_.base.updateChild({
        state,
        childStatePath: ["table"],
        childUpdate: Table.update,
        childMsg: msg.value,
        mapChildMsg: (value) => ({ tag: "table", value })
      });
    case "pageChange":
      return [
        startLoading(state),
        [
          component_.cmd.map(loadPage(msg.value), (response) =>
            adt("onPageChangeResponse", response)
          )
        ]
      ];
    case "onPageChangeResponse": {
      const { page, numPages, items } = msg.value;
      return [
        stopLoading(state)
          .set("page", page)
          .set("numPages", numPages)
          .set("organizations", items),
        [updateUrl(page), component_.cmd.scrollTo(0, 0, adt("noop"))]
      ];
    }
    default:
      return [state, []];
  }
};

function showVendorOrAdminColumn(state: Immutable<State>): boolean {
  return !!state.sessionUser && state.sessionUser.type !== UserType.Government;
}

function tableHeadCells(state: Immutable<State>): Table.HeadCells {
  const owner = {
    children: "Owner",
    className: "text-nowrap",
    style: {
      minWidth: "200px"
    }
  };
  const swuQualified = {
    children: "SWU Qualified?",
    className: "text-center text-nowrap",
    style: {
      width: "0px"
    }
  };
  const twuQualified = {
    children: "TWU Qualified?",
    className: "text-center text-nowrap",
    style: {
      width: "0px"
    }
  };
  return [
    {
      children: "Organization Name",
      className: "text-nowrap",
      style: {
        width: "100%",
        minWidth: "240px"
      }
    },
    ...(showVendorOrAdminColumn(state) ? [twuQualified] : []),
    ...(showVendorOrAdminColumn(state) ? [swuQualified] : []),
    ...(showVendorOrAdminColumn(state) ? [owner] : [])
  ];
}

function tableBodyRows(state: Immutable<State>): Table.BodyRows {
  return state.organizations.map((org) => {
    const isSwuQualified = doesOrganizationMeetSWUQualification(org);
    const isTwuQualified = doesOrganizationMeetTWUQualification(org);
    const owner = {
      className: "text-nowrap",
      children: org.owner ? (
        state.sessionUser &&
        (usersAreEquivalent(org.owner, state.sessionUser) ||
          isAdmin(state.sessionUser)) ? (
          <Link dest={routeDest(adt("userProfile", { userId: org.owner.id }))}>
            {org.owner.name}
          </Link>
        ) : (
          org.owner.name
        )
      ) : (
        EMPTY_STRING
      )
    };
    const swuQualified = {
      className: "text-nowrap",
      children: org.owner ? (
        state.sessionUser &&
        (usersAreEquivalent(org.owner, state.sessionUser) ||
          isAdmin(state.sessionUser)) ? (
          <Icon
            name={isSwuQualified ? "check" : "times"}
            color={isSwuQualified ? "success" : "body"}
          />
        ) : (
          // only admins or owners can see SWU qualified status
          EMPTY_STRING
        )
      ) : (
        EMPTY_STRING
      )
    };
    const twuQualified = {
      className: "text-nowrap",
      children: org.owner ? (
        state.sessionUser &&
        (usersAreEquivalent(org.owner, state.sessionUser) ||
          isAdmin(state.sessionUser)) ? (
          <Icon
            name={isTwuQualified ? "check" : "times"}
            color={isTwuQualified ? "success" : "body"}
          />
        ) : (
          // only admins or owners can see SWU qualified status
          EMPTY_STRING
        )
      ) : (
        EMPTY_STRING
      )
    };
    return [
      {
        children: org.owner ? (
          <Link dest={routeDest(adt("orgEdit", { orgId: org.id }))}>
            {org.legalName}
          </Link>
        ) : (
          org.legalName
        )
      },
      ...(showVendorOrAdminColumn(state) ? [twuQualified] : []),
      ...(showVendorOrAdminColumn(state) ? [swuQualified] : []),
      ...(showVendorOrAdminColumn(state) ? [owner] : [])
    ];
  });
}

const view: component_.page.View<State, InnerMsg, Route> = ({
  state,
  dispatch
}) => {
  const dispatchTable = component_.base.mapDispatch<Msg, Table.Msg>(
    dispatch,
    (value) => ({ tag: "table", value })
  );
  return (
    <div>
      <h1 className="mb-5">Digital Marketplace Organizations</h1>
      <Row>
        <Col xs="12">
          <Table.view
            headCells={tableHeadCells(state)}
            bodyRows={tableBodyRows(state)}
            state={state.table}
            dispatch={dispatchTable}
          />
        </Col>
      </Row>
      {state.numPages === 1 ? null : (
        <Row>
          <Col xs="12" className="mt-5 d-flex justify-content-center">
            <Pagination
              page={state.page}
              numPages={state.numPages}
              disabled={state.loading > 0}
              onPageChange={(page) => dispatch(adt("pageChange", page))}
            />
          </Col>
        </Row>
      )}
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
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata("Organizations");
  },
  getActions: ({ state }) => {
    if (!state.sessionUser || !isVendor(state.sessionUser)) {
      return component_.page.actions.none();
    }
    return component_.page.actions.links([
      {
        children: "Create Organization",
        button: true,
        symbol_: leftPlacement(iconLinkSymbol("plus-circle")),
        color: "primary",
        dest: routeDest(adt("orgCreate", null))
      },
      {
        children: "My Organizations",
        button: true,
        outline: true,
        symbol_: leftPlacement(iconLinkSymbol("building")),
        color: "c-nav-fg-alt",
        dest: routeDest(
          adt("userProfile", {
            userId: state.sessionUser.id,
            tab: "organizations" as const
          })
        )
      }
    ]);
  }
};
