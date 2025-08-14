"use client";

import * as React from "react";

import type * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

import { useDraggable, useDropLine } from "@platejs/dnd";
import {
  BlockSelectionPlugin,
  useBlockSelected
} from "@platejs/selection/react";
import { setCellBackground } from "@platejs/table";
import {
  TablePlugin,
  TableProvider,
  useTableBordersDropdownMenuContentState,
  useTableCellElement,
  useTableCellElementResizable,
  useTableElement,
  useTableMergeState
} from "@platejs/table/react";
import { PopoverAnchor } from "@radix-ui/react-popover";
import { cva } from "class-variance-authority";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CombineIcon,
  EraserIcon,
  Grid2X2Icon,
  GripVertical,
  PaintBucketIcon,
  SquareSplitHorizontalIcon,
  Trash2Icon,
  XIcon
} from "lucide-react";
import {
  type TElement,
  type TTableCellElement,
  type TTableElement,
  type TTableRowElement,
  KEYS,
  PathApi
} from "platejs";
import {
  type PlateElementProps,
  PlateElement,
  useComposedRef,
  useEditorPlugin,
  useEditorRef,
  useEditorSelector,
  useElement,
  usePluginOption,
  useReadOnly,
  useRemoveNodeButton,
  useSelected,
  withHOC
} from "platejs/react";
import { useElementSelector } from "platejs/react";

import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger
} from "./dropdown-menu";
import { Popover, PopoverContent } from "./popover";
import { cn } from "./utils";

import { blockSelectionVariants } from "./block-selection";
import {
  ColorDropdownMenuItems,
  DEFAULT_COLORS
} from "./font-color-toolbar-button";
import { ResizeHandle } from "./resize-handle";
import {
  BorderAllIcon,
  BorderBottomIcon,
  BorderLeftIcon,
  BorderNoneIcon,
  BorderRightIcon,
  BorderTopIcon
} from "./table-icons";
import {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarMenuGroup
} from "./toolbar";
export const TableElement = withHOC(
  TableProvider,
  function TableElement({
    children,
    ...props
  }: PlateElementProps<TTableElement>) {
    const readOnly = useReadOnly();
    const isSelectionAreaVisible = usePluginOption(
      BlockSelectionPlugin,
      "isSelectionAreaVisible"
    );
    const hasControls = !readOnly && !isSelectionAreaVisible;
    const {
      isSelectingCell,
      marginLeft,
      props: tableProps
    } = useTableElement();

    const isSelectingTable = useBlockSelected(props.element.id as string);

    const content = (
      <PlateElement
        {...props}
        className={cn(
          "tw:overflow-x-auto tw:py-5",
          hasControls && "tw:-ml-2 tw:*:data-[slot=block-selection]:left-2"
        )}
        style={{ paddingLeft: marginLeft }}>
        <div className="tw:group/table tw:relative tw:w-fit">
          <table
            className={cn(
              "tw:mr-0 tw:ml-px tw:table tw:h-px tw:table-fixed tw:border-collapse",
              isSelectingCell && "tw:selection:bg-transparent"
            )}
            {...tableProps}>
            <tbody className="tw:min-w-full">{children}</tbody>
          </table>

          {isSelectingTable && (
            <div className={blockSelectionVariants()} contentEditable={false} />
          )}
        </div>
      </PlateElement>
    );

    if (readOnly) {
      return content;
    }

    return <TableFloatingToolbar>{content}</TableFloatingToolbar>;
  }
);

