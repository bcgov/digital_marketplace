import { DROPDOWN_CARET_SIZE } from "front-end/config";
import { Immutable, component as component_ } from "front-end/lib/framework";
import Icon from "front-end/lib/views/icon";
import Link, {
  emptyIconLinkSymbol,
  iconLinkSymbol,
  leftPlacement,
  rightPlacement
} from "front-end/lib/views/link";
import React from "react";
import { Dropdown, DropdownMenu, DropdownToggle, Nav } from "reactstrap";
import { ADT, adt } from "shared/lib/types";

export interface State<TabId> {
  id: string;
  isDropdownOpen: boolean;
  activeTab: TabId;
  tabs: TabId[];
  showAllTabs?: boolean;
}

export interface Params<TabId> extends Pick<State<TabId>, "tabs"> {
  activeTab?: TabId;
  showAllTabs?: boolean;
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
  return ({ tabs, activeTab, showAllTabs = false }) => {
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
        activeTab: activeTab || tabs[0],
        showAllTabs
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
  getTabContent?(tabId: TabId): React.ReactNode;
}

interface HeaderProps<TabId> extends Props<TabId> {
  currentTabForHeader?: TabId;
}

export function view<TabId>(): component_.base.View<Props<TabId>> {
  const Header: component_.base.View<HeaderProps<TabId>> = ({
    valid,
    state,
    dispatch,
    getTabLabel,
    isTabValid,
    currentTabForHeader
  }) => {
    const tabToDisplay = currentTabForHeader || getActiveTab(state);
    if (!tabToDisplay) {
      return null;
    }
    return (
      <div className="d-flex mb-5">
        <Nav tabs className="flex-grow-1 flex-nowrap">
          <Dropdown
            nav
            isOpen={state.isDropdownOpen}
            toggle={() => dispatch(adt("toggleDropdown"))}>
            <DropdownToggle
              tag="div"
              nav
              className="d-flex align-items-center flex-nowrap active">
              <Link
                symbol_={
                  valid
                    ? undefined
                    : leftPlacement(iconLinkSymbol("exclamation-circle"))
                }
                symbolClassName="text-warning"
                color="body">
                {String(state.tabs.indexOf(tabToDisplay) + 1)}.{" "}
                {getTabLabel(tabToDisplay)}
              </Link>
              <Icon
                name="caret-down"
                color="body"
                className="ml-2"
                width={DROPDOWN_CARET_SIZE}
                height={DROPDOWN_CARET_SIZE}
              />
            </DropdownToggle>
            <DropdownMenu>
              {state.tabs.map((tab, i) => (
                <div
                  key={`form-tab-dropdown-item-${i}`}
                  className="dropdown-item d-flex align-items-center flex-nowrap pl-3">
                  <Link
                    symbol_={
                      valid
                        ? undefined
                        : leftPlacement(
                            isTabValid(tab)
                              ? emptyIconLinkSymbol()
                              : iconLinkSymbol("exclamation-circle")
                          )
                    }
                    symbolClassName="text-warning"
                    onClick={() => dispatch(adt("setActiveTab", tab))}
                    color="body">
                    {String(i + 1)}. {getTabLabel(tab)}
                  </Link>
                </div>
              ))}
            </DropdownMenu>
          </Dropdown>
        </Nav>
      </div>
    );
  };

  const Footer: component_.base.View<Props<TabId>> = ({ state, dispatch }) => {
    if (state.showAllTabs) {
      return null;
    }

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

  const SingleTabView: component_.base.View<Props<TabId>> = (props) => {
    return (
      <div id={props.state.id}>
        <Header {...props} />
        <div>{props.children}</div>
        <Footer {...props} />
      </div>
    );
  };

  const AllTabsView: component_.base.View<Props<TabId>> = (props) => {
    return (
      <div id={props.state.id}>
        {props.state.tabs.map((tab, index) => (
          <div
            key={`all-tabs-${index}`}
            className={index > 0 ? "mt-5 pt-5 border-top" : ""}>
            <Header {...props} currentTabForHeader={tab} />
            {props.getTabContent && props.getTabContent(tab)}
          </div>
        ))}
      </div>
    );
  };

  return function PageWrapper(props) {
    return props.state.showAllTabs ? (
      <AllTabsView {...props} />
    ) : (
      <SingleTabView {...props} />
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
