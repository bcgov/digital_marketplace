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
import { TabbedFormHeaderAndContent } from "front-end/lib/components/tabbed-form";

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

const TABS: TabId[] = [
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

  console.log("form", form);
  console.log("opportunity", opportunity);

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

  const makeTabState = (activeTab: TabId) =>
    immutable({
      id: `readonly-${activeTab}`,
      isDropdownOpen: false,
      activeTab,
      tabs: TABS
    });

  return (
    // OpportunityViewWrapper is a wrapper that includes the EditTabHeader, Reporting and <Row>-><Col>->Children components:
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
