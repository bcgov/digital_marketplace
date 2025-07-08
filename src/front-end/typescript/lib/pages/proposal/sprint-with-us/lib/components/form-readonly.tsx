import { component as component_, immutable } from "front-end/lib/framework";
import { SWUProposal } from "shared/lib/resources/proposal/sprint-with-us";
import { SWUOpportunity } from "shared/lib/resources/opportunity/sprint-with-us";
import { User } from "shared/lib/resources/user";
import React from "react";
import {
  EvaluationView,
  TeamView,
  PricingView,
  TeamQuestionsView,
  ReferencesView,
  ReviewProposalView
} from "./form";
import { Immutable } from "front-end/lib/framework";
import * as Form from "./form";
import * as TabbedFormReadonly from "front-end/lib/components/tabbed-form-readonly";
import ProposalViewWrapper from "./proposal-view-wrapper";
import { State } from "front-end/lib/pages/proposal/sprint-with-us/edit/tab/proposal";
import * as SubmitProposalTerms from "front-end/lib/components/submit-proposal-terms";

type TabId =
  | "Evaluation"
  | "Team"
  | "Pricing"
  | "Team Questions"
  | "References"
  | "Review Proposal";

interface Props {
  proposal: SWUProposal;
  opportunity: SWUOpportunity;
  viewerUser: User;
  form: Immutable<Form.State> | null;
}

const TABS: TabId[] = [
  "Evaluation",
  "Team",
  "Pricing",
  "Team Questions",
  "References",
  "Review Proposal"
];

const ProposalFormReadOnly: component_.base.View<Props> = (props) => {
  const { proposal, opportunity, viewerUser, form } = props;

  if (!form) {
    return null;
  }

  // Create a modified form state with all accordions expanded for readonly view
  let formWithExpandedAccordions = form;

  try {
    // Expand Team Questions accordions
    formWithExpandedAccordions = formWithExpandedAccordions.update(
      "teamQuestions",
      (teamQuestions) => {
        return teamQuestions.update("responses", (responses) =>
          responses.map((response) => ({
            ...response,
            isAccordianOpen: true
          }))
        );
      }
    );

    // Expand Team phase accordions
    formWithExpandedAccordions = formWithExpandedAccordions.update(
      "team",
      (team) => {
        return team
          .update("inceptionPhase", (phase) =>
            phase.set("isAccordionOpen", true)
          )
          .update("prototypePhase", (phase) =>
            phase.set("isAccordionOpen", true)
          )
          .update("implementationPhase", (phase) =>
            phase.set("isAccordionOpen", true)
          );
      }
    );
  } catch (error) {
    console.error("Error updating form with expanded accordions:", error);
  }
  console.log("updated form", formWithExpandedAccordions);

  const getTabContent = (tabId: TabId) => {
    const viewProps = {
      dispatch: () => {},
      state: formWithExpandedAccordions,
      disabled: true
    };
    switch (tabId) {
      case "Evaluation":
        return <EvaluationView {...viewProps} />;
      case "Team":
        return <TeamView {...viewProps} />;
      case "Pricing":
        return <PricingView {...viewProps} />;
      case "Team Questions":
        return <TeamQuestionsView {...viewProps} />;
      case "References":
        return <ReferencesView {...viewProps} />;
      case "Review Proposal":
        return <ReviewProposalView {...viewProps} />;
    }
  };

  const getTabLabel = (tabId: TabId): string => tabId;

  const ReadonlyComponent = TabbedFormReadonly.view<TabId>();

  // Create state object that matches the State interface expected by ProposalViewWrapper
  const wrapperState = immutable({
    // Tab.Params properties
    proposal,
    opportunity,
    viewerUser,
    organizations: [],
    evaluationContent: "",
    // State properties (readonly defaults)
    isEditing: false,
    startEditingLoading: 0,
    saveChangesLoading: 0,
    saveChangesAndSubmitLoading: 0,
    submitLoading: 0,
    withdrawLoading: 0,
    deleteLoading: 0,
    showModal: null,
    form: formWithExpandedAccordions || immutable({} as Form.State),
    submitTerms: immutable({} as SubmitProposalTerms.State)
  }) as component_.base.Immutable<State>;

  return (
    <ProposalViewWrapper state={wrapperState} dispatch={() => {}}>
      <ReadonlyComponent
        id="swu-proposal-readonly"
        tabs={TABS}
        getTabLabel={getTabLabel}
        getTabContent={getTabContent}
        isTabValid={() => true}
        valid={true}
        state={immutable({
          id: "swu-proposal-readonly",
          isDropdownOpen: false,
          activeTab: TABS[0],
          tabs: TABS
        })}
        dispatch={() => {}}
        children={null}
      />
    </ProposalViewWrapper>
  );
};

export default ProposalFormReadOnly;