function TableFloatingToolbar({
  children,
  ...props
}: React.ComponentProps<typeof PopoverContent>) {
  const { tf } = useEditorPlugin(TablePlugin);
  const selected = useSelected();
  const element = useElement<TTableElement>();
  const { props: buttonProps } = useRemoveNodeButton({ element });
  const collapsedInside = useEditorSelector(
    (editor) => selected && editor.api.isCollapsed(),
    [selected]
  );

  const { canMerge, canSplit } = useTableMergeState();

  return (
    <Popover open={canMerge || canSplit || collapsedInside} modal={false}>
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      <PopoverContent
        asChild
        onOpenAutoFocus={(e) => e.preventDefault()}
        contentEditable={false}
        {...props}>
        <Toolbar
          className="tw:scrollbar-hide tw:flex tw:w-auto tw:max-w-[80vw] tw:flex-row tw:overflow-x-auto tw:rounded-md tw:border tw:bg-popover tw:p-1 tw:shadow-md tw:print:hidden"
          contentEditable={false}>
          <ToolbarGroup>
            <ColorDropdownMenu tooltip="Background color">
              <PaintBucketIcon />
            </ColorDropdownMenu>
            {canMerge && (
              <ToolbarButton
                onClick={() => tf.table.merge()}
                onMouseDown={(e) => e.preventDefault()}
                tooltip="Merge cells">
                <CombineIcon />
              </ToolbarButton>
            )}
            {canSplit && (
              <ToolbarButton
                onClick={() => tf.table.split()}
                onMouseDown={(e) => e.preventDefault()}
                tooltip="Split cell">
                <SquareSplitHorizontalIcon />
              </ToolbarButton>
            )}

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <ToolbarButton tooltip="Cell borders">
                  <Grid2X2Icon />
                </ToolbarButton>
              </DropdownMenuTrigger>

              <DropdownMenuPortal>
                <TableBordersDropdownMenuContent />
              </DropdownMenuPortal>
            </DropdownMenu>

            {collapsedInside && (
              <ToolbarGroup>
                <ToolbarButton tooltip="Delete table" {...buttonProps}>
                  <Trash2Icon />
                </ToolbarButton>
              </ToolbarGroup>
            )}
          </ToolbarGroup>

          {collapsedInside && (
            <ToolbarGroup>
              <ToolbarButton
                onClick={() => {
                  tf.insert.tableRow({ before: true });
                }}
                onMouseDown={(e) => e.preventDefault()}
                tooltip="Insert row before">
                <ArrowUp />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => {
                  tf.insert.tableRow();
                }}
                onMouseDown={(e) => e.preventDefault()}
                tooltip="Insert row after">
                <ArrowDown />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => {
                  tf.remove.tableRow();
                }}
                onMouseDown={(e) => e.preventDefault()}
                tooltip="Delete row">
                <XIcon />
              </ToolbarButton>
            </ToolbarGroup>
          )}

          {collapsedInside && (
            <ToolbarGroup>
              <ToolbarButton
                onClick={() => {
                  tf.insert.tableColumn({ before: true });
                }}
                onMouseDown={(e) => e.preventDefault()}
                tooltip="Insert column before">
                <ArrowLeft />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => {
                  tf.insert.tableColumn();
                }}
                onMouseDown={(e) => e.preventDefault()}
                tooltip="Insert column after">
                <ArrowRight />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => {
                  tf.remove.tableColumn();
                }}
                onMouseDown={(e) => e.preventDefault()}
                tooltip="Delete column">
                <XIcon />
              </ToolbarButton>
            </ToolbarGroup>
          )}
        </Toolbar>
      </PopoverContent>
    </Popover>
  );
}

function TableBordersDropdownMenuContent(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Content>
) {
  const editor = useEditorRef();
  const {
    getOnSelectTableBorder,
    hasBottomBorder,
    hasLeftBorder,
    hasNoBorders,
    hasOuterBorders,
    hasRightBorder,
    hasTopBorder
  } = useTableBordersDropdownMenuContentState();

  return (
    <DropdownMenuContent
      className="tw:min-w-[220px]"
      onCloseAutoFocus={(e) => {
        e.preventDefault();
        editor.tf.focus();
      }}
      align="start"
      side="right"
      sideOffset={0}
      {...props}>
      <DropdownMenuGroup>
        <DropdownMenuCheckboxItem
          checked={hasTopBorder}
          onCheckedChange={getOnSelectTableBorder("top")}>
          <BorderTopIcon />
          <div>Top Border</div>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={hasRightBorder}
          onCheckedChange={getOnSelectTableBorder("right")}>
          <BorderRightIcon />
          <div>Right Border</div>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={hasBottomBorder}
          onCheckedChange={getOnSelectTableBorder("bottom")}>
          <BorderBottomIcon />
          <div>Bottom Border</div>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={hasLeftBorder}
          onCheckedChange={getOnSelectTableBorder("left")}>
          <BorderLeftIcon />
          <div>Left Border</div>
        </DropdownMenuCheckboxItem>
      </DropdownMenuGroup>

      <DropdownMenuGroup>
        <DropdownMenuCheckboxItem
          checked={hasNoBorders}
          onCheckedChange={getOnSelectTableBorder("none")}>
          <BorderNoneIcon />
          <div>No Border</div>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={hasOuterBorders}
          onCheckedChange={getOnSelectTableBorder("outer")}>
          <BorderAllIcon />
          <div>Outside Borders</div>
        </DropdownMenuCheckboxItem>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  );
}

