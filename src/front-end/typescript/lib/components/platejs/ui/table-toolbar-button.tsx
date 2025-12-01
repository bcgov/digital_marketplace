"use client";

import * as React from "react";

import type { DropdownMenuProps } from "@radix-ui/react-dropdown-menu";

import { TablePlugin, useTableMergeState } from "@platejs/table/react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Combine,
  Grid3x3Icon,
  Table,
  Trash2Icon,
  Ungroup,
  XIcon
} from "lucide-react";
import { KEYS } from "platejs";
import { useEditorPlugin, useEditorSelector } from "platejs/react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from "./dropdown-menu";
import { cn } from "./utils";

import { ToolbarButton } from "./toolbar";

export function TableToolbarButton(props: DropdownMenuProps) {
  const tableSelected = useEditorSelector(
    (editor) => editor.api.some({ match: { type: KEYS.table } }),
    []
  );

  const { editor, tf } = useEditorPlugin(TablePlugin);
  const [open, setOpen] = React.useState(false);
  const mergeState = useTableMergeState();

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip="Table" isDropdown>
          <Table />
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="tw:flex tw:w-[180px] tw:min-w-0 tw:flex-col"
        align="start">
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="tw:gap-2 tw:data-[disabled]:pointer-events-none tw:data-[disabled]:opacity-50">
              <Grid3x3Icon className="tw:size-4" />
              <span>Table</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="tw:m-0 tw:p-0">
              <TablePicker />
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger
              className="tw:gap-2 tw:data-[disabled]:pointer-events-none tw:data-[disabled]:opacity-50"
              disabled={!tableSelected}>
              <div className="tw:size-4" />
              <span>Cell</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                className="tw:min-w-[180px]"
                disabled={!mergeState.canMerge}
                onSelect={() => {
                  tf.table.merge();
                  editor.tf.focus();
                }}>
                <Combine />
                Merge cells
              </DropdownMenuItem>
              <DropdownMenuItem
                className="tw:min-w-[180px]"
                disabled={!mergeState.canSplit}
                onSelect={() => {
                  tf.table.split();
                  editor.tf.focus();
                }}>
                <Ungroup />
                Split cell
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger
              className="tw:gap-2 tw:data-[disabled]:pointer-events-none tw:data-[disabled]:opacity-50"
              disabled={!tableSelected}>
              <div className="tw:size-4" />
              <span>Row</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                className="tw:min-w-[180px]"
                disabled={!tableSelected}
                onSelect={() => {
                  tf.insert.tableRow({ before: true });
                  editor.tf.focus();
                }}>
                <ArrowUp />
                Insert row before
              </DropdownMenuItem>
              <DropdownMenuItem
                className="tw:min-w-[180px]"
                disabled={!tableSelected}
                onSelect={() => {
                  tf.insert.tableRow();
                  editor.tf.focus();
                }}>
                <ArrowDown />
                Insert row after
              </DropdownMenuItem>
              <DropdownMenuItem
                className="tw:min-w-[180px]"
                disabled={!tableSelected}
                onSelect={() => {
                  tf.remove.tableRow();
                  editor.tf.focus();
                }}>
                <XIcon />
                Delete row
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger
              className="tw:gap-2 tw:data-[disabled]:pointer-events-none tw:data-[disabled]:opacity-50"
              disabled={!tableSelected}>
              <div className="tw:size-4" />
              <span>Column</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                className="tw:min-w-[180px]"
                disabled={!tableSelected}
                onSelect={() => {
                  tf.insert.tableColumn({ before: true });
                  editor.tf.focus();
                }}>
                <ArrowLeft />
                Insert column before
              </DropdownMenuItem>
              <DropdownMenuItem
                className="tw:min-w-[180px]"
                disabled={!tableSelected}
                onSelect={() => {
                  tf.insert.tableColumn();
                  editor.tf.focus();
                }}>
                <ArrowRight />
                Insert column after
              </DropdownMenuItem>
              <DropdownMenuItem
                className="tw:min-w-[180px]"
                disabled={!tableSelected}
                onSelect={() => {
                  tf.remove.tableColumn();
                  editor.tf.focus();
                }}>
                <XIcon />
                Delete column
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem
            className="tw:min-w-[180px]"
            disabled={!tableSelected}
            onSelect={() => {
              tf.remove.table();
              editor.tf.focus();
            }}>
            <Trash2Icon />
            Delete table
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TablePicker() {
  const { editor, tf } = useEditorPlugin(TablePlugin);

  const [tablePicker, setTablePicker] = React.useState({
    grid: Array.from({ length: 8 }, () => Array.from({ length: 8 }).fill(0)),
    size: { colCount: 0, rowCount: 0 }
  });

  const onCellMove = (rowIndex: number, colIndex: number) => {
    const newGrid = [...tablePicker.grid];

    for (let i = 0; i < newGrid.length; i++) {
      for (let j = 0; j < newGrid[i].length; j++) {
        newGrid[i][j] =
          i >= 0 && i <= rowIndex && j >= 0 && j <= colIndex ? 1 : 0;
      }
    }

    setTablePicker({
      grid: newGrid,
      size: { colCount: colIndex + 1, rowCount: rowIndex + 1 }
    });
  };

  return (
    <div
      className="tw:m-0 tw:flex! tw:flex-col tw:p-0"
      onClick={() => {
        tf.insert.table(tablePicker.size, { select: true });
        editor.tf.focus();
      }}>
      <div className="tw:grid tw:size-[130px] tw:grid-cols-8 tw:gap-0.5 tw:p-1">
        {tablePicker.grid.map((rows, rowIndex) =>
          rows.map((value, columIndex) => {
            return (
              <div
                key={`(${rowIndex},${columIndex})`}
                className={cn(
                  "tw:col-span-1 tw:size-3 tw:border tw:border-solid tw:bg-secondary",
                  !!value && "tw:border-current"
                )}
                onMouseMove={() => {
                  onCellMove(rowIndex, columIndex);
                }}
              />
            );
          })
        )}
      </div>

      <div className="tw:text-center tw:text-xs tw:text-current">
        {tablePicker.size.rowCount} x {tablePicker.size.colCount}
      </div>
    </div>
  );
}
