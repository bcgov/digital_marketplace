import { EMPTY_STRING } from "front-end/config";
import { makePageMetadata } from "front-end/lib";
import { isUserType } from "front-end/lib/access-control";
import router from "front-end/lib/app/router";
import { Route, SharedState } from "front-end/lib/app/types";
import * as Table from "front-end/lib/components/table";
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
import React from "react";
import { Col, Row } from "reactstrap";
import { compareStrings } from "shared/lib";
import { isAdmin, User, UserType } from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";

interface TableUser extends User {
  statusTitleCase: string;
  typeTitleCase: string;
}

export interface State {
  table: Immutable<Table.State>;
  users: TableUser[];
}

type InnerMsg = ADT<"onInitResponse", TableUser[]> | ADT<"table", Table.Msg>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

export type RouteParams = null;

function baseInit(): component_.base.InitReturnValue<State, Msg> {
  const [tableState, tableCmds] = Table.init({
    idNamespace: "user-list-table"
  });
  return [
    {
      users: [],
      table: immutable(tableState)
    },
    [
      component_.cmd.dispatch(component_.page.readyMsg()),
      ...component_.cmd.mapMany(tableCmds, (msg) => adt("table", msg) as Msg)
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
    case "onInitResponse":
      return [state.set("users", msg.value), []];
    case "table":
      return component_.base.updateChild({
        state,
        childStatePath: ["table"],
        childUpdate: Table.update,
        childMsg: msg.value,
        mapChildMsg: (value) => ({ tag: "table", value })
      });
    default:
      return [state, []];
  }
};

function tableHeadCells(): Table.HeadCells {
  return [
    {
      children: "Status",
      className: "text-nowrap",
      style: { width: "0px" }
    },
    {
      children: "Account Type",
      className: "text-nowrap",
      style: { width: "0px" }
    },
    {
      children: "Name",
      className: "text-nowrap",
      style: {
        width: "100%",
        minWidth: "200px"
      }
    },
    {
      children: "Admin?",
      className: "text-center text-nowrap",
      style: { width: "0px" }
    }
  ];
}

function tableBodyRows(state: Immutable<State>): Table.BodyRows {
  return state.users.map((user) => {
    return [
      {
        children: (
          <Badge
            text={user.statusTitleCase}
            color={userStatusToColor(user.status)}
          />
        )
      },
      {
        children: user.typeTitleCase,
        className: "text-nowrap"
      },
      {
        children: (
          <Link dest={routeDest(adt("userProfile", { userId: user.id }))}>
            {user.name || EMPTY_STRING}
          </Link>
        )
      },
      {
        children: <Table.Check checked={isAdmin(user)} />,
        className: "text-center"
      }
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
    <Row>
      <Col xs="12">
        <h1 className="mb-5">Digital Marketplace Users</h1>
        <Table.view
          headCells={tableHeadCells()}
          bodyRows={tableBodyRows(state)}
          state={state.table}
          dispatch={dispatchTable}
        />
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
