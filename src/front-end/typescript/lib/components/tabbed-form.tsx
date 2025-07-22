import { Immutable, component as component_ } from "front-end/lib/framework";
import Link, {
  iconLinkSymbol,
  leftPlacement,
  rightPlacement
} from "front-end/lib/views/link";
import React from "react";
import { ADT, adt } from "shared/lib/types";
import * as TabbedFormHeader from "front-end/lib/components/tabbed-form-header";

export interface State<TabId> {
  id: string;
  isDropdownOpen: boolean;
  activeTab: TabId;
  tabs: TabId[];
}

export interface Params<TabId> extends Pick<State<TabId>, "tabs"> {
  activeTab?: TabId;
}

export type Msg<TabId> =
  | ADT<"noop">
  | ADT<"toggleDropdown">
  | ADT<"setActiveTab", TabId>
  | ADT<"next">
  | ADT<"previous">;

export function getActiveTab<TabId>(state: Immutable<State<TabId>>): TabId {
  return state.activeTab;
}

function getActiveTabIndex<TabId>(state: Immutable<State<TabId>>): number {
  return state.tabs.indexOf(getActiveTab(state));
}

function getNextTab<TabId>(state: Immutable<State<TabId>>): TabId | null {
  const index = getActiveTabIndex(state);
  return index !== -1 && index < state.tabs.length - 1
    ? state.tabs[index + 1]
    : null;
}

function showNextButton<TabId>(state: Immutable<State<TabId>>): boolean {
  return !!getNextTab(state);
}

function getPreviousTab<TabId>(state: Immutable<State<TabId>>): TabId | null {
  const index = getActiveTabIndex(state);
  return index !== -1 && index > 0 ? state.tabs[index - 1] : null;
}

function showPreviousButton<TabId>(state: Immutable<State<TabId>>): boolean {
  return !!getPreviousTab(state);
}

export function init<TabId>(): component_.base.Init<
  Params<TabId>,
  State<TabId>,
  Msg<TabId>
> {
  return ({ tabs, activeTab }) => {
    if (!tabs.length) {
      throw new Error(
        "Must provide a non-empty array of tabs for tabbed forms."
      );
    }
    return [
      {
        id: `tabbed-form-${Math.random()}`,
        tabs,
        isDropdownOpen: false,
        activeTab: activeTab || tabs[0]
      },
      []
    ];
  };
}

function scrollToFormTop<TabId>(
  state: Immutable<State<TabId>>
): component_.Cmd<Msg<TabId>> {
  const form = document.getElementById(state.id);
  if (!form) {
    return component_.cmd.dispatch(adt("noop"));
  }
  const toY = Math.max(
    0,
    form.getBoundingClientRect().top +
      (window.document.scrollingElement?.scrollTop || 0)
  );
  return component_.cmd.scrollTo(0, toY - 100, adt("noop")); //Offset by 100px to account for nav.
}

export function update<TabId>(): component_.base.Update<
  State<TabId>,
  Msg<TabId>
> {
  return ({ state, msg }) => {
    switch (msg.tag) {
      case "noop":
        return [state, []];
      case "toggleDropdown":
        return [state.update("isDropdownOpen", (v) => !v), []];
      case "setActiveTab":
        return [
          state.set("isDropdownOpen", false).set("activeTab", msg.value),
          []
        ];
      case "next":
        return [
          state
            .set("isDropdownOpen", false)
            .set("activeTab", getNextTab(state) || state.activeTab),
          [scrollToFormTop(state)]
        ];
      case "previous":
        return [
          state
            .set("isDropdownOpen", false)
            .set("activeTab", getPreviousTab(state) || state.activeTab),
          [scrollToFormTop(state)]
        ];
    }
  };
}

export interface Props<TabId>
  extends component_.base.ComponentViewProps<State<TabId>, Msg<TabId>> {
  valid: boolean;
  disabled?: boolean;
  children: component_.base.ViewElementChildren;
  getTabLabel(tabId: TabId): string;
  isTabValid(tabId: TabId): boolean;
}

export function view<TabId>(): component_.base.View<Props<TabId>> {
  const Footer: component_.base.View<Props<TabId>> = ({ state, dispatch }) => {
    return (
      <div className="mt-5 d-flex flex-nowrap justify-content-between align-items-center">
        {showPreviousButton(state) ? (
          <Link
            button
            outline
            color="info"
            symbol_={leftPlacement(iconLinkSymbol("arrow-left"))}
            onClick={() => dispatch(adt("previous"))}
            focusable={false}>
            Previous
          </Link>
        ) : (
          <div></div>
        )}
        {showNextButton(state) ? (
          <Link
            button
            outline
            color="primary"
            symbol_={rightPlacement(iconLinkSymbol("arrow-right"))}
            onClick={() => dispatch(adt("next"))}>
            Next
          </Link>
        ) : (
          <div></div>
        )}
      </div>
    );
  };

  return function PageWrapper(props) {
    const TabbedFormHeaderView = TabbedFormHeader.view;
    return (
      <div id={props.state.id}>
        <TabbedFormHeaderView {...props} />
        <div>{props.children}</div>
        <Footer {...props} />
      </div>
    );
  };
}

export function makeComponent<TabId>(): component_.base.Component<
  Params<TabId>,
  State<TabId>,
  Msg<TabId>,
  Props<TabId>
> {
  return {
    init: init(),
    update: update(),
    view: view()
  };
}
