import React from "react";
import { adt, ADT } from "shared/lib/types";
import { component as component_, immutable } from "front-end/lib/framework";
import * as Table from "front-end/lib/components/table";
import { userStatusToColor } from "front-end/lib/pages/user/lib";
import Badge from "front-end/lib/views/badge";
import Link, { routeDest } from "front-end/lib/views/link";
import { isAdmin, User } from "shared/lib/resources/user";
import { EMPTY_STRING } from "shared/config";

interface TableUser extends User {
  statusTitleCase: string;
  typeTitleCase: string;
}

export interface VirtualizedTableState {
  visibleRange: { start: number; end: number };
  scrollTop: number;
  containerHeight: number;
  totalItems: number;
  rowHeight: number;
  bufferSize: number;
}

export type VirtualizedTableMsg =
  | ADT<"scroll", { scrollTop: number; containerHeight: number }>
  | ADT<"updateVisibleRange", { start: number; end: number }>
  | ADT<"updateTotalItems", number>
  | ADT<"resetScroll", null>
  | ADT<"noop", null>;

interface VirtualizedTableParams {
  totalItems: number;
  rowHeight: number;
  bufferSize: number;
}

// Helper function to scroll the virtualized table container to top
function scrollContainerToTop(): void {
  const container = document.getElementById("virtualized-table-container");
  if (container) {
    container.scrollTop = 0;
  }
}

// Separate interface for the view props that includes the data
interface VirtualizedTableViewProps
  extends component_.base.ComponentViewProps<
    VirtualizedTableState,
    VirtualizedTableMsg
  > {
  visibleUsers: TableUser[];
}

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

function generateBodyRows(visibleUsers: TableUser[]): Table.BodyRows {
  return visibleUsers.map((user: TableUser) => [
    {
      children: (
        <Badge
          text={user.statusTitleCase}
          color={userStatusToColor(user.status)}
        />
      ),
      className: "align-middle"
    },
    {
      children: user.typeTitleCase,
      className: "align-middle text-nowrap"
    },
    {
      children: (
        <Link dest={routeDest(adt("userProfile", { userId: user.id }))}>
          {user.name || EMPTY_STRING}
        </Link>
      ),
      className: "align-middle"
    },
    {
      children: <Table.Check checked={isAdmin(user)} />,
      className: "align-middle text-center"
    }
  ]);
}

// Custom TBody component for virtualized table
interface VirtualizedTBodyProps {
  rows: Table.BodyRows;
  rowHeight: number;
}

const VirtualizedTBody: component_.base.View<VirtualizedTBodyProps> = ({
  rows,
  rowHeight
}) => {
  return (
    <tbody className="font-size-small">
      {rows.map((row, rowIndex) => (
        <tr
          key={`virtualized-row-${rowIndex}`}
          style={{ height: `${rowHeight}px` }}>
          {row.map((cell, cellIndex) => (
            <td
              key={`virtualized-cell-${rowIndex}-${cellIndex}`}
              className={cell.className}>
              {cell.children}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
};

const init: component_.base.Init<
  VirtualizedTableParams,
  VirtualizedTableState,
  VirtualizedTableMsg
> = (params) => {
  return [
    {
      visibleRange: { start: 0, end: 20 },
      scrollTop: 0,
      containerHeight: 0,
      totalItems: params.totalItems,
      rowHeight: params.rowHeight,
      bufferSize: params.bufferSize
    },
    []
  ];
};

const update: component_.base.Update<
  VirtualizedTableState,
  VirtualizedTableMsg
> = ({ state, msg }) => {
  switch (msg.tag) {
    case "scroll": {
      const { scrollTop, containerHeight } = msg.value;
      const rowHeight = state.rowHeight;
      const buffer = state.bufferSize;
      const start = Math.floor(scrollTop / rowHeight);
      const visibleStart = Math.max(0, start - buffer);

      if (containerHeight <= 0) {
        return [state, []];
      }

      const visibleCount = Math.ceil(containerHeight / rowHeight);
      const visibleEnd = Math.min(
        state.totalItems || 0,
        visibleStart + visibleCount + buffer * 2
      );

      return [
        state
          .set("scrollTop", scrollTop)
          .set("containerHeight", containerHeight)
          .set("visibleRange", { start: visibleStart, end: visibleEnd }),
        []
      ];
    }
    case "updateVisibleRange":
      return [state.set("visibleRange", msg.value), []];
    case "updateTotalItems":
      return [state.set("totalItems", msg.value), []];
    case "resetScroll": {
      scrollContainerToTop();
      return [
        state.set("scrollTop", 0).set("visibleRange", {
          start: 0,
          end: Math.min(20, state.totalItems || 0)
        }),
        []
      ];
    }
    case "noop":
      return [state, []];
    default:
      return [state, []];
  }
};

const view: component_.base.View<VirtualizedTableViewProps> = ({
  state,
  dispatch,
  visibleUsers
}) => {
  const headCells = tableHeadCells();
  const totalHeight = state.totalItems * state.rowHeight;
  const paddingTop = state.visibleRange.start * state.rowHeight;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    dispatch(
      adt("scroll", {
        scrollTop: target.scrollTop,
        containerHeight: target.clientHeight
      })
    );
  };

  // Generate body rows for visible users
  const visibleUsersSlice = visibleUsers.slice(
    state.visibleRange.start,
    state.visibleRange.end
  );
  const bodyRows = generateBodyRows(visibleUsersSlice);
  const TableView = Table.view;

  return (
    <div className="virtualized-table-layout">
      {/* 1. Render Header Separately */}
      <div className="virtualized-table-header-wrapper">
        <TableView
          state={immutable(Table.init({ idNamespace: "user-list-header" })[0])}
          dispatch={() => {}} // No dispatch needed for header
          headCells={headCells}
          bodyRows={[]} // No body rows for the header table
          className="table virtualized-table-header-fixed" // Apply fixed layout
        />
      </div>

      {/* 2. Render Scrollable Body Container */}
      <div
        id="virtualized-table-container"
        className="virtualized-body-container"
        onScroll={handleScroll}>
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
            {/* 5. Render Body Table using existing Table components */}
            <table className="table virtualized-body-table">
              <colgroup>
                {headCells.map((cell, index) => (
                  <col key={index} style={cell.style} />
                ))}
              </colgroup>
              <VirtualizedTBody rows={bodyRows} rowHeight={state.rowHeight} />
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export const VirtualizedTable: component_.base.Component<
  VirtualizedTableParams,
  VirtualizedTableState,
  VirtualizedTableMsg,
  VirtualizedTableViewProps
> = {
  init,
  update,
  view
};
