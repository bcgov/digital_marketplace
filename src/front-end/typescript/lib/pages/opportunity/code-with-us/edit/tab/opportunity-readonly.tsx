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
import * as TabbedFormReadonly from "front-end/lib/components/tabbed-form-readonly";

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

  return (
    <OpportunityViewWrapper opportunity={opportunity} viewerUser={viewerUser}>
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
        children={null}
      />
    </OpportunityViewWrapper>
  );
};

export default OpportunityReadOnly;
