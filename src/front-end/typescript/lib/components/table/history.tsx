import { EMPTY_STRING } from "front-end/config";
import * as Table from "front-end/lib/components/table";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import { ThemeColor } from "front-end/lib/types";
import Badge from "front-end/lib/views/badge";
import Link, { routeDest } from "front-end/lib/views/link";
import React from "react";
import { formatDate, formatTime } from "shared/lib";
import { isAdmin, User, UserSlim } from "shared/lib/resources/user";
import { ADT, adt } from "shared/lib/types";

export interface Item {
  type: {
    text: string;
    color?: ThemeColor;
  };
  note?: string;
  createdAt: Date;
  createdBy?: UserSlim;
}

export interface Params {
  idNamespace: string;
  items: Item[];
  viewerUser: User;
}

export interface State extends Pick<Params, "items" | "viewerUser"> {
  table: Immutable<Table.State>;
}

export type Msg = ADT<"table", Table.Msg>;

export const init: component_.base.Init<Params, State, Msg> = ({
  idNamespace,
  items,
  viewerUser
}) => {
  const [tableState, tableCmds] = Table.init({
    idNamespace
  });
  return [
    {
      viewerUser,
      items, //items sorted in the http/api module.
      table: immutable(tableState)
    },
    tableCmds.map((c) => component_.cmd.map(c, (msg) => adt("table", msg)))
  ];
};

export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "table":
      return component_.base.updateChild({
        state,
        childStatePath: ["table"],
        childUpdate: Table.update,
        childMsg: msg.value,
        mapChildMsg: (value) => ({ tag: "table", value })
      });
  }
};

function tableHeadCells(): Table.HeadCells {
  return [
    {
      children: "Entry Type",
      className: "text-nowrap",
      style: {
        width: "0px",
        minWidth: "150px"
      }
    },
    {
      children: "Note",
      className: "text-nowrap",
      style: {
        width: "100%",
        minWidth: "200px"
      }
    },
    {
      children: "Created",
      className: "text-nowrap",
      style: { width: "0px" }
    }
  ];
}

function tableBodyRows(state: Immutable<State>): Table.BodyRows {
  return state.items.map((item) => {
    return [
      {
        children: item.type.color ? (
          <Badge text={item.type.text} color={item.type.color} />
        ) : (
          item.type.text
        ),
        className: "text-wrap"
      },
      {
        children: item.note || EMPTY_STRING
      },
      {
        className: "text-nowrap",
        children: (
          <div>
            <div>{formatDate(item.createdAt)}</div>
            <div>{formatTime(item.createdAt, true)}</div>
            {(() => {
              if (!item.createdBy) {
                return (
                  <div className="text-secondary text-uppercase small">
                    System
                  </div>
                );
              }
              if (isAdmin(state.viewerUser)) {
                return (
                  <Link
                    className="text-uppercase small"
                    dest={routeDest(
                      adt("userProfile", { userId: item.createdBy.id })
                    )}>
                    {item.createdBy.name}
                  </Link>
                );
              }
              return (
                <div className="text-secondary text-uppercase small">
                  {item.createdBy.name}
                </div>
              );
            })()}
          </div>
        )
      }
    ];
  });
}

export const view: component_.base.ComponentView<State, Msg> = ({
  state,
  dispatch
}) => {
  return (
    <Table.view
      headCells={tableHeadCells()}
      bodyRows={tableBodyRows(state)}
      state={state.table}
      dispatch={component_.base.mapDispatch(
        dispatch,
        (msg) => adt("table", msg) as Msg
      )}
    />
  );
};

export const component: component_.base.Component<Params, State, Msg> = {
  init,
  update,
  view
};

export default component;
