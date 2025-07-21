import React from "react";
import { adt, ADT } from "shared/lib/types";
import { component as component_ } from "front-end/lib/framework";
import * as Table from "front-end/lib/components/table";
import { immutable } from "front-end/lib/framework";
import { User } from "shared/lib/resources/user";
import { userStatusToColor } from "front-end/lib/pages/user/lib";
import Badge from "front-end/lib/views/badge";
import Link, { routeDest } from "front-end/lib/views/link";
import { isAdmin } from "shared/lib/resources/user";
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
}

export type VirtualizedTableMsg =
  | ADT<"scroll", { scrollTop: number; containerHeight: number }>
  | ADT<"updateVisibleRange", { start: number; end: number }>;

interface VirtualizedTableParams {
  totalItems: number;
  rowHeight: number;
  bufferSize: number;
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
}

const VirtualizedTBody: component_.base.View<VirtualizedTBodyProps> = ({
  rows
}) => {
  return (
    <tbody className="font-size-small">
      {rows.map((row, rowIndex) => (
        <tr key={`virtualized-row-${rowIndex}`} style={{ height: "50px" }}>
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

export const VirtualizedTable = {
  init: (
    params: VirtualizedTableParams
  ): component_.base.InitReturnValue<
    VirtualizedTableState,
    VirtualizedTableMsg
  > => {
    return [
      {
        visibleRange: { start: 0, end: 20 },
        scrollTop: 0,
        containerHeight: 0,
        totalItems: params.totalItems
      },
      []
    ];
  },

  update: ({
    state,
    msg
  }: component_.base.UpdateParams<
    VirtualizedTableState,
    VirtualizedTableMsg
  >): component_.base.UpdateReturnValue<
    VirtualizedTableState,
    VirtualizedTableMsg
  > => {
    switch (msg.tag) {
      case "scroll": {
        const { scrollTop, containerHeight } = msg.value;
        const rowHeight = 50; // Must match CSS
        const buffer = 5;
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
      default:
        return [state, []];
    }
  },

  view: ({
    state,
    dispatch,
    visibleUsers
  }: component_.base.ComponentViewProps<
    VirtualizedTableState,
    VirtualizedTableMsg
  > & { visibleUsers: TableUser[] }) => {
    const headCells = tableHeadCells();
    const totalHeight = state.totalItems * 50; // 50px per row (must match CSS)
    const paddingTop = state.visibleRange.start * 50; // Calculate top padding based on hidden rows

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

    return (
      <div className="virtualized-table-layout">
        {/* 1. Render Header Separately */}
        <div className="table-header-wrapper">
          <Table.view
            state={immutable(
              Table.init({ idNamespace: "user-list-header" })[0]
            )}
            dispatch={() => {}} // No dispatch needed for header
            headCells={headCells}
            bodyRows={[]} // No body rows for the header table
            className="table table-header-fixed" // Apply fixed layout
          />
        </div>

        {/* 2. Render Scrollable Body Container */}
        <div className="virtualized-body-container" onScroll={handleScroll}>
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
                <VirtualizedTBody rows={bodyRows} />
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }
};
