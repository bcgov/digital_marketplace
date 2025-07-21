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
  userStatusToTitleCase,
  userTypeToTitleCase
} from "front-end/lib/pages/user/lib";
import {
  VirtualizedTable,
  VirtualizedTableState,
  VirtualizedTableMsg
} from "front-end/lib/pages/user/lib/components/virtualized-table";
import React from "react";
import { Col, Row, Spinner } from "reactstrap";
import { compareStrings } from "shared/lib";
import { User, UserType } from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";

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
  virtualizedTable: Immutable<VirtualizedTableState>;
}

type InnerMsg =
  | ADT<"onInitResponse", TableUser[]>
  | ADT<"table", Table.Msg>
  | ADT<"searchFilter", ShortText.Msg>
  | ADT<"search", null>
  | ADT<"noop", null>
  | ADT<"virtualizedTable", VirtualizedTableMsg>;

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
  const [virtualizedTableState, virtualizedTableCmds] = VirtualizedTable.init({
    totalItems: 0,
    rowHeight: 50,
    bufferSize: 5
  });
  return [
    {
      users: [],
      visibleUsers: [],
      table: immutable(tableState),
      loading: true,
      searchFilter: immutable(searchFilterState),
      virtualizedTable: immutable(virtualizedTableState)
    },
    [
      component_.cmd.dispatch(component_.page.readyMsg()),
      ...component_.cmd.mapMany(tableCmds, (msg) => adt("table", msg) as Msg),
      ...component_.cmd.mapMany(
        searchFilterCmds,
        (msg) => adt("searchFilter", msg) as Msg
      ),
      ...component_.cmd.mapMany(
        virtualizedTableCmds,
        (msg) => adt("virtualizedTable", msg) as Msg
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
      const searchState = runSearch(newState);
      return [
        searchState.setIn(
          ["virtualizedTable", "totalItems"],
          searchState.visibleUsers.length
        ),
        []
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
    case "search": {
      const searchState = runSearch(state);
      return [
        searchState.setIn(
          ["virtualizedTable", "totalItems"],
          searchState.visibleUsers.length
        ),
        []
      ];
    }
    case "virtualizedTable":
      return component_.base.updateChild({
        state,
        childStatePath: ["virtualizedTable"],
        childUpdate: VirtualizedTable.update,
        childMsg: msg.value,
        mapChildMsg: (value) => ({ tag: "virtualizedTable", value })
      });
    case "noop":
      return [state, []];
    default:
      return [state, []];
  }
};

const view: component_.page.View<State, InnerMsg, Route> = ({
  state,
  dispatch
}) => {
  const dispatchSearchFilter = component_.base.mapDispatch<Msg, ShortText.Msg>(
    dispatch,
    (value) => ({ tag: "searchFilter", value })
  );
  const dispatchVirtualizedTable = component_.base.mapDispatch<
    Msg,
    VirtualizedTableMsg
  >(dispatch, (value) => ({ tag: "virtualizedTable", value }));
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
              <VirtualizedTable.view
                state={state.virtualizedTable}
                dispatch={dispatchVirtualizedTable}
                visibleUsers={state.visibleUsers}
              />
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
