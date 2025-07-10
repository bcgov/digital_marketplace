import { component as component_, Immutable } from "front-end/lib/framework";
import React from "react";
import { Msg, State } from "./tabbed-form";
import * as TabbedFormHeader from "./tabbed-form-header";

export interface Props<TabId>
  extends component_.base.ComponentViewProps<State<TabId>, Msg<TabId>> {
  id: string;
  tabs: TabId[];
  getTabLabel(tabId: TabId): string;
  isTabValid?(tabId: TabId): boolean;
  getTabContent?(tabId: TabId): React.ReactNode;
  getTabHeader?(tabId: TabId): React.ReactNode;
  valid?: boolean;
  disabled?: boolean;
  children?: component_.base.ViewElementChildren;
}

// Create a mock state and dispatch for the Header component
function createMockHeaderProps<TabId>(
  tabId: TabId,
  tabs: TabId[],
  getTabLabel: (tabId: TabId) => string,
  isTabValid: (tabId: TabId) => boolean = () => true,
  valid: boolean = true
): TabbedFormHeader.Props<TabId> {
  const mockState = {
    id: "readonly-tabbed-form",
    isDropdownOpen: false,
    activeTab: tabId,
    tabs
  };

  const mockDispatch = () => {}; // No-op for readonly

  return {
    valid,
    state: mockState as Immutable<typeof mockState>,
    dispatch: mockDispatch,
    getTabLabel,
    isTabValid,
    disabled: true,
    children: null
  };
}

export function view<TabId>(): component_.base.View<Props<TabId>> {
  return function ReadOnlyTabbedForm(props) {
    const {
      id,
      tabs,
      getTabLabel,
      getTabContent,
      getTabHeader,
      isTabValid = () => true,
      valid = true
    } = props;

    const TabbedFormHeaderView = TabbedFormHeader.view;

    return (
      <div id={id}>
        {tabs.map((tab, index) => (
          <div
            key={`readonly-tab-${String(tab)}`}
            className={index > 0 ? "mt-5 pt-5 border-top" : ""}>
            {getTabHeader ? (
              getTabHeader(tab)
            ) : (
              <TabbedFormHeaderView
                {...createMockHeaderProps(
                  tab,
                  tabs,
                  getTabLabel,
                  isTabValid,
                  valid
                )}
              />
            )}
            {getTabContent?.(tab)}
          </div>
        ))}
      </div>
    );
  };
}

export function makeComponent<TabId>(): component_.base.Component<
  Record<string, never>,
  State<TabId>,
  Msg<TabId>,
  Props<TabId>
> {
  const update: component_.base.Update<State<TabId>, Msg<TabId>> = ({
    state
  }) => [state, []];

  return {
    init: () => [
      {
        id: "readonly-tabbed-form",
        isDropdownOpen: false,
        activeTab: {} as TabId, // This will be overridden by props
        tabs: [] as TabId[]
      } as State<TabId>,
      []
    ],
    update,
    view: view()
  };
}
