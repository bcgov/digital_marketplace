import { component as component_, immutable } from "front-end/lib/framework";
import { SWUOpportunity } from "shared/lib/resources/opportunity/sprint-with-us";
import { User } from "shared/lib/resources/user";
import OpportunityViewWrapper from "./opportunity-view-wrapper";
import React from "react";
import {
  AgreementView,
  EvaluationPanelView,
  OverviewView,
  DescriptionView,
  PhasesView,
  TeamQuestionsView,
  ScoringView,
  AttachmentsView
} from "../../lib/components/form";
import { Immutable } from "front-end/lib/framework";
import * as Form from "front-end/lib/pages/opportunity/sprint-with-us/lib/components/form";
import { TabbedFormHeaderAndContent } from "front-end/lib/components/tabbed-form";

type TabId =
  | "Agreement"
  | "Evaluation Panel"
  | "Overview"
  | "Description"
  | "Phases"
  | "Team Questions"
  | "Scoring"
  | "Attachments";

interface Props {
  opportunity: SWUOpportunity;
  viewerUser: User;
  form: Immutable<Form.State> | null;
}

const TABS: TabId[] = [
  "Agreement",
  "Evaluation Panel",
  "Overview",
  "Description",
  "Phases",
  "Team Questions",
  "Scoring",
  "Attachments"
];

const OpportunityReadOnly: component_.base.View<Props> = (props) => {
  const { opportunity, viewerUser, form } = props;

  if (!form) {
    return null;
  }

  const getTabContent = (tabId: TabId) => {
    const viewProps = { dispatch: () => {}, state: form, disabled: true };
    switch (tabId) {
      case "Agreement":
        return <AgreementView />;
      case "Evaluation Panel":
        return <EvaluationPanelView {...viewProps} />;
      case "Overview":
        return <OverviewView {...viewProps} />;
      case "Description":
        return <DescriptionView {...viewProps} />;
      case "Phases":
        return <PhasesView {...viewProps} />;
      case "Team Questions":
        return <TeamQuestionsView {...viewProps} />;
      case "Scoring":
        return <ScoringView {...viewProps} />;
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
