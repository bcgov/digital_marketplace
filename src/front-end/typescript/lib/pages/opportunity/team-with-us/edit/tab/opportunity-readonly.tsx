import { component as component_, immutable } from "front-end/lib/framework";
import { TWUOpportunity } from "shared/lib/resources/opportunity/team-with-us";
import { User } from "shared/lib/resources/user";
import OpportunityViewWrapper from "./opportunity-view-wrapper";
import React from "react";
import {
  AgreementView,
  OverviewView,
  ResourceDetailsView,
  DescriptionView,
  ResourceQuestionsView,
  ScoringView,
  AttachmentsView
} from "../../lib/components/form";
import { Immutable } from "front-end/lib/framework";
import * as Form from "front-end/lib/pages/opportunity/team-with-us/lib/components/form";
import * as TabbedFormReadonly from "front-end/lib/components/tabbed-form-readonly";
import { State } from "front-end/lib/pages/opportunity/team-with-us/edit/tab/opportunity";

type TabId =
  | "Agreement"
  | "Overview"
  | "Resource Details"
  | "Description"
  | "Resource Questions"
  | "Scoring"
  | "Attachments";

interface Props {
  opportunity: TWUOpportunity;
  viewerUser: User;
  form: Immutable<Form.State> | null;
}

const ALL_TABS: TabId[] = [
  "Agreement",
  "Overview",
  "Resource Details",
  "Description",
  "Resource Questions",
  "Scoring",
  "Attachments"
];

const OpportunityReadOnly: component_.base.View<Props> = (props) => {
  const { opportunity, viewerUser, form } = props;

  if (!form) {
    return <div>Loading...</div>;
  }

  const TABS = ALL_TABS;

  const getTabContent = (tab: TabId) => {
    switch (tab) {
      case "Agreement":
        return <AgreementView />;
      case "Overview":
        return (
          <OverviewView state={form} dispatch={() => {}} disabled={true} />
        );
      case "Resource Details":
        return (
          <ResourceDetailsView
            state={form}
            dispatch={() => {}}
            disabled={true}
          />
        );
      case "Description":
        return (
          <DescriptionView state={form} dispatch={() => {}} disabled={true} />
        );
      case "Resource Questions":
        return (
          <ResourceQuestionsView
            state={form}
            dispatch={() => {}}
            disabled={true}
          />
        );
      case "Scoring":
        return <ScoringView state={form} dispatch={() => {}} disabled={true} />;
      case "Attachments":
        return (
          <AttachmentsView state={form} dispatch={() => {}} disabled={true} />
        );
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
    users: [],
    showModal: null,
    startEditingLoading: 0,
    saveChangesLoading: 0,
    saveChangesAndUpdateStatusLoading: 0,
    updateStatusLoading: 0,
    deleteLoading: 0,
    isEditing: false
  }) as component_.base.Immutable<State>;

  return (
    // OpportunityViewWrapper is a wrapper that includes the EditTabHeader, Reporting and <Row>-><Col>->Children components:
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
          id: "twu-opportunity-readonly",
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
