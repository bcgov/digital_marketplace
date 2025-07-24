import React, { CSSProperties } from "react";
import { component as component_ } from "front-end/lib/framework";
import * as Table from "front-end/lib/components/table";
import { Table as ReactstrapTable } from "reactstrap";
import { ADT, adt } from "shared/lib/types";

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
  activeTooltipTdIndex: [number, number] | null;
  // Virtualization-specific state
  visibleRange: VisibleRange;
  scrollTop: number;
  containerHeight: number;
  totalItems: number;
  rowHeight: number;
  bufferSize: number;
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
  bufferSize = 5
}) => {
  const initialEnd = Math.min(20, totalItems);

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
      bufferSize
    },
    []
  ];
};

export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "toggleTooltipTh": {
      const currentThIndex = state.activeTooltipThIndex;
      if (!currentThIndex) {
        return [state.set("activeTooltipThIndex", msg.value), []];
      } else {
        return [state.set("activeTooltipThIndex", null), []];
      }
    }
    case "toggleTooltipTd": {
      const currentTdIndex = state.activeTooltipTdIndex;
      if (!currentTdIndex) {
        return [state.set("activeTooltipTdIndex", msg.value), []];
      } else {
        return [state.set("activeTooltipTdIndex", null), []];
      }
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
      const initialEnd = Math.min(20, state.totalItems || 0);

      return [
        state
          .set("scrollTop", 0)
          .set("visibleRange", { start: 0, end: initialEnd }),
        [component_.cmd.scrollTo(0, 0, adt("scrollCompleted", null))]
      ];
    }
    case "scrollToTop": {
      return [
        state,
        [component_.cmd.scrollTo(0, 0, adt("scrollCompleted", null))]
      ];
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
}

const VirtualizedTBody: component_.base.View<VirtualizedTBodyProps> = ({
  rows,
  rowHeight,
  borderless
}) => {
  return (
    <tbody
      className={`font-size-small ${borderless ? "table-borderless" : ""}`}>
      {rows.map((row, rowIndex) => (
        <tr
          key={`virtualized-row-${rowIndex}`}
          style={{ height: `${rowHeight}px` }}>
          {row.map((cell, cellIndex) => (
            <td
              key={`virtualized-cell-${rowIndex}-${cellIndex}`}
              className={cell.className}
              style={cell.style}
              colSpan={cell.colSpan}>
              <div className={cell.showOnHover ? "table-show-on-hover" : ""}>
                {cell.children}
              </div>
            </td>
          ))}
        </tr>
      ))}
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

  const bodyProps = {
    rows: visibleRows.map((row, rowIndex) => {
      const actualRowIndex = visibleRange.start + rowIndex;
      return row.map((cell, cellIndex) => {
        return {
          ...cell,
          dispatch,
          index: [actualRowIndex, cellIndex],
          id: `virtualized-table-${state.idNamespace}-td-${actualRowIndex}-${cellIndex}`,
          tooltipIsOpen:
            !!state.activeTooltipTdIndex &&
            actualRowIndex === state.activeTooltipTdIndex[0] &&
            cellIndex === state.activeTooltipTdIndex[1]
        };
      });
    }),
    rowHeight: state.rowHeight,
    borderless
  };

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

  return (
    <div className="virtualized-table-layout">
      {/* Fixed Header */}
      <div className="virtualized-table-header-wrapper">
        <ReactstrapTable
          className={`mb-0 ${className} virtualized-table-header-fixed`}
          style={style}
          responsive
          hover={hover}>
          <Table.THead {...headProps} />
        </ReactstrapTable>
      </div>

      {/* Scrollable Body Container */}
      <div
        id={`virtualized-table-container-${state.idNamespace}`}
        className="virtualized-body-container"
        onScroll={handleScroll}>
        {/* Inner div for total height simulation */}
        <div
          style={{
            height: virtualizationStyles.totalHeight,
            position: "relative"
          }}>
          {/* Absolutely positioned div for visible rows */}
          <div
            style={{
              position: "absolute",
              top: `${virtualizationStyles.paddingTop}px`,
              left: 0,
              width: "100%"
            }}>
            <ReactstrapTable
              className={`mb-0 ${className} virtualized-body-table`}
              style={style}
              responsive
              hover={hover}>
              <colgroup>
                {headCells.map((cell, index) => (
                  <col key={index} style={cell.style} />
                ))}
              </colgroup>
              <VirtualizedTBody {...bodyProps} />
            </ReactstrapTable>
          </div>
        </div>
      </div>
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