function ColorDropdownMenu({
  children,
  tooltip
}: {
  children: React.ReactNode;
  tooltip: string;
}) {
  const [open, setOpen] = React.useState(false);

  const editor = useEditorRef();
  const selectedCells = usePluginOption(TablePlugin, "selectedCells");

  const onUpdateColor = React.useCallback(
    (color: string) => {
      setOpen(false);
      setCellBackground(editor, { color, selectedCells: selectedCells ?? [] });
    },
    [selectedCells, editor]
  );

  const onClearColor = React.useCallback(() => {
    setOpen(false);
    setCellBackground(editor, {
      color: null,
      selectedCells: selectedCells ?? []
    });
  }, [selectedCells, editor]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton tooltip={tooltip}>{children}</ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        <ToolbarMenuGroup label="Colors">
          <ColorDropdownMenuItems
            className="tw:px-2"
            colors={DEFAULT_COLORS}
            updateColor={onUpdateColor}
          />
        </ToolbarMenuGroup>
        <DropdownMenuGroup>
          <DropdownMenuItem className="tw:p-2" onClick={onClearColor}>
            <EraserIcon />
            <span>Clear</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TableRowElement(props: PlateElementProps<TTableRowElement>) {
  const { element } = props;
  const readOnly = useReadOnly();
  const selected = useSelected();
  const editor = useEditorRef();
  const isSelectionAreaVisible = usePluginOption(
    BlockSelectionPlugin,
    "isSelectionAreaVisible"
  );
  const hasControls = !readOnly && !isSelectionAreaVisible;

  const { isDragging, previewRef, handleRef } = useDraggable({
    element,
    type: element.type,
    canDropNode: ({ dragEntry, dropEntry }) =>
      PathApi.equals(
        PathApi.parent(dragEntry[1]),
        PathApi.parent(dropEntry[1])
      ),
    onDropHandler: (_, { dragItem }) => {
      const dragElement = (dragItem as { element: TElement }).element;

      if (dragElement) {
        editor.tf.select(dragElement);
      }
    }
  });

  return (
    <PlateElement
      {...props}
      ref={useComposedRef(props.ref, previewRef)}
      as="tr"
      className={cn("tw:group/row", isDragging && "tw:opacity-50")}
      attributes={{
        ...props.attributes,
        "data-selected": selected ? "true" : undefined
      }}>
      {hasControls && (
        <td className="tw:w-2 tw:select-none" contentEditable={false}>
          <RowDragHandle dragRef={handleRef} />
          <RowDropLine />
        </td>
      )}

      {props.children}
    </PlateElement>
  );
}

function RowDragHandle({ dragRef }: { dragRef: React.Ref<any> }) {
  const editor = useEditorRef();
  const element = useElement();

  return (
    <Button
      ref={dragRef}
      variant="outline"
      className={cn(
        "tw:absolute tw:top-1/2 tw:left-0 tw:z-51 tw:h-6 tw:w-4 tw:-translate-y-1/2 tw:p-0 tw:focus-visible:ring-0 tw:focus-visible:ring-offset-0",
        "tw:cursor-grab tw:active:cursor-grabbing",
        "tw:opacity-0 tw:transition-opacity tw:duration-100 tw:group-hover/row:opacity-100 tw:group-has-data-[resizing=true]/row:opacity-0"
      )}
      onClick={() => {
        editor.tf.select(element);
      }}>
      <GripVertical className="tw:text-muted-foreground" />
    </Button>
  );
}

function RowDropLine() {
  const { dropLine } = useDropLine();

  if (!dropLine) return null;

  return (
    <div
      className={cn(
        "tw:absolute tw:inset-x-0 tw:left-2 tw:z-50 tw:h-0.5 tw:bg-brand/50",
        dropLine === "top" ? "tw:-top-px" : "tw:-bottom-px"
      )}
    />
  );
}

export function TableCellElement({
  isHeader,
  ...props
}: PlateElementProps<TTableCellElement> & {
  isHeader?: boolean;
}) {
  const { api } = useEditorPlugin(TablePlugin);
  const readOnly = useReadOnly();
  const element = props.element;

  const rowId = useElementSelector(([node]) => node.id as string, [], {
    key: KEYS.tr
  });
  const isSelectingRow = useBlockSelected(rowId);
  const isSelectionAreaVisible = usePluginOption(
    BlockSelectionPlugin,
    "isSelectionAreaVisible"
  );

  const { borders, colIndex, colSpan, minHeight, rowIndex, selected, width } =
    useTableCellElement();

  const { bottomProps, hiddenLeft, leftProps, rightProps } =
    useTableCellElementResizable({
      colIndex,
      colSpan,
      rowIndex
    });

  return (
    <PlateElement
      {...props}
      as={isHeader ? "th" : "td"}
      className={cn(
        "tw:h-full tw:overflow-visible tw:border-none tw:bg-background tw:p-0",
        element.background ? "tw:bg-(--cellBackground)" : "tw:bg-background",
        isHeader && "tw:text-left tw:*:m-0",
        "tw:before:size-full",
        selected && "tw:before:z-10 tw:before:bg-brand/5",
        "tw:before:absolute tw:before:box-border tw:before:content-[] tw:before:select-none",
        borders.bottom?.size && `before:border-b before:border-b-border`,
        borders.right?.size && `before:border-r before:border-r-border`,
        borders.left?.size && `before:border-l before:border-l-border`,
        borders.top?.size && `before:border-t before:border-t-border`
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
        className="tw:relative tw:z-20 tw:box-border tw:h-full tw:px-3 tw:py-2"
        style={{ minHeight }}>
        {props.children}
      </div>

      {!isSelectionAreaVisible && (
        <div
          className="tw:group tw:absolute tw:top-0 tw:size-full tw:select-none"
          contentEditable={false}
          suppressContentEditableWarning={true}>
          {!readOnly && (
            <>
              <ResizeHandle
                {...rightProps}
                className="tw:-top-2 tw:-right-1 tw:h-[calc(100%_+_8px)] tw:w-2"
                data-col={colIndex}
              />
              <ResizeHandle {...bottomProps} className="tw:-bottom-1 tw:h-2" />
              {!hiddenLeft && (
                <ResizeHandle
                  {...leftProps}
                  className="tw:top-0 tw:-left-1 tw:w-2"
                  data-resizer-left={colIndex === 0 ? "true" : undefined}
                />
              )}

              <div
                className={cn(
                  "tw:absolute tw:top-0 tw:z-30 tw:hidden tw:h-full tw:w-1 tw:bg-ring",
                  "tw:right-[-1.5px]",
                  columnResizeVariants({ colIndex: colIndex as any })
                )}
              />
              {colIndex === 0 && (
                <div
                  className={cn(
                    "tw:absolute tw:top-0 tw:z-30 tw:h-full tw:w-1 tw:bg-ring",
                    "tw:left-[-1.5px]",
                    "tw:hidden tw:animate-in tw:fade-in tw:group-has-[[data-resizer-left]:hover]/table:block tw:group-has-[[data-resizer-left][data-resizing=true]]/table:block"
                  )}
                />
              )}
            </>
          )}
        </div>
      )}

      {isSelectingRow && (
        <div className={blockSelectionVariants()} contentEditable={false} />
      )}
    </PlateElement>
  );
}

export function TableCellHeaderElement(
  props: React.ComponentProps<typeof TableCellElement>
) {
  return <TableCellElement {...props} isHeader />;
}

const columnResizeVariants = cva("tw:hidden tw:animate-in tw:fade-in", {
  variants: {
    colIndex: {
      0: "tw:group-has-[[data-col=0]:hover]/table:block tw:group-has-[[data-col=0][data-resizing=true]]/table:block",
      1: "tw:group-has-[[data-col=1]:hover]/table:block tw:group-has-[[data-col=1][data-resizing=true]]/table:block",
      2: "tw:group-has-[[data-col=2]:hover]/table:block tw:group-has-[[data-col=2][data-resizing=true]]/table:block",
      3: "tw:group-has-[[data-col=3]:hover]/table:block tw:group-has-[[data-col=3][data-resizing=true]]/table:block",
      4: "tw:group-has-[[data-col=4]:hover]/table:block tw:group-has-[[data-col=4][data-resizing=true]]/table:block",
      5: "tw:group-has-[[data-col=5]:hover]/table:block tw:group-has-[[data-col=5][data-resizing=true]]/table:block",
      6: "tw:group-has-[[data-col=6]:hover]/table:block tw:group-has-[[data-col=6][data-resizing=true]]/table:block",
      7: "tw:group-has-[[data-col=7]:hover]/table:block tw:group-has-[[data-col=7][data-resizing=true]]/table:block",
      8: "tw:group-has-[[data-col=8]:hover]/table:block tw:group-has-[[data-col=8][data-resizing=true]]/table:block",
      9: "tw:group-has-[[data-col=9]:hover]/table:block tw:group-has-[[data-col=9][data-resizing=true]]/table:block",
      10: "tw:group-has-[[data-col=10]:hover]/table:block tw:group-has-[[data-col=10][data-resizing=true]]/table:block"
    }
  }
});
