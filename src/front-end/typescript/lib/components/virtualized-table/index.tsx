import React, { CSSProperties } from "react";
import { component as component_ } from "front-end/lib/framework";
import * as Table from "front-end/lib/components/table";
import { Table as ReactstrapTable } from "reactstrap";
import { ADT, adt } from "shared/lib/types";

// Constants
const DEFAULT_BUFFER_SIZE = 5;
const INITIAL_VISIBLE_ITEMS = 20;
const BUFFER_MULTIPLIER = 2;

// Simple visible range interface
interface VisibleRange {
  start: number;
  end: number;
}

export interface State {
  idNamespace: string;
  THView: component_.base.View<Table.THProps>;
  TDView: component_.base.View<Table.TDProps>;
  activeTooltipThIndex: number | null;
  // Virtualization-specific state
  visibleRange: VisibleRange;
  scrollTop: number;
  containerHeight: number;
  totalItems: number;
  rowHeight: number;
  bufferSize: number;
  scrollContainerId: string;
}

export interface Params {
  idNamespace: string;
  THView?: component_.base.View<Table.THProps>;
  TDView?: component_.base.View<Table.TDProps>;
  totalItems: number;
  rowHeight: number;
  bufferSize?: number;
}

export type Msg =
  | ADT<"toggleTooltipTh", number>
  | ADT<"toggleTooltipTd", [number, number]>
  | ADT<"handleScroll", { scrollTop: number; containerHeight: number }>
  | ADT<"updateVisibleRange", { start: number; end: number }>
  | ADT<"updateTotalItems", number>
  | ADT<"resetScroll", null>
  | ADT<"scrollToTop", null>
  | ADT<"scrollCompleted", null>;

export const init: component_.base.Init<Params, State, Msg> = ({
  idNamespace,
  THView = Table.DefaultTHView,
  TDView = Table.DefaultTDView,
  totalItems,
  rowHeight,
  bufferSize = DEFAULT_BUFFER_SIZE
}) => {
  const initialEnd = Math.min(INITIAL_VISIBLE_ITEMS, totalItems);
  return [
    {
      idNamespace,
      THView,
      TDView,
      activeTooltipThIndex: null,
      activeTooltipTdIndex: null,
      visibleRange: { start: 0, end: initialEnd },
      scrollTop: 0,
      containerHeight: 0,
      totalItems,
      rowHeight,
      bufferSize,
      scrollContainerId: `virtualized-table-${idNamespace}-scroll-container`
    },
    []
  ];
};

export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "toggleTooltipTh": {
      const currentThIndex = state.activeTooltipThIndex;
      if (currentThIndex === null) {
        return [state.set("activeTooltipThIndex", msg.value), []];
      } else {
        return [state.set("activeTooltipThIndex", null), []];
      }
    }
    case "toggleTooltipTd": {
      return [state, []];
    }
    case "handleScroll": {
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
        visibleStart + visibleCount + buffer * BUFFER_MULTIPLIER
      );

      return [
        state
          .set("scrollTop", scrollTop)
          .set("containerHeight", containerHeight)
          .set("visibleRange", { start: visibleStart, end: visibleEnd }),
        []
      ];
    }
    case "updateVisibleRange": {
      return [
        state.set("visibleRange", {
          start: msg.value.start,
          end: msg.value.end
        }),
        []
      ];
    }
    case "updateTotalItems": {
      const newTotalItems = msg.value;
      const currentRange = state.visibleRange;
      // Update visible range if current range is invalid with new total
      const updatedRange = {
        start: currentRange.start,
        end: Math.min(currentRange.end, newTotalItems)
      };
      return [
        state
          .set("totalItems", newTotalItems)
          .set("visibleRange", updatedRange),
        []
      ];
    }
    case "resetScroll": {
      const initialEnd = Math.min(INITIAL_VISIBLE_ITEMS, state.totalItems || 0);
      return [
        state
          .set("scrollTop", 0)
          .set("visibleRange", { start: 0, end: initialEnd }),
        [component_.cmd.delayedDispatch(10, adt("scrollToTop", null))]
      ];
    }
    case "scrollToTop": {
      // Get the scrollable container element and scroll within it instead of the document
      const tableElement = document.getElementById(state.scrollContainerId);
      const scrollContainer = tableElement?.querySelector(
        ".virtualized-tbody"
      ) as HTMLElement;
      if (scrollContainer) {
        return [
          state,
          [
            component_.cmd.scrollContainerTo(
              0,
              0,
              adt("scrollCompleted", null),
              scrollContainer
            )
          ]
        ];
      } else {
        return [state, []];
      }
    }
    case "scrollCompleted":
      return [state, []];
    default:
      return [state, []];
  }
};

