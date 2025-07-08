import { component as component_, immutable } from "front-end/lib/framework";
import { TWUOpportunity } from "shared/lib/resources/opportunity/team-with-us";
import { User } from "shared/lib/resources/user";
import OpportunityViewWrapper from "./opportunity-view-wrapper";
import React from "react";
import {
  AgreementView,
  EvaluationPanelView,
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

type TabId =
  | "Agreement"
  | "Evaluation Panel"
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
  "Evaluation Panel",
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

  // Only show evaluation panel if there's data for it
  const hasEvaluationPanel =
    opportunity.evaluationPanel && opportunity.evaluationPanel.length > 0;
  const TABS = hasEvaluationPanel
    ? ALL_TABS
    : ALL_TABS.filter((tab) => tab !== "Evaluation Panel");

  const getTabContent = (tab: TabId) => {
    switch (tab) {
      case "Agreement":
        return <AgreementView />;
      case "Evaluation Panel":
        return (
          <EvaluationPanelView
            state={form}
            dispatch={() => {}}
            disabled={true}
          />
        );
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

  return (
    // OpportunityViewWrapper is a wrapper that includes the EditTabHeader, Reporting and <Row>-><Col>->Children components:
    <OpportunityViewWrapper opportunity={opportunity} viewerUser={viewerUser}>
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
