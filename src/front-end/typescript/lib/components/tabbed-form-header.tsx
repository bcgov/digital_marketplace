import { DROPDOWN_CARET_SIZE } from "front-end/config";
import { Immutable, component as component_ } from "front-end/lib/framework";
import Icon from "front-end/lib/views/icon";
import Link, {
  emptyIconLinkSymbol,
  iconLinkSymbol,
  leftPlacement
} from "front-end/lib/views/link";
import React from "react";
import { Dropdown, DropdownMenu, DropdownToggle, Nav } from "reactstrap";
import { adt } from "shared/lib/types";

export interface State<TabId> {
  id: string;
  isDropdownOpen: boolean;
  activeTab: TabId;
  tabs: TabId[];
}

export interface Props<TabId>
  extends component_.base.ComponentViewProps<State<TabId>, any> {
  valid: boolean;
  disabled?: boolean;
  children: component_.base.ViewElementChildren;
  getTabLabel(tabId: TabId): string;
  isTabValid(tabId: TabId): boolean;
}

export function getActiveTab<TabId>(state: Immutable<State<TabId>>): TabId {
  return state.activeTab;
}

export function view<TabId>(
  props: Props<TabId>
): component_.base.ViewElement | null {
  const { valid, state, dispatch, getTabLabel, isTabValid } = props;
  const tabToDisplay = getActiveTab(state);
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
              className="ms-2"
              width={DROPDOWN_CARET_SIZE}
              height={DROPDOWN_CARET_SIZE}
            />
          </DropdownToggle>
          <DropdownMenu>
            {state.tabs.map((tab, i) => (
              <div
                key={`form-tab-dropdown-item-${i}`}
                className="dropdown-item d-flex align-items-center flex-nowrap ps-3">
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
}
