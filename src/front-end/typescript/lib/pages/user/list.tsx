import { SEARCH_DEBOUNCE_DURATION } from "front-end/config";
import { makePageMetadata } from "front-end/lib";
import { isUserType } from "front-end/lib/access-control";
import router from "front-end/lib/app/router";
import { Route, SharedState } from "front-end/lib/app/types";
import * as Table from "front-end/lib/components/table";
import * as ShortText from "front-end/lib/components/form-field/short-text";
import * as FormField from "front-end/lib/components/form-field";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import {
  userStatusToColor,
  userStatusToTitleCase,
  userTypeToTitleCase
} from "front-end/lib/pages/user/lib";
import Badge from "front-end/lib/views/badge";
import Link, { routeDest } from "front-end/lib/views/link";
import React, { useState, useEffect } from "react";
import { Col, Row, Spinner } from "reactstrap";
import { compareStrings } from "shared/lib";
import { isAdmin, User, UserType } from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";
import { EMPTY_STRING } from "shared/config";

interface TableUser extends User {
  statusTitleCase: string;
  typeTitleCase: string;
}

export interface State {
  table: Immutable<Table.State>;
  users: TableUser[];
  visibleUsers: TableUser[];
  loading: boolean;
  searchFilter: Immutable<ShortText.State>;
}

type InnerMsg =
  | ADT<"onInitResponse", TableUser[]>
  | ADT<"table", Table.Msg>
  | ADT<"searchFilter", ShortText.Msg>
  | ADT<"search", null>
  | ADT<"noop", null>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

export type RouteParams = null;

function makeQueryRegExp(query: string): RegExp | null {
  if (!query) {
    return null;
  }
  return new RegExp(query.split(/\s+/).join(".*"), "i");
}

function filterUsers(users: TableUser[], query: string): TableUser[] {
  const regExp = makeQueryRegExp(query);
  if (!regExp) {
    return users;
  }
  return users.filter((user) => {
    return user.name && user.name.match(regExp);
  });
}

function runSearch(state: Immutable<State>): Immutable<State> {
  const query = FormField.getValue(state.searchFilter);
  const filteredUsers = filterUsers(state.users, query);
  return state.set("visibleUsers", filteredUsers);
}

const dispatchSearch = component_.cmd.makeDebouncedDispatch(
  adt("noop", null) as InnerMsg,
  adt("search", null) as InnerMsg,
  SEARCH_DEBOUNCE_DURATION
);

function baseInit(): component_.base.InitReturnValue<State, Msg> {
  const [tableState, tableCmds] = Table.init({
    idNamespace: "user-list-table"
  });
  const [searchFilterState, searchFilterCmds] = ShortText.init({
    errors: [],
    child: {
      type: "text",
      value: "",
      id: "user-list-search"
    }
  });
  return [
    {
      users: [],
      visibleUsers: [],
      table: immutable(tableState),
      loading: true,
      searchFilter: immutable(searchFilterState)
    },
    [
      component_.cmd.dispatch(component_.page.readyMsg()),
      ...component_.cmd.mapMany(tableCmds, (msg) => adt("table", msg) as Msg),
      ...component_.cmd.mapMany(
        searchFilterCmds,
        (msg) => adt("searchFilter", msg) as Msg
      )
    ]
  ];
}

const init: component_.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = isUserType({
  userType: [UserType.Admin],
  success() {
    const [initState, initCmds] = baseInit();
    return [
      initState,
      [
        ...initCmds,
        api.users.readMany<Msg>()((response) => {
          if (!api.isValid(response)) return adt("onInitResponse", []);
          const users = response.value
            .map((user) => ({
              ...user,
              typeTitleCase: userTypeToTitleCase(user.type),
              statusTitleCase: userStatusToTitleCase(user.status)
            }))
            .sort((a, b) => {
              const statusCompare = compareStrings(
                a.statusTitleCase,
                b.statusTitleCase
              );
              if (statusCompare) {
                return statusCompare;
              }
              const typeCompare = compareStrings(
                a.typeTitleCase,
                b.typeTitleCase
              );
              if (typeCompare) {
                return typeCompare;
              }
              return compareStrings(a.name, b.name);
            });
          return adt("onInitResponse", users);
        })
      ]
    ];
  },
  fail({ routePath, shared }) {
    const [initState, initCmds] = baseInit();
    return [
      initState,
      [
        ...initCmds,
        component_.cmd.dispatch(
          component_.global.replaceRouteMsg(
            shared.session
              ? adt("notFound" as const, { path: routePath })
              : adt("signIn" as const, {
                  redirectOnSuccess: router.routeToUrl(adt("userList", null))
                })
          )
        )
      ]
    ];
  }
});

