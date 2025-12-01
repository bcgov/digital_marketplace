"use client";

import * as React from "react";

import type { Emoji } from "@emoji-mart/data";

import {
  type EmojiCategoryList,
  type EmojiIconList,
  type GridRow,
  EmojiSettings
} from "@platejs/emoji";
import {
  type EmojiDropdownMenuOptions,
  type UseEmojiPickerType,
  useEmojiDropdownMenuState
} from "@platejs/emoji/react";
import * as Popover from "@radix-ui/react-popover";
import {
  AppleIcon,
  ClockIcon,
  CompassIcon,
  FlagIcon,
  LeafIcon,
  LightbulbIcon,
  MusicIcon,
  SearchIcon,
  SmileIcon,
  StarIcon,
  XIcon
} from "lucide-react";

import { Button } from "./button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "./tooltip";
import { cn } from "./utils";
import { ToolbarButton } from "./toolbar";

export function EmojiToolbarButton({
  options,
  ...props
}: {
  options?: EmojiDropdownMenuOptions;
} & React.ComponentPropsWithoutRef<typeof ToolbarButton>) {
  const { emojiPickerState, isOpen, setIsOpen } =
    useEmojiDropdownMenuState(options);

  return (
    <EmojiPopover
      control={
        <ToolbarButton pressed={isOpen} tooltip="Emoji" isDropdown {...props}>
          <SmileIcon />
        </ToolbarButton>
      }
      isOpen={isOpen}
      setIsOpen={setIsOpen}>
      <EmojiPicker
        {...emojiPickerState}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        settings={options?.settings}
      />
    </EmojiPopover>
  );
}

