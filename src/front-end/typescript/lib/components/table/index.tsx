import { component as component_ } from "front-end/lib/framework";
import Icon from "front-end/lib/views/icon";
import React, { CSSProperties, ReactElement } from "react";
import { Table, Tooltip } from "reactstrap";
import { ADT, adt } from "shared/lib/types";

export interface State {
  idNamespace: string;
  THView: component_.base.View<THProps>;
  TDView: component_.base.View<TDProps>;
  activeTooltipThIndex: number | null;
  activeTooltipTdIndex: [number, number] | null; // [row, cell]
}

export interface Params {
  idNamespace: string;
  THView?: component_.base.View<THProps>;
  TDView?: component_.base.View<TDProps>;
}

export type Msg =
  | ADT<"toggleTooltipTh", number>
  | ADT<"toggleTooltipTd", [number, number]>; // [row, cell]

export const init: component_.base.Init<Params, State, Msg> = ({
  idNamespace,
  THView = DefaultTHView,
  TDView = DefaultTDView
}) => [
  {
    idNamespace,
    THView,
    TDView,
    activeTooltipThIndex: null,
    activeTooltipTdIndex: null
  },
  []
];

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
    default:
      return [state, []];
  }
};

interface TableTooltipProps {
  text: string;
  isOpen: boolean;
  target: string;
  toggle(): void;
}

const TableTooltip: component_.base.View<TableTooltipProps> = (props) => {
  return (
    <Tooltip
      autohide={false}
      placement="top"
      boundariesElement="window"
      {...props}>
      {props.text}
    </Tooltip>
  );
};

export interface THSpec {
  children: component_.base.ViewElementChildren;
  style?: CSSProperties;
  className?: string;
  tooltipText?: string;
}

export interface THProps extends THSpec {
  dispatch: component_.base.Dispatch<Msg>;
  index: number;
  tooltipIsOpen: boolean;
  id: string;
}

export const DefaultTHView: component_.base.View<THProps> = ({
  id,
  style,
  className,
  children,
  index,
  tooltipText,
  dispatch,
  tooltipIsOpen
}) => {
  const tooltipProps = !tooltipText
    ? undefined
    : {
        text: tooltipText,
        isOpen: tooltipIsOpen,
        target: id,
        toggle: () => dispatch(adt("toggleTooltipTh", index))
      };
  return (
    <th key={id} style={style} className={className}>
      {tooltipProps ? (
        <div className="d-inline-block" id={id}>
          {children}
          <TableTooltip {...tooltipProps} />
        </div>
      ) : (
        children
      )}
    </th>
  );
};

interface THeadProps {
  cells: THProps[];
  THView: component_.base.View<THProps>;
}

export const THead: component_.base.View<THeadProps> = ({ cells, THView }) => {
  const children = cells.map((cell, i) => (
    <THView key={`table-thead-${i}`} {...cell} />
  ));
  return (
    <thead className="table-light">
      <tr>{children}</tr>
    </thead>
  );
};

export interface TDSpec {
  children: component_.base.ViewElementChildren;
  style?: CSSProperties;
  className?: string;
  tooltipText?: string;
  colSpan?: number;
  showOnHover?: boolean;
}

export interface TDProps extends TDSpec {
  dispatch: component_.base.Dispatch<Msg>;
  index: [number, number]; // [row, cell]
  tooltipIsOpen: boolean;
  id: string;
}

export function DefaultTDView(props: TDProps): ReactElement {
  const {
    colSpan,
    id,
    style,
    className,
    children,
    index,
    tooltipText,
    dispatch,
    tooltipIsOpen,
    showOnHover
  } = props;
  const tooltipProps = !tooltipText
    ? undefined
    : {
        text: tooltipText,
        isOpen: tooltipIsOpen,
        target: id,
        toggle: () => dispatch(adt("toggleTooltipTd", index))
      };
  return (
    <td key={id} style={style} className={className} colSpan={colSpan}>
      <div className={showOnHover ? "table-show-on-hover" : ""}>
        {tooltipProps ? (
          <div className="d-inline-block" id={id}>
            {children}
            <TableTooltip {...tooltipProps} />
          </div>
        ) : (
          children
        )}
      </div>
    </td>
  );
}

export type RowSpec = TDSpec[];

export type RowsSpec = RowSpec[];

export type RowProps = TDProps[];

export type RowsProps = RowProps[];

interface TBodyProps {
  id: string;
  rows: RowsProps;
  TDView: component_.base.View<TDProps>;
  borderless?: boolean;
}

const TBody: component_.base.View<TBodyProps> = ({
  id,
  rows,
  TDView,
  borderless
}) => {
  const children = rows.map((row, rowIndex) => {
    const cellChildren = row.map((cell) => (
      <TDView key={`${cell.id}-wrapper`} {...cell} />
    ));
    return <tr key={`${id}-row-${rowIndex}`}>{cellChildren}</tr>;
  });
  return (
    <tbody
      className={`font-size-small ${borderless ? "table-borderless" : ""}`}>
      {children}
    </tbody>
  );
};

export type HeadCells = THSpec[];

export type BodyRows = RowsSpec;

export interface Props extends component_.base.ComponentViewProps<State, Msg> {
  headCells: HeadCells;
  bodyRows: BodyRows;
  className?: string;
  style?: CSSProperties;
  borderless?: boolean;
  hover?: boolean;
}

export const view: component_.base.View<Props> = (props) => {
  const {
    state,
    dispatch,
    className = "",
    style,
    headCells,
    bodyRows,
    borderless,
    hover = true
  } = props;
  const headProps: THeadProps = {
    THView: state.THView,
    cells: headCells.map((spec, index) => {
      return {
        ...spec,
        index,
        dispatch,
        id: `table-${state.idNamespace}-th-${index}`,
        tooltipIsOpen: index === state.activeTooltipThIndex
      };
    })
  };
  const bodyProps: TBodyProps = {
    id: `table-${state.idNamespace}-tbody`,
    TDView: state.TDView,
    rows: bodyRows.map((row, rowIndex) => {
      return row.map((cell, cellIndex) => {
        return {
          ...cell,
          dispatch,
          index: [rowIndex, cellIndex],
          id: `table-${state.idNamespace}-td-${rowIndex}-${cellIndex}`,
          tooltipIsOpen:
            !!state.activeTooltipTdIndex &&
            rowIndex === state.activeTooltipTdIndex[0] &&
            cellIndex === state.activeTooltipTdIndex[1]
        };
      });
    }),
    borderless
  };
  return (
    <Table
      className={`mb-0 ${className}`}
      style={style}
      responsive
      hover={hover}>
      <THead {...headProps} />
      <TBody {...bodyProps} />
    </Table>
  );
};

export type TableComponent = component_.base.Component<
  Params,
  State,
  Msg,
  Props
>;

export const component: TableComponent = {
  init,
  update,
  view
};

// Misc views.

export const Check: component_.base.View<{ checked: boolean }> = ({
  checked
}) => {
  return (
    <Icon
      name={checked ? "check" : "times"}
      color={checked ? "c-table-icon-check" : "c-table-icon-times"}
    />
  );
};
