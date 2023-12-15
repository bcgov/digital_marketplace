import { Route } from "front-end/lib/app/types";
import {
  component as component_,
  immutable,
  Immutable
} from "front-end/lib/framework";
import * as Table from "front-end/lib/components/table";
import * as Tab from "front-end/lib/pages/organization/edit/tab";
import React from "react";
import Link, { routeDest } from "front-end/lib/views/link";
import { Row, Col } from "reactstrap";
import { EMPTY_STRING } from "shared/config";
import { formatDate, formatTime } from "shared/lib";
import { isAdmin } from "shared/lib/resources/user";
import { adt } from "shared/lib/types";
import { OrganizationHistoryTypeToTitleCase } from "front-end/lib/pages/organization/lib";
import { ReadyMsg } from "front-end/lib/framework/component/page";
import EditTabHeader from "front-end/lib/pages/organization/lib/views/edit-tab-header";

export type State = Tab.Params & Table.State;

export type InnerMsg = Table.Msg | ReadyMsg;

export type Msg = component_.page.Msg<InnerMsg, Route>;

function getTableState(state: State) {
  return (({
    idNamespace,
    THView,
    TDView,
    activeTooltipThIndex,
    activeTooltipTdIndex,
    ..._
  }) => ({
    idNamespace,
    THView,
    TDView,
    activeTooltipThIndex,
    activeTooltipTdIndex
  }))(state);
}

export const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  const [tableState, tableCmds] = Table.init({
    idNamespace: "organization-changelog-table"
  });

  return [{ ...tableState, ...params }, tableCmds];
};

export const update: component_.page.Update<State, InnerMsg, Route> = ({
  state,
  msg
}) => {
  switch (msg.tag) {
    case "toggleTooltipTd":
    case "toggleTooltipTh": {
      const [tableState, tableCmds] = Table.update({
        state: immutable(getTableState(state)),
        msg
      });
      return [state.merge(tableState), tableCmds];
    }
    default:
      return [state, []];
  }
};

function tableHeadCells(): Table.HeadCells {
  const cells = [
    {
      children: "Entry Type",
      className: "text-nowrap"
    },
    {
      children: "Member",
      className: "text-nowrap text-center"
    },
    {
      children: "Created",
      className: "text-nowrap text-center"
    }
  ];

  return cells.map(({ style, ...cell }: Table.HeadCells[number]) => ({
    ...cell,
    style: { ...style, width: `calc(100% / ${cells.length})` }
  }));
}

function tableBodyRows(state: Immutable<State>): Table.BodyRows {
  const history = state.organization.history ?? [];
  return history.map((record) => {
    return [
      {
        children: OrganizationHistoryTypeToTitleCase(record.type),
        className: "text-wrap"
      },
      {
        children: record.member ? (
          isAdmin(state.viewerUser) ? (
            <Link
              className="text-uppercase small"
              dest={routeDest(
                adt("userProfile", { userId: record.member.id })
              )}>
              {record.member.name}
            </Link>
          ) : (
            record.member.name
          )
        ) : (
          EMPTY_STRING
        ),
        className: "text-nowrap text-center"
      },
      {
        children: (
          <div className="d-flex justify-content-center">
            <div>
              <div>{formatDate(record.createdAt)}</div>
              <div>{formatTime(record.createdAt, true)}</div>
              {(() => {
                if (isAdmin(state.viewerUser)) {
                  return (
                    <Link
                      className="text-uppercase small"
                      dest={routeDest(
                        adt("userProfile", { userId: record.createdBy.id })
                      )}>
                      {record.createdBy.name}
                    </Link>
                  );
                }
                return (
                  <div className="text-secondary text-uppercase small">
                    {record.createdBy.name}
                  </div>
                );
              })()}
            </div>
          </div>
        ),
        className: "text-nowrap"
      }
    ];
  });
}

const view: component_.page.View<State, InnerMsg, Route> = ({
  state,
  dispatch
}) => {
  return (
    <div>
      <EditTabHeader
        legalName={state.organization.legalName}
        swuQualified={state.swuQualified}
        twuQualified={state.twuQualified}
      />
      <Row className="mt-5">
        <Col xs="12">
          <h3 className="mb-4">Changelog</h3>
          <Table.view
            headCells={tableHeadCells()}
            bodyRows={tableBodyRows(state)}
            state={immutable(getTableState(state))}
            dispatch={dispatch}
          />
        </Col>
      </Row>
    </div>
  );
};

export const component: Tab.Component<State, InnerMsg> = {
  init,
  update,
  view,
  onInitResponse() {
    return component_.page.readyMsg();
  }
};