export function EmojiPopover({
  children,
  control,
  isOpen,
  setIsOpen
}: {
  children: React.ReactNode;
  control: React.ReactNode;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>{control}</Popover.Trigger>

      <Popover.Portal>
        <Popover.Content className="tw:z-100">{children}</Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function EmojiPicker({
  clearSearch,
  emoji,
  emojiLibrary,
  focusedCategory,
  hasFound,
  i18n,
  icons = {
    categories: emojiCategoryIcons,
    search: emojiSearchIcons
  },
  isSearching,
  refs,
  searchResult,
  searchValue,
  setSearch,
  settings = EmojiSettings,
  visibleCategories,
  handleCategoryClick,
  onMouseOver,
  onSelectEmoji
}: Omit<UseEmojiPickerType, "icons"> & {
  icons?: EmojiIconList<React.ReactElement>;
}) {
  return (
    <div
      className={cn(
        "tw:flex tw:flex-col tw:rounded-xl tw:bg-popover tw:text-popover-foreground",
        "tw:h-[23rem] tw:w-80 tw:border tw:shadow-md"
      )}>
      <EmojiPickerNavigation
        onClick={handleCategoryClick}
        emojiLibrary={emojiLibrary}
        focusedCategory={focusedCategory}
        i18n={i18n}
        icons={icons}
      />
      <EmojiPickerSearchBar
        i18n={i18n}
        searchValue={searchValue}
        setSearch={setSearch}>
        <EmojiPickerSearchAndClear
          clearSearch={clearSearch}
          i18n={i18n}
          searchValue={searchValue}
        />
      </EmojiPickerSearchBar>
      <EmojiPickerContent
        onMouseOver={onMouseOver}
        onSelectEmoji={onSelectEmoji}
        emojiLibrary={emojiLibrary}
        i18n={i18n}
        isSearching={isSearching}
        refs={refs}
        searchResult={searchResult}
        settings={settings}
        visibleCategories={visibleCategories}
      />
      <EmojiPickerPreview
        emoji={emoji}
        hasFound={hasFound}
        i18n={i18n}
        isSearching={isSearching}
      />
    </div>
  );
}

const EmojiButton = React.memo(function EmojiButton({
  emoji,
  index,
  onMouseOver,
  onSelect
}: {
  emoji: Emoji;
  index: number;
  onMouseOver: (emoji?: Emoji) => void;
  onSelect: (emoji: Emoji) => void;
}) {
  return (
    <button
      className="tw:group tw:relative tw:flex tw:size-9 tw:cursor-pointer tw:items-center tw:justify-center tw:border-none tw:bg-transparent tw:text-2xl tw:leading-none"
      onClick={() => onSelect(emoji)}
      onMouseEnter={() => onMouseOver(emoji)}
      onMouseLeave={() => onMouseOver()}
      aria-label={emoji.skins[0].native}
      data-index={index}
      tabIndex={-1}
      type="button">
      <div
        className="tw:absolute tw:inset-0 tw:rounded-full tw:opacity-0 tw:group-hover:opacity-100"
        aria-hidden="true"
      />
      <span
        className="tw:relative"
        style={{
          fontFamily:
            '"Apple Color Emoji", "Segoe UI Emoji", NotoColorEmoji, "Noto Color Emoji", "Segoe UI Symbol", "Android Emoji", EmojiSymbols'
        }}
        data-emoji-set="native">
        {emoji.skins[0].native}
      </span>
    </button>
  );
});

const RowOfButtons = React.memo(function RowOfButtons({
  emojiLibrary,
  row,
  onMouseOver,
  onSelectEmoji
}: {
  row: GridRow;
} & Pick<
  UseEmojiPickerType,
  "emojiLibrary" | "onMouseOver" | "onSelectEmoji"
>) {
  return (
    <div key={row.id} className="tw:flex" data-index={row.id}>
      {row.elements.map((emojiId, index) => (
        <EmojiButton
          key={emojiId}
          onMouseOver={onMouseOver}
          onSelect={onSelectEmoji}
          emoji={emojiLibrary.getEmoji(emojiId)}
          index={index}
        />
      ))}
    </div>
  );
});

function EmojiPickerContent({
  emojiLibrary,
  i18n,
  isSearching = false,
  refs,
  searchResult,
  settings = EmojiSettings,
  visibleCategories,
  onMouseOver,
  onSelectEmoji
}: Pick<
  UseEmojiPickerType,
  | "emojiLibrary"
  | "i18n"
  | "isSearching"
  | "onMouseOver"
  | "onSelectEmoji"
  | "refs"
  | "searchResult"
  | "settings"
  | "visibleCategories"
>) {
  const getRowWidth = settings.perLine.value * settings.buttonSize.value;

  const isCategoryVisible = React.useCallback(
    (categoryId: any) => {
      return visibleCategories.has(categoryId)
        ? visibleCategories.get(categoryId)
        : false;
    },
    [visibleCategories]
  );

  const EmojiList = React.useCallback(() => {
    return emojiLibrary
      .getGrid()
      .sections()
      .map(({ id: categoryId }) => {
        const section = emojiLibrary.getGrid().section(categoryId);
        const { buttonSize } = settings;

        return (
          <div
            key={categoryId}
            ref={section.root}
            style={{ width: getRowWidth }}
            data-id={categoryId}>
            <div className="tw:sticky tw:-top-px tw:z-1 tw:bg-popover/90 tw:p-1 tw:py-2 tw:text-sm tw:font-semibold tw:backdrop-blur-xs">
              {i18n.categories[categoryId]}
            </div>
            <div
              className="tw:relative tw:flex tw:flex-wrap"
              style={{ height: section.getRows().length * buttonSize.value }}>
              {isCategoryVisible(categoryId) &&
                section
                  .getRows()
                  .map((row: GridRow) => (
                    <RowOfButtons
                      key={row.id}
                      onMouseOver={onMouseOver}
                      onSelectEmoji={onSelectEmoji}
                      emojiLibrary={emojiLibrary}
                      row={row}
                    />
                  ))}
            </div>
          </div>
        );
      });
  }, [
    emojiLibrary,
    getRowWidth,
    i18n.categories,
    isCategoryVisible,
    onSelectEmoji,
    onMouseOver,
    settings
  ]);

  const SearchList = React.useCallback(() => {
    return (
      <div style={{ width: getRowWidth }} data-id="search">
        <div className="tw:sticky tw:-top-px tw:z-1 tw:bg-popover/90 tw:p-1 tw:py-2 tw:text-sm tw:font-semibold tw:text-card-foreground tw:backdrop-blur-xs">
          {i18n.searchResult}
        </div>
        <div className="tw:relative tw:flex tw:flex-wrap">
          {searchResult.map((emoji: Emoji, index: number) => (
            <EmojiButton
              key={emoji.id}
              onMouseOver={onMouseOver}
              onSelect={onSelectEmoji}
              emoji={emojiLibrary.getEmoji(emoji.id)}
              index={index}
            />
          ))}
        </div>
      </div>
    );
  }, [
    emojiLibrary,
    getRowWidth,
    i18n.searchResult,
    searchResult,
    onSelectEmoji,
    onMouseOver
  ]);

  return (
    <div
      ref={refs.current.contentRoot}
      className={cn(
        "tw:h-full tw:min-h-[50%] tw:overflow-x-hidden tw:overflow-y-auto tw:px-2",
        "tw:[&::-webkit-scrollbar]:w-4",
        "tw:[&::-webkit-scrollbar-button]:hidden tw:[&::-webkit-scrollbar-button]:size-0",
        "tw:[&::-webkit-scrollbar-thumb]:min-h-11 tw:[&::-webkit-scrollbar-thumb]:rounded-full tw:[&::-webkit-scrollbar-thumb]:bg-muted tw:[&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/25",
        "tw:[&::-webkit-scrollbar-thumb]:border-4 tw:[&::-webkit-scrollbar-thumb]:border-solid tw:[&::-webkit-scrollbar-thumb]:border-popover tw:[&::-webkit-scrollbar-thumb]:bg-clip-padding"
      )}
      data-id="scroll">
      <div ref={refs.current.content} className="tw:h-full">
        {isSearching ? SearchList() : EmojiList()}
      </div>
    </div>
  );
}

function EmojiPickerSearchBar({
  children,
  i18n,
  searchValue,
  setSearch
}: {
  children: React.ReactNode;
} & Pick<UseEmojiPickerType, "i18n" | "searchValue" | "setSearch">) {
  return (
    <div className="tw:flex tw:items-center tw:px-2">
      <div className="tw:relative tw:flex tw:grow tw:items-center">
        <input
          className="tw:block tw:w-full tw:appearance-none tw:rounded-full tw:border-0 tw:bg-muted tw:px-10 tw:py-2 tw:text-sm tw:outline-none tw:placeholder:text-muted-foreground tw:focus-visible:outline-none"
          value={searchValue}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={i18n.search}
          aria-label="Search"
          autoComplete="off"
          type="text"
          autoFocus
        />
        {children}
      </div>
    </div>
  );
}

function EmojiPickerSearchAndClear({
  clearSearch,
  i18n,
  searchValue
}: Pick<UseEmojiPickerType, "clearSearch" | "i18n" | "searchValue">) {
  return (
    <div className="tw:flex tw:items-center tw:text-foreground">
      <div
        className={cn(
          "tw:absolute tw:top-1/2 tw:left-2.5 tw:z-10 tw:flex tw:size-5 tw:-translate-y-1/2 tw:items-center tw:justify-center tw:text-foreground"
        )}>
        {emojiSearchIcons.loupe}
      </div>
      {searchValue && (
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            "tw:absolute tw:top-1/2 tw:right-0.5 tw:flex tw:size-8 tw:-translate-y-1/2 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-full tw:border-none tw:bg-transparent tw:text-popover-foreground tw:hover:bg-transparent"
          )}
          onClick={clearSearch}
          title={i18n.clear}
          aria-label="Clear"
          type="button">
          {emojiSearchIcons.delete}
        </Button>
      )}
    </div>
  );
}

