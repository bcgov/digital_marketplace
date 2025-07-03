import { component as component_, immutable } from "front-end/lib/framework";
import { CWUOpportunity } from "shared/lib/resources/opportunity/code-with-us";
import { User } from "shared/lib/resources/user";
import OpportunityViewWrapper from "./opportunity-view-wrapper";
import React from "react";
import {
  AttachmentsView,
  DescriptionView,
  DetailsView,
  OverviewView
} from "../../lib/components/form";
import { Immutable } from "front-end/lib/framework";
import * as Form from "front-end/lib/pages/opportunity/code-with-us/lib/components/form";
import { TabbedFormHeaderAndContent } from "front-end/lib/components/tabbed-form";

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

  const makeTabState = (activeTab: TabId) =>
    immutable({
      id: `readonly-${activeTab}`,
      isDropdownOpen: false,
      activeTab,
      tabs: TABS
    });

  return (
    <OpportunityViewWrapper opportunity={opportunity} viewerUser={viewerUser}>
      {TABS.map((tab) => (
        <TabbedFormHeaderAndContent
          key={`tab-${tab}`}
          valid={true}
          disabled={true}
          getTabLabel={() => tab}
          isTabValid={() => true}
          dispatch={() => {}}
          state={makeTabState(tab)}>
          {getTabContent(tab)}
        </TabbedFormHeaderAndContent>
      ))}
    </OpportunityViewWrapper>
  );
};

export default OpportunityReadOnly;
