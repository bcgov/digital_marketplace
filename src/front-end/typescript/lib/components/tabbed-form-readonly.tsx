import { component as component_, Immutable } from "front-end/lib/framework";
import React from "react";
import { Header, HeaderProps } from "./tabbed-form";

export interface Props<TabId>
  extends component_.base.ComponentViewProps<object, never> {
  id: string;
  tabs: TabId[];
  getTabLabel(tabId: TabId): string;
  isTabValid?(tabId: TabId): boolean;
  getTabContent?(tabId: TabId): React.ReactNode;
  getTabHeader?(tabId: TabId): React.ReactNode;
  valid?: boolean;
}

// Create a mock state and dispatch for the Header component
function createMockHeaderProps<TabId>(
  tabId: TabId,
  tabs: TabId[],
  getTabLabel: (tabId: TabId) => string,
  isTabValid: (tabId: TabId) => boolean = () => true,
  valid: boolean = true
): HeaderProps<TabId> {
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
    currentTabForHeader: tabId,
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

    return (
      <div id={id}>
        {tabs.map((tab, index) => (
          <div
            key={`readonly-tab-${index}`}
            className={index > 0 ? "mt-5 pt-5 border-top" : ""}>
            {getTabHeader ? (
              getTabHeader(tab)
            ) : (
              <Header
                {...createMockHeaderProps(
                  tab,
                  tabs,
                  getTabLabel,
                  isTabValid,
                  valid
                )}
              />
            )}
            {getTabContent && getTabContent(tab)}
          </div>
        ))}
      </div>
    );
  };
}

export function makeComponent<TabId>(): component_.base.Component<
  object,
  object,
  never,
  Props<TabId>
> {
  const update: component_.base.Update<object, never> = ({ state }) => [
    state,
    []
  ];

  return {
    init: () => [{} as object, []],
    update,
    view: view()
  };
}