function EmojiPreview({ emoji }: Pick<UseEmojiPickerType, "emoji">) {
  return (
    <div className="tw:flex tw:h-14 tw:max-h-14 tw:min-h-14 tw:items-center tw:border-t tw:border-muted tw:p-2">
      <div className="tw:flex tw:items-center tw:justify-center tw:text-2xl">
        {emoji?.skins[0].native}
      </div>
      <div className="tw:overflow-hidden tw:pl-2">
        <div className="tw:truncate tw:text-sm tw:font-semibold">
          {emoji?.name}
        </div>
        <div className="tw:truncate tw:text-sm">{`:${emoji?.id}:`}</div>
      </div>
    </div>
  );
}

function NoEmoji({ i18n }: Pick<UseEmojiPickerType, "i18n">) {
  return (
    <div className="tw:flex tw:h-14 tw:max-h-14 tw:min-h-14 tw:items-center tw:border-t tw:border-muted tw:p-2">
      <div className="tw:flex tw:items-center tw:justify-center tw:text-2xl">
        😢
      </div>
      <div className="tw:overflow-hidden tw:pl-2">
        <div className="tw:truncate tw:text-sm tw:font-bold">
          {i18n.searchNoResultsTitle}
        </div>
        <div className="tw:truncate tw:text-sm">
          {i18n.searchNoResultsSubtitle}
        </div>
      </div>
    </div>
  );
}

function PickAnEmoji({ i18n }: Pick<UseEmojiPickerType, "i18n">) {
  return (
    <div className="tw:flex tw:h-14 tw:max-h-14 tw:min-h-14 tw:items-center tw:border-t tw:border-muted tw:p-2">
      <div className="tw:flex tw:items-center tw:justify-center tw:text-2xl">
        ☝️
      </div>
      <div className="tw:overflow-hidden tw:pl-2">
        <div className="tw:truncate tw:text-sm tw:font-semibold">
          {i18n.pick}
        </div>
      </div>
    </div>
  );
}

