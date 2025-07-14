import {
  component as component_,
  immutable,
  Immutable
} from "front-end/lib/framework";
import { CWUOpportunity } from "shared/lib/resources/opportunity/code-with-us";
import { User } from "shared/lib/resources/user";
import OpportunityViewWrapper from "front-end/lib/pages/opportunity/code-with-us/edit/tab/opportunity-view-wrapper";
import React from "react";
import {
  AttachmentsView,
  DescriptionView,
  DetailsView,
  OverviewView
} from "front-end/lib/pages/opportunity/code-with-us/lib/components/form";
import * as Form from "front-end/lib/pages/opportunity/code-with-us/lib/components/form";
import * as TabbedFormReadonly from "front-end/lib/components/tabbed-form-readonly";
import { State } from "front-end/lib/pages/opportunity/code-with-us/edit/tab/opportunity";

type TabId = "Overview" | "Description" | "Details" | "Attachments";

interface Props {
  opportunity: CWUOpportunity;
  viewerUser: User;
  form: Immutable<Form.State> | null;
}

const TABS: TabId[] = ["Overview", "Description", "Details", "Attachments"];

const OpportunityReadOnly: component_.base.View<Props> = (props) => {
  const { opportunity, viewerUser, form } = props;

  if (!form) {
    return null;
  }

  const getTabContent = (tabId: TabId) => {
    const viewProps = { dispatch: () => {}, state: form, disabled: true };
    switch (tabId) {
      case "Overview":
        return <OverviewView {...viewProps} />;
      case "Description":
        return <DescriptionView {...viewProps} />;
      case "Details":
        return <DetailsView {...viewProps} />;
      case "Attachments":
        return <AttachmentsView {...viewProps} />;
    }
  };

  const getTabLabel = (tabId: TabId): string => tabId;

  const ReadonlyComponent = TabbedFormReadonly.view<TabId>();

  // Create state object that matches the State interface expected by OpportunityViewWrapper
  const wrapperState = immutable({
    // Tab.Params properties
    viewerUser,
    opportunity,
    // State properties (readonly defaults)
    form: form,
    showModal: null,
    startEditingLoading: 0,
    saveChangesLoading: 0,
    saveChangesAndUpdateStatusLoading: 0,
    updateStatusLoading: 0,
    deleteLoading: 0,
    isEditing: false
  }) as component_.base.Immutable<State>;

  return (
    <OpportunityViewWrapper
      state={wrapperState}
      dispatch={() => {}}
      opportunity={opportunity}
      viewerUser={viewerUser}>
      <ReadonlyComponent
        id="opportunity-readonly"
        tabs={TABS}
        getTabLabel={getTabLabel}
        getTabContent={getTabContent}
        isTabValid={() => true}
        valid={true}
        state={immutable({
          id: "cwu-opportunity-readonly",
          isDropdownOpen: false,
          activeTab: TABS[0],
          tabs: TABS
        })}
        dispatch={() => {}}
      />
    </OpportunityViewWrapper>
  );
};

export default OpportunityReadOnly;
