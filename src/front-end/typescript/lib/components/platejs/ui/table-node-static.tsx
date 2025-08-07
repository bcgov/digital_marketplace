import * as React from "react";

import type {
  SlateElementProps,
  TTableCellElement,
  TTableElement
} from "platejs";

import { BaseTablePlugin } from "@platejs/table";
import { SlateElement } from "platejs";

import { cn } from "./utils";

export function TableElementStatic({
  children,
  ...props
}: SlateElementProps<TTableElement>) {
  const { disableMarginLeft } = props.editor.getOptions(BaseTablePlugin);
  const marginLeft = disableMarginLeft ? 0 : props.element.marginLeft;

  return (
    <SlateElement
      {...props}
      className="tw:overflow-x-auto tw:py-5"
      style={{ paddingLeft: marginLeft }}>
      <div className="tw:group/table tw:relative tw:w-fit">
        <table className="tw:mr-0 tw:ml-px tw:table tw:h-px tw:table-fixed tw:border-collapse">
          <tbody className="tw:min-w-full">{children}</tbody>
        </table>
      </div>
    </SlateElement>
  );
}

export function TableRowElementStatic(props: SlateElementProps) {
  return (
    <SlateElement {...props} as="tr" className="tw:h-full">
      {props.children}
    </SlateElement>
  );
}

export function TableCellElementStatic({
  isHeader,
  ...props
}: SlateElementProps<TTableCellElement> & {
  isHeader?: boolean;
}) {
  const { editor, element } = props;
  const { api } = editor.getPlugin(BaseTablePlugin);

  const { minHeight, width } = api.table.getCellSize({ element });
  const borders = api.table.getCellBorders({ element });

  return (
    <SlateElement
      {...props}
      as={isHeader ? "th" : "td"}
      className={cn(
        "tw:h-full tw:overflow-visible tw:border-none tw:bg-background tw:p-0",
        element.background ? "tw:bg-(--cellBackground)" : "tw:bg-background",
        isHeader && "tw:text-left tw:font-normal tw:*:m-0",
        "tw:before:size-full",
        "tw:before:absolute tw:before:box-border tw:before:content-[] tw:before:select-none",
        borders &&
          cn(
            borders.bottom?.size && `before:border-b before:border-b-border`,
            borders.right?.size && `before:border-r before:border-r-border`,
            borders.left?.size && `before:border-l before:border-l-border`,
            borders.top?.size && `before:border-t before:border-t-border`
          )
      )}
      style={
        {
          "--cellBackground": element.background,
          maxWidth: width || 240,
          minWidth: width || 120
        } as React.CSSProperties
      }
      attributes={{
        ...props.attributes,
        colSpan: api.table.getColSpan(element),
        rowSpan: api.table.getRowSpan(element)
      }}>
      <div
        className="tw:relative tw:z-20 tw:box-border tw:h-full tw:px-4 tw:py-2"
        style={{ minHeight }}>
        {props.children}
      </div>
    </SlateElement>
  );
}

export function TableCellHeaderElementStatic(
  props: SlateElementProps<TTableCellElement>
) {
  return <TableCellElementStatic {...props} isHeader />;
}