function EmojiPickerPreview({
  emoji,
  hasFound = true,
  i18n,
  isSearching = false,
  ...props
}: Pick<UseEmojiPickerType, "emoji" | "hasFound" | "i18n" | "isSearching">) {
  const showPickEmoji = !emoji && (!isSearching || hasFound);
  const showNoEmoji = isSearching && !hasFound;
  const showPreview = emoji && !showNoEmoji && !showNoEmoji;

  return (
    <>
      {showPreview && <EmojiPreview emoji={emoji} {...props} />}
      {showPickEmoji && <PickAnEmoji i18n={i18n} {...props} />}
      {showNoEmoji && <NoEmoji i18n={i18n} {...props} />}
    </>
  );
}

function EmojiPickerNavigation({
  emojiLibrary,
  focusedCategory,
  i18n,
  icons,
  onClick
}: {
  onClick: (id: EmojiCategoryList) => void;
} & Pick<
  UseEmojiPickerType,
  "emojiLibrary" | "focusedCategory" | "i18n" | "icons"
>) {
  return (
    <TooltipProvider delayDuration={500}>
      <nav
        id="emoji-nav"
        className="tw:mb-2.5 tw:border-0 tw:border-b tw:border-solid tw:border-b-border tw:p-1.5">
        <div className="tw:relative tw:flex tw:items-center tw:justify-evenly">
          {emojiLibrary
            .getGrid()
            .sections()
            .map(({ id }) => (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn(
                      "tw:h-fit tw:rounded-full tw:fill-current tw:p-1.5 tw:text-muted-foreground tw:hover:bg-muted tw:hover:text-muted-foreground",
                      id === focusedCategory &&
                        "tw:pointer-events-none tw:bg-accent tw:fill-current tw:text-accent-foreground"
                    )}
                    onClick={() => {
                      onClick(id);
                    }}
                    aria-label={i18n.categories[id]}
                    type="button">
                    <span className="tw:inline-flex tw:size-5 tw:items-center tw:justify-center">
                      {icons.categories[id].outline}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {i18n.categories[id]}
                </TooltipContent>
              </Tooltip>
            ))}
        </div>
      </nav>
    </TooltipProvider>
  );
}

const emojiCategoryIcons: Record<
  EmojiCategoryList,
  {
    outline: React.ReactElement;
    solid: React.ReactElement; // Needed to add another solid variant - outline will be used for now
  }
> = {
  activity: {
    outline: (
      <svg
        className="tw:size-full"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" />
        <path d="M2.1 13.4A10.1 10.1 0 0 0 13.4 2.1" />
        <path d="m5 4.9 14 14.2" />
        <path d="M21.9 10.6a10.1 10.1 0 0 0-11.3 11.3" />
      </svg>
    ),
    solid: (
      <svg
        className="tw:size-full"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" />
        <path d="M2.1 13.4A10.1 10.1 0 0 0 13.4 2.1" />
        <path d="m5 4.9 14 14.2" />
        <path d="M21.9 10.6a10.1 10.1 0 0 0-11.3 11.3" />
      </svg>
    )
  },

  custom: {
    outline: <StarIcon className="tw:size-full" />,
    solid: <StarIcon className="tw:size-full" />
  },

  flags: {
    outline: <FlagIcon className="tw:size-full" />,
    solid: <FlagIcon className="tw:size-full" />
  },

  foods: {
    outline: <AppleIcon className="tw:size-full" />,
    solid: <AppleIcon className="tw:size-full" />
  },

  frequent: {
    outline: <ClockIcon className="tw:size-full" />,
    solid: <ClockIcon className="tw:size-full" />
  },

  nature: {
    outline: <LeafIcon className="tw:size-full" />,
    solid: <LeafIcon className="tw:size-full" />
  },

  objects: {
    outline: <LightbulbIcon className="tw:size-full" />,
    solid: <LightbulbIcon className="tw:size-full" />
  },

  people: {
    outline: <SmileIcon className="tw:size-full" />,
    solid: <SmileIcon className="tw:size-full" />
  },

  places: {
    outline: <CompassIcon className="tw:size-full" />,
    solid: <CompassIcon className="tw:size-full" />
  },

  symbols: {
    outline: <MusicIcon className="tw:size-full" />,
    solid: <MusicIcon className="tw:size-full" />
  }
};

const emojiSearchIcons = {
  delete: <XIcon className="tw:size-4 tw:text-current" />,
  loupe: <SearchIcon className="tw:size-4 tw:text-current" />
};