export interface Props extends component_.base.ComponentViewProps<State, Msg> {
  headCells: Table.HeadCells;
  bodyRows: Table.BodyRows;
  className?: string;
  style?: CSSProperties;
  borderless?: boolean;
  hover?: boolean;
}

// Custom TBody component for virtualized table
interface VirtualizedTBodyProps {
  rows: Table.BodyRows;
  rowHeight: number;
  borderless?: boolean;
  totalHeight: number;
  paddingTop: number;
  columnStyles?: CSSProperties[];
}

const VirtualizedTBody: component_.base.View<VirtualizedTBodyProps> = ({
  rows,
  rowHeight,
  borderless,
  totalHeight,
  paddingTop,
  columnStyles = []
}) => {
  return (
    <tbody
      className={`font-size-small virtualized-tbody ${
        borderless ? "table-borderless" : ""
      }`}>
      {/* Virtual spacer as first row */}
      <tr
        className="virtual-spacer"
        style={{
          height: `${totalHeight}px`
        }}></tr>

      {/* Container for visible rows positioned absolutely */}
      <tr>
        <td colSpan={rows[0]?.length || 1} className="virtualized-container-td">
          <div
            className="virtualized-rows-container"
            style={{
              top: `${paddingTop}px`
            }}>
            {/* Visible rows */}
            {rows.map((row, rowIndex) => (
              <div
                key={`virtualized-row-${rowIndex}`}
                className="virtualized-row"
                style={{ height: `${rowHeight}px` }}>
                {row.map((cell, cellIndex) => (
                  <div
                    key={`virtualized-cell-${rowIndex}-${cellIndex}`}
                    className={`virtualized-cell ${cell.className || ""}`}
                    style={{
                      ...cell.style,
                      ...columnStyles[cellIndex]
                    }}>
                    <div>{cell.children}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </td>
      </tr>
    </tbody>
  );
};

export const view: component_.base.View<Props> = ({
  state,
  dispatch,
  className = "",
  style,
  headCells,
  bodyRows,
  borderless,
  hover = true
}) => {
  const visibleRange = state.visibleRange;

  const headProps = {
    THView: state.THView,
    cells: headCells.map((spec, index) => {
      return {
        ...spec,
        index,
        dispatch,
        id: `virtualized-table-${state.idNamespace}-th-${index}`,
        tooltipIsOpen: index === state.activeTooltipThIndex
      };
    })
  };

  const visibleRows = bodyRows.slice(visibleRange.start, visibleRange.end);

  const virtualizationStyles = {
    totalHeight: state.totalItems * state.rowHeight,
    paddingTop: visibleRange.start * state.rowHeight
  };

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    dispatch(
      adt("handleScroll", {
        scrollTop: target.scrollTop,
        containerHeight: target.clientHeight
      })
    );
  };

  const bodyProps = {
    rows: visibleRows.map((row, rowIndex) => {
      const actualRowIndex = visibleRange.start + rowIndex;
      return row.map((cell, cellIndex) => {
        return {
          ...cell,
          dispatch,
          index: [actualRowIndex, cellIndex],
          id: `virtualized-table-${state.idNamespace}-td-${actualRowIndex}-${cellIndex}`
        };
      });
    }),
    rowHeight: state.rowHeight,
    borderless,
    totalHeight: virtualizationStyles.totalHeight,
    paddingTop: virtualizationStyles.paddingTop,
    columnStyles: headCells.map((cell) => cell.style || {})
  };

  return (
    <div className="virtualized-table-layout">
      <ReactstrapTable
        id={state.scrollContainerId}
        onScroll={handleScroll}
        className={`mb-0 virtualized-body-table virtualized-body-container table ${
          hover ? "table-hover" : ""
        } ${className}`}
        style={style}
        responsive>
        <Table.THead {...headProps} />
        <colgroup>
          {headCells.map((cell, index) => (
            <col key={index} style={cell.style} />
          ))}
        </colgroup>
        <VirtualizedTBody {...bodyProps} />
      </ReactstrapTable>
    </div>
  );
};

export const component: component_.base.Component<Params, State, Msg, Props> = {
  init,
  update,
  view
};

// Re-export the Check component for convenience
export const Check = Table.Check;