const update: component_.page.Update<State, InnerMsg, Route> = ({
  state,
  msg
}) => {
  switch (msg.tag) {
    case "onInitResponse": {
      const newState = state.set("users", msg.value).set("loading", false);
      return [runSearch(newState), []];
    }
    case "table":
      return component_.base.updateChild({
        state,
        childStatePath: ["table"],
        childUpdate: Table.update,
        childMsg: msg.value,
        mapChildMsg: (value) => ({ tag: "table", value })
      });
    case "searchFilter":
      return component_.base.updateChild({
        state,
        childStatePath: ["searchFilter"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => ({ tag: "searchFilter", value }),
        updateAfter: (state) =>
          [state, [dispatchSearch()]] as component_.page.UpdateReturnValue<
            State,
            InnerMsg,
            Route
          >
      });
    case "search":
      return [runSearch(state), []];
    case "noop":
      return [state, []];
    default:
      return [state, []];
  }
};

function tableHeadCells(): Table.HeadCells {
  return [
    {
      children: "Status",
      className: "text-nowrap",
      style: { width: "10%", minWidth: "80px" }
    },
    {
      children: "Account Type",
      className: "text-nowrap",
      style: { width: "15%", minWidth: "180px" }
    },
    {
      children: "Name",
      className: "text-nowrap",
      style: {
        width: "30%",
        minWidth: "200px"
      }
    },
    {
      children: "Admin?",
      className: "text-center text-nowrap",
      style: { width: "10%", minWidth: "52px" }
    }
  ];
}

const VirtualizedTable: React.FC<{
  state: Immutable<State>;
  dispatch: component_.base.Dispatch<Table.Msg>;
}> = ({ state, dispatch }) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const bodyContainerRef = React.useRef<HTMLDivElement>(null);
  const headCells = React.useMemo(() => tableHeadCells(), []);

  useEffect(() => {
    const container = bodyContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const rowHeight = 50; // Must match CSS
      const start = Math.floor(scrollTop / rowHeight);
      const buffer = 5;
      const visibleStart = Math.max(0, start - buffer);

      // Ensure container height is calculated before proceeding
      const clientHeight = container.clientHeight;
      if (clientHeight <= 0) {
        return; // Don't calculate if height isn't ready
      }

      const visibleCount = Math.ceil(clientHeight / rowHeight);
      const visibleEnd = Math.min(
        state.visibleUsers.length,
        visibleStart + visibleCount + buffer * 2
      );

      setVisibleRange({ start: visibleStart, end: visibleEnd });
    };

    container.addEventListener("scroll", handleScroll);

    // Delay initial calculation slightly to allow layout
    const timerId = setTimeout(handleScroll, 0);

    return () => {
      clearTimeout(timerId);
      container.removeEventListener("scroll", handleScroll);
    };
  }, [state.visibleUsers.length]);

  const visibleUsers = state.visibleUsers.slice(
    visibleRange.start,
    visibleRange.end
  );

  const totalHeight = state.visibleUsers.length * 50; // 50px per row (must match CSS)
  const paddingTop = visibleRange.start * 50; // Calculate top padding based on hidden rows

  return (
    <div className="virtualized-table-layout">
      {/* 1. Render Header Separately */}
      <div className="table-header-wrapper">
        <Table.view
          // Use a dummy table state if Table.view requires it
          state={immutable(Table.init({ idNamespace: "user-list-header" })[0])}
          dispatch={dispatch} // Dispatch might not be needed here
          headCells={headCells}
          bodyRows={[]} // No body rows for the header table
          className="table table-header-fixed" // Apply fixed layout
        />
      </div>

      {/* 2. Render Scrollable Body Container */}
      <div ref={bodyContainerRef} className="virtualized-body-container">
        {/* 3. Inner div for total height simulation */}
        <div style={{ height: totalHeight, position: "relative" }}>
          {/* 4. Absolutely positioned div for visible rows, using padding */}
          <div
            style={{
              position: "absolute",
              top: `${paddingTop}px`, // Use padding instead of transform
              left: 0,
              width: "100%"
            }}>
            {/* 5. Render Body Table Manually */}
            <table className="table virtualized-body-table">
              <colgroup>
                {headCells.map((cell, index) => (
                  <col key={index} style={cell.style} />
                ))}
              </colgroup>
              <tbody>
                {visibleUsers.map((user) => (
                  <tr key={user.id} style={{ height: "50px" }}>
                    <td className="align-middle">
                      <Badge
                        text={user.statusTitleCase}
                        color={userStatusToColor(user.status)}
                      />
                    </td>
                    <td className="align-middle text-nowrap">
                      {user.typeTitleCase}
                    </td>
                    <td className="align-middle">
                      <Link
                        dest={routeDest(
                          adt("userProfile", { userId: user.id })
                        )}>
                        {user.name || EMPTY_STRING}
                      </Link>
                    </td>
                    <td className="align-middle text-center">
                      <Table.Check checked={isAdmin(user)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const view: component_.page.View<State, InnerMsg, Route> = ({
  state,
  dispatch
}) => {
  const dispatchTable = component_.base.mapDispatch<Msg, Table.Msg>(
    dispatch,
    (value) => ({ tag: "table", value })
  );
  const dispatchSearchFilter = component_.base.mapDispatch<Msg, ShortText.Msg>(
    dispatch,
    (value) => ({ tag: "searchFilter", value })
  );
  return (
    <Row>
      <Col xs="12">
        <h1 className="mb-5">Digital Marketplace Users</h1>
        <div className="mb-3">
          {state.loading ? (
            <div
              className="d-flex justify-content-center align-items-center"
              style={{ height: "60vh" }}>
              <Spinner color="primary" />
            </div>
          ) : (
            <>
              <div className="mb-4">
                <ShortText.view
                  extraChildProps={{}}
                  placeholder="Search by name..."
                  disabled={false}
                  state={state.searchFilter}
                  className="w-100"
                  dispatch={dispatchSearchFilter}
                />
              </div>
              <VirtualizedTable state={state} dispatch={dispatchTable} />
            </>
          )}
        </div>
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
  getMetadata() {
    return makePageMetadata("Users");
  }
};
