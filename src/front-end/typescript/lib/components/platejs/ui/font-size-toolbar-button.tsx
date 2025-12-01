"use client";

import * as React from "react";

import type { TElement } from "platejs";

import { toUnitLess } from "@platejs/basic-styles";
import { FontSizePlugin } from "@platejs/basic-styles/react";
import { Minus, Plus } from "lucide-react";
import { KEYS } from "platejs";
import { useEditorPlugin, useEditorSelector } from "platejs/react";

import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "./utils";

import { ToolbarButton } from "./toolbar";

const DEFAULT_FONT_SIZE = "16";

const FONT_SIZE_MAP = {
  h1: "36",
  h2: "24",
  h3: "20"
} as const;

const FONT_SIZES = [
  "8",
  "9",
  "10",
  "12",
  "14",
  "16",
  "18",
  "24",
  "30",
  "36",
  "48",
  "60",
  "72",
  "96"
] as const;

export function FontSizeToolbarButton() {
  const [inputValue, setInputValue] = React.useState(DEFAULT_FONT_SIZE);
  const [isFocused, setIsFocused] = React.useState(false);
  const { editor, tf } = useEditorPlugin(FontSizePlugin);

  const cursorFontSize = useEditorSelector((editor) => {
    const fontSize = editor.api.marks()?.[KEYS.fontSize];

    if (fontSize) {
      return toUnitLess(fontSize as string);
    }

    const [block] = editor.api.block<TElement>() || [];

    if (!block?.type) return DEFAULT_FONT_SIZE;

    return block.type in FONT_SIZE_MAP
      ? FONT_SIZE_MAP[block.type as keyof typeof FONT_SIZE_MAP]
      : DEFAULT_FONT_SIZE;
  }, []);

  const handleInputChange = () => {
    const newSize = toUnitLess(inputValue);

    if (Number.parseInt(newSize) < 1 || Number.parseInt(newSize) > 100) {
      editor.tf.focus();

      return;
    }
    if (newSize !== toUnitLess(cursorFontSize)) {
      tf.fontSize.addMark(`${newSize}px`);
    }

    editor.tf.focus();
  };

  const handleFontSizeChange = (delta: number) => {
    const newSize = Number(displayValue) + delta;
    tf.fontSize.addMark(`${newSize}px`);
    editor.tf.focus();
  };

  const displayValue = isFocused ? inputValue : cursorFontSize;

  return (
    <div className="tw:flex tw:h-7 tw:items-center tw:gap-1 tw:rounded-md tw:bg-muted/60 tw:p-0">
      <ToolbarButton onClick={() => handleFontSizeChange(-1)}>
        <Minus />
      </ToolbarButton>

      <Popover open={isFocused} modal={false}>
        <PopoverTrigger asChild>
          <input
            className={cn(
              "tw:h-full tw:w-10 tw:shrink-0 tw:bg-transparent tw:px-1 tw:text-center tw:text-sm tw:hover:bg-muted"
            )}
            value={displayValue}
            onBlur={() => {
              setIsFocused(false);
              handleInputChange();
            }}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              setInputValue(toUnitLess(cursorFontSize));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleInputChange();
              }
            }}
            data-plate-focus="true"
            type="text"
          />
        </PopoverTrigger>
        <PopoverContent
          className="tw:w-10 tw:px-px tw:py-1"
          onOpenAutoFocus={(e) => e.preventDefault()}>
          {FONT_SIZES.map((size) => (
            <button
              key={size}
              className={cn(
                "tw:flex tw:h-8 tw:w-full tw:items-center tw:justify-center tw:text-sm tw:hover:bg-accent tw:data-[highlighted=true]:bg-accent"
              )}
              onClick={() => {
                tf.fontSize.addMark(`${size}px`);
                setIsFocused(false);
              }}
              data-highlighted={size === displayValue}
              type="button">
              {size}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <ToolbarButton onClick={() => handleFontSizeChange(1)}>
        <Plus />
      </ToolbarButton>
    </div>
  );
}
