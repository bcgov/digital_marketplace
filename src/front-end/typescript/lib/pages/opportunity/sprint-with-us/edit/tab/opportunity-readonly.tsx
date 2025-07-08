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
import * as Phase from "front-end/lib/pages/opportunity/sprint-with-us/lib/components/phase";
import * as TabbedFormReadonly from "front-end/lib/components/tabbed-form-readonly";
import { State } from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab/opportunity";

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

const ALL_TABS: TabId[] = [
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

  // Only show evaluation panel if there's data for it
  const hasEvaluationPanel =
    opportunity.evaluationPanel && opportunity.evaluationPanel.length > 0;
  const TABS = hasEvaluationPanel
    ? ALL_TABS
    : ALL_TABS.filter((tab) => tab !== "Evaluation Panel");

  // Create a modified form state with all phase accordions expanded for readonly view
  let formWithExpandedPhases = form;

  try {
    formWithExpandedPhases = form.update("phases", (phases) => {
      return phases
        .update("inceptionPhase", (phase) =>
          Phase.setIsAccordionOpen(phase, true)
        )
        .update("prototypePhase", (phase) =>
          Phase.setIsAccordionOpen(phase, true)
        )
        .update("implementationPhase", (phase) =>
          Phase.setIsAccordionOpen(phase, true)
        );
    });
  } catch (error) {
    console.error("Error updating form with expanded phases:", error);
  }

  const getTabContent = (tabId: TabId) => {
    const viewProps = {
      dispatch: () => {},
      state: formWithExpandedPhases,
      disabled: true
    };
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

  const getTabLabel = (tabId: TabId): string => tabId;

  const ReadonlyComponent = TabbedFormReadonly.view<TabId>();

  // Create state object that matches the State interface expected by OpportunityViewWrapper
  const wrapperState = immutable({
    // Tab.Params properties
    viewerUser,
    opportunity,
    // State properties (readonly defaults)
    form: formWithExpandedPhases,
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
          id: "swu-opportunity-readonly",
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
