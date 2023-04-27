import {
  getActionsValid,
  makePageMetadata,
  updateValid,
  ValidatedState,
  viewValid
} from "front-end/lib";
import { isUserType } from "front-end/lib/access-control";
import { Route, SharedState } from "front-end/lib/app/types";
import * as Table from "front-end/lib/components/table";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import { slugPath } from "front-end/lib/pages/content/lib";
import Link, {
  iconLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";
import React from "react";
import { Col, Row } from "reactstrap";
import { compareStrings, formatDate } from "shared/lib";
import { ContentSlim } from "shared/lib/resources/content";
import { UserType } from "shared/lib/resources/user";
import { ADT, adt } from "shared/lib/types";
import { invalid, valid } from "shared/lib/validation";

interface TableContent extends ContentSlim {
  slugPath: string;
}

interface ValidState {
  table: Immutable<Table.State>;
  content: TableContent[];
}

export type State = ValidatedState<ValidState>;

export type InnerMsg =
  | ADT<"table", Table.Msg>
  | ADT<"onInitResponse", api.ResponseValidation<ContentSlim[], string[]>>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

export type RouteParams = null;

export const init: component_.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = isUserType<RouteParams, State, InnerMsg>({
  userType: [UserType.Admin],
  success() {
    const [tableState, tableCmds] = Table.init({
      idNamespace: "content-list"
    });
    return [
      valid(
        immutable({
          content: [] as TableContent[],
          table: immutable(tableState)
        })
      ),
      [
        ...component_.cmd.mapMany(tableCmds, (msg) => adt("table", msg) as Msg),
        api.content.readMany<Msg>()((response) =>
          adt("onInitResponse", response)
        )
      ]
    ];
  },
  fail({ routePath }) {
    return [
      invalid(null),
      [
        component_.cmd.dispatch(
          component_.global.replaceRouteMsg(
            adt("notFound" as const, {
              path: routePath
            })
          )
        )
      ]
    ];
  }
});

export const update: component_.page.Update<State, InnerMsg, Route> =
  updateValid(({ state, msg }) => {
    switch (msg.tag) {
      case "onInitResponse": {
        const response = msg.value;
        let content: TableContent[] = [];
        if (api.isValid(response)) {
          content = response.value
            .map((c) => ({
              ...c,
              slugPath: slugPath(c.slug)
            }))
            .sort((a, b) => compareStrings(a.title, b.title));
        }
        return [
          state.set("content", content),
          [component_.cmd.dispatch(component_.page.readyMsg())]
        ];
      }
      case "table":
        return component_.base.updateChild({
          state,
          childStatePath: ["table"],
          childUpdate: Table.update,
          childMsg: msg.value,
          mapChildMsg: (value) => adt("table", value)
        });
      default:
        return [state, []];
    }
  });

function tableHeadCells(): Table.HeadCells {
  return [
    {
      children: "Title",
      className: "text-nowrap",
      style: {
        width: "100%",
        minWidth: "200px"
      }
    },
    {
      children: "Fixed?",
      className: "text-center",
      style: { width: "0px" }
    },
    {
      children: "Updated",
      className: "text-nowrap",
      style: { width: "0px" }
    },
    {
      children: "Created",
      className: "text-nowrap",
      style: { width: "0px" }
    }
  ];
}

function tableBodyRows(state: Immutable<ValidState>): Table.BodyRows {
  return state.content.map((c) => {
    return [
      {
        children: (
          <div>
            <Link dest={routeDest(adt("contentEdit", c.slug))}>{c.title}</Link>
            <br />
            <Link
              className="small text-uppercase"
              color="secondary"
              newTab
              dest={routeDest(adt("contentView", c.slug))}
              iconSymbolSize={0.75}>
              {c.slugPath}
            </Link>
          </div>
        )
      },
      {
        children: <Table.Check checked={c.fixed} />,
        className: "text-center"
      },
      {
        children: formatDate(c.updatedAt),
        className: "text-nowrap"
      },
      {
        children: formatDate(c.createdAt),
        className: "text-nowrap"
      }
    ];
  });
}

export const view: component_.page.View<State, InnerMsg, Route> = viewValid(
  ({ state, dispatch }) => {
    return (
      <div>
        <Row>
          <Col xs="12">
            <h1 className="mb-5">Content Management</h1>
            <h2 className="mb-4">Pages</h2>
            <Table.view
              headCells={tableHeadCells()}
              bodyRows={tableBodyRows(state)}
              state={state.table}
              dispatch={component_.base.mapDispatch(dispatch, (msg) =>
                adt("table" as const, msg)
              )}
            />
          </Col>
        </Row>
      </div>
    );
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
  getMetadata() {
    return makePageMetadata("Content");
  },
  getActions: getActionsValid(() => {
    return adt("links", [
      {
        children: "Create Page",
        button: true,
        symbol_: leftPlacement(iconLinkSymbol("file-plus")),
        color: "primary",
        dest: routeDest(adt("contentCreate", null))
      }
    ]);
  })
};
